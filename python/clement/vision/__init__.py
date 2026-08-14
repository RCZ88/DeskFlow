# vision package
from .contracts import *
from .sampling import build_frame_plan
from .fingerprints import compute_frame_signature, compute_delta
from .shot_detect import detect_shots
from .digest import build_digest, build_heuristic_digest
from .bridge import build_visual_bridge_prompt, validate_visual_digest_response, generate_repair_prompt
from .collision import build_protected_regions, check_overlay_collision
