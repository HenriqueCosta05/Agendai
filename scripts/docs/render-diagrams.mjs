// Writes the Archify candidates that follow from the code, then renders every candidate to HTML and SVG.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { ROOT } from '../lib/ts-utils.mjs';

const SRC = join(ROOT, 'docs', 'diagrams', 'src');
const OUT = join(ROOT, 'docs', 'diagrams');
const RECEIPTS = join(OUT, '.archify');

// One column per functional domain keeps the diagram readable on a laptop screen.
const ERD_PLACEMENT = {
  tenants: ['tenancy and people', 0, 0],
  users: ['tenancy and people', 0, 1],
  units: ['scheduling setup', 1, 0],
  services: ['scheduling setup', 1, 1],
  professionals: ['scheduling setup', 1, 2],
  schedules: ['scheduling setup', 1, 3],
  time_off: ['scheduling setup', 1, 4],
  bookings: ['bookings', 2, 0],
  class_sessions: ['classes', 3, 0],
  waitlist_entries: ['classes', 3, 1],
  outbox_events: ['platform', 4, 0],
  refresh_tokens: ['platform', 4, 1],
};

const MODULE_NOTES = new Map([
  ['src/main.ts', 'Bootstraps the application and enables shutdown hooks'],
  ['src/app.module.ts', 'Wires configuration, database, observability, auth and the features'],
  ['src/features', 'One folder per business capability'],
  ['src/features/auth', 'Sign-up, sign-in, tokens, members and the access policy'],
  ['src/features/users', 'User type, repository and GET /me'],
  ['src/features/units', 'Units CRUD'],
  ['src/features/services', 'Services CRUD'],
  ['src/features/professionals', 'Professionals CRUD'],
  ['src/features/metrics', 'Prometheus registry, middleware and GET /metrics'],
  ['src/shared', 'Code used by several features'],
  ['src/shared/config', 'Environment schema validated with Zod'],
  ['src/shared/database', 'Drizzle schema and PostgreSQL error helpers'],
  ['src/shared/observe', 'NestJS Observe module and instrument'],
]);

const shortType = (type) => type.replace('timestamp with time zone', 'timestamptz');

function keysOf(column) {
  const keys = [column.primary ? 'pk' : null, column.foreign ? 'fk' : null, column.unique ? 'uk' : null].filter(Boolean);
  return keys.length > 1 ? keys : keys[0];
}

function attributesOf(table) {
  return table.columns.map((column) => {
    const attribute = { name: column.name, type: shortType(column.type) };
    const key = keysOf(column);
    if (key) attribute.key = key;
    const fk = table.foreignKeys.find((f) => f.columns.includes(column.name));
    if (fk) attribute.references = `${fk.table}.${fk.foreignColumns[0]}`;
    return attribute;
  });
}

function relationshipsOf(table) {
  return table.foreignKeys
    .filter((fk) => fk.table !== 'tenants')
    .map((fk) => ({
      id: `${table.name}_${fk.columns.join('_')}`,
      from: table.name,
      to: fk.table,
      label: fk.columns.join(', '),
      fromCardinality: 'many',
      toCardinality: 'one',
      fromOptional: fk.columns.some((name) => table.columns.find((c) => c.name === name)?.nullable),
    }));
}

export function erdCandidate(tables, output) {
  const names = new Set(tables.map((t) => t.name));
  const missing = tables.filter((t) => !ERD_PLACEMENT[t.name]).map((t) => t.name);
  if (missing.length > 0) {
    throw new Error(`ERD placement missing for: ${missing.join(', ')}. Add them to ERD_PLACEMENT.`);
  }
  const entities = tables.map((table) => {
    const [tag, col, row] = ERD_PLACEMENT[table.name];
    return { id: table.name, label: table.name, tag, row, col, attributes: attributesOf(table) };
  });
  const relationships = tables.flatMap(relationshipsOf).filter((r) => names.has(r.to));
  return {
    schema_version: 1,
    diagram_type: 'erd',
    meta: {
      title: 'Data model',
      subtitle: 'Generated from src/shared/database/schema.ts',
      output,
      locale: 'en',
      quality_profile: 'standard',
      feedback_links: false,
    },
    layout: { mode: 'grid', gapX: 56, gapY: 36 },
    entities,
    relationships,
    cards: [
      {
        dot: 'cyan',
        title: 'Tenancy',
        items: [
          'Business tables reference tenants.id through tenant_id',
          'Those tenant edges are left out of the picture to keep it readable',
        ],
      },
      {
        dot: 'amber',
        title: 'Beyond the schema',
        items: [
          'bookings has an exclusion constraint that Drizzle cannot express',
          'It lives in the booking_constraints migration',
        ],
      },
    ],
  };
}

const isDirectory = (path) => statSync(path).isDirectory();

function moduleNodes(dir, relDir, parent, nodes) {
  for (const name of readdirSync(join(ROOT, dir)).sort()) {
    const rel = `${relDir}/${name}`;
    if (!isDirectory(join(ROOT, dir, name))) continue;
    const id = rel.replace(/[^a-z0-9]+/gi, '_');
    nodes.push({ id, label: `${name}/`, parent, sublabel: MODULE_NOTES.get(rel) });
    moduleNodes(join(dir, name), rel, id, nodes);
  }
  return nodes;
}

export function treeCandidate(output) {
  const nodes = [
    { id: 'src', label: 'src/', sublabel: 'NestJS application' },
    { id: 'src_main_ts', label: 'main.ts', parent: 'src', sublabel: MODULE_NOTES.get('src/main.ts') },
    { id: 'src_app_module_ts', label: 'app.module.ts', parent: 'src', sublabel: MODULE_NOTES.get('src/app.module.ts') },
    { id: 'src_features', label: 'features/', parent: 'src', sublabel: MODULE_NOTES.get('src/features') },
    { id: 'src_shared', label: 'shared/', parent: 'src', sublabel: MODULE_NOTES.get('src/shared') },
  ];
  return {
    schema_version: 1,
    diagram_type: 'tree',
    meta: {
      title: 'Module map',
      subtitle: 'Folders under src/, read from the file system',
      output,
      locale: 'en',
      quality_profile: 'showcase',
      feedback_links: false,
    },
    layout: { direction: 'down' },
    nodes: [
      ...nodes,
      ...moduleNodes(join('src', 'features'), 'src/features', 'src_features', []),
      ...moduleNodes(join('src', 'shared'), 'src/shared', 'src_shared', []),
    ],
  };
}

function archifyCli() {
  const home = process.env.ARCHIFY_HOME ?? join(homedir(), '.agents', 'skills', 'archify');
  const cli = join(home, 'bin', 'archify.mjs');
  return existsSync(cli) ? cli : null;
}

function clearReceipts(stem) {
  for (const name of readdirSync(RECEIPTS)) {
    if (name.startsWith(`${stem}.`)) rmSync(join(RECEIPTS, name));
  }
}

function finalize(cli, candidate, output) {
  const { diagram_type: type, meta } = JSON.parse(readFileSync(candidate, 'utf8'));
  clearReceipts(basename(output, '.html'));
  const args = [cli, 'finalize', type, candidate, output, '--quality', meta.quality_profile, '--out-dir', RECEIPTS, '--json'];
  let stdout;
  try {
    stdout = execFileSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    stdout = error.stdout;
  }
  const receipt = JSON.parse(stdout);
  if (!receipt.ok) {
    throw new Error(`archify finalize failed for ${candidate} at ${receipt.failedStage}: ${JSON.stringify(receipt.diagnostics)}`);
  }
}

function exportSvg(cli, html, svg) {
  rmSync(svg, { force: true });
  const exporter = join(cli, '..', 'export-svg.mjs');
  execFileSync(process.execPath, [exporter, html, svg, 'light'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
}

export function writeCandidate(file, candidate) {
  writeFileSync(join(SRC, file), `${JSON.stringify(candidate, null, 2)}\n`);
}

// Every candidate in docs/diagrams/src is rendered; the first two are regenerated from the code.
export function renderDiagrams(tables) {
  writeCandidate('data-model.erd.json', erdCandidate(tables, 'docs/diagrams/data-model.html'));
  writeCandidate('module-map.tree.json', treeCandidate('docs/diagrams/module-map.html'));
  const cli = archifyCli();
  if (!cli) {
    console.warn('docs: Archify not found (set ARCHIFY_HOME). Candidates were written, HTML and SVG were not rendered.');
    return;
  }
  for (const file of readdirSync(SRC).filter((f) => f.endsWith('.json')).sort()) {
    const stem = file.replace(/\.[a-z]+\.json$/, '');
    const html = join(OUT, `${stem}.html`);
    finalize(cli, join(SRC, file), html);
    exportSvg(cli, html, join(OUT, `${stem}.svg`));
  }
}
