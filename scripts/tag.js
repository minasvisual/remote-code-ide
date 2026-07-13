#!/usr/bin/env node
/**
 * Tag script — bumps the version and pushes a tag to trigger the
 * release workflow (.github/workflows/release.yml builds and publishes).
 *
 * Usage:
 *   node scripts/tag.js           # tag current version
 *   node scripts/tag.js patch     # bump patch (0.1.0 → 0.1.1), then tag
 *   node scripts/tag.js minor     # bump minor (0.1.0 → 0.2.0), then tag
 *   node scripts/tag.js major     # bump major (0.1.0 → 1.0.0), then tag
 *
 * Requires a clean working tree. Does not build locally — the tag push
 * triggers CI to build and publish the release.
 */

const { execSync } = require('child_process');
const { readFileSync } = require('fs');

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

function runCapture(cmd) {
  return execSync(cmd, { encoding: 'utf-8' }).trim();
}

// --- require clean working tree ---
if (runCapture('git status --porcelain')) {
  console.error('\nERROR: working tree is not clean. Commit or stash changes first.\n');
  process.exit(1);
}

// --- bump version if requested ---
const bumpType = process.argv[2];
if (bumpType) {
  if (!['patch', 'minor', 'major'].includes(bumpType)) {
    console.error(`Unknown bump type: ${bumpType}. Use patch, minor, or major.`);
    process.exit(1);
  }
  run(`npm version ${bumpType} --no-git-tag-version`);
}

// --- read version ---
const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
const tag = `v${pkg.version}`;

// --- check tag does not already exist ---
const existingTags = runCapture('git tag -l').split('\n').filter(Boolean);
if (existingTags.includes(tag)) {
  console.error(`\nERROR: tag ${tag} already exists. Bump the version first.\n`);
  process.exit(1);
}

console.log(`\n  Tagging ${tag}\n`);

// --- commit version bump, if any ---
if (runCapture('git status --porcelain')) {
  run('git add package.json package-lock.json');
  run(`git commit -m "chore: release ${tag}"`);
}

// --- tag + push ---
run(`git tag -a ${tag} -m "${tag}"`);
run('git push origin main');
run(`git push origin ${tag}`);

console.log(`\nPushed ${tag} — the release workflow will build and publish automatically.`);
console.log('Track progress in the Actions tab (or: gh run watch).');
