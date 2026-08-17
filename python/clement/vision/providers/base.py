"""Vision providers — base interface."""
from __future__ import annotations
from abc import ABC, abstractmethod
from .contracts import VisualAnalysis, FrameManifest


class VisualProvider(ABC):
    provider_id: str = "base"
    display_name: str = "Base Provider"

    @abstractmethod
    def available(self) -> bool: ...

    @abstractmethod
    def analyze(
        self,
        manifest: FrameManifest,
        transcript: dict | None = None,
    ) -> VisualAnalysis: ...
