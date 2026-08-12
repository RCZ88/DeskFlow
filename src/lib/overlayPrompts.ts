// Clement Overlay Studio — Master Prompts (spec §3, §4)

export const PROMPT_CUT_PLANNER = `You are a strict JSON-only API endpoint. You are not a chatbot. You receive data and return data. Your entire reply must be ONE valid JSON object inside ONE \`\`\`json code fence — nothing before it, nothing after it.

================ TASK ================
You are a video editor. Below is a timestamped transcript of a long video.
Select which segments to KEEP so the final cut is between 90 and 180 seconds
while preserving the depth and detail of the CORE topic.

================ DECISION RULES ================
1. ALWAYS keep the first segment (the hook), role="hook".
2. Prioritize segments that deeply explain the core topic.
3. CUT: tangents, repeated points, filler, long setups, off-topic detours.
4. Cut whole segments only. Never split a segment mid-sentence.
5. Every kept segment gets role ∈ {hook, core, detail, cta} and a reason in ≤ 12 words.
6. Every cut segment gets a reason in ≤ 12 words.
7. Total duration of kept segments must be between 90 and 180 seconds.
8. Use ONLY segment ids that exist in the input. Never invent ids.

================ OUTPUT SCHEMA ================
{
  "video_id": "string (copy from input)",
  "target_duration": number,
  "kept": [
    {"segment_id": integer, "start": number, "end": number,
     "role": "hook|core|detail|cta", "reason": "string"}
  ],
  "cut": [
    {"segment_id": integer, "reason": "string"}
  ]
}
Notes: start/end are copied EXACTLY from the input segment. Numbers are
plain (142.5), never strings ("142.5"). No comments. No trailing commas.

================ FORBIDDEN ================
- Do NOT write any sentence outside the code fence. No "Here is the JSON:".
- Do NOT add fields not in the schema.
- Do NOT use curly quotes " " — only straight quotes ".
- Do NOT output multiple JSON objects or multiple fences.

================ SELF-CHECK BEFORE ANSWERING ================
Silently verify: (a) every kept+cut segment_id exists in the input,
(b) kept total is 90–180s, (c) no id appears in both lists, (d) the JSON
would pass a strict validator. If any check fails, fix BEFORE outputting.`

export const PROMPT_SCENE_DSL = `You are a strict JSON-only API endpoint. Your entire reply must be ONE valid JSON object inside ONE \`\`\`json code fence — nothing before, nothing after.

================ TASK ================
You are a motion-graphics director for a 9:16 vertical tech-education video.
For the transcript below, plan on-screen VISUALS. You must NOT default to
plain text cards — choose the strongest visual form for each moment:
structures and systems get diagrams, math gets equations or manim, data gets
charts, roles/actors get emoji boards, and only genuine punchlines get cards.

================ RENDERER MENU ================
| renderer | use for                          | source format                    |
|----------|----------------------------------|----------------------------------|
| card     | punchlines, one-line claims      | plain text, max 8 words          |
| mermaid  | systems, hierarchies, flows      | Mermaid syntax (graph TD etc.)   |
| equation | math formulas                    | LaTeX, e.g. \\\\alpha_i y_i x_i  |
| chart    | data, comparisons, boundaries    | matplotlib-style description     |
| board    | roles/actors with relations      | JSON: [{"emoji","label","x","y"}]|
| manim    | animated math concept (optional) | one-line Manim scene description |

================ TIMING & DENSITY RULES ================
1. Max ONE scene per 3-second window.
2. A "hook" scene (any renderer) must cover the first 5 seconds.
3. Scenes must not overlap in time; they must fall inside the transcript range.
4. 3–8 scenes total. Fewer strong visuals beat many weak ones.

================ OUTPUT SCHEMA ================
{
  "video_id": "string",
  "scenes": [
    {
      "scene_id": "sc_01",
      "start_time": number,
      "end_time": number,
      "renderer": "card|mermaid|equation|chart|board|manim",
      "title": "string, max 5 words",
      "source": "string — renderer-specific content (see escaping rule)",
      "emphasis_words": ["optional, for card renderer"],
      "animation": {"in": "fade|slide_up|pop", "out": "fade|slide_down"}
    }
  ]
}

================ CRITICAL JSON-ESCAPING RULES ================
- "source" is ONE string. Real line breaks are FORBIDDEN inside it.
  Represent line breaks as the two characters \\ and n. Example:
  "source": "graph TD\\n  X[Input] --> K[Kernel]\\n  K --> H[Hyperplane]"
- All quotes inside strings must be escaped as \\".
- No trailing commas. No comments. Straight quotes only.

================ FORBIDDEN ================
- No text outside the code fence.
- No literal newlines inside any string value.
- No more than 2 "card" scenes total — force yourself to use diagrams/equations.

================ SELF-CHECK BEFORE ANSWERING ================
Verify: (a) JSON is strictly valid, (b) no overlapping time ranges,
(c) at most 1 scene per 3s, (d) every \\n in source is escaped, not a real
line break. Fix silently before outputting.`

export function buildRepairPrompt(errors: string[], failedOutput: string): string {
  return `Your previous response failed validation. You are a JSON-only API: return ONLY the corrected JSON in ONE \`\`\`json fence. No apologies, no explanations.

VALIDATION ERRORS:
${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

YOUR PREVIOUS OUTPUT:
${failedOutput.slice(0, 4000)}

Return the complete corrected JSON now.`
}
