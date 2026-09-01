import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE_REPOSITORY = 'GuardBench/guardbench-backend';
const SOURCE_FILE = 'docs/api/openapi.yaml';
const TARGET_FILE = resolve('docs/api/openapi.yaml');
const METADATA_FILE = resolve('docs/api/openapi.source.json');

const [mode, ...rawArgs] = process.argv.slice(2);
const valueOf = (name, fallback) => {
  const index = rawArgs.indexOf(name);
  return index >= 0 ? rawArgs[index + 1] : fallback;
};

const backendPath = resolve(valueOf('--backend-path', '../guardbench-backend'));
const requestedRef = valueOf('--ref', 'origin/dev');
const git = (...args) => execFileSync('git', ['-C', backendPath, ...args], { encoding: 'utf8' }).trim();
const sourceAt = (commit) => execFileSync(
  'git',
  ['-C', backendPath, 'show', `${commit}:${SOURCE_FILE}`],
);
const sha256 = (content) => createHash('sha256').update(content).digest('hex');

const resolveCommit = (ref) => git('rev-parse', `${ref}^{commit}`);
const readMetadata = () => JSON.parse(readFileSync(METADATA_FILE, 'utf8'));

const assertMetadata = (metadata) => {
  if (metadata.repository !== SOURCE_REPOSITORY || metadata.path !== SOURCE_FILE) {
    throw new Error('OpenAPI source metadata가 canonical backend 경로를 가리키지 않습니다.');
  }
  if (!/^[0-9a-f]{40}$/.test(metadata.commit) || !/^[0-9a-f]{64}$/.test(metadata.sha256)) {
    throw new Error('OpenAPI source metadata의 commit 또는 sha256 형식이 올바르지 않습니다.');
  }
};

const verifyTarget = (metadata) => {
  const targetHash = sha256(readFileSync(TARGET_FILE));
  if (targetHash !== metadata.sha256) {
    throw new Error(`프론트 OpenAPI 사본이 다릅니다: metadata=${metadata.sha256}, frontend=${targetHash}`);
  }
};

const verifyContent = (source, metadata) => {
  const sourceHash = sha256(source);
  if (sourceHash !== metadata.sha256) {
    throw new Error(`기록된 source hash가 다릅니다: metadata=${metadata.sha256}, backend=${sourceHash}`);
  }
  verifyTarget(metadata);
};

if (mode === 'sync') {
  const commit = resolveCommit(requestedRef);
  const source = sourceAt(commit);
  const metadata = {
    repository: SOURCE_REPOSITORY,
    commit,
    path: SOURCE_FILE,
    sha256: sha256(source),
  };

  writeFileSync(TARGET_FILE, source);
  writeFileSync(METADATA_FILE, `${JSON.stringify(metadata, null, 2)}\n`);
  console.log(`OpenAPI synchronized from ${SOURCE_REPOSITORY}@${commit}`);
  console.log(`sha256=${metadata.sha256}`);
} else if (mode === 'verify') {
  const metadata = readMetadata();
  assertMetadata(metadata);
  verifyContent(sourceAt(metadata.commit), metadata);
  console.log(`OpenAPI copy verified against ${SOURCE_REPOSITORY}@${metadata.commit}`);
} else if (mode === 'check-latest') {
  const metadata = readMetadata();
  assertMetadata(metadata);
  const latestCommit = resolveCommit(requestedRef);
  const latestSource = sourceAt(latestCommit);
  verifyTarget(metadata);
  const latestHash = sha256(latestSource);
  if (latestHash !== metadata.sha256) {
    throw new Error(
      `Backend OpenAPI drift detected: recorded=${metadata.commit}, latest=${latestCommit}. `
      + 'npm run openapi:sync을 실행하세요.',
    );
  }
  console.log(`OpenAPI copy matches latest ${requestedRef} (${latestCommit})`);
} else {
  console.error('Usage: node scripts/sync-openapi.mjs <sync|verify|check-latest> [--backend-path PATH] [--ref REF]');
  process.exitCode = 2;
}
