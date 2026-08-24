#!/usr/bin/env node

"use strict";

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const workflowPath = path.join(root, ".github", "workflows", "pages.yml");
const workflow = fs.readFileSync(workflowPath, "utf8");
const fail = (message) => {
  throw new Error(message);
};

if (/runs-on:\s+(?:ubuntu|macos|windows)-latest\b/.test(workflow)) {
  fail("The Pages workflow must use a fixed runner image");
}
if ((workflow.match(/runs-on:\s+ubuntu-24\.04\b/g) || []).length !== 2) {
  fail("Both Pages jobs must use ubuntu-24.04");
}
if (workflow.includes("pull_request_target") || workflow.includes("continue-on-error")) {
  fail("The Pages workflow contains a disallowed privilege or failure bypass");
}

const actionRefs = [...workflow.matchAll(/^\s+uses:\s+([^@\s]+)@([^\s]+)/gm)];
if (!actionRefs.length) fail("The Pages workflow must declare its actions explicitly");
for (const [, action, ref] of actionRefs) {
  if (!/^[0-9a-f]{40}$/.test(ref)) fail(`${action} must use a 40-character immutable SHA`);
}

const checkoutPositions = [...workflow.matchAll(/uses:\s+actions\/checkout@[0-9a-f]{40}/g)].map((match) => match.index);
const patchPositions = [...workflow.matchAll(/run:\s+git diff --check/g)].map((match) => match.index);
if (checkoutPositions.length !== 2 || patchPositions.length !== 2) {
  fail("Every checkout must have exactly one patch-hygiene step");
}
for (const checkoutPosition of checkoutPositions) {
  const nextCheckout = checkoutPositions.find((position) => position > checkoutPosition) ?? Infinity;
  const patchPosition = patchPositions.find((position) => position > checkoutPosition && position < nextCheckout);
  if (patchPosition === undefined) fail("Patch hygiene must run immediately after each checkout");
}

const credentialIsolationCount = (workflow.match(/persist-credentials:\s+false/g) || []).length;
if (credentialIsolationCount !== checkoutPositions.length) {
  fail("Every checkout must disable persisted credentials");
}
if ((workflow.match(/timeout-minutes:/g) || []).length < 2) {
  fail("Both Pages jobs must have explicit timeouts");
}
if (!workflow.includes("permissions:\n  contents: read") || !workflow.includes("concurrency:")) {
  fail("The workflow must declare least-privilege contents access and concurrency");
}

console.log("Pages workflow contract passed: immutable actions, fixed runners, isolated checkouts, patch hygiene, permissions, concurrency, and timeouts.");
