"""main.py — CLI for Clement Overlay Engine (v2 §10.1)."""
import argparse
import json
import sys
from pathlib import Path

def cmd_ingest(args):
    from clement.contracts.transcript import TranscriptInput
    data = json.loads(Path(args.input).read_text())
    transcript = TranscriptInput.from_v1_dict(data)
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(transcript.model_dump_json(indent=2))
    print(f'✓ Ingested {len(transcript.segments)} segments, {transcript.duration_us / 1e6:.1f}s')

def cmd_extract(args):
    from clement.contracts.transcript import TranscriptInput
    from clement.extraction.rules_v2 import extract_shots
    transcript = TranscriptInput.model_validate_json(Path(args.input).read_text())
    plan = extract_shots(transcript)
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(plan.model_dump_json(indent=2))
    kept = len(plan.kept_shots())
    total = len(plan.shots)
    print(f'✓ Extracted {kept}/{total} shots, {plan.kept_duration_us() / 1e6:.1f}s')

def cmd_plan(args):
    from clement.contracts.transcript import TranscriptInput
    from clement.contracts.shotplan import ShotPlan
    transcript = TranscriptInput.model_validate_json(Path(args.input).read_text())
    plan = ShotPlan.model_validate_json(Path(args.shots).read_text())
    print(f'✓ Plan: {len(plan.kept_shots())} kept shots, {plan.kept_duration_us() / 1e6:.1f}s')

def cmd_validate(args):
    from clement.contracts.shotplan import ShotPlan
    from clement.validators.qa import validate_scene
    plan = ShotPlan.model_validate_json(Path(args.input).read_text())
    print(f'✓ Plan validates: {len(plan.shots)} shots, in target: {plan.is_in_target_range()}')

def cmd_render(args):
    print(f'✓ Render: {args.input} → {args.output} (stub)')

def cmd_composite(args):
    print(f'✓ Composite: {args.input} → {args.output} (stub)')

def cmd_export(args):
    print(f'✓ Export: {args.input} → {args.output} (stub)')

def main():
    parser = argparse.ArgumentParser(description='Clement Overlay Engine v2')
    sub = parser.add_subparsers(dest='command')

    p_ingest = sub.add_parser('ingest', help='Normalize transcript to µs JSON')
    p_ingest.add_argument('--input', required=True)
    p_ingest.add_argument('--output', required=True)

    p_extract = sub.add_parser('extract', help='Rule-based shot extraction')
    p_extract.add_argument('--input', required=True)
    p_extract.add_argument('--output', required=True)

    p_plan = sub.add_parser('plan', help='Plan shots from transcript + shot plan')
    p_plan.add_argument('--input', required=True)
    p_plan.add_argument('--shots', required=True)
    p_plan.add_argument('--output', required=True)

    p_validate = sub.add_parser('validate', help='Validate a shot plan')
    p_validate.add_argument('--input', required=True)

    p_render = sub.add_parser('render', help='Render scenes to PNG/sequence')
    p_render.add_argument('--input', required=True)
    p_render.add_argument('--output', required=True)

    p_composite = sub.add_parser('composite', help='Composite overlays onto video')
    p_composite.add_argument('--input', required=True)
    p_composite.add_argument('--output', required=True)

    p_export = sub.add_parser('export', help='Export final package')
    p_export.add_argument('--input', required=True)
    p_export.add_argument('--output', required=True)

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)

    {'ingest': cmd_ingest, 'extract': cmd_extract, 'plan': cmd_plan,
     'validate': cmd_validate, 'render': cmd_render, 'composite': cmd_composite,
     'export': cmd_export}[args.command](args)

if __name__ == '__main__':
    main()
