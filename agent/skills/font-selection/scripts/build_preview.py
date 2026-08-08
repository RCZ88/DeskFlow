#!/usr/bin/env python3
"""
Build a single HTML file that renders 2-4 candidate font pairings side by side,
using the PROJECT'S OWN copy and colors -- not lorem ipsum, not generic swatches.

This closes the gap the model can't close by itself: it can name fonts, but it
can't feel whether one looks right next to this exact headline, this exact
button, this exact accent color. Rendering it and looking at it (or handing it
to the user to look at) is the only way to actually know.

Usage:
    python3 build_preview.py --config candidates.json --out preview.html

candidates.json shape:
{
  "headline": "Ship agents that actually finish the task",
  "subhead": "DeskFlow gives every CLI agent a real terminal, a real filesystem, and a real memory.",
  "body": "Longer paragraph of real body copy from the project...",
  "button_label": "Get started",
  "bg_color": "#0B0D10",
  "text_color": "#F4F4F5",
  "accent_color": "#7C9BFF",
  "dark": true,
  "candidates": [
    {
      "id": "technical-precision",
      "heading_font": "Space Grotesk",
      "heading_weight": 600,
      "body_font": "IBM Plex Sans",
      "body_weight": 400,
      "mono_font": "JetBrains Mono"
    },
    { "...": "..." }
  ]
}

Only heading_font, body_font are required per candidate. id / mono_font / weights
are optional. Pull the candidate list from references/font-library.md -- don't
invent pairings here.
"""
import argparse
import json
import urllib.parse


def google_fonts_link(fonts):
    """fonts: list of (family, weights) tuples -> single CSS2 <link> href."""
    parts = []
    seen = set()
    for family, weights in fonts:
        if not family or family in seen:
            continue
        seen.add(family)
        fam = urllib.parse.quote(family)
        w = ";".join(str(x) for x in sorted(set(weights))) if weights else "400;700"
        parts.append(f"family={fam}:wght@{w}")
    return "https://fonts.googleapis.com/css2?" + "&".join(parts) + "&display=swap"


def card_html(cfg, cand, index):
    heading_font = cand["heading_font"]
    body_font = cand["body_font"]
    mono_font = cand.get("mono_font")
    heading_weight = cand.get("heading_weight", 600)
    body_weight = cand.get("body_weight", 400)
    cand_id = cand.get("id", f"candidate-{index}")

    mono_line = ""
    if mono_font:
        mono_line = (
            f'<div class="mono-sample" style="font-family:\'{mono_font}\', monospace;">'
            f"{cand_id} · aA bB 0123 -&gt; ::</div>"
        )

    return f"""
    <section class="card">
      <header class="card-label">
        <span class="dot"></span>
        <code>{cand_id}</code>
        <span class="recipe">{heading_font} {heading_weight} / {body_font} {body_weight}{' / ' + mono_font if mono_font else ''}</span>
      </header>
      <div class="hero">
        <h1 style="font-family:'{heading_font}', sans-serif; font-weight:{heading_weight};">
          {cfg['headline']}
        </h1>
        <p class="subhead" style="font-family:'{body_font}', sans-serif; font-weight:{body_weight};">
          {cfg.get('subhead', '')}
        </p>
        <button class="cta" style="font-family:'{heading_font}', sans-serif; font-weight:{max(heading_weight, 500)};">
          {cfg.get('button_label', 'Continue')}
        </button>
        <p class="body-copy" style="font-family:'{body_font}', sans-serif; font-weight:{body_weight};">
          {cfg.get('body', '')}
        </p>
        {mono_line}
      </div>
    </section>
    """


def build(cfg):
    all_fonts = []
    for c in cfg["candidates"]:
        all_fonts.append((c["heading_font"], [c.get("heading_weight", 600), 700]))
        all_fonts.append((c["body_font"], [c.get("body_weight", 400), 500]))
        if c.get("mono_font"):
            all_fonts.append((c["mono_font"], [400, 500]))

    font_link = google_fonts_link(all_fonts)
    bg = cfg.get("bg_color", "#0B0D10" if cfg.get("dark") else "#FAFAFA")
    fg = cfg.get("text_color", "#F4F4F5" if cfg.get("dark") else "#111111")
    accent = cfg.get("accent_color", "#7C9BFF")

    cards = "\n".join(
        card_html(cfg, c, i) for i, c in enumerate(cfg["candidates"])
    )

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Font candidates</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{font_link}" rel="stylesheet">
<style>
  :root {{
    --bg: {bg};
    --fg: {fg};
    --accent: {accent};
  }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0;
    background: #16181c;
    padding: 32px;
    font-family: system-ui, sans-serif;
  }}
  .grid {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    gap: 24px;
    max-width: 1400px;
    margin: 0 auto;
  }}
  .card {{
    background: var(--bg);
    color: var(--fg);
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(127,127,127,0.25);
  }}
  .card-label {{
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: rgba(127,127,127,0.08);
    font-size: 12px;
    color: rgba(127,127,127,0.9);
    border-bottom: 1px solid rgba(127,127,127,0.2);
  }}
  .card-label .dot {{
    width: 8px; height: 8px; border-radius: 50%; background: var(--accent);
  }}
  .card-label code {{ color: inherit; }}
  .recipe {{ margin-left: auto; opacity: 0.7; }}
  .hero {{ padding: 32px; }}
  .hero h1 {{ font-size: 32px; line-height: 1.15; margin: 0 0 12px; }}
  .subhead {{ font-size: 16px; line-height: 1.5; opacity: 0.85; margin: 0 0 20px; }}
  .cta {{
    display: inline-block;
    padding: 10px 20px;
    border-radius: 8px;
    border: none;
    background: var(--accent);
    color: #0B0D10;
    font-size: 14px;
    margin-bottom: 24px;
    cursor: pointer;
  }}
  .body-copy {{ font-size: 15px; line-height: 1.6; opacity: 0.8; margin: 0 0 16px; }}
  .mono-sample {{
    font-size: 13px;
    padding: 8px 10px;
    background: rgba(127,127,127,0.1);
    border-radius: 6px;
    opacity: 0.85;
  }}
  h2.title {{ color: #eee; font-family: system-ui, sans-serif; max-width: 1400px; margin: 0 auto 24px; }}
</style>
</head>
<body>
  <h2 class="title">Font candidates -- pick the one that fits</h2>
  <div class="grid">
    {cards}
  </div>
</body>
</html>
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", required=True, help="Path to candidates JSON")
    ap.add_argument("--out", default="preview.html", help="Output HTML path")
    args = ap.parse_args()

    with open(args.config) as f:
        cfg = json.load(f)

    if not cfg.get("candidates"):
        raise SystemExit("config must include a non-empty 'candidates' list")
    if len(cfg["candidates"]) > 4:
        raise SystemExit("keep it to <=4 candidates -- more than that isn't a real choice, it's a wall")

    html = build(cfg)
    with open(args.out, "w") as f:
        f.write(html)
    print(f"wrote {args.out} ({len(cfg['candidates'])} candidates)")


if __name__ == "__main__":
    main()
