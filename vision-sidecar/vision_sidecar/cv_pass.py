"""M1 deterministic CV pass — no VLM, pure math.

Produces: palette, gradients, contrast_issues, elements (CV-only),
spacing_issues, alignment, scores (rule-based).
"""

import math
import statistics
from collections import Counter

import numpy as np
from PIL import Image
from sklearn.cluster import KMeans


# ── Palette ────────────────────────────────────────────────────────────

def extract_palette(
    img: Image.Image,
    n_colors: int = 8,
    min_ratio: float = 0.02,
) -> list[dict]:
    """Extract dominant palette colours via k-means in CIE LAB.

    Returns list of {hex, rgb, lab, ratio, role} sorted by ratio descending.
    """
    rgb = np.array(img.convert("RGB"))
    h, w, _ = rgb.shape
    pixels = rgb.reshape(-1, 3).astype(np.float32)

    # Sample if large
    if len(pixels) > 100_000:
        idx = np.random.choice(len(pixels), 100_000, replace=False)
        pixels = pixels[idx]

    kmeans = KMeans(n_clusters=min(n_colors, len(pixels)), random_state=0, n_init="auto")
    kmeans.fit(pixels)
    labels = kmeans.labels_
    counts = Counter(labels)

    total = sum(counts.values())
    centers = np.round(kmeans.cluster_centers_).astype(int)

    palette = []
    for i in range(len(centers)):
        ratio = counts[i] / total
        if ratio < min_ratio:
            continue
        r, g, b = int(centers[i][0]), int(centers[i][1]), int(centers[i][2])
        lab = _rgb_to_lab(r, g, b)
        hex_str = f"#{r:02x}{g:02x}{b:02x}"
        role = _classify_role(r, g, b, ratio, rgb)
        palette.append({
            "hex": hex_str,
            "rgb": [r, g, b],
            "lab": [round(v, 2) for v in lab],
            "ratio": round(ratio, 4),
            "role": role,
        })

    palette.sort(key=lambda c: c["ratio"], reverse=True)
    return palette


def _rgb_to_lab(r: int, g: int, b: int) -> tuple[float, float, float]:
    """Return CIE LAB for an sRGB pixel (quick approximation)."""
    def _linearize(c: float) -> float:
        c = c / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    rl, gl, bl = _linearize(r), _linearize(g), _linearize(b)
    # sRGB → XYZ (D65)
    x = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375
    y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750
    z = rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041
    # Normalise D65
    xn, yn, zn = x / 0.95047, y / 1.0, z / 1.08883
    def _f(t: float) -> float:
        return t ** (1 / 3) if t > 0.008856 else (7.787 * t + 16 / 116)
    l_val = 116 * _f(yn) - 16
    a_val = 500 * (_f(xn) - _f(yn))
    b_val = 200 * (_f(yn) - _f(zn))
    return l_val, a_val, b_val


def _classify_role(r: int, g: int, b: int, ratio: float, full_image: np.ndarray) -> str:
    """Heuristic role classification."""
    brightness = 0.299 * r + 0.587 * g + 0.114 * b
    # Very dark → likely text
    if brightness < 50 and ratio < 0.1:
        return "text"
    # Very light + large coverage → background
    if brightness > 200 and ratio > 0.3:
        return "background"
    # Mid-range large coverage → surface
    if ratio > 0.15:
        return "surface"
    # Saturated small coverage → accent
    max_c = max(r, g, b)
    min_c = min(r, g, b)
    saturation = (max_c - min_c) / max_c if max_c > 0 else 0
    if saturation > 0.4 and ratio < 0.12:
        return "accent"
    return "other"


# ── WCAG Contrast ──────────────────────────────────────────────────────

def relative_luminance(r: int, g: int, b: int) -> float:
    def _lin(c: int) -> float:
        c = c / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b)


def contrast_ratio(c1: tuple[int, int, int], c2: tuple[int, int, int]) -> float:
    l1 = relative_luminance(*c1) + 0.05
    l2 = relative_luminance(*c2) + 0.05
    return max(l1, l2) / min(l1, l2)


def check_contrast(
    img: Image.Image,
    ocr_spans: list[dict],
    elements: list[dict],
) -> list[dict]:
    """Check WCAG contrast for detected text boxes and UI elements."""
    rgb = np.array(img.convert("RGB"))
    issues = []

    # Check OCR text boxes
    for span in ocr_spans:
        bx, by, bw, bh = span["bbox"]
        if bw < 4 or bh < 4:
            continue
        fg_sample = _sample_center(rgb, bx, by, bw, bh)
        bg_sample = _sample_background(rgb, bx, by, bw, bh)
        if fg_sample is None or bg_sample is None:
            continue
        ratio = contrast_ratio(fg_sample, bg_sample)
        required_aa = 4.5
        required_aaa = 7.0
        if ratio < required_aa:
            hex_fg = f"#{fg_sample[0]:02x}{fg_sample[1]:02x}{fg_sample[2]:02x}"
            hex_bg = f"#{bg_sample[0]:02x}{bg_sample[1]:02x}{bg_sample[2]:02x}"
            severity = "high" if ratio < 3.0 else ("med" if ratio < required_aa else "low")
            issues.append({
                "fg": hex_fg,
                "bg": hex_bg,
                "ratio": round(ratio, 2),
                "required": required_aa,
                "wcag_level": "AA",
                "context": "text",
                "bbox": [int(bx), int(by), int(bw), int(bh)],
                "severity": severity,
            })

    return issues


def _sample_center(img: np.ndarray, x: int, y: int, w: int, h: int) -> tuple[int, int, int] | None:
    """Sample a small patch at the centre of the bbox for foreground."""
    cx, cy = x + w // 2, y + h // 2
    s = max(2, min(w, h) // 4)
    x1, y1 = max(0, cx - s), max(0, cy - s)
    x2, y2 = min(img.shape[1], cx + s), min(img.shape[0], cy + s)
    patch = img[y1:y2, x1:x2]
    if patch.size == 0:
        return None
    return tuple(int(v) for v in np.median(patch.reshape(-1, 3), axis=0))


def _sample_background(img: np.ndarray, x: int, y: int, w: int, h: int) -> tuple[int, int, int] | None:
    """Sample a ring around the bbox for background."""
    margin = max(2, min(w, h) // 6)
    x1, y1 = max(0, x - margin), max(0, y - margin)
    x2, y2 = min(img.shape[1], x + w + margin), min(img.shape[0], y + h + margin)
    # Mask out the inner box
    mask = np.ones((y2 - y1, x2 - x1), dtype=bool)
    ix1 = max(0, x - x1)
    iy1 = max(0, y - y1)
    ix2 = min(x2 - x1, ix1 + w)
    iy2 = min(y2 - y1, iy1 + h)
    mask[iy1:iy2, ix1:ix2] = False
    bg_pixels = img[y1:y2, x1:x2][mask]
    if len(bg_pixels) < 10:
        return None
    return tuple(int(v) for v in np.median(bg_pixels, axis=0))


# ── CV Element Detection ───────────────────────────────────────────────

def detect_elements_cv(img: Image.Image) -> list[dict]:
    """Simple CV-based element detection using edge/corner heuristics.

    Returns list of {id, label, type, bbox, source: "cv", confidence}.
    This is a fallback until Florence-2 grounds real labels.
    """
    gray = np.array(img.convert("L"))
    h, w = gray.shape
    elements = []

    # Use horizontal + vertical projection to find blocks
    # Simple: detect large connected-components-like regions
    # by thresholding at mid-brightness
    binary = (gray < 128).astype(np.uint8) * 255

    # Find bounding boxes via simple row/col projections
    # Horizontal projection
    row_sum = np.sum(binary, axis=1) // 255
    in_block = False
    block_rows = []
    for r in range(h):
        if row_sum[r] > w * 0.05 and not in_block:
            block_rows.append(r)
            in_block = True
        elif row_sum[r] <= w * 0.05 and in_block:
            block_rows.append(r)
            in_block = False
    if in_block:
        block_rows.append(h - 1)

    for i in range(0, len(block_rows) - 1, 2):
        y1, y2 = block_rows[i], block_rows[i + 1]
        if y2 - y1 < 8:
            continue
        row_slice = binary[y1:y2, :]
        col_sum = np.sum(row_slice, axis=0) // 255
        in_col = False
        for c in range(w):
            if col_sum[c] > (y2 - y1) * 0.05 and not in_col:
                x1 = c
                in_col = True
            elif col_sum[c] <= (y2 - y1) * 0.05 and in_col:
                elements.append({
                    "id": f"cv-{len(elements)}",
                    "label": f"region-{len(elements)}",
                    "type": "other",
                    "bbox": [x1, y1, c - x1, y2 - y1],
                    "source": "cv",
                    "confidence": 0.5,
                })
                in_col = False
        if in_col:
            elements.append({
                "id": f"cv-{len(elements)}",
                "label": f"region-{len(elements)}",
                "type": "other",
                "bbox": [0 if not elements else 0, y1, w - 1, y2 - y1],
                "source": "cv",
                "confidence": 0.5,
            })

    return elements


# ── Spacing & Alignment ────────────────────────────────────────────────

def check_spacing(
    elements: list[dict],
    edge_padding: int = 16,
    min_gap: int = 8,
    img_w: int = 0,
    img_h: int = 0,
) -> list[dict]:
    """Check spacing/overlap/edge-crowding among detected element boxes.

    Returns list of SpacingIssue dicts.
    """
    issues = []
    boxes = [(e["bbox"], e["id"]) for e in elements if e.get("bbox")]

    # Overlap
    for i in range(len(boxes)):
        for j in range(i + 1, len(boxes)):
            b1, id1 = boxes[i]
            b2, id2 = boxes[j]
            iou = _bbox_iou(b1, b2)
            if iou > 0:
                issues.append({
                    "kind": "overlap",
                    "elements": [id1, id2],
                    "measured_px": 0,
                    "threshold_px": 0,
                    "axis": "both",
                    "severity": "high" if iou > 0.3 else "med",
                    "note": f"IoU {iou:.2f}",
                })

    # Edge crowding
    for bbox, eid in boxes:
        bx, by, bw, bh = bbox
        if bx < edge_padding:
            issues.append({
                "kind": "edge_crowding",
                "elements": [eid],
                "measured_px": bx,
                "threshold_px": edge_padding,
                "axis": "x",
                "severity": "high" if bx < 4 else "med",
                "note": f"{bx}px from left edge",
            })
        if by < edge_padding:
            issues.append({
                "kind": "edge_crowding",
                "elements": [eid],
                "measured_px": by,
                "threshold_px": edge_padding,
                "axis": "y",
                "severity": "high" if by < 4 else "med",
                "note": f"{by}px from top edge",
            })
        if img_w > 0 and bx + bw > img_w - edge_padding:
            dist = img_w - (bx + bw)
            issues.append({
                "kind": "edge_crowding",
                "elements": [eid],
                "measured_px": dist,
                "threshold_px": edge_padding,
                "axis": "x",
                "severity": "high" if dist < 4 else "med",
                "note": f"{dist}px from right edge",
            })
        if img_h > 0 and by + bh > img_h - edge_padding:
            dist = img_h - (by + bh)
            issues.append({
                "kind": "edge_crowding",
                "elements": [eid],
                "measured_px": dist,
                "threshold_px": edge_padding,
                "axis": "y",
                "severity": "high" if dist < 4 else "med",
                "note": f"{dist}px from bottom edge",
            })

    return issues


def detect_alignment(elements: list[dict]) -> dict:
    """Heuristic grid alignment detection."""
    boxes = [e["bbox"] for e in elements if e.get("bbox")]
    if len(boxes) < 3:
        return {"detected_grid_px": None, "columns": None, "off_grid_elements": []}

    lefts = [b[0] for b in boxes]
    # Try to find a common grid interval
    diffs = []
    for i in range(len(lefts)):
        for j in range(i + 1, len(lefts)):
            d = abs(lefts[i] - lefts[j])
            if d > 4:
                diffs.append(d)

    if not diffs:
        return {"detected_grid_px": None, "columns": 1, "off_grid_elements": []}

    # Most common interval ≈ grid
    counter = Counter([round(d / 8) * 8 for d in diffs if d > 0])
    if counter:
        grid_px = counter.most_common(1)[0][0]
        off_grid = []
        for e in elements:
            b = e["bbox"]
            if b[0] % max(grid_px, 1) > 4 and b[0] > 8:
                off_grid.append(e["id"])
        return {
            "detected_grid_px": grid_px,
            "columns": max(1, (max(lefts) - min(lefts)) // max(grid_px, 1)) if lefts else 1,
            "off_grid_elements": off_grid[:10],
        }

    return {"detected_grid_px": None, "columns": None, "off_grid_elements": []}


# ── Gradient detection ─────────────────────────────────────────────────

def detect_gradients(img: Image.Image) -> list[dict]:
    """Simple gradient region detection by variance analysis."""
    rgb = np.array(img)
    # Analyse horizontal and vertical gradient magnitude
    gray = np.array(img.convert("L")).astype(np.float32)
    gx = np.abs(np.diff(gray, axis=1))
    gy = np.abs(np.diff(gray, axis=0))

    # Pad back
    gx = np.pad(gx, ((0, 0), (0, 1)), mode="edge")
    gy = np.pad(gy, ((0, 1), (0, 0)), mode="edge")

    grad_mag = np.sqrt(gx ** 2 + gy ** 2)

    # Regions where gradient is smooth but non-zero = potential gradients
    thresh = np.percentile(grad_mag, 80)
    smooth = grad_mag < thresh
    has_grad = grad_mag > 10

    return []  # Gradient detection needs image-level tiling — stub for M1


# ── Rule-based scores ──────────────────────────────────────────────────

def compute_scores(
    contrast_issues: list[dict],
    spacing_issues: list[dict],
    palette: list[dict],
    elements: list[dict],
) -> dict:
    """Deterministic 0-100 scores from measured data."""
    # Contrast: 100 - penalty per issue
    contrast_score = 100.0
    for ci in contrast_issues:
        weight = 20 if ci["severity"] == "high" else (10 if ci["severity"] == "med" else 5)
        contrast_score -= weight
    contrast_score = max(0, contrast_score)

    # Spacing: 100 - penalty per issue
    spacing_score = 100.0
    for si in spacing_issues:
        weight = 15 if si["severity"] == "high" else (8 if si["severity"] == "med" else 3)
        spacing_score -= weight
    spacing_score = max(0, spacing_score)

    # Layout: based on element alignment + grid
    layout_score = 80.0
    if len(elements) < 2:
        layout_score = 50.0
    else:
        # Check alignment
        lefts = [e["bbox"][0] for e in elements if e.get("bbox")]
        if lefts:
            alignment_std = statistics.stdev(lefts) if len(lefts) > 1 else 0
            if alignment_std > 50:
                layout_score -= 20

    layout_score = max(0, min(100, layout_score))

    # Color: based on accent count
    color_score = 90.0
    accents = [c for c in palette if c["role"] == "accent"]
    if len(accents) > 3:
        color_score -= (len(accents) - 3) * 15
    color_score = max(0, color_score)

    # Hierarchy: stub — needs text size analysis
    hierarchy_score = 70.0

    overall = round(
        layout_score * 0.2
        + color_score * 0.15
        + contrast_score * 0.35
        + spacing_score * 0.2
        + hierarchy_score * 0.1,
        1,
    )

    return {
        "layout": round(layout_score, 1),
        "color": round(color_score, 1),
        "contrast": round(contrast_score, 1),
        "spacing": round(spacing_score, 1),
        "hierarchy": round(hierarchy_score, 1),
        "overall": overall,
    }


# ── Templated description ──────────────────────────────────────────────

def generate_description(
    palette: list[dict],
    ocr_spans: list[dict],
    contrast_issues: list[dict],
    spacing_issues: list[dict],
    elements: list[dict],
    scores: dict,
) -> str:
    """Deterministic, metrics-anchored description (no VLM)."""
    n_colors = len(palette)
    n_texts = len(ocr_spans)
    n_elements = len(elements)
    n_contrast = len(contrast_issues)
    n_spacing = len(spacing_issues)
    top_color = palette[0]["hex"] if palette else "unknown"

    if n_contrast > 0:
        worst = min(ci["ratio"] for ci in contrast_issues)
        contrast_note = f"Found {n_contrast} contrast issue(s), worst ratio {worst:.1f}:1"
    else:
        contrast_note = "No contrast issues detected"

    desc = (
        f"Measured report for {n_elements} element regions in {n_colors} colours "
        f"(dominant {top_color}) with {n_texts} OCR text spans. "
        f"{contrast_note}. "
        f"Overall score {scores['overall']}/100 "
        f"(contrast {scores['contrast']}, spacing {scores['spacing']}, "
        f"layout {scores['layout']})."
    )
    return desc


# ── Helpers ────────────────────────────────────────────────────────────

def _bbox_iou(a: list[int], b: list[int]) -> float:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    xi1, yi1 = max(ax, bx), max(ay, by)
    xi2, yi2 = min(ax + aw, bx + bw), min(ay + ah, by + bh)
    inter = max(0, xi2 - xi1) * max(0, yi2 - yi1)
    area_a = aw * ah
    area_b = bw * bh
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0
