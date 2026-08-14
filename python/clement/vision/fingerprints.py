"""fingerprints.py — Frame signature computation for shot detection."""
import math
from typing import List
from .contracts import FrameSignature

def compute_frame_signature(
    frame_id: str,
    timestamp_sec: float,
    pixels: bytes,
    width: int,
    height: int,
) -> FrameSignature:
    """Compute a signature from raw pixel data (RGB bytes)."""
    # Average brightness
    total = 0.0
    r_sum = g_sum = b_sum = 0.0
    r_sq = g_sq = b_sq = 0.0
    n = width * height

    for i in range(0, len(pixels), 3):
        if i + 2 >= len(pixels):
            break
        r, g, b = pixels[i], pixels[i + 1], pixels[i + 2]
        total += (r + g + b) / 3.0
        r_sum += r; g_sum += g; b_sum += b
        r_sq += r * r; g_sq += g * g; b_sq += b * b

    avg_brightness = total / max(n, 1)
    mean_r = r_sum / max(n, 1)
    mean_g = g_sum / max(n, 1)
    mean_b = b_sum / max(n, 1)
    std_r = math.sqrt(r_sq / max(n, 1) - mean_r * mean_r) if n > 1 else 0
    std_g = math.sqrt(g_sq / max(n, 1) - mean_g * mean_g) if n > 1 else 0
    std_b = math.sqrt(b_sq / max(n, 1) - mean_b * mean_b) if n > 1 else 0

    # RGB histogram (32 bins)
    histogram = [0.0] * 32
    for i in range(0, len(pixels), 3):
        if i + 2 >= len(pixels):
            break
        r, g, b = pixels[i], pixels[i + 1], pixels[i + 2]
        brightness = int((r + g + b) / 3)
        bin_idx = min(brightness * 32 // 256, 31)
        histogram[bin_idx] += 1
    # Normalize
    total_px = max(n, 1)
    histogram = [h / total_px for h in histogram]

    # Simple edge density (horizontal gradient magnitude)
    edge_count = 0
    for y in range(1, min(height, n // 3)):
        for x in range(1, width):
            idx = (y * width + x) * 3
            if idx + 5 < len(pixels):
                dx = abs(pixels[idx] - pixels[idx - 3])
                dy = abs(pixels[idx] - pixels[idx - width * 3])
                if dx > 20 or dy > 20:
                    edge_count += 1
    edge_density = edge_count / max(n, 1)

    return FrameSignature(
        frame_id=frame_id,
        timestamp_sec=timestamp_sec,
        avg_brightness=avg_brightness,
        rgb_histogram=histogram,
        color_moments={'mean_r': mean_r, 'mean_g': mean_g, 'mean_b': mean_b,
                       'std_r': std_r, 'std_g': std_g, 'std_b': std_b},
        edge_density=edge_density,
    )


def compute_delta(sig1: FrameSignature, sig2: FrameSignature) -> float:
    """Compute visual delta between two frame signatures."""
    # Brightness delta
    bright_delta = abs(sig1.avg_brightness - sig2.avg_brightness) / 255.0

    # Histogram intersection distance
    hist_dist = sum(abs(a - b) for a, b in zip(sig1.rgb_histogram, sig2.rgb_histogram)) / len(sig1.rgb_histogram)

    # Color moment distance
    color_dist = 0.0
    for key in ['mean_r', 'mean_g', 'mean_b']:
        color_dist += abs(sig1.color_moments.get(key, 0) - sig2.color_moments.get(key, 0)) / 255.0
    color_dist /= 3.0

    # Edge density delta
    edge_delta = abs(sig1.edge_density - sig2.edge_density)

    # Weighted combination
    return 0.3 * bright_delta + 0.3 * hist_dist + 0.2 * color_dist + 0.2 * edge_delta
