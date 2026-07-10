import * as fs from 'fs';
import { parseLessonMarkdown } from './services/learn/parseLessonMarkdown';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

const src = fs.readFileSync('./resources/learn/part-10-meta-skills.lmd', 'utf-8');
let doc: any;
try {
  doc = parseLessonMarkdown(src);
  console.log('=== PARSE OK ===');
  console.log(`Nodes: ${doc.nodes.length}`);
  doc.nodes.forEach((n: any, i: number) => {
    console.log(`\nNode ${i}: id="${n.id}" title="${n.title}" mastery=${n.mastery_target} prereq=${JSON.stringify(n.prereq)}`);
    console.log(`  Blocks: ${n.blocks.length}`);
    n.blocks.forEach((b: any, j: number) => {
      console.log(`  Block ${j}: id="${b.id}" type="${(b as any).type}" md_len=${((b as any).md || '').length} src_len=${((b as any).src || '').length}`);
    });
    console.log(`  Grounding keys: ${Object.keys(n.grounding).join(', ')}`);
    console.log(`  Grounding must_know: ${n.grounding.must_know.length}`);
    console.log(`  Grounding sources: ${n.grounding.sources.length}`);
    console.log(`  Grounding scope.includes: "${n.grounding.scope.includes?.substring?.(0, 60) || n.grounding.scope.includes}"`);
  });
} catch (e: any) {
  console.log('=== PARSE ERROR ===');
  console.log(e.message);
  process.exit(1);
}

const schemaPath = './src/schemas/ldoc-1.0.json';
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateFn = ajv.compile(schema);
const valid = validateFn(doc) as boolean;
const report = { ok: valid, errors: (validateFn.errors || []).map((e: any) => ({ rule: 'schema', message: `${e.instancePath || 'root'} ${e.message || 'invalid'}` })) };
console.log(`\n=== SCHEMA VALIDATION ===`);
console.log(`OK: ${report.ok}`);
console.log(`Errors: ${report.errors.length}`);
report.errors.forEach((err, i) => {
  console.log(`  [${i}] ${err.message}`);
  if (i >= 30) {
    console.log(`  ... and ${report.errors.length - i - 1} more`);
  }
});
