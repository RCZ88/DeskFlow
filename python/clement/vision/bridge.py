"""Manual Visual Bridge — prompt generation and validation for external VLMs."""
from __future__ import annotations
import json
from .contracts import VisualDigest, FrameManifest


VISUAL_DIGEST_PROMPT = """You are a visual analysis engine.

Analyze the attached video frames and transcript metadata.

Return only valid JSON.
Do not include markdown fences.
Do not include comments.

Use this schema exactly:
{
  "gist": "One sentence describing what is happening visually.",
  "summary": "Two to three sentences about visual content.",
  "keywords": ["word1", "word2", "..."],
  "topics": ["topic1", "topic2"],
  "entities": ["entity1", "entity2"],
  "setting": "Description of the visual setting.",
  "actions": ["action1", "action2"],
  "objects_visible": ["object1", "object2"],
  "text_on_screen": ["text1", "text2"],
  "visual_complexity": "low | medium | high",
  "motion_level": "low | medium | high",
  "color_palette": ["#hex1", "#hex2", "#hex3"],
  "frames": [
    {
      "frame_id": "f_00000",
      "timestamp_sec": 0.0,
      "caption": "What is happening in this frame.",
      "objects": ["face", "laptop"],
      "text_visible": ["slide heading"],
      "composition": "center, top-right, etc.",
      "motion": "static, panning, zoom"
    }
  ]
}

Return ONLY the JSON object. Nothing else."""


def build_visual_bridge_prompt(
    video_id: str,
    transcript: dict | None = None,
    frame_manifest: FrameManifest | None = None,
) -> str:
    """Build the Manual Visual Bridge prompt for external VLM analysis."""
    parts = [VISUAL_DIGEST_PROMPT]
    parts.append(f"\n\n================ INPUT DATA ================")
    parts.append(f"video_id: {video_id}")

    if transcript:
        parts.append(f"\ntranscript:")
        parts.append(json.dumps(transcript, indent=2)[:3000])

    if frame_manifest:
        parts.append(f"\nframe_manifest:")
        parts.append(f"  frame_count: {frame_manifest.frame_count}")
        parts.append(f"  frames:")
        for f in frame_manifest.frames[:24]:
            parts.append(f"    {f.frame_id}: {f.timestamp_sec}s ({f.reason})")

    return "\n".join(parts)


def validate_visual_digest(data: dict) -> list[dict]:
    """Validate a visual digest response. Returns list of checks."""
    checks = []

    checks.append({"rule": "Valid JSON", "passed": True, "message": "Response parsed successfully"})

    has_gist = isinstance(data.get("gist"), str) and len(data["gist"]) > 0
    checks.append({"rule": "Has gist", "passed": has_gist, "message": "gist string present" if has_gist else "Missing gist"})

    has_keywords = isinstance(data.get("keywords"), list) and len(data["keywords"]) > 0
    checks.append({"rule": "Has keywords", "passed": has_keywords, "message": f"{len(data.get('keywords', []))} keywords" if has_keywords else "Missing keywords"})

    valid_complexity = data.get("visual_complexity") in ("low", "medium", "high", None)
    checks.append({"rule": "Valid visual_complexity", "passed": valid_complexity, "message": f"'{data.get('visual_complexity')}'" if valid_complexity else "Invalid value"})

    valid_motion = data.get("motion_level") in ("low", "medium", "high", None)
    checks.append({"rule": "Valid motion_level", "passed": valid_motion, "message": f"'{data.get('motion_level')}'" if valid_motion else "Invalid value"})

    has_frames = isinstance(data.get("frames"), list)
    checks.append({"rule": "Has frames array", "passed": has_frames, "message": f"{len(data.get('frames', []))} frames" if has_frames else "Missing frames array"})

    return checks


def all_passed(checks: list[dict]) -> bool:
    return all(c.get("passed", False) for c in checks)


def passed_count(checks: list[dict]) -> dict:
    p = sum(1 for c in checks if c.get("passed"))
    return {"passed": p, "total": len(checks)}
