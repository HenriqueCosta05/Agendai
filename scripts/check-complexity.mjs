#!/usr/bin/env node
// Cyclomatic complexity gate. Usage: node scripts/check-complexity.mjs [file...]
// Threshold: MAX_COMPLEXITY env var (default 10).
import { ts, listTsFiles, parse, isFunctionLike, functionName, lineOf, rel } from './lib/ts-utils.mjs';

const MAX = Number(process.env.MAX_COMPLEXITY ?? 10);

function complexityOf(fn) {
  let score = 1;
  const visit = (node) => {
    if (node !== fn && isFunctionLike(node)) return;
    switch (node.kind) {
      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.CatchClause:
      case ts.SyntaxKind.ConditionalExpression:
      case ts.SyntaxKind.CaseClause:
        score += 1;
        break;
      case ts.SyntaxKind.BinaryExpression: {
        const op = node.operatorToken.kind;
        if (
          op === ts.SyntaxKind.AmpersandAmpersandToken ||
          op === ts.SyntaxKind.BarBarToken ||
          op === ts.SyntaxKind.QuestionQuestionToken
        ) {
          score += 1;
        }
        break;
      }
      default:
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(fn, visit);
  return score;
}

const files = process.argv.slice(2).length ? process.argv.slice(2) : listTsFiles('src');
const violations = [];

for (const file of files) {
  const sf = parse(file);
  const walk = (node) => {
    if (isFunctionLike(node) && node.body) {
      const score = complexityOf(node);
      if (score > MAX) {
        violations.push(`${rel(file)}:${lineOf(sf, node.getStart(sf))} ${functionName(node, sf)} has complexity ${score} (max ${MAX})`);
      }
    }
    ts.forEachChild(node, walk);
  };
  walk(sf);
}

if (violations.length) {
  console.error(`Cyclomatic complexity above ${MAX}:\n${violations.join('\n')}\nSplit the function into smaller ones.`);
  process.exit(1);
}
console.log(`Complexity OK (max ${MAX}).`);
