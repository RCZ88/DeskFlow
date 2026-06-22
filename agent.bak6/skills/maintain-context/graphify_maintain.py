import sys
import json
from pathlib import Path


def rebuild_code_fix(watch_path_str: str) -> bool:
    try:
        from graphify.extract import extract
        from graphify.detect import detect
        from graphify.build import build_from_json
        from graphify.cluster import cluster, score_all
        from graphify.analyze import (
            god_nodes,
            surprising_connections,
            suggest_questions,
        )
        from graphify.report import generate
        from graphify.export import to_json

        watch_path = Path(watch_path_str)
        detected = detect(watch_path, follow_symlinks=False)
        code_files = [Path(f) for f in detected["files"]["code"]]

        if not code_files:
            print("[graphify watch] No code files found - nothing to rebuild.")
            return False

        result = extract(code_files)

        detection = {
            "files": {
                "code": [str(f) for f in code_files],
                "document": [],
                "paper": [],
                "image": [],
            },
            "total_files": len(code_files),
            "total_words": detected.get("total_words", 0),
        }

        G = build_from_json(result)
        if G.number_of_nodes() == 0:
            print("[graphify watch] Graph empty after extraction - nothing to rebuild.")
            return False

        communities = cluster(G)
        cohesion = score_all(G, communities)
        gods = god_nodes(G)
        surprises = surprising_connections(G, communities)

        # Load labels if saved previously, otherwise generate defaults
        labels_path = watch_path / "graphify-out" / ".graphify_labels.json"
        if labels_path.exists():
            labels = {
                int(k): v
                for k, v in json.loads(labels_path.read_text(encoding="utf-8")).items()
            }
        else:
            labels = {cid: "Community " + str(cid) for cid in communities}

        questions = suggest_questions(G, communities, labels)

        out = watch_path / "graphify-out"
        out.mkdir(exist_ok=True)

        report = generate(
            G,
            communities,
            cohesion,
            labels,
            gods,
            surprises,
            detection,
            {"input": 0, "output": 0},
            str(watch_path),
            suggested_questions=questions,
        )
        # Fix: use encoding='utf-8' to handle Unicode arrows on Windows
        (out / "GRAPH_REPORT.md").write_text(report, encoding="utf-8")
        to_json(G, communities, str(out / "graph.json"))

        # Save analysis for future regeneration
        analysis = {
            "communities": {str(k): v for k, v in communities.items()},
            "cohesion": {str(k): v for k, v in cohesion.items()},
            "gods": gods,
            "surprises": surprises,
        }
        (out / "analysis.json").write_text(
            json.dumps(analysis, indent=2), encoding="utf-8"
        )
        # Save labels for future use
        (out / ".graphify_labels.json").write_text(
            json.dumps({str(k): v for k, v in labels.items()}), encoding="utf-8"
        )

        # Save manifest for incremental updates
        from graphify.detect import save_manifest

        save_manifest(detection["files"])

        # Clear stale needs_update flag if present
        flag = out / "needs_update"
        if flag.exists():
            flag.unlink()

        print(
            f"[graphify watch] Rebuilt: {G.number_of_nodes()} nodes, "
            f"{G.number_of_edges()} edges, {len(communities)} communities"
        )
        print(f"[graphify watch] graph.json and GRAPH_REPORT.md updated in {out}")
        return True

    except Exception as exc:
        print(f"[graphify watch] Rebuild failed: {exc}")
        return False


def validate_report(watch_path_str: str) -> bool:
    """Check GRAPH_REPORT.md exists and has content. Regenerate if broken."""
    watch_path = Path(watch_path_str)
    report_path = watch_path / "graphify-out" / "GRAPH_REPORT.md"

    if (
        report_path.exists()
        and len(report_path.read_text(encoding="utf-8").strip()) >= 50
    ):
        lines = report_path.read_text(encoding="utf-8").strip().split("\n")
        print(f"[graphify] GRAPH_REPORT.md OK: {len(lines)} lines")
        return True

    print(
        "[graphify] GRAPH_REPORT.md missing or empty - regenerating from existing data..."
    )

    graph_path = watch_path / "graphify-out" / "graph.json"
    analysis_path = watch_path / "graphify-out" / "analysis.json"
    labels_path = watch_path / "graphify-out" / ".graphify_labels.json"

    if not graph_path.exists():
        print(
            "[graphify] ERROR: graph.json not found. Run full graphify pipeline first."
        )
        return False

    try:
        from graphify.report import generate
        from graphify.analyze import suggest_questions
        import networkx as nx
        from networkx.readwrite import json_graph as nx_json_graph

        data = json.loads(graph_path.read_text(encoding="utf-8"))
        G = nx_json_graph.node_link_graph(data, edges="links")

        communities = {}
        cohesion = {}
        gods = []
        surprises = []

        if analysis_path.exists():
            analysis = json.loads(analysis_path.read_text(encoding="utf-8"))
            communities = {int(k): v for k, v in analysis["communities"].items()}
            cohesion = {int(k): v for k, v in analysis["cohesion"].items()}
            gods = analysis.get("gods", [])
            surprises = analysis.get("surprises", [])

        if labels_path.exists():
            labels = {
                int(k): v
                for k, v in json.loads(labels_path.read_text(encoding="utf-8")).items()
            }
        else:
            labels = {cid: "Community " + str(cid) for cid in communities}

        detection = {
            "files": {"code": [], "document": [], "paper": [], "image": []},
            "total_files": 0,
            "total_words": 0,
        }
        tokens = {"input": 0, "output": 0}

        questions = suggest_questions(G, communities, labels)
        report = generate(
            G,
            communities,
            cohesion,
            labels,
            gods,
            surprises,
            detection,
            tokens,
            str(watch_path),
            suggested_questions=questions,
        )
        report_path.write_text(report, encoding="utf-8")

        lines = report_path.read_text(encoding="utf-8").strip().split("\n")
        print(
            f"[graphify] GRAPH_REPORT.md regenerated: {len(lines)} lines, {len(report)} chars"
        )
        return True

    except Exception as exc:
        print(f"[graphify] ERROR regenerating report: {exc}")
        return False


def ensure_para_structure(vault_root: Path) -> None:
    """Create PARA directory structure in vault if it doesn't exist."""
    para_dirs = [
        "00_Projects",
        "01_Areas/AI-Agents/Skills",
        "01_Areas/AI-Agents/Patterns",
        "02_Resources/Prompts",
        "02_Resources/Templates",
        "03_Archives",
    ]
    for dir_path in para_dirs:
        (vault_root / dir_path).mkdir(parents=True, exist_ok=True)


def parse_problems(problems_md: str) -> list[dict]:
    """Parse PROBLEMS.md into individual problem dicts (simple parser)."""
    problems = []
    current = {}
    for line in problems_md.split("\n"):
        if line.startswith("### "):
            if current:
                problems.append(current)
            title = line.replace("### ", "").strip()
            current = {"id": title.split(":")[0].strip(), "title": title, "lines": []}
        elif current:
            current["lines"].append(line)
    if current:
        problems.append(current)
    return problems


def sync_to_para(project_root: str, vault_root: str) -> bool:
    """Sync project files to PARA-organized Obsidian vault."""
    project_path = Path(project_root)
    vault_path = Path(vault_root)

    print(f"\n[para] Syncing {project_path.name} to PARA vault: {vault_path}")

    ensure_para_structure(vault_path)

    project_para = vault_path / "00_Projects" / project_path.name
    project_para.mkdir(parents=True, exist_ok=True)

    # Sync graphify output
    graph_src = project_path / "graphify-out"
    graph_dst = project_para / "Graph"
    if graph_src.exists():
        graph_dst.mkdir(exist_ok=True)
        import shutil
        for fname in ["GRAPH_REPORT.md", "graph.json", "analysis.json", "graph.html", "manifest.json"]:
            src_file = graph_src / fname
            if src_file.exists():
                shutil.copy2(src_file, graph_dst / fname)
        print(f"[para] Synced graphify output to {graph_dst}")

    # Sync skills to Areas
    skills_src = project_path / "agent" / "skills"
    skills_dst = vault_path / "01_Areas" / "AI-Agents" / "Skills" / project_path.name
    if skills_src.exists():
        skills_dst.mkdir(parents=True, exist_ok=True)
        for skill_dir in skills_src.iterdir():
            if skill_dir.is_dir() and (skill_dir / "SKILL.md").exists():
                skill_dst = skills_dst / skill_dir.name
                skill_dst.mkdir(exist_ok=True)
                import shutil
                shutil.copy2(skill_dir / "SKILL.md", skill_dst / "SKILL.md")
        print(f"[para] Synced skills to {skills_dst}")

    print("[para] PARA sync complete")
    return True


def sync_to_vault(watch_path_str: str, vault_path_str: str) -> bool:
    """Sync graphify-out/ to Obsidian vault."""
    src = Path(watch_path_str) / "graphify-out"
    dst = Path(vault_path_str)

    if not src.exists():
        print(f"[graphify] ERROR: {src} does not exist")
        return False

    dst.mkdir(exist_ok=True)

    files_to_sync = [
        "GRAPH_REPORT.md",
        "graph.json",
        "analysis.json",
        "graph.html",
        "manifest.json",
    ]
    synced = []

    for fname in files_to_sync:
        src_file = src / fname
        if src_file.exists():
            import shutil

            shutil.copy2(src_file, dst / fname)
            synced.append(fname)

    print(f"[graphify] Synced {len(synced)} files to vault: {', '.join(synced)}")
    return True


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"

    if cmd == "rebuild":
        rebuild_code_fix(".")
    elif cmd == "validate":
        validate_report(".")
    elif cmd == "sync":
        vault = (
            sys.argv[2]
            if len(sys.argv) > 2
            else None
        )
        if not vault:
            vault = input("Enter your Obsidian vault sync path (e.g., C:/Users/USER/Documents/CZVault/00_Projects/MyProject/Graph): ").strip()
            if not vault:
                print("ERROR: Vault path is required for sync.")
                sys.exit(1)
        sync_to_vault(".", vault)
    elif cmd == "full":
        vault = (
            sys.argv[2]
            if len(sys.argv) > 2
            else None
        )
        if not vault:
            vault = input("Enter your Obsidian vault path (e.g., C:/Users/USER/Documents/CZVault): ").strip()
            if not vault:
                print("ERROR: Vault path is required for full pipeline.")
                sys.exit(1)
        # rebuild + validate + sync + para
        ok = rebuild_code_fix(".")
        ok2 = validate_report(".")
        if ok and ok2:
            sync_to_vault(".", vault + "/00_Projects/AppTracker/Graph")
            sync_to_para(".", vault)
    elif cmd == "para":
        vault = (
            sys.argv[2]
            if len(sys.argv) > 2
            else None
        )
        if not vault:
            vault = input("Enter your Obsidian vault path (e.g., C:/Users/USER/Documents/CZVault): ").strip()
            if not vault:
                print("ERROR: Vault path is required for PARA sync.")
                sys.exit(1)
        sync_to_para(".", vault)
    elif cmd == "help":
        print("Usage: python graphify_maintain.py <command> [vault_path]")
        print()
        print("Commands:")
        print("  rebuild              Rebuild graph from source code (no vault needed)")
        print("  validate             Validate GRAPH_REPORT.md (no vault needed)")
        print("  sync <vault_path>    Sync graph files to vault path")
        print("  full <vault_path>    Rebuild + validate + sync + PARA sync")
        print("  para <vault_path>    Sync project files to PARA vault structure")
        print()
        print("If vault_path is omitted, you will be prompted interactively.")
