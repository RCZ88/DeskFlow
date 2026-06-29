import hashlib
import json
import os
from pathlib import Path


def get_cache_dir() -> Path:
    """Resolve the vision cache directory under APPDATA or XDG."""
    base = os.environ.get("APPDATA") or os.path.join(os.environ["HOME"], ".local", "share")
    d = Path(base) / "DeskFlow" / "vision-cache"
    d.mkdir(parents=True, exist_ok=True)
    return d


def image_hash(image_bytes: bytes) -> str:
    return hashlib.sha256(image_bytes).hexdigest()


def pass_cache_key(image_hash: str, pass_name: str, params: dict | None = None) -> str:
    """Build a stable cache key from image hash + pass name + optional params.

    Changing any param invalidates only that pass's cache forward.
    """
    parts = [image_hash, pass_name]
    if params:
        param_str = json.dumps(params, sort_keys=True)
        param_hash = hashlib.sha256(param_str.encode()).hexdigest()[:12]
        parts.append(param_hash)
    return "_".join(parts)


def cache_get(image_hash: str, pass_name: str, params: dict | None = None) -> dict | None:
    key = pass_cache_key(image_hash, pass_name, params)
    path = get_cache_dir() / f"{key}.json"
    if path.exists():
        try:
            return json.loads(path.read_text("utf-8"))
        except (json.JSONDecodeError, OSError):
            return None
    return None


def cache_set(image_hash: str, pass_name: str, data: dict, params: dict | None = None) -> None:
    key = pass_cache_key(image_hash, pass_name, params)
    path = get_cache_dir() / f"{key}.json"
    path.write_text(json.dumps(data, default=str), "utf-8")


def cache_hit_keys(image_hash: str, pass_names: list[str]) -> list[str]:
    """Return which of the given pass names have a cache hit."""
    hits = []
    for p in pass_names:
        key = pass_cache_key(image_hash, p)
        if (get_cache_dir() / f"{key}.json").exists():
            hits.append(p)
    return hits
