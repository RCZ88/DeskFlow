"""ffmpeg.py — FFmpeg composite + alpha export recipes (v2 §10.9)."""
import subprocess
import os
from typing import List, Optional

def composite_mp4(input_video: str, overlay_dir: str, output: str,
                  fps: int = 30, crf: int = 18) -> str:
    """Composite overlay PNGs over source video (v2 §10.9)."""
    cmd = [
        'ffmpeg', '-y',
        '-i', input_video,
        '-framerate', str(fps),
        '-i', os.path.join(overlay_dir, 'frame_%06d.png'),
        '-filter_complex', '[0:v][1:v]overlay=0:0:shortest=1',
        '-c:v', 'libx264', '-crf', str(crf),
        '-pix_fmt', 'yuv420p',
        '-color_primaries', 'bt709',
        '-color_trc', 'bt709',
        '-colorspace', 'bt709',
        '-map', '0:a?',
        '-c:a', 'copy',
        '-movflags', '+faststart',
        '-shortest',
        output,
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return output


def export_alpha_webm(png_dir: str, output: str, fps: int = 30) -> str:
    """Export transparent PNGs as VP9 alpha WebM."""
    cmd = [
        'ffmpeg', '-y',
        '-framerate', str(fps),
        '-i', os.path.join(png_dir, 'frame_%06d.png'),
        '-c:v', 'libvpx-vp9',
        '-pix_fmt', 'yuva420p',
        '-auto-alt-ref', '0',
        '-b:v', '2M',
        output,
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return output


def concat_videos(parts: List[str], output: str) -> str:
    """Concat multiple video parts into one."""
    list_file = output + '.concat.txt'
    with open(list_file, 'w') as f:
        for p in parts:
            f.write(f"file '{p}'\n")
    cmd = ['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', list_file, '-c', 'copy', output]
    subprocess.run(cmd, check=True, capture_output=True)
    os.remove(list_file)
    return output
