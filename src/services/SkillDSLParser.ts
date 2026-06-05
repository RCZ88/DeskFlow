import type { SkillIO, Skill, SkillOutput, SkillComponent } from './SkillsService';

export interface ParsedSkillInput extends SkillIO {
  widget: NonNullable<SkillIO['widget']>;
}

export interface ParsedSkillOutput extends SkillOutput {
  preview?: boolean;
}

export interface ParsedSkillConfig {
  inputs: ParsedSkillInput[];
  outputs: ParsedSkillOutput[];
  components: SkillComponent[];
  warnings: string[];
}

function inferWidget(input: Partial<SkillIO>): NonNullable<SkillIO['widget']> {
  if (input.widget) return input.widget;
  const type = input.type || 'text';
  switch (type) {
    case 'enum': return 'select';
    case 'multienum': return 'tags';
    case 'boolean': return 'switch';
    case 'number':
      return (input.min !== undefined && input.max !== undefined) ? 'slider' : 'text';
    case 'text': return 'text';
    case 'textarea': return 'textarea';
    case 'code': return 'code';
    case 'file': return 'file';
    case 'markdown': return 'textarea';
    case 'list': return 'tags';
    default: return 'text';
  }
}

function coerceValue(raw: string, propName: string): any {
  if (raw === 'true') return true;
  if (raw === 'false') return false;

  if (propName === 'min' || propName === 'max' || propName === 'step') {
    const num = Number(raw);
    return isNaN(num) ? raw : num;
  }

  if (propName === 'default') {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    const num = Number(raw);
    if (!isNaN(num) && raw.trim() !== '') return num;
  }

  return raw;
}

function parseFrontmatterSection(frontmatter: string, key: string): Record<string, any>[] {
  const lines = frontmatter.split('\n');
  const results: Record<string, any>[] = [];
  let inSection = false;
  let currentItem: Record<string, any> | null = null;
  let lastKey = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line === `${key}:` || new RegExp(`^${key}:\\s*$`).test(line)) {
      inSection = true;
      continue;
    }

    if (inSection && /^\w[\w-]*:/.test(line) && !line.startsWith(' ')) {
      if (currentItem) results.push(currentItem);
      currentItem = null;
      inSection = false;
      continue;
    }

    if (!inSection) continue;
    if (line.trim() === '' || line.trim() === '#') continue;

    const newItemMatch = line.match(/^  - (\w[\w-]*):\s*(.*)$/);
    if (newItemMatch) {
      if (currentItem) results.push(currentItem);
      currentItem = {};
      lastKey = newItemMatch[1];
      currentItem[lastKey] = coerceValue(newItemMatch[2].trim(), lastKey);
      continue;
    }

    const propMatch = line.match(/^    (\w[\w-]*):\s*(.*)$/);
    if (propMatch && currentItem) {
      lastKey = propMatch[1];
      let val: any = propMatch[2].trim();
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (val.startsWith('[') && val.endsWith(']')) {
        val = val.slice(1, -1).split(',').map((s: string) => s.trim().replace(/^['"]|['"]$/g, ''));
      }
      currentItem[lastKey] = coerceValue(String(val), lastKey);
      continue;
    }

    const listValueMatch = line.match(/^      - (.+)$/);
    if (listValueMatch && currentItem) {
      const value = listValueMatch[1].trim().replace(/^['"]|['"]$/g, '');
      if (!Array.isArray(currentItem[lastKey])) {
        currentItem[lastKey] = [value];
      } else {
        (currentItem[lastKey] as string[]).push(value);
      }
      continue;
    }

    const continuationMatch = line.match(/^      (.+)$/);
    if (continuationMatch && currentItem && typeof currentItem[lastKey] === 'string') {
      currentItem[lastKey] += ' ' + continuationMatch[1].trim();
    }
  }

  if (currentItem) results.push(currentItem);
  return results;
}

export function parseSkillDSL(frontmatter: string): ParsedSkillConfig {
  const warnings: string[] = [];

  const rawInputs = parseFrontmatterSection(frontmatter, 'inputs');
  const rawOutputs = parseFrontmatterSection(frontmatter, 'outputs');
  const rawComponents = parseFrontmatterSection(frontmatter, 'components');

  const inputs: ParsedSkillInput[] = rawInputs.map((raw: any) => {
    const input: ParsedSkillInput = {
      name: raw.name || 'Unnamed',
      type: raw.type || 'text',
      description: raw.description,
      required: raw.required === true,
      source: raw.source,
      widget: raw.widget,
      choices: Array.isArray(raw.choices) ? raw.choices : undefined,
      default: raw.default,
      placeholder: raw.placeholder,
      min: typeof raw.min === 'number' ? raw.min : undefined,
      max: typeof raw.max === 'number' ? raw.max : undefined,
      step: typeof raw.step === 'number' ? raw.step : undefined,
      validation: raw.validation,
      validationMessage: raw.validationMessage,
      group: raw.group,
      language: raw.language,
    };

    input.widget = inferWidget(input);

    if ((input.type === 'enum' || input.type === 'multienum') && (!input.choices || input.choices.length === 0)) {
      warnings.push(`Input "${input.name}": type is ${input.type} but no choices provided`);
    }

    if (input.widget === 'slider' && (input.min === undefined || input.max === undefined)) {
      warnings.push(`Input "${input.name}": widget is slider but min/max not set, falling back to text input`);
      input.widget = 'text';
    }

    return input;
  });

  const outputs: ParsedSkillOutput[] = rawOutputs.map((raw: any) => ({
    name: raw.name || 'Unnamed',
    type: raw.type || 'text',
    description: raw.description,
    preview: raw.preview === true,
  }));

  const components: SkillComponent[] = rawComponents.map((raw: any) => ({
    name: raw.name || 'Unnamed',
    description: raw.description,
    type: raw.type,
    required: raw.required === true,
    source: raw.source,
  }));

  return { inputs, outputs, components, warnings };
}

export function enhanceSkillWithDSL(skill: Skill): Skill {
  if (!skill.content) return skill;

  const frontmatterMatch = skill.content.trimStart().match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return skill;

  const parsed = parseSkillDSL(frontmatterMatch[1]);

  const result: Skill = {
    ...skill,
    inputs: parsed.inputs.length > 0 ? parsed.inputs : skill.inputs,
    outputs: parsed.outputs.length > 0 ? parsed.outputs : skill.outputs,
    components: parsed.components.length > 0 ? parsed.components : skill.components,
  };

  if (parsed.warnings.length > 0) {
    (result as any)._dslWarnings = parsed.warnings;
  }

  return result;
}
