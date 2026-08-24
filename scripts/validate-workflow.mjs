#!/usr/bin/env node

"use strict";

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const nodeVersion = fs.readFileSync(path.join(root, ".node-version"), "utf8").trim();

if (!/^\d+\.\d+\.\d+$/.test(nodeVersion)) {
  fail(".node-version must contain an exact semantic Node.js version");
}

function fail(message) {
  throw new Error(message);
}

function validateResearchPromptPortability() {
  const promptPaths = [
    "research/zerodevllc-marketfront-prompt.md",
    "research/sacred-geometry-atlas-10-10-prompt.md",
  ];
  for (const relativePath of promptPaths) {
    const prompt = fs.readFileSync(path.join(root, relativePath), "utf8");
    if (/\/Users\/|[A-Z]:\\Users\\/i.test(prompt)) {
      fail(`${relativePath} must not contain a machine-specific user path`);
    }
  }
}

function validateWorkflow({ name, fileName, expectedJobs, expectedCheckouts }) {
  const workflowPath = path.join(root, ".github", "workflows", fileName);
  const workflow = fs.readFileSync(workflowPath, "utf8");

  if (/runs-on:\s+(?:ubuntu|macos|windows)-latest\b/.test(workflow)) {
    fail(`${name} must use fixed runner images`);
  }
  if ((workflow.match(/runs-on:\s+ubuntu-24\.04\b/g) || []).length !== expectedJobs) {
    fail(`${name} must use ubuntu-24.04 for every job`);
  }
  if (workflow.includes("pull_request_target") || workflow.includes("continue-on-error")) {
    fail(`${name} contains a disallowed privilege or failure bypass`);
  }

  const actionRefs = [...workflow.matchAll(/^\s+uses:\s+([^@\s]+)@([^\s]+)/gm)];
  if (!actionRefs.length) fail(`${name} must declare its actions explicitly`);
  for (const [, action, ref] of actionRefs) {
    if (!/^[0-9a-f]{40}$/.test(ref)) fail(`${action} must use a 40-character immutable SHA`);
  }

  const checkoutPositions = [...workflow.matchAll(/uses:\s+actions\/checkout@[0-9a-f]{40}/g)]
    .map((match) => match.index);
  const patchPositions = [...workflow.matchAll(/run:\s+git diff --check/g)]
    .map((match) => match.index);
  if (checkoutPositions.length !== expectedCheckouts || patchPositions.length !== expectedCheckouts) {
    fail(`${name} must have exactly one patch-hygiene step per checkout`);
  }
  for (const checkoutPosition of checkoutPositions) {
    const nextCheckout = checkoutPositions.find((position) => position > checkoutPosition) ?? Infinity;
    const patchPosition = patchPositions.find(
      (position) => position > checkoutPosition && position < nextCheckout,
    );
    if (patchPosition === undefined) fail(`${name} must run patch hygiene after every checkout`);
  }

  const credentialIsolationCount = (workflow.match(/persist-credentials:\s+false/g) || []).length;
  if (credentialIsolationCount !== checkoutPositions.length) {
    fail(`${name} must disable persisted checkout credentials everywhere`);
  }
  if ((workflow.match(/timeout-minutes:/g) || []).length !== expectedJobs) {
    fail(`${name} must set one timeout-minutes value per job`);
  }
  if (!workflow.includes("node-version-file: .node-version") || workflow.includes("node-version: 22")) {
    fail(`${name} must use the exact Node.js version from .node-version`);
  }
  if (!workflow.includes("node scripts/validate-geometry-data.js") || !workflow.includes("node scripts/sync-geometry-json.js --check")) {
    fail(`${name} must validate the geometry source and generated artifacts`);
  }
  if (!workflow.includes("permissions:\n  contents: read") || !workflow.includes("concurrency:")) {
    fail(`${name} must declare least-privilege contents access and concurrency`);
  }

  if (fileName === "cloudflare-pages.yml") {
    if (!workflow.includes("deploy:\n    needs: validate")) {
      fail("Cloudflare Pages deployment must require validation");
    }
    if (!workflow.includes("      deployments: write")) {
      fail("Cloudflare Pages deployment must scope deployments: write to the deploy job");
    }
    if (!workflow.includes("cloudflare/wrangler-action@")) {
      fail("Cloudflare Pages deployment must use the Wrangler action");
    }
  }
}

function validateReadmeOperatorGuide() {
  const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
  const headings = [
    "## Features",
    "## Prerequisites",
    "## Installation and setup",
    "## Run locally",
    "## Troubleshooting",
    "## Contributing",
    "## Security",
    "## License",
  ];
  for (const heading of headings) {
    if ((readme.match(new RegExp(`^${heading}#!/usr/bin/env node

"use strict";

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const nodeVersion = fs.readFileSync(path.join(root, ".node-version"), "utf8").trim();

if (!/^\d+\.\d+\.\d+$/.test(nodeVersion)) {
  fail(".node-version must contain an exact semantic Node.js version");
}

function fail(message) {
  throw new Error(message);
}

function validateResearchPromptPortability() {
  const promptPaths = [
    "research/zerodevllc-marketfront-prompt.md",
    "research/sacred-geometry-atlas-10-10-prompt.md",
  ];
  for (const relativePath of promptPaths) {
    const prompt = fs.readFileSync(path.join(root, relativePath), "utf8");
    if (/\/Users\/|[A-Z]:\\Users\\/i.test(prompt)) {
      fail(`${relativePath} must not contain a machine-specific user path`);
    }
  }
}

function validateWorkflow({ name, fileName, expectedJobs, expectedCheckouts }) {
  const workflowPath = path.join(root, ".github", "workflows", fileName);
  const workflow = fs.readFileSync(workflowPath, "utf8");

  if (/runs-on:\s+(?:ubuntu|macos|windows)-latest\b/.test(workflow)) {
    fail(`${name} must use fixed runner images`);
  }
  if ((workflow.match(/runs-on:\s+ubuntu-24\.04\b/g) || []).length !== expectedJobs) {
    fail(`${name} must use ubuntu-24.04 for every job`);
  }
  if (workflow.includes("pull_request_target") || workflow.includes("continue-on-error")) {
    fail(`${name} contains a disallowed privilege or failure bypass`);
  }

  const actionRefs = [...workflow.matchAll(/^\s+uses:\s+([^@\s]+)@([^\s]+)/gm)];
  if (!actionRefs.length) fail(`${name} must declare its actions explicitly`);
  for (const [, action, ref] of actionRefs) {
    if (!/^[0-9a-f]{40}$/.test(ref)) fail(`${action} must use a 40-character immutable SHA`);
  }

  const checkoutPositions = [...workflow.matchAll(/uses:\s+actions\/checkout@[0-9a-f]{40}/g)]
    .map((match) => match.index);
  const patchPositions = [...workflow.matchAll(/run:\s+git diff --check/g)]
    .map((match) => match.index);
  if (checkoutPositions.length !== expectedCheckouts || patchPositions.length !== expectedCheckouts) {
    fail(`${name} must have exactly one patch-hygiene step per checkout`);
  }
  for (const checkoutPosition of checkoutPositions) {
    const nextCheckout = checkoutPositions.find((position) => position > checkoutPosition) ?? Infinity;
    const patchPosition = patchPositions.find(
      (position) => position > checkoutPosition && position < nextCheckout,
    );
    if (patchPosition === undefined) fail(`${name} must run patch hygiene after every checkout`);
  }

  const credentialIsolationCount = (workflow.match(/persist-credentials:\s+false/g) || []).length;
  if (credentialIsolationCount !== checkoutPositions.length) {
    fail(`${name} must disable persisted checkout credentials everywhere`);
  }
  if ((workflow.match(/timeout-minutes:/g) || []).length !== expectedJobs) {
    fail(`${name} must set one timeout-minutes value per job`);
  }
  if (!workflow.includes("node-version-file: .node-version") || workflow.includes("node-version: 22")) {
    fail(`${name} must use the exact Node.js version from .node-version`);
  }
  if (!workflow.includes("node scripts/validate-geometry-data.js") || !workflow.includes("node scripts/sync-geometry-json.js --check")) {
    fail(`${name} must validate the geometry source and generated artifacts`);
  }
  if (!workflow.includes("permissions:\n  contents: read") || !workflow.includes("concurrency:")) {
    fail(`${name} must declare least-privilege contents access and concurrency`);
  }

  if (fileName === "cloudflare-pages.yml") {
    if (!workflow.includes("deploy:\n    needs: validate")) {
      fail("Cloudflare Pages deployment must require validation");
    }
    if (!workflow.includes("      deployments: write")) {
      fail("Cloudflare Pages deployment must scope deployments: write to the deploy job");
    }
    if (!workflow.includes("cloudflare/wrangler-action@")) {
      fail("Cloudflare Pages deployment must use the Wrangler action");
    }
  }
}
, "gm")) || []).length !== 1) {
      fail(`README must contain exactly one ${heading} heading`);
    }
  }
  for (const token of [
    "node scripts/validate-geometry-data.js",
    "node scripts/sync-geometry-json.js --check",
    "python3 scripts/prepare-cloudflare-site.py",
    "static.html",
    "No backend or credentials are needed for the static Atlas",
  ]) {
    if (!readme.includes(token)) fail(`README is missing operator contract: ${token}`);
  }
  if (/\/Users\/|[A-Z]:\\Users\\/i.test(readme)) {
    fail("README must not contain a machine-specific user path");
  }
}

validateReadmeOperatorGuide();
validateWorkflow({
  name: "GitHub Pages workflow",
  fileName: "pages.yml",
  expectedJobs: 2,
  expectedCheckouts: 2,
});
validateWorkflow({
  name: "Cloudflare Pages workflow",
  fileName: "cloudflare-pages.yml",
  expectedJobs: 2,
  expectedCheckouts: 2,
});
validateResearchPromptPortability();

console.log("Pages workflow contracts passed: immutable actions, fixed runners, isolated checkouts, patch hygiene, scoped permissions, concurrency, validation gating, and timeouts.");
