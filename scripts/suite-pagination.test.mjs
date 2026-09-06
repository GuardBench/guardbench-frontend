import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/components/common/SuiteDetailModal.tsx', import.meta.url), 'utf8');
const paginationStart = source.indexOf('<nav aria-label="테스트 케이스 페이지네이션"');
const paginationEnd = source.indexOf('</nav>', paginationStart);
const pagination = source.slice(paginationStart, paginationEnd);

const directionButtonClassTokens = (label) => {
  const labelIndex = pagination.indexOf(`\n              ${label}\n`);
  assert.notEqual(labelIndex, -1, `${label} button must exist`);
  const buttonStart = pagination.lastIndexOf('<button', labelIndex);
  const buttonMarkup = pagination.slice(buttonStart, labelIndex);
  const className = buttonMarkup.match(/className="([^"]+)"/)?.[1];
  assert.ok(className, `${label} button must have a static className`);
  return new Set(className.split(/\s+/));
};

test('Suite Detail pagination keeps direction labels horizontal without shrinking', () => {
  assert.notEqual(paginationStart, -1);
  assert.notEqual(paginationEnd, -1);
  for (const label of ['이전', '다음']) {
    const classTokens = directionButtonClassTokens(label);
    assert.equal(classTokens.has('shrink-0'), true);
    assert.equal(classTokens.has('whitespace-nowrap'), true);
  }
});

test('Suite Detail pagination receives a full mobile row and remains horizontally operable', () => {
  assert.match(pagination, /col-span-2/);
  assert.match(pagination, /max-w-full/);
  assert.match(pagination, /overflow-x-auto/);
  assert.match(pagination, /sm:col-span-1/);
});

test('Suite Detail footer DOM order follows its mobile visual and focus order', () => {
  const footerStart = source.indexOf('{/* Footer */}');
  const footerEnd = source.indexOf('</div>', source.indexOf('</nav>', footerStart));
  const footer = source.slice(footerStart, footerEnd);

  assert.notEqual(footerStart, -1);
  assert.notEqual(footerEnd, -1);
  assert.ok(footer.indexOf('<nav') < footer.indexOf('스위트 삭제'));
  assert.ok(footer.indexOf('스위트 삭제') < footer.indexOf('닫기'));
});
