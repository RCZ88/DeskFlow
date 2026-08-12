import shutil, subprocess, sys, json, urllib.request

def run(cmd):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        return r.returncode, (r.stdout or r.stderr).strip().splitlines()[:2]
    except Exception as e:
        return -1, [str(e)]

rep = {"python": sys.version.split()[0]}

code, out = run(["ffmpeg", "-version"])
rep["ffmpeg"] = {"found": code == 0, "detail": out[0] if out else ""}

for name in ("faster_whisper", "stable_whisper"):
    try:
        __import__(name); rep[name] = {"installed": True}
    except ImportError:
        rep[name] = {"installed": False}

code, _ = run(["whisper", "--help"])
rep["whisper_cli"] = {"found": code == 0}

ollama = {"running": False, "models": []}
try:
    with urllib.request.urlopen("http://localhost:11434/api/tags", timeout=3) as r:
        d = json.loads(r.read())
        ollama = {"running": True, "models": [m.get("name") for m in d.get("models", [])]}
except Exception as e:
    ollama["error"] = str(e)
rep["ollama"] = ollama

code, out = run(["mmdc", "--version"])
if code != 0:
    code, out = run(["npx", "--yes", "@mermaid-js/mermaid-cli", "--version"])
rep["mermaid_cli"] = {"found": code == 0, "detail": out[0] if out else ""}

code, out = run(["node", "--version"])
rep["node"] = out[0] if out else ""

print(json.dumps(rep, indent=2))
