import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const topbar = readFileSync(new URL('../src/components/layout/Topbar.tsx', import.meta.url), 'utf8');
const sidebar = readFileSync(new URL('../src/components/layout/Sidebar.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('the topbar keeps only a neutral accessible user icon', () => {
  assert.match(topbar, /UserRound/);
  assert.match(topbar, /role="img"/);
  assert.match(topbar, /aria-label="사용자"/);
  for (const removedText of ['AP-NORTHEAST-2', 'MVP', '문서', '해인', 'onHelpClick']) {
    assert.doesNotMatch(topbar, new RegExp(removedText));
  }
});

test('the architecture demo is removed from the application shell', () => {
  assert.doesNotMatch(sidebar, /onSelectView\('architecture'\)/);
  assert.doesNotMatch(app, /ArchitectureView|view === 'architecture'/);
  assert.equal(existsSync(new URL('../src/components/views/ArchitectureView.tsx', import.meta.url)), false);
  assert.equal(existsSync(new URL('../src/mocks/mockData.ts', import.meta.url)), false);
});
