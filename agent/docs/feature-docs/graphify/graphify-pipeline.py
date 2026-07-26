"""
Graphify Pipeline for Windows
Runs the full knowledge graph extraction pipeline
"""

import sys
import json
from pathlib import Path
from datetime import datetime

# Step 1: Detect files
print("=" * 50)
print("Step 1: Detecting files...")
from graphify.detect import detect

result = detect(Path("."))
print(f"  Found: {result['total_files']} files, {result['total_words']} words")
print(f"  Code: {len(result['files']['code'])} files")
print(f"  Docs: {len(result['files']['document'])} files")

# Step 2: Extract from code files
print("\n" + "=" * 50)
print("Step 2: Extracting code structure...")
from graphify.extract import extract

code_files = []
for f in result["files"]["code"]:
    p = Path(f)
    if p.is_file():
        code_files.append(p)

# Limit to avoid timeout on first run
if len(code_files) > 30:
    code_files = code_files[:30]
    print(f"  Limited to first 30 code files (for speed)")

extracted = extract(code_files)
print(f"  Extracted: {len(extracted['nodes'])} nodes, {len(extracted['edges'])} edges")

# Step 3: Build graph
print("\n" + "=" * 50)
print("Step 3: Building graph...")
from graphify.build import build_from_json

G = build_from_json(
    {"nodes": extracted["nodes"], "edges": extracted["edges"], "hyperedges": []}
)
print(f"  Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

# Step 4: Cluster
print("\n" + "=" * 50)
print("Step 4: Detecting communities...")
from graphify.cluster import cluster, score_all

communities = cluster(G)
cohesion = score_all(G, communities)
print(f"  Communities: {len(communities)}")

# Step 5: Analyze
print("\n" + "=" * 50)
print("Step 5: Analyzing graph...")
from graphify.analyze import god_nodes, surprising_connections

gods = god_nodes(G)
surprises = surprising_connections(G, communities)
print(f"  God nodes: {len(gods)}")
print(f"  Surprising connections: {len(surprises)}")

# Step 6: Generate outputs
print("\n" + "=" * 50)
print("Step 6: Generating outputs...")
from graphify.export import to_json, to_html
from graphify.report import generate

# Save graph.json
Path("graphify-out").mkdir(exist_ok=True)
to_json(G, communities, "graphify-out/graph.json")
print("  Saved: graph.json")

# Generate report
detection = result
tokens = {
    "input": extracted.get("input_tokens", 0),
    "output": extracted.get("output_tokens", 0),
}
labels = {cid: f"Community {cid}" for cid in communities}

report = generate(
    G, communities, cohesion, labels, gods, surprises, detection, tokens, "."
)
Path("graphify-out/GRAPH_REPORT.md").write_text(report, encoding="utf-8")
print("Saved: GRAPH_REPORT.md")

# Save analysis
analysis = {
    "communities": {str(k): v for k, v in communities.items()},
    "cohesion": {str(k): v for k, v in cohesion.items()},
    "gods": gods,
    "surprises": surprises,
}
Path("graphify-out/analysis.json").write_text(json.dumps(analysis, indent=2))

# Generate HTML (if graph is small enough)
if G.number_of_nodes() < 5000:
    to_html(G, communities, "graphify-out/graph.html", community_labels=labels)
    print("  Saved: graph.html")
else:
    print(f"  Skipped: graph.html (too large: {G.number_of_nodes()} nodes)")

# Step 7: Summary
print("\n" + "=" * 50)
print("DONE!")
print(f"Graph built successfully:")
print(f"  - {G.number_of_nodes()} nodes")
print(f"  - {G.number_of_edges()} edges")
print(f"  - {len(communities)} communities")
print(f"  - {len(gods)} god nodes")
print("\nOutputs in graphify-out/:")
print("  - graph.json (raw graph data)")
print("  - GRAPH_REPORT.md (analysis)")
print("  - graph.html (visualization)")
