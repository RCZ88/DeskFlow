"""M1 OCR pass using pytesseract.

Returns list of OcrSpan dicts with text, bbox (x, y, w, h), and confidence.
"""

from PIL import Image

try:
    import pytesseract
    HAS_TESSERACT = True
except (ImportError, Exception):
    HAS_TESSERACT = False


def run_ocr(img: Image.Image) -> list[dict]:
    """Run Tesseract OCR and return structured spans.

    Returns list of {text, bbox: [x, y, w, h], confidence}.
    """
    if not HAS_TESSERACT:
        return _fallback_no_tesseract()

    try:
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
    except Exception:
        return _fallback_no_tesseract()

    spans = []
    n = len(data.get("text", []))

    for i in range(n):
        text = data.get("text", [""])[i].strip()
        conf_str = data.get("conf", ["-1"])[i]
        try:
            conf = float(conf_str)
        except (ValueError, TypeError):
            conf = 0.0

        if not text or conf < 10:
            continue

        x = data.get("left", [0])[i]
        y = data.get("top", [0])[i]
        w = data.get("width", [0])[i]
        h = data.get("height", [0])[i]

        if w < 2 or h < 2:
            continue

        spans.append({
            "text": text,
            "bbox": [int(x), int(y), int(w), int(h)],
            "confidence": round(conf / 100.0, 4),
        })

    return spans


def _fallback_no_tesseract() -> list[dict]:
    """Return empty OCR with a placeholder span if Tesseract isn't available."""
    return [
        {
            "text": "[Tesseract not installed — install tesseract-ocr and pytesseract]",
            "bbox": [0, 0, 0, 0],
            "confidence": 0.0,
        }
    ]
