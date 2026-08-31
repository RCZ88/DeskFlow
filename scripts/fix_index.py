import re

path = "src/index.css"
with open(path, "r", encoding="utf-8") as f:
    lines = f.read().split("\n")

# 1) Strip "Geist" from the body font-family line (index 3)
lines[3] = lines[3].replace(', "Geist",', '')

# 2) Delete the .light block (lines 169..447 -> index 168..446 inclusive)
start = end = None
for i, ln in enumerate(lines):
    if ln.startswith(".light{"):
        start = i
    if start is not None and "app-background" in ln and "canvas" in ln:
        end = i
        break
print(f".light block: start line {start+1}, end line {end+1}")
if start is not None and end is not None:
    del lines[start:end+1]

# 3) Delete obsolete data-page keys (productivity, stats, browser, tutorial)
new_lines = []
obsolete = {"productivity", "stats", "browser", "tutorial"}
for ln in lines:
    if "[data-page=" in ln:
        route = re.search(r'data-page="([^"]+)"', ln)
        if route and route.group(1) in obsolete:
            continue
    new_lines.append(ln)
lines = new_lines

with open(path, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
print("Done. Lines:", len(lines))
