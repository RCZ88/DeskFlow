import type { PromptPack, ReflectionPrompt } from './types';

const BUILTIN_PACKS: PromptPack[] = [
  {
    id: 'stillness',
    name: 'Stillness',
    builtin: true,
    prompts: [
      'What is one small thing you are grateful for right now?',
      'Where did you show up for yourself today, even a little?',
      'What would it look like to be gentle with yourself today?',
      'Name one thing that felt true today.',
      'What are you carrying that you could set down for a moment?',
      'What is quietly going right in your life?',
      'Who or what made today a little softer?',
      'What do you want to remember about today?',
      'What is one thing you are learning to let go of?',
      'Where did you notice beauty today?',
    ],
  },
  {
    id: 'everyday',
    name: 'Everyday',
    builtin: true,
    prompts: [
      'What is one step, however small, that moved you forward today?',
      'What challenged you today, and what did it teach you?',
      'What are you looking forward to?',
      'What is a habit you are proud of building?',
      'What would today look like if you trusted yourself a little more?',
      'What is something you would tell a friend who had your day?',
      'What is one thing worth showing up for again tomorrow?',
    ],
  },
];

const CUSTOM_PACKS_KEY = 'deskflow.covenant.promptPacks.v1';

function loadCustomPacks(): PromptPack[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PACKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomPacks(packs: PromptPack[]) {
  localStorage.setItem(CUSTOM_PACKS_KEY, JSON.stringify(packs));
}

export function listPromptPacks(): PromptPack[] {
  return [...BUILTIN_PACKS, ...loadCustomPacks()];
}

export function addPromptPack(pack: Omit<PromptPack, 'builtin'>): PromptPack[] {
  const custom = loadCustomPacks().filter(p => p.id !== pack.id);
  const next = [...custom, { ...pack, builtin: false }];
  saveCustomPacks(next);
  return listPromptPacks();
}

export function removePromptPack(id: string): PromptPack[] {
  saveCustomPacks(loadCustomPacks().filter(p => p.id !== id));
  return listPromptPacks();
}

function dayHash(dateStr: string): number {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h = (h * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getPromptForDate(dateStr: string, activePackId?: string): ReflectionPrompt {
  const packs = listPromptPacks();
  const pack = (activePackId && packs.find(p => p.id === activePackId)) || packs[0];
  const idx = dayHash(dateStr + pack.id) % pack.prompts.length;
  return { id: `${pack.id}:${idx}`, text: pack.prompts[idx], source: pack.name };
}
