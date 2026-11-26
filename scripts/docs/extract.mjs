// Reads the facts the documentation states: database tables, environment variables and HTTP endpoints.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { is } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { ROOT, listTsFiles, parse, ts } from '../lib/ts-utils.mjs';

const SCHEMA = 'src/shared/database/schema.ts';
const ENV = 'src/shared/config/env.schema.ts';
const POLICY = 'src/features/auth/access.policy.ts';
const HTTP_VERBS = new Set(['Get', 'Post', 'Put', 'Patch', 'Delete']);

const unquote = (text) => text.replace(/^['"`]|['"`]$/g, '');
const absolute = (file) => pathToFileURL(join(ROOT, file)).href;

async function loadTables() {
  const schema = await import(absolute(SCHEMA));
  const tables = Object.values(schema).filter((value) => is(value, PgTable));
  const names = new Map(tables.map((table) => [table, getTableConfig(table).name]));
  return tables.map((table) => describeTable(getTableConfig(table), names));
}

function describeTable(config, names) {
  const foreignKeyColumns = new Set(config.foreignKeys.flatMap((fk) => fk.reference().columns.map((c) => c.name)));
  const uniqueColumns = new Set(config.uniqueConstraints.filter((u) => u.columns.length === 1).map((u) => u.columns[0].name));
  return {
    name: config.name,
    columns: config.columns.map((column) => ({
      name: column.name,
      type: column.getSQLType(),
      nullable: !column.notNull,
      hasDefault: column.hasDefault,
      primary: column.primary,
      foreign: foreignKeyColumns.has(column.name),
      unique: uniqueColumns.has(column.name),
    })),
    foreignKeys: config.foreignKeys.map((fk) => {
      const reference = fk.reference();
      return {
        columns: reference.columns.map((c) => c.name),
        table: names.get(reference.foreignTable) ?? config.name,
        foreignColumns: reference.foreignColumns.map((c) => c.name),
        onDelete: fk.onDelete ?? 'no action',
      };
    }),
    uniques: config.uniqueConstraints.filter((u) => u.columns.length > 1).map((u) => u.columns.map((c) => c.name)),
    indexes: config.indexes.map((index) => index.config.name),
    checks: config.checks.map((check) => check.name),
  };
}

async function loadEnvironment() {
  const { envSchema } = await import(absolute(ENV));
  const json = z.toJSONSchema(envSchema, { io: 'input' });
  return Object.entries(json.properties).map(([name, property]) => ({
    name,
    type: property.enum ? property.enum.map((value) => `\`${value}\``).join(', ') : property.type,
    required: json.required?.includes(name) ?? false,
    defaultValue: property.default === undefined ? null : String(property.default),
    description: property.description ?? '',
  }));
}

function decoratorsOf(node) {
  const decorators = ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : [];
  return decorators.map((decorator) => {
    const call = decorator.expression;
    if (!ts.isCallExpression(call)) {
      return { name: call.getText(), args: [] };
    }
    return { name: call.expression.getText(), args: call.arguments.map((arg) => arg.getText()) };
  });
}

function loadAccessRules() {
  const sf = parse(join(ROOT, POLICY));
  const rules = new Map();
  sf.forEachChild((node) => {
    if (!ts.isClassDeclaration(node)) return;
    for (const member of node.members) {
      if (!ts.isMethodDeclaration(member)) continue;
      const body = member.body?.getText() ?? '';
      const roles = [...body.matchAll(/role === '(\w+)'/g)].map((match) => match[1]);
      const rule = roles.length > 0 ? roles.join(' or ') : body.includes('!== null') ? 'any signed-in user' : 'nobody';
      rules.set(member.name.getText(), rule);
    }
  });
  return rules;
}

function endpointsOf(file, rules) {
  const sf = parse(file);
  const found = [];
  sf.forEachChild((node) => {
    if (!ts.isClassDeclaration(node)) return;
    const controller = decoratorsOf(node).find((d) => d.name === 'Controller');
    if (!controller) return;
    const prefix = controller.args[0] ? unquote(controller.args[0]) : '';
    const classPublic = decoratorsOf(node).some((d) => d.name === 'Public');
    for (const member of node.members) {
      if (!ts.isMethodDeclaration(member)) continue;
      found.push(...routesOf(member, prefix, rules, file, classPublic));
    }
  });
  return found;
}

function routesOf(method, prefix, rules, file, classPublic) {
  const decorators = decoratorsOf(method);
  const verb = decorators.find((d) => HTTP_VERBS.has(d.name));
  if (!verb) return [];
  const verbName = verb.name;
  const httpCode = decorators.find((d) => d.name === 'HttpCode');
  const access = classPublic ? 'public' : accessOf(decorators, rules);
  const bodyArg = method.parameters.map((p) => decoratorsOf(p).find((d) => d.name === 'Body')).find(Boolean);
  const path = verb.args[0] ? unquote(verb.args[0]) : '';
  return [
    {
      method: verbName.toUpperCase(),
      path: '/' + [prefix, path].filter(Boolean).join('/'),
      access,
      status: httpCode ? Number(httpCode.args[0]) : verbName === 'Post' ? 201 : 200,
      body: bodyArg ? bodyArg.args[0].match(/schema:\s*(\w+)/)?.[1] ?? null : null,
      handler: `${file.split('/').slice(-1)[0].replace('.ts', '')}.${method.name.getText()}`,
    },
  ];
}

function accessOf(decorators, rules) {
  if (decorators.some((d) => d.name === 'Public')) return 'public';
  const can = decorators.find((d) => d.name === 'Can');
  if (!can) return 'not declared';
  const action = unquote(can.args[1] ?? '');
  return rules.get(action) ?? 'unknown policy action';
}

function loadEndpoints() {
  const rules = loadAccessRules();
  return listTsFiles('src/features')
    .filter((file) => file.endsWith('.controller.ts'))
    .flatMap((file) => endpointsOf(file, rules))
    .sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}

export async function extract() {
  return {
    tables: await loadTables(),
    environment: await loadEnvironment(),
    endpoints: loadEndpoints(),
  };
}
