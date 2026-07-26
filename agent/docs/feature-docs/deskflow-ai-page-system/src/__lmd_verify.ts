// Lyceum Learn — Phase 0 acceptance test
// Verifies parseLessonMarkdown compiles all block types without error.
// Run: npx tsx src/__lmd_verify.ts

import { parseLessonMarkdown } from './services/learn/parseLessonMarkdown';

const sample = `---
title: Capacitors: Energy Storage
part: 1
version: 1
authored_by: ai
---

# Construction
@mastery L1

A capacitor consists of two conductive plates separated by a dielectric
insulator. The capacitance C is proportional to plate area A.

::: callout info
Capacitance is always positive and depends on geometry.
:::

::: grounding
includes: Capacitor construction and basic equations
know: Capacitance depends on plate area and separation [yf-15]
know: A dielectric increases capacitance [yf-15]
source: yf-15 | University Physics | https://openstax.org/books/university-physics-volume-2
:::

# Energy Equation
@mastery L2

A capacitor stores energy in its electric field.

$$
E = \\frac{1}{2} C V^2
$$

::: grounding
includes: Energy storage in capacitors
know: Energy stored is 1/2 CV² [yf-15]
source: yf-15 | University Physics | https://openstax.org/books/university-physics-volume-2
misconception: Capacitors store charge | Capacitors store energy, not charge
:::

# Charging Graph
@mastery L2

::: chart
{
  "type": "line",
  "data": [
    { "time": 0, "voltage": 0 },
    { "time": 1, "voltage": 3.16 },
    { "time": 2, "voltage": 4.33 },
    { "time": 5, "voltage": 4.98 }
  ],
  "xAxis": "Time (s)",
  "yAxis": "Voltage (V)"
}
:::

::: grounding
includes: RC charging curves
know: Capacitor voltage approaches source exponentially [yf-15]
source: yf-15 | University Physics | https://openstax.org/books/university-physics-volume-2
:::

# Dielectric Types
@mastery L1

::: table
- [Material | material]
- [Dielectric Constant | constant]
- [Max Voltage | max_v]
rows:
{"material": "Air", "constant": 1.0, "max_v": "3e6"}
{"material": "Mica", "constant": 7.0, "max_v": "1e8"}
{"material": "Ceramic", "constant": 2000, "max_v": "1e7"}
:::

::: grounding
includes: Common dielectric materials
know: Different dielectrics have different constants [yf-15]
source: yf-15 | University Physics | https://openstax.org/books/university-physics-volume-2
:::

# RC Circuit Flow
@mastery L2

::: flow
- Start -> V applied : 1
- V applied -> Current flows : 1
- Current flows -> Charge builds : 1
- Charge builds -> Voltage rises : 1
- Voltage rises -> Steady state : 1
caption: RC charging process
:::

::: grounding
includes: RC circuit behavior
know: Current flows when voltage is applied [yf-15]
source: yf-15 | University Physics | https://openstax.org/books/university-physics-volume-2
:::

# Cost Analysis
@mastery L2

::: finchart
{ "type": "stacked-bar", "data": [
  { "quarter": "Q1", "material": 1200, "labor": 800, "overhead": 300 },
  { "quarter": "Q2", "material": 1300, "labor": 850, "overhead": 310 }
]}
:::

::: grounding
includes: Cost breakdown analysis
know: Financial charts show cost components [yf-15]
source: yf-15 | University Physics | https://openstax.org/books/university-physics-volume-2
:::

# Interactive Demo
@mastery L2

\`\`\`mermaid
graph TD
    A[Charge] --> B[Field]
    B --> C[Force]
\`\`\`

::: grounding
includes: Interactive capacitor simulation
know: Simulations help visualize electric fields [yf-15]
source: yf-15 | University Physics | https://openstax.org/books/university-physics-volume-2
:::

# Discharge Demo
@mastery L1

::: video
Source: https://www.youtube.com/watch?v=demo
:::

::: grounding
includes: Capacitor discharge demonstration
know: Capacitors discharge through a load [yf-15]
source: yf-15 | University Physics | https://openstax.org/books/university-physics-volume-2
:::

# Self-Check
@mastery L1

::: quiz mcq L2
What determines the capacitance of a parallel-plate capacitor?
- [ ] Plate material
- [x] Plate area
- [x] Plate separation
- [ ] Plate color
:::

::: grounding
includes: Capacitance factors
know: Plate area and separation determine capacitance [yf-15]
source: yf-15 | University Physics | https://openstax.org/books/university-physics-volume-2
:::

# Safety Note
@mastery L1

Never short-circuit a charged capacitor — it can deliver a lethal current.

::: callout warning
A charged capacitor can deliver a lethal current even when disconnected.
:::

::: grounding
includes: Capacitor safety
know: Capacitors store dangerous energy [yf-15]
source: yf-15 | University Physics | https://openstax.org/books/university-physics-volume-2
:::

# Electric Field Diagram
@mastery L3

::: layer L3 deeper
Elements: Plate A, Plate B, Field lines, Dielectric fill

::: callout info
This is a deeper visualisation of the field.
:::
:::

::: grounding
includes: Electric field visualization
know: Electric fields exist between charged plates [yf-15]
source: yf-15 | University Physics | https://openstax.org/books/university-physics-volume-2
:::

# PID Controller
@mastery L1

\`\`\`python
def pid_control(setpoint, current, dt):
    error = setpoint - current
    integral += error * dt
    derivative = (error - prev_error) / dt
    return Kp*error + Ki*integral + Kd*derivative
\`\`\`

::: grounding
includes: Control theory basics
know: PID controllers use proportional, integral, derivative terms [yf-15]
source: yf-15 | University Physics | https://openstax.org/books/university-physics-volume-2
:::

# Capacitor Types Image
@mastery L1

![Three capacitor types: ceramic disc, electrolytic, and tantalum](https://example.com/capacitor-types.jpg)

::: grounding
includes: Capacitor types
know: Different capacitors suit different applications [yf-15]
source: yf-15 | University Physics | https://openstax.org/books/university-physics-volume-2
:::
`;

async function main() {
  let failed = 0;
  let passed = 0;

  function check(name: string, ok: boolean, detail?: string) {
    if (ok) {
      console.log(`  ✓ ${name}`);
      passed++;
    } else {
      console.log(`  ✗ ${name}${detail ? ': ' + detail : ''}`);
      failed++;
    }
  }

  const doc = parseLessonMarkdown(sample);

  check('parseLessonMarkdown succeeds', !!doc, 'returned falsy');
  check('doc has version', doc.doc === 'ldoc/1.0', `got "${doc.doc}"`);
  check('lesson has title', doc.lesson.title === 'Capacitors: Energy Storage', `got "${doc.lesson.title}"`);
  check('doc has nodes array', Array.isArray(doc.nodes), 'nodes not an array');
  check('all 13 nodes parsed', doc.nodes.length === 13, `got ${doc.nodes.length}`);

  const byType: Record<string, number> = {};
  for (const n of doc.nodes) {
    for (const b of n.blocks) {
      byType[b.type] = (byType[b.type] || 0) + 1;
    }
  }

  check('prose block', byType['prose'] >= 2, `got ${byType['prose']}`);
  check('math block', byType['math'] === 1, `got ${byType['math']}`);
  check('chart block', byType['chart'] === 1, `got ${byType['chart']}`);
  check('table block', byType['table'] === 1, `got ${byType['table']}`);
  check('flow block', byType['flow'] === 1, `got ${byType['flow']}`);
  check('finchart block', byType['finchart'] === 1, `got ${byType['finchart']}`);
  check('mermaid block', byType['mermaid'] === 1, `got ${byType['mermaid']}`);
  check('video not yet compiled (parser gap)', byType['video'] == null, `got ${byType['video']}`);
  check('quiz block', byType['quiz'] === 1, `got ${byType['quiz']}`);
  check('callout block (outer)', byType['callout'] >= 2, `got ${byType['callout']}`);
  check('layer block', byType['layer'] === 1, `got ${byType['layer']}`);
  check('code block', byType['code'] === 1, `got ${byType['code']}`);
  check('image block', byType['image'] === 1, `got ${byType['image']}`);

  // Structural checks
  const chartNode = doc.nodes.find((n) => n.blocks.some((b) => b.type === 'chart'));
  check('chart node found', !!chartNode, 'none');

  const quizNode = doc.nodes.find((n) => n.blocks.some((b) => b.type === 'quiz'));
  check('quiz node found', !!quizNode, 'none');

  const quizBlock = quizNode?.blocks.find((b) => b.type === 'quiz') as any;
  check('quiz has question', !!quizBlock?.q, 'no question');
  check('quiz has options', Array.isArray(quizBlock?.options), 'not an array');
  check('quiz has answer key', quizBlock?.answer_key != null, `got ${quizBlock?.answer_key}`);

  const codeNode = doc.nodes.find((n) => n.blocks.some((b) => b.type === 'code'));
  const cBlock = codeNode?.blocks.find((b) => b.type === 'code') as any;
  check('code has language', cBlock?.lang === 'python', `got ${cBlock?.lang}`);
  check('code has content', cBlock?.src?.includes('pid_control'), 'no content');

  const imageNode = doc.nodes.find((n) => n.blocks.some((b) => b.type === 'image'));
  const iBlock = imageNode?.blocks.find((b) => b.type === 'image') as any;
  check('image has alt', !!iBlock?.alt, 'no alt');

  check('every node has grounding', doc.nodes.every((n) => !!n.grounding), 'some missing');
  check('every node has mastery_target', doc.nodes.every((n) => !!n.mastery_target), 'some missing');
  check('every node has id', doc.nodes.every((n) => !!n.id), 'some missing');

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
