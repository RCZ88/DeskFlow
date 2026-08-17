"""Heuristic visual provider — no ML dependencies, PIL only."""
from __future__ import annotations
from datetime import datetime, timezone
from ..contracts import VisualAnalysis, VisualDigest, FrameManifest


class HeuristicVisualProvider:
    provider_id = "heuristic"
    display_name = "Heuristic Analysis"

    def available(self) -> bool:
        return True

    def analyze(
        self,
        manifest: FrameManifest,
        transcript: dict | None = None,
    ) -> VisualAnalysis:
        """Run basic heuristic analysis on frame manifest."""
        keywords = []
        if transcript:
            segments = transcript.get("segments", [])
            for seg in segments[:20]:
                text = seg.get("text", "")
                words = [w.lower().strip(".,!?") for w in text.split() if len(w) > 3]
                keywords.extend(words[:5])

        # Deduplicate and take top
        seen = set()
        unique_kw = []
        for w in keywords:
            if w not in seen and len(unique_kw) < 15:
                seen.add(w)
                unique_kw.append(w)

        frame_count = manifest.frame_count
        duration = manifest.frames[-1].timestamp_sec if manifest.frames else 0

        digest = VisualDigest(
            gist=f"Video with {frame_count} sampled frames over {duration:.0f}s.",
            summary=f"Automated heuristic analysis of {frame_count} frames.",
            keywords=unique_kw[:10],
            topics=[],
            entities=[],
            visual_complexity="medium",
            motion_level="low",
            confidence=0.3,
            source="heuristic",
        )

        return VisualAnalysis(
            video_id=manifest.video_id,
            status="partial",
            created_at=datetime.now(timezone.utc).isoformat(),
            providers=["heuristic"],
            digest=digest,
            warnings=["Heuristic analysis only. No VLM available."],
        )
