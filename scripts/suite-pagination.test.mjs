import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/components/common/SuiteDetailModal.tsx', import.meta.url), 'utf8');
const paginationStart = source.indexOf('<nav aria-label="테스트 케이스 페이지네이션"');
const paginationEnd = source.indexOf('</nav>', paginationStart);
const pagination = source.slice(paginationStart, paginationEnd);

test('Suite Detail pagination keeps direction labels horizontal without shrinking', () => {
  assert.notEqual(paginationStart, -1);
  assert.notEqual(paginationEnd, -1);
  assert.equal(pagination.match(/shrink-0 whitespace-nowrap/g)?.length, 2);
  assert.match(pagination, />\s*이전\s*<\/button>/);
  assert.match(pagination, />\s*다음\s*<\/button>/);
});

test('Suite Detail pagination receives a full mobile row and remains horizontally operable', () => {
  assert.match(pagination, /col-span-2/);
  assert.match(pagination, /max-w-full/);
  assert.match(pagination, /overflow-x-auto/);
  assert.match(pagination, /sm:col-span-1/);
});
