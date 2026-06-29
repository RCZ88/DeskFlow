"""Vision sidecar — FastAPI server, spawn by Electron main.

Endpoints:
  GET  /health            — liveness + GPU stats
  POST /analyze           — start async analysis, returns {job_id}
  GET  /jobs/{id}/events  — SSE progress stream
  GET  /jobs/{id}         — final CritiqueResult
  POST /jobs/{id}/cancel  — cancel a running job
"""

import argparse
import asyncio
import base64
import io
import json
import os
import sys
import time
import uuid
from io import BytesIO

import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
import uvicorn

from . import __version__
from .cache import cache_get, cache_set, cache_hit_keys, image_hash
from .cv_pass import (
    extract_palette,
    check_contrast,
    detect_elements_cv,
    check_spacing,
    detect_alignment,
    compute_scores,
    generate_description,
)
from .ocr_pass import run_ocr

app = FastAPI(title="DeskFlow Vision Sidecar", version=__version__)

# ── In-memory job store ────────────────────────────────────────────────
jobs: dict[str, dict] = {}
cancel_flags: set[str] = set()

GPU_INFO: dict | None = None


class AnalyzeRequest(BaseModel):
    image_path: str          # base64 data URI or file path
    passes: list[str] | None = None
    resolution: dict | None = None
    tiling: dict | None = None
    models: dict | None = None
    temps: dict | None = None
    rubric_version: str | None = "1.0"
    use_cache: bool = True


def _load_image(image_path: str) -> Image.Image:
    """Load image from base64 data URI or file path."""
    if image_path.startswith("data:image/"):
        # Base64
        header, _, b64data = image_path.partition(",")
        raw = base64.b64decode(b64data)
        return Image.open(BytesIO(raw)).convert("RGB")
    else:
        # File path
        return Image.open(image_path).convert("RGB")


async def run_analysis(job_id: str, request: AnalyzeRequest):
    """Execute passes sequentially, store result, stream SSE."""
    try:
        passes = request.passes or ["cv", "ocr"]
        use_cache = request.use_cache
        img = _load_image(request.image_path)
        w, h = img.size
        raw_bytes = _get_image_bytes(img)

        img_hash = image_hash(raw_bytes)
        timings: dict[str, float] = {}
        cache_hits: list[str] = []

        partial: dict = {
            "schema_version": "1.0",
            "image": {"hash": img_hash, "width": w, "height": h, "analyzed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())},
            "ocr_text": [],
            "palette": [],
            "gradients": [],
            "contrast_issues": [],
            "elements": [],
            "spacing_issues": [],
            "alignment": {"detected_grid_px": None, "columns": None, "off_grid_elements": []},
            "description": "",
            "critique": {"summary": "", "strengths": [], "issues": []},
            "scores": {"layout": 0, "color": 0, "contrast": 0, "spacing": 0, "hierarchy": 0, "overall": 0},
            "verification": {"claims_checked": 0, "disagreements": []},
            "meta": {"passes_run": [], "models": {"ground": "none", "synth": "none"}, "timings_ms": {}, "cache_hits": []},
        }

        for pass_name in passes:
            if job_id in cancel_flags:
                cancel_flags.discard(job_id)
                return

            # Check cache
            if use_cache:
                cached = cache_get(img_hash, pass_name)
                if cached:
                    partial.update(cached)
                    cache_hits.append(pass_name)
                    partial["meta"]["cache_hits"] = cache_hits
                    partial["meta"]["passes_run"].append(pass_name)
                    _emit_progress(job_id, pass_name, 100, partial)
                    timings[pass_name] = 0
                    continue

            t0 = time.perf_counter()

            if pass_name == "cv":
                # Palette
                partial["palette"] = extract_palette(img)
                _emit_progress(job_id, "cv/palette", 25, partial)
                await asyncio.sleep(0)

                # CV elements
                partial["elements"] = detect_elements_cv(img)
                _emit_progress(job_id, "cv/elements", 50, partial)
                await asyncio.sleep(0)

            elif pass_name == "ocr":
                partial["ocr_text"] = run_ocr(img)
                _emit_progress(job_id, "ocr", 50, partial)
                await asyncio.sleep(0)

            if pass_name in ("cv", "ocr"):
                # Contrast (needs OCR + elements)
                partial["contrast_issues"] = check_contrast(img, partial.get("ocr_text", []), partial.get("elements", []))
                _emit_progress(job_id, f"{pass_name}/contrast", 75, partial)
                await asyncio.sleep(0)

                # Spacing (needs elements)
                if partial.get("elements"):
                    partial["spacing_issues"] = check_spacing(
                        partial["elements"],
                        img_w=w, img_h=h,
                    )
                    partial["alignment"] = detect_alignment(partial["elements"])

                _emit_progress(job_id, f"{pass_name}/spacing", 90, partial)
                await asyncio.sleep(0)

                # Scores
                partial["scores"] = compute_scores(
                    partial.get("contrast_issues", []),
                    partial.get("spacing_issues", []),
                    partial.get("palette", []),
                    partial.get("elements", []),
                )
                # Templated description
                partial["description"] = generate_description(
                    partial.get("palette", []),
                    partial.get("ocr_text", []),
                    partial.get("contrast_issues", []),
                    partial.get("spacing_issues", []),
                    partial.get("elements", []),
                    partial["scores"],
                )

            elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)
            timings[pass_name] = elapsed_ms
            partial["meta"]["passes_run"].append(pass_name)
            partial["meta"]["timings_ms"] = {k: round(v, 1) for k, v in timings.items()}

            # Write cache
            if use_cache:
                _cache_pass_result(img_hash, pass_name, partial)

            _emit_progress(job_id, pass_name, 100, partial)

        # Final
        jobs[job_id]["result"] = dict(partial)
        jobs[job_id]["status"] = "done"
        _emit_progress(job_id, "complete", 100, dict(partial))

    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)
        _emit_progress(job_id, "error", 0, {"error": str(e)})


def _get_image_bytes(img: Image.Image) -> bytes:
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _cache_pass_result(img_hash: str, pass_name: str, partial: dict):
    """Cache result for a single pass."""
    cache_set(img_hash, pass_name, partial)


def _emit_progress(job_id: str, pass_name: str, pct: int, partial: dict):
    event = {"jobId": job_id, "pass": pass_name, "pct": pct, "partial": None}
    jobs[job_id]["events"].append({"event": "progress", "data": json.dumps(event, default=str)})


@app.on_event("startup")
async def startup():
    """Probe GPU and mark READY."""
    gpu_info = None
    try:
        import torch
        if torch.cuda.is_available():
            gpu_info = {
                "device": torch.cuda.get_device_name(0),
                "vram_free_mb": round(torch.cuda.mem_get_info()[0] / (1024 * 1024)),
            }
    except ImportError:
        pass
    global GPU_INFO
    GPU_INFO = gpu_info
    print(f"READY port={_get_port()}", flush=True)


def _get_port() -> int:
    """Return port from args (set by main on startup)."""
    import __main__
    # We store port in a module-level var set during argparse
    return getattr(app, "_port", 8765)


@app.get("/health")
async def health():
    gpu_name = GPU_INFO["device"] if GPU_INFO else None
    vram = GPU_INFO["vram_free_mb"] if GPU_INFO else None
    return {
        "status": "ok",
        "gpu": gpu_name,
        "vram_free_mb": vram,
        "models": ["cv", "ocr"],
        "version": __version__,
    }


@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "running", "events": [], "result": None, "error": None}
    asyncio.create_task(run_analysis(job_id, request))
    return {"job_id": job_id}


@app.get("/jobs/{job_id}/events")
async def job_events(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")

    async def event_generator():
        last_idx = 0
        while True:
            job = jobs.get(job_id)
            if not job:
                break
            while last_idx < len(job["events"]):
                ev = job["events"][last_idx]
                yield ev
                last_idx += 1
            if job["status"] in ("done", "error"):
                break
            await asyncio.sleep(0.2)
        yield {"event": "done", "data": "{}"}

    return EventSourceResponse(event_generator())


@app.get("/jobs/{job_id}")
async def job_result(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    job = jobs[job_id]
    if job["status"] == "error":
        raise HTTPException(500, detail=job.get("error", "Unknown error"))
    if job["result"]:
        return JSONResponse(content=job["result"])
    return {"status": job["status"]}


@app.post("/jobs/{job_id}/cancel")
async def cancel_job(job_id: str):
    cancel_flags.add(job_id)
    return {"ok": True}


def main():
    parser = argparse.ArgumentParser(description="DeskFlow Vision Sidecar")
    parser.add_argument("--port", type=int, default=8765, help="HTTP port")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Bind address")
    args = parser.parse_args()

    app._port = args.port
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
