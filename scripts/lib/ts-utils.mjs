import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

export const ROOT = process.cwd();

export function listTsFiles(dir = 'src') {
  const out = [];
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const full = join(current, name);
      if (statSync(full).isDirectory()) {
        if (name !== 'node_modules' && name !== 'dist') walk(full);
      } else if (/\.ts$/.test(name) && !/\.(spec|test|e2e-spec)\.ts$/.test(name) && !name.endsWith('.d.ts')) {
        out.push(full);
      }
    }
  };
  try {
    walk(join(ROOT, dir));
  } catch {
    return [];
  }
  return out;
}

export function parse(fileName, text = readFileSync(fileName, 'utf8')) {
  return ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

export function isFunctionLike(node) {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessor(node) ||
    ts.isSetAccessor(node)
  );
}

export function functionName(node, sf) {
  if (node.name) return node.name.getText(sf);
  if (ts.isConstructorDeclaration(node)) return 'constructor';
  const parent = node.parent;
  if (parent && ts.isVariableDeclaration(parent)) return parent.name.getText(sf);
  if (parent && ts.isPropertyAssignment(parent)) return parent.name.getText(sf);
  return '<anonymous>';
}

export function lineOf(sf, pos) {
  return sf.getLineAndCharacterOfPosition(pos).line + 1;
}

export function rel(file) {
  return relative(ROOT, file);
}

export { ts };
