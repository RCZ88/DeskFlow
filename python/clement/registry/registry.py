"""Template ABC + Registry — v2 §4/§9.2."""
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from ..contracts.template import TemplateDefinition, TemplateProps
from ..contracts.scenegraph import SceneGraph
from ..contracts.timeline import AnimationTimeline
import json
import os

class ValidationResult:
    def __init__(self, valid: bool, errors: Optional[List[str]] = None):
        self.valid = valid
        self.errors = errors or []

class TemplateBuildContext:
    def __init__(self, profile: Any, canvas_w: int = 1080, canvas_h: int = 1920, fps: int = 30):
        self.profile = profile
        self.canvas_w = canvas_w
        self.canvas_h = canvas_h
        self.fps = fps

class TemplatePlugin(ABC):
    definition: TemplateDefinition

    @abstractmethod
    def validate_props(self, props: TemplateProps) -> ValidationResult:
        ...

    @abstractmethod
    def build_scene_graph(self, props: TemplateProps, ctx: TemplateBuildContext) -> SceneGraph:
        ...

    @abstractmethod
    def build_animation(self, scene: SceneGraph, ctx: TemplateBuildContext) -> AnimationTimeline:
        ...


class TemplateRegistry:
    def __init__(self):
        self._plugins: Dict[str, TemplatePlugin] = {}
        self._intent_map: Dict[str, List[str]] = {}

    def register(self, plugin: TemplatePlugin) -> None:
        tid = plugin.definition.id
        if tid in self._plugins:
            raise ValueError(f'Duplicate template id: {tid}')
        self._plugins[tid] = plugin
        for intent in plugin.definition.intents:
            self._intent_map.setdefault(intent, []).append(tid)

    def get(self, template_id: str) -> TemplatePlugin:
        if template_id not in self._plugins:
            raise KeyError(f'Unknown template: {template_id}')
        return self._plugins[template_id]

    def list_for_intent(self, intent: str) -> List[TemplatePlugin]:
        tids = self._intent_map.get(intent, [])
        return [self._plugins[tid] for tid in tids if tid in self._plugins]

    def choose(self, shot_intent: str, text_length: int, duration_s: float) -> Optional[TemplatePlugin]:
        """Score and choose the best template for a shot (v2 §4)."""
        candidates = self.list_for_intent(shot_intent)
        if not candidates:
            return None

        scored = []
        for plugin in candidates:
            d = plugin.definition
            c = d.constraints

            # Duration fit
            dur_ok = c.get('min_duration', 0) <= duration_s <= c.get('max_duration', 60)
            # Text capacity fit
            cap_ok = text_length <= c.get('max_characters', 999)
            # Region check (always valid for 'full')
            region_ok = 'full' in c.get('allowed_regions', ['full'])

            if dur_ok and cap_ok and region_ok:
                score = 0.5  # base
                scored.append((score, plugin))

        if not scored:
            return None
        scored.sort(key=lambda x: -x[0])
        return scored[0][1]

    def load_definitions(self, templates_dir: str) -> None:
        """Load all definition.json files from a directory."""
        for entry in os.listdir(templates_dir):
            defn_path = os.path.join(templates_dir, entry, 'definition.json')
            if os.path.isfile(defn_path):
                with open(defn_path) as f:
                    data = json.load(f)
                defn = TemplateDefinition(**data)
                # Create a minimal plugin wrapper
                class MinimalPlugin(TemplatePlugin):
                    definition = defn
                    def validate_props(self, props):
                        return ValidationResult(True)
                    def build_scene_graph(self, props, ctx):
                        return SceneGraph(scene_id=self.definition.id, timing=None, layers=[])
                    def build_animation(self, scene, ctx):
                        return AnimationTimeline(tracks=[], duration_us=scene.timing.duration_us() if scene.timing else 0, fps=ctx.fps)
                self.register(MinimalPlugin())
