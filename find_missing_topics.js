import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const bankTxt = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'src/data/problemsBank.ts'), 'utf8');
const catalogTxt = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'src/i18n/topicCatalog.ts'), 'utf8');

const regex = /topics:\s*\[([^\]]+)\]/g;
let match;
const foundTopics = new Set();
while ((match = regex.exec(bankTxt)) !== null) {
  const topics = match[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
  for (const t of topics) foundTopics.add(t);
}

const TOPIC_ID_ALIASES = {
  joins: 'join',
  groupby: 'group_by',
}

function toTopicId(topic) {
  const normalized = topic
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return TOPIC_ID_ALIASES[normalized] || normalized;
}

const idsInCatalog = new Set();
const catalogRegex = /^\s*([a-z_]+):\s*\{/gm;
let catalogMatch;
while ((catalogMatch = catalogRegex.exec(catalogTxt)) !== null) {
  idsInCatalog.add(catalogMatch[1]);
}

for (const topic of foundTopics) {
  const id = toTopicId(topic);
  if (!idsInCatalog.has(id)) {
    console.log("Missing topic:", topic, "-> id:", id);
  }
}
console.log("Done checking missing topics.");
