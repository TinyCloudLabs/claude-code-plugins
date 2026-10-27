#!/usr/bin/env node
// Keep the bundled tc-apps skill identical to the one on agents.tinycloud.xyz.
//
//   node scripts/sync-skill.mjs           Download the live skill, verify it, then replace the bundled copy.
//   node scripts/sync-skill.mjs --check   Verify the bundled copy against its SHA256SUMS. Offline. CI runs this.
//
// The live skill is at https://agents.tinycloud.xyz/skills/apps/ with a SHA256SUMS file,
// and is listed in https://agents.tinycloud.xyz/skills/index.json.
// Any mismatch stops the script with exit code 1 and leaves the bundled copy as it was.
// Needs Node.js 18 or later. No dependencies.

import { createHash, randomBytes } from 'node:crypto';
import { readFile, readdir, rename, rm, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://agents.tinycloud.xyz';
const INDEX_URL = `${SITE}/skills/index.json`;
const SKILL_URL = `${SITE}/skills/apps/`;
const SKILL_NAME = 'tc-apps';
const SUMS = 'SHA256SUMS';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN_DIR = path.join(ROOT, 'plugins', 'tinycloud');
const SKILL_DIR = path.join(PLUGIN_DIR, 'skills', SKILL_NAME);
const PLUGIN_JSON = path.join(PLUGIN_DIR, '.claude-plugin', 'plugin.json');

// Plain file names only: no folders, no "..", nothing hidden.
const FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

class Refusal extends Error {}

function refuse(message) {
  throw new Refusal(message);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

// Parse a sha256sum-style list: "<64 hex>  <name>" per line.
function parseSums(text) {
  const sums = new Map();
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    const m = /^([0-9a-f]{64}) [ *]([^\s]+)$/.exec(line);
    if (!m) refuse(`${SUMS}: unexpected line: ${JSON.stringify(line)}`);
    const [, hash, name] = m;
    if (!FILE_NAME.test(name) || name === SUMS) refuse(`${SUMS}: refusing file name ${JSON.stringify(name)}`);
    if (sums.has(name)) refuse(`${SUMS}: ${name} is listed twice`);
    sums.set(name, hash);
  }
  if (sums.size === 0) refuse(`${SUMS} lists no files`);
  if (!sums.has('SKILL.md')) refuse(`${SUMS} does not list SKILL.md`);
  return sums;
}

function skillVersion(skillMd) {
  const name = /^name:\s*(\S+)\s*$/m.exec(skillMd);
  if (!name || name[1] !== SKILL_NAME) refuse(`SKILL.md: expected "name: ${SKILL_NAME}"`);
  const version = /^metadata:\s*\n\s+version:\s*"?([^"\s]+)"?\s*$/m.exec(skillMd);
  if (!version) refuse('SKILL.md: no metadata.version');
  return version[1];
}

async function fetchBytes(url) {
  const res = await fetch(url, { redirect: 'error', headers: { 'cache-control': 'no-cache' } });
  if (!res.ok) refuse(`${url}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function readPluginJson() {
  return JSON.parse(await readFile(PLUGIN_JSON, 'utf8'));
}

// Offline check of the bundled copy.
async function check() {
  const sums = parseSums(await readFile(path.join(SKILL_DIR, SUMS), 'utf8'));
  const entries = await readdir(SKILL_DIR, { withFileTypes: true });
  const present = new Set();
  for (const e of entries) {
    if (!e.isFile()) refuse(`${path.relative(ROOT, SKILL_DIR)}/${e.name} is not a plain file`);
    if (e.name !== SUMS) present.add(e.name);
  }
  for (const name of present) if (!sums.has(name)) refuse(`${name} is not listed in ${SUMS}`);
  for (const [name, hash] of sums) {
    if (!present.has(name)) refuse(`${name} is listed in ${SUMS} but missing`);
    const actual = sha256(await readFile(path.join(SKILL_DIR, name)));
    if (actual !== hash) refuse(`${name}: checksum mismatch (expected ${hash}, got ${actual})`);
    console.log(`${name}: OK`);
  }
  const version = skillVersion(await readFile(path.join(SKILL_DIR, 'SKILL.md'), 'utf8'));
  const recorded = (await readPluginJson()).metadata?.[SKILL_NAME]?.version;
  if (recorded !== version) {
    refuse(`plugin.json metadata.${SKILL_NAME}.version is ${JSON.stringify(recorded)}, SKILL.md says ${JSON.stringify(version)}`);
  }
  console.log(`${SKILL_NAME} ${version}: all ${sums.size} files match ${SUMS}`);
  return version;
}

// Download, verify, and only then replace the bundled copy.
async function sync() {
  const index = JSON.parse((await fetchBytes(INDEX_URL)).toString('utf8'));
  const entry = (index.skills || []).find((s) => s.name === SKILL_NAME);
  if (!entry) refuse(`${INDEX_URL} does not list ${SKILL_NAME}`);

  const sumsBytes = await fetchBytes(new URL(SUMS, SKILL_URL).href);
  const sums = parseSums(sumsBytes.toString('utf8'));

  // The index and SHA256SUMS must describe the same files with the same hashes.
  const listed = new Map((entry.files || []).map((f) => [f.path, f]));
  if (listed.size !== sums.size) refuse(`${INDEX_URL} lists ${listed.size} files, ${SUMS} lists ${sums.size}`);
  for (const [name, hash] of sums) {
    const f = listed.get(name);
    if (!f) refuse(`${name} is in ${SUMS} but not in ${INDEX_URL}`);
    if (f.sha256 !== hash) refuse(`${name}: ${SUMS} and ${INDEX_URL} disagree on its checksum`);
  }

  const files = new Map();
  for (const [name, hash] of sums) {
    const bytes = await fetchBytes(new URL(name, SKILL_URL).href);
    const actual = sha256(bytes);
    if (actual !== hash) refuse(`${name}: checksum mismatch (expected ${hash}, got ${actual})`);
    if (bytes.length !== listed.get(name).size) refuse(`${name}: size mismatch`);
    files.set(name, bytes);
    console.log(`${name}: downloaded, checksum OK`);
  }

  const version = skillVersion(files.get('SKILL.md').toString('utf8'));
  if (version !== entry.version) refuse(`SKILL.md says ${version}, ${INDEX_URL} says ${entry.version}`);

  // Write the new copy next to the old one, then swap the folders.
  const tag = randomBytes(4).toString('hex');
  const next = `${SKILL_DIR}.new-${tag}`;
  const prev = `${SKILL_DIR}.old-${tag}`;
  await mkdir(next, { recursive: false });
  try {
    for (const [name, bytes] of files) await writeFile(path.join(next, name), bytes);
    await writeFile(path.join(next, SUMS), sumsBytes);
  } catch (err) {
    await rm(next, { recursive: true, force: true });
    throw err;
  }
  await rename(SKILL_DIR, prev).catch(async (err) => {
    if (err.code !== 'ENOENT') {
      await rm(next, { recursive: true, force: true });
      throw err;
    }
  });
  await rename(next, SKILL_DIR);
  await rm(prev, { recursive: true, force: true });

  const pluginJson = await readPluginJson();
  const before = pluginJson.metadata?.[SKILL_NAME]?.version;
  pluginJson.metadata = { ...pluginJson.metadata, [SKILL_NAME]: { version, source: SKILL_URL } };
  await writeFile(PLUGIN_JSON, `${JSON.stringify(pluginJson, null, 2)}\n`);

  await check();
  if (before !== version) {
    console.log(`\n${SKILL_NAME} changed from ${before} to ${version}.`);
    console.log('Bump "version" in plugins/tinycloud/.claude-plugin/plugin.json, so installed copies update.');
  } else {
    console.log(`\n${SKILL_NAME} is still ${version}.`);
  }
}

const args = process.argv.slice(2);
if (args.some((a) => a !== '--check')) {
  console.error('usage: node scripts/sync-skill.mjs [--check]');
  process.exit(2);
}

try {
  if (args.includes('--check')) await check();
  else await sync();
} catch (err) {
  if (err instanceof Refusal) {
    console.error(`Refusing: ${err.message}`);
    process.exit(1);
  }
  throw err;
}
