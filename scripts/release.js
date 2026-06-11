#!/usr/bin/env node
/**
 * Release script — builds Windows installer and publishes a GitHub release.
 *
 * Usage:
 *   node scripts/release.js           # release current version
 *   node scripts/release.js patch     # bump patch (0.1.0 → 0.1.1), then release
 *   node scripts/release.js minor     # bump minor (0.1.0 → 0.2.0), then release
 *   node scripts/release.js major     # bump major (0.1.0 → 1.0.0), then release
 *
 * Requirements:
 *   - gh CLI installed and authenticated  (winget install GitHub.cli)
 *   - git working tree must be clean before running
 */

const { execSync } = require('child_process');
const { readFileSync, existsSync } = require('fs');
const path = require('path');

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  return execSync(cmd, { stdio: 'inherit', ...opts });
}

function runCapture(cmd) {
  return execSync(cmd, { encoding: 'utf-8' }).trim();
}

// --- bump version if requested ---
const bumpType = process.argv[2];
if (bumpType && ['patch', 'minor', 'major'].includes(bumpType)) {
  run(`npm version ${bumpType} --no-git-tag-version`);
} else if (bumpType) {
  console.error(`Unknown bump type: ${bumpType}. Use patch, minor, or major.`);
  process.exit(1);
}

// --- read current version ---
const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
const version = pkg.version;
const tag = `v${version}`;
const productName = pkg.build.productName;
const exePath = path.join('release', `${productName} Setup ${version}.exe`);

console.log(`\n  Releasing ${productName} ${tag}\n`);

// --- check gh is available ---
try {
  runCapture('gh --version');
} catch {
  console.error('\nERROR: gh CLI not found. Install it with:\n  winget install GitHub.cli\nThen run: gh auth login\n');
  process.exit(1);
}

// --- check tag does not already exist ---
const existingTags = runCapture('git tag -l').split('\n').filter(Boolean);
if (existingTags.includes(tag)) {
  console.error(`\nERROR: tag ${tag} already exists. Bump the version first.\n`);
  process.exit(1);
}

// --- build ---
console.log('\nBuilding Windows installer...');
run('npm run dist:win');

// verify artifact exists
if (!existsSync(exePath)) {
  console.error(`\nERROR: Expected artifact not found: ${exePath}\n`);
  process.exit(1);
}

// --- commit any version bump changes ---
const dirty = runCapture('git status --porcelain');
if (dirty) {
  run('git add package.json');
  run(`git commit -m "chore: release ${tag}"`);
}

// --- tag + push ---
run(`git tag ${tag}`);
run('git push origin main --follow-tags');

// --- GitHub release ---
console.log(`\nCreating GitHub release ${tag}...`);
run(`gh release create ${tag} "${exePath}" --title "${productName} ${tag}" --generate-notes`);

console.log(`\nRelease ${tag} published!`);
