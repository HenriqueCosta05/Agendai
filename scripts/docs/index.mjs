// Regenerates the documentation: Markdown reference pages and Archify diagrams (HTML and SVG).
// Usage: npm run docs
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../lib/ts-utils.mjs';
import { extract } from './extract.mjs';
import { renderDiagrams } from './render-diagrams.mjs';
import { renderMarkdown } from './render-markdown.mjs';

mkdirSync(join(ROOT, 'docs', 'diagrams', '.archify'), { recursive: true });
const data = await extract();
const pages = renderMarkdown(data);
renderDiagrams(data.tables);
console.log(`docs: generated ${pages.length} reference pages and refreshed the diagrams.`);
