#!/usr/bin/env node
// Static best-practice review of one file: cybersecurity, NestJS, clean code, design patterns.
// Usage: node scripts/review-best-practices.mjs <file>   (exit 1 when problems are found)
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { ts, parse, isFunctionLike, functionName, lineOf, rel } from './lib/ts-utils.mjs';

const file = process.argv[2];
if (!file) process.exit(0);
const text = readFileSync(file, 'utf8');
const name = basename(file);
const findings = [];
const add = (tag, line, msg) => findings.push(`[${tag}] ${rel(file)}${line ? `:${line}` : ''} ${msg}`);

const lineNo = (index) => text.slice(0, index).split('\n').length;
const scan = (tag, regex, msg) => {
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
  for (const m of text.matchAll(re)) add(tag, lineNo(m.index), msg);
};

const SECRET_PATTERNS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key committed'],
  [/AKIA[0-9A-Z]{16}/, 'AWS access key'],
  [/gh[pousr]_[A-Za-z0-9]{36,}/, 'GitHub token'],
  [/sk-[A-Za-z0-9_-]{20,}/, 'API key'],
  [/[a-z]+:\/\/[^/\s:@'"]+:[^/\s@'"]{3,}@[^\s'"]+/, 'credentials embedded in a URL/connection string'],
  [/(password|passwd|secret|api[_-]?key|token|private[_-]?key)\s*[:=]\s*['"`][^'"`\s$]{8,}['"`]/i, 'hardcoded secret literal; read it from the environment'],
];

function reviewSecrets() {
  if (/\.(example|sample|md)$/.test(name) || /\.env\.example$/.test(name)) return;
  for (const [re, msg] of SECRET_PATTERNS) scan('security', re, msg);
  if (/^\.env(\..+)?$/.test(name) && !/example|sample/.test(name)) {
    add('security', 0, 'real .env file written by the agent; use .env.example with placeholders');
  }
}

function reviewTypeScriptSecurity() {
  scan('security', /\beval\s*\(|new\s+Function\s*\(/, 'dynamic code execution (eval/Function)');
  scan('security', /\bexec(Sync)?\s*\(\s*[`'"][^`'"]*(\$\{|['"]\s*\+)/, 'shell command built from variables; use execFile with an args array');
  scan('security', /\bexec(Sync)?\s*\(\s*[A-Za-z_]/, 'shell exec with a non-literal command; use execFile with an args array');
  scan('security', /\.(query|raw|\$queryRawUnsafe|execute)\s*\(\s*`[^`]*\$\{/, 'SQL built with template interpolation; use parameters ($1, $2) or a query builder');
  scan('security', /\.(query|raw|execute)\s*\(\s*['"][^'"]*(SELECT|INSERT|UPDATE|DELETE)[^'"]*['"]\s*\+/i, 'SQL built by concatenation; use parameters');
  scan('security', /rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0/, 'TLS verification disabled');
  scan('security', /createHash\(\s*['"](md5|sha1)['"]\s*\)/i, 'weak hash (md5/sha1); use argon2/bcrypt for passwords or sha256+');
  scan('security', /ignoreExpiration\s*:\s*true/, 'JWT expiration ignored');
  scan('security', /enableCors\(\s*\)|origin\s*:\s*(true|['"]\*['"])/, 'CORS open to every origin; use an explicit allow-list');
  scan('security', /synchronize\s*:\s*true/, 'ORM synchronize:true must not be used; use migrations');
  scan('security', /Math\.random\(\)[^;\n]*(token|secret|password|otp|session)|(token|secret|password|otp|session)[^;\n]*Math\.random\(\)/i, 'Math.random is not cryptographically secure; use crypto.randomUUID/randomBytes');
  scan('security', /console\.(log|info|debug)\([^)]*(password|token|secret|authorization)/i, 'sensitive value written to logs');
  scan('security', /\binnerHTML\s*=|dangerouslySetInnerHTML/, 'unsanitised HTML sink');
}

function reviewAst() {
  const sf = parse(file, text);
  const isSpec = /\.(spec|test)\.ts$/.test(name);
  const isController = /\.controller\.ts$/.test(name) || /@Controller\(/.test(text);
  const isConfigLike = name === 'main.ts' || /config\.ts$/.test(name);

  const nesting = (fn) => {
    let max = 0;
    const visit = (node, depth) => {
      if (node !== fn && isFunctionLike(node)) return;
      const adds =
        ts.isIfStatement(node) || ts.isForStatement(node) || ts.isForOfStatement(node) ||
        ts.isForInStatement(node) || ts.isWhileStatement(node) || ts.isDoStatement(node) ||
        ts.isSwitchStatement(node) || ts.isTryStatement(node);
      const d = adds && !(ts.isIfStatement(node) && ts.isIfStatement(node.parent) && node.parent.elseStatement === node) ? depth + 1 : depth;
      max = Math.max(max, d);
      ts.forEachChild(node, (c) => visit(c, d));
    };
    ts.forEachChild(fn, (c) => visit(c, 0));
    return max;
  };

  const visit = (node) => {
    if (isFunctionLike(node) && node.body) {
      const fname = functionName(node, sf);
      const start = lineOf(sf, node.getStart(sf));
      const length = lineOf(sf, node.end) - start + 1;
      const params = node.parameters.length;
      if (!isSpec && length > 30) add('clean-code', start, `${fname} is ${length} lines (max 30); extract smaller functions`);
      if (params > 4) add('clean-code', start, `${fname} takes ${params} parameters (max 4); group them in an object/DTO`);
      if (nesting(node) > 3) add('clean-code', start, `${fname} nests deeper than 3 levels; use guard clauses or extract`);
      if (isController && ts.isMethodDeclaration(node) && length > 15) {
        add('nest', start, `controller method ${fname} is ${length} lines; move business logic to a service`);
      }
    }
    if (ts.isCatchClause(node) && node.block.statements.length === 0) {
      add('clean-code', lineOf(sf, node.getStart(sf)), 'empty catch block swallows errors; handle or rethrow');
    }
    if (!isSpec && node.kind === ts.SyntaxKind.AnyKeyword) {
      add('clean-code', lineOf(sf, node.getStart(sf)), "'any' disables type safety; use a concrete type or unknown");
    }
    if (!isSpec && ts.isNewExpression(node) && /^[A-Z]\w*(Service|Repository|Client|Gateway|Provider)$/.test(node.expression.getText(sf))) {
      add('design-pattern', lineOf(sf, node.getStart(sf)), `new ${node.expression.getText(sf)}() bypasses dependency injection; inject it through the constructor`);
    }
    if (!isSpec && ts.isSwitchStatement(node) && node.caseBlock.clauses.length > 6) {
      add('design-pattern', lineOf(sf, node.getStart(sf)), 'switch with more than 6 branches; consider Strategy/lookup map');
    }
    if (ts.isClassDeclaration(node)) {
      const size = lineOf(sf, node.end) - lineOf(sf, node.getStart(sf)) + 1;
      if (size > 250 && !isSpec) add('design-pattern', lineOf(sf, node.getStart(sf)), `class is ${size} lines; split responsibilities (SRP)`);
    }
    if (ts.isParameter(node) && node.type && isController) {
      const decorators = ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : [];
      const decorator = decorators.map((d) => d.expression.getText(sf)).find((d) => /^(Body|Query|Param)\b/.test(d));
      if (decorator && /^(any|object|Record<.*>|unknown)$/.test(node.type.getText(sf))) {
        add('nest', lineOf(sf, node.getStart(sf)), `@${decorator.split('(')[0]} is typed loosely; use a validated DTO/schema`);
      }
    }
    if (isController && ts.isImportDeclaration(node) && /typeorm|@nestjs\/typeorm|drizzle|^'pg'|^"pg"|mongoose|sequelize/.test(node.moduleSpecifier.getText(sf))) {
      add('nest', lineOf(sf, node.getStart(sf)), 'controller talks to the database layer directly; go through a service');
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  if (!isSpec && !isConfigLike && /\bprocess\.env\b/.test(text)) {
    scan('nest', /\bprocess\.env\b/, 'read configuration through @nestjs/config (ConfigService), not process.env');
  }
  if (!isSpec) scan('clean-code', /\bconsole\.(log|debug)\(/, 'use the Nest Logger instead of console.*');
  if (text.split('\n').length > 300 && !isSpec) add('clean-code', 0, 'file exceeds 300 lines; split by responsibility (move AppModule to *.module.ts, etc.)');
}

function reviewDocker() {
  const lines = text.split('\n');
  const hasUser = lines.some((l) => /^\s*USER\s+(?!root\b)\S+/i.test(l));
  lines.forEach((l, i) => {
    const n = i + 1;
    const from = l.match(/^\s*FROM\s+(\S+)/i);
    if (from && !/\bAS\b/i.test(l) && !from[1].includes('@sha256') && (!from[1].includes(':') || /:latest$/.test(from[1])) && from[1] !== 'scratch') {
      add('docker', n, `image ${from[1]} is unpinned; use an explicit tag or digest`);
    } else if (from && /:latest\b/.test(from[1])) {
      add('docker', n, 'do not use the latest tag');
    }
    if (/^\s*(ENV|ARG)\s+\w*(PASSWORD|SECRET|TOKEN|KEY)\w*[= ]\s*\S+/i.test(l)) add('docker', n, 'secret baked into the image through ENV/ARG; inject at runtime');
    if (/^\s*ADD\s+https?:/i.test(l)) add('docker', n, 'ADD from a URL; use curl with checksum verification');
    if (/(curl|wget)[^|]*\|\s*(sh|bash)/.test(l)) add('docker', n, 'piping a download into a shell');
    if (/privileged\s*:\s*true|network_mode\s*:\s*['"]?host/.test(l)) add('docker', n, 'privileged/host network container');
    if (/POSTGRES_PASSWORD\s*[:=]\s*(?!\$\{|\$)['"]?[^\s'"$]+/.test(l)) add('docker', n, 'literal POSTGRES_PASSWORD; use ${POSTGRES_PASSWORD} from env or a secret');
    if (/^\s*-\s*['"]?5432:5432/.test(l)) add('docker', n, 'PostgreSQL published on all interfaces; bind to 127.0.0.1:5432:5432');
  });
  if (/^Dockerfile/i.test(name) && !hasUser) add('docker', 0, 'no non-root USER instruction; the container runs as root');
}

function reviewSql() {
  scan('postgres', /\bGRANT\s+ALL\b/i, 'GRANT ALL is too broad; grant least privilege');
  scan('postgres', /\bSUPERUSER\b/i, 'SUPERUSER role in a migration');
  scan('postgres', /\bPASSWORD\s+['"][^'"]+['"]/i, 'password literal in SQL');
  scan('postgres', /\bDROP\s+(TABLE|DATABASE|SCHEMA)\s+(?!IF\s+EXISTS)/i, 'DROP without IF EXISTS in a migration');
  scan('postgres', /\bDELETE\s+FROM\s+\w+\s*;/i, 'DELETE without WHERE');
}

reviewSecrets();
if (/\.ts$/.test(name)) {
  if (!/\.(spec|test)\.ts$/.test(name)) reviewTypeScriptSecurity();
  reviewAst();
} else if (/^Dockerfile|docker-compose|compose\.ya?ml$|\.dockerfile$/i.test(name)) {
  reviewDocker();
} else if (/\.sql$/.test(name)) {
  reviewSql();
}

if (findings.length) {
  console.error(findings.join('\n'));
  process.exit(1);
}
