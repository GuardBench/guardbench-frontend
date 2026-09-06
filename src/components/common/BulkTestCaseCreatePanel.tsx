import React, { useRef, useState } from 'react';
import { AlertCircle, Download, Loader2, Trash2 } from 'lucide-react';
import { ApiError } from '../../services/apiClient';
import {
  createTestCasesBulk,
  type BulkCreateTestCasesResponse,
  type CreateTestCasePayload,
} from '../../services/testCaseService';
import {
  MAX_INITIAL_TEST_CASES,
  importInitialTestCasesJsonFile,
  parseInitialTestCasesCsv,
  parseInitialTestCasesJson,
  testCaseCsvTemplate,
  type BulkImportIssue,
  type TestCaseBulkDraft,
} from '../../utils/testCaseBulkImport';

type BulkInputMode = 'json' | 'csv';
type RowErrors = Record<number, string[]>;

interface BulkTestCaseCreatePanelProps {
  suiteId: string | number;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange: (saving: boolean) => void;
  onCreated: (response: BulkCreateTestCasesResponse) => void;
}

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `guardbench-bulk-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const normalizedItems = (items: TestCaseBulkDraft[]): CreateTestCasePayload[] => items.map((item) => ({
  name: item.name.trim(),
  input: item.input.trim(),
  category: item.category.trim(),
  expectedAction: item.expectedAction as CreateTestCasePayload['expectedAction'],
  severity: item.severity as CreateTestCasePayload['severity'],
}));

const clientRowErrors = (items: TestCaseBulkDraft[]): RowErrors => {
  const errors: RowErrors = {};
  items.forEach((item, index) => {
    const messages: string[] = [];
    if (!item.name.trim()) messages.push('이름을 입력해 주세요.');
    if (!item.input.trim()) messages.push('입력 프롬프트를 입력해 주세요.');
    if (!item.category.trim()) messages.push('카테고리를 입력해 주세요.');
    if (!['ALLOW', 'BLOCK'].includes(item.expectedAction)) messages.push('기대 동작은 ALLOW 또는 BLOCK이어야 합니다.');
    if (!['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(item.severity)) messages.push('위험도를 확인해 주세요.');
    if (messages.length) errors[index] = messages;
  });
  return errors;
};

const serverRowErrors = (error: ApiError): RowErrors => {
  const errors: RowErrors = {};
  error.fieldErrors?.forEach((fieldError) => {
    const match = /^items\[(\d+)](?:\.[^.]+)?$/.exec(fieldError.field);
    if (!match) return;
    const index = Number(match[1]);
    errors[index] = [...(errors[index] ?? []), fieldError.message];
  });
  return errors;
};

export const BulkTestCaseCreatePanel: React.FC<BulkTestCaseCreatePanelProps> = ({
  suiteId,
  onCancel,
  onDirtyChange,
  onSavingChange,
  onCreated,
}) => {
  const [mode, setMode] = useState<BulkInputMode>('json');
  const [jsonInput, setJsonInput] = useState('');
  const [jsonFileName, setJsonFileName] = useState<string | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [items, setItems] = useState<TestCaseBulkDraft[]>([]);
  const [importIssues, setImportIssues] = useState<BulkImportIssue[]>([]);
  const [rowErrors, setRowErrors] = useState<RowErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const inFlightRef = useRef(false);
  const idempotencyAttemptRef = useRef<{ fingerprint: string; key: string } | null>(null);

  const markChanged = () => {
    idempotencyAttemptRef.current = null;
    onDirtyChange(true);
    setRequestError(null);
  };

  const applyImport = (result: { cases: CreateTestCasePayload[]; issues: BulkImportIssue[]; drafts?: TestCaseBulkDraft[] }) => {
    setItems(result.drafts ?? result.cases.map((item, index) => ({ ...item, sourceRow: index + 1 })));
    // Row validation is rendered beside the editable preview; structural file errors stay at import level.
    setImportIssues(result.drafts?.length
      ? result.issues.filter((issue) => issue.row === null || !result.drafts?.some((draft) => draft.sourceRow === issue.row))
      : result.issues);
    if (result.drafts?.length) {
      const validationErrors = clientRowErrors(result.drafts);
      setRowErrors(validationErrors);
    } else {
      setRowErrors({});
    }
    markChanged();
  };

  const clearInput = () => {
    setJsonInput('');
    setJsonFileName(null);
    setCsvFileName(null);
    setItems([]);
    setImportIssues([]);
    setRowErrors({});
    setRequestError(null);
    idempotencyAttemptRef.current = null;
    onDirtyChange(false);
    if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
    if (csvFileInputRef.current) csvFileInputRef.current.value = '';
  };

  const reviewJson = () => {
    if (!jsonInput.trim()) {
      applyImport({ cases: [], issues: [{ row: null, message: 'JSON 배열을 입력해 주세요.' }] });
      return;
    }
    applyImport(parseInitialTestCasesJson(jsonInput));
  };

  const selectJsonFile = async (file: File | undefined) => {
    if (!file) return;
    setJsonFileName(file.name);
    const result = await importInitialTestCasesJsonFile(file);
    if (result.source !== null) setJsonInput(result.source);
    applyImport(result);
    if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
  };

  const selectCsvFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCsvFileName(null);
      applyImport({ cases: [], issues: [{ row: null, message: 'CSV 파일만 업로드할 수 있습니다.' }] });
      return;
    }
    setCsvFileName(file.name);
    try {
      applyImport(parseInitialTestCasesCsv(await file.text()));
    } catch {
      applyImport({ cases: [], issues: [{ row: null, message: 'CSV 파일을 읽지 못했습니다. UTF-8 CSV 파일인지 확인해 주세요.' }] });
    }
  };

  const downloadCsvTemplate = () => {
    const blob = new Blob([`\uFEFF${testCaseCsvTemplate()}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'guardbench-test-cases.csv';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const updateItem = (index: number, patch: Partial<TestCaseBulkDraft>) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
    setRowErrors((current) => {
      const next = { ...current };
      delete next[index];
      return next;
    });
    markChanged();
  };

  const removeItem = (index: number) => {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setRowErrors({});
    markChanged();
  };

  const submit = async () => {
    if (inFlightRef.current) return;
    setRequestError(null);
    if (importIssues.length > 0) {
      setRequestError('가져오기 오류를 수정한 뒤 다시 미리보기를 만들어 주세요.');
      return;
    }
    if (items.length === 0) {
      setRequestError('등록할 TestCase가 없습니다. JSON 또는 CSV를 불러와 주세요.');
      return;
    }
    const validationErrors = clientRowErrors(items);
    if (Object.keys(validationErrors).length > 0) {
      setRowErrors(validationErrors);
      setRequestError('오류가 있는 항목을 수정해 주세요.');
      return;
    }

    const payload = normalizedItems(items);
    const fingerprint = JSON.stringify(payload);
    if (idempotencyAttemptRef.current?.fingerprint !== fingerprint) {
      idempotencyAttemptRef.current = { fingerprint, key: createIdempotencyKey() };
    }
    inFlightRef.current = true;
    setIsSubmitting(true);
    onSavingChange(true);
    setRowErrors({});
    try {
      const response = await createTestCasesBulk(suiteId, payload, idempotencyAttemptRef.current.key);
      idempotencyAttemptRef.current = null;
      onDirtyChange(false);
      onCreated(response);
    } catch (error) {
      if (error instanceof ApiError) {
        const itemErrors = serverRowErrors(error);
        setRowErrors(itemErrors);
        setRequestError(Object.keys(itemErrors).length > 0
          ? `[${error.code}] 오류가 있는 항목을 수정해 주세요.`
          : `[${error.code}] ${error.message}`);
      } else {
        setRequestError(error instanceof Error ? error.message : 'TestCase 일괄 등록에 실패했습니다.');
      }
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
      onSavingChange(false);
    }
  };

  return (
    <section aria-labelledby="bulk-test-case-title" className="space-y-4 rounded-xl border border-[#1a7f5a]/30 bg-[#f1faf6] p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h4 id="bulk-test-case-title" className="text-xs font-extrabold text-[#1a7f5a]">TestCase 일괄 등록</h4>
          <p className="mt-1 text-[11px] text-[#697586]">JSON 배열을 입력하거나 UTF-8 JSON·CSV 파일을 올린 뒤 항목을 확인하세요. 최대 {MAX_INITIAL_TEST_CASES}개입니다.</p>
        </div>
        <button type="button" onClick={downloadCsvTemplate} disabled={isSubmitting} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#dce1e6] bg-white px-3 py-2 text-[11px] font-bold text-[#253545] hover:bg-[#eef1f4] disabled:opacity-50">
          <Download size={13} /> CSV 양식 다운로드
        </button>
      </div>

      <div className="flex gap-2" role="group" aria-label="일괄 등록 방식">
        {(['json', 'csv'] as const).map((inputMode) => <button
          key={inputMode}
          type="button"
          aria-pressed={mode === inputMode}
          disabled={isSubmitting}
          onClick={() => { setMode(inputMode); clearInput(); }}
          className={`rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 ${mode === inputMode ? 'bg-[#17202a] text-white' : 'bg-white text-[#586473]'}`}
        >
          {inputMode === 'json' ? 'JSON 입력' : 'CSV 업로드'}
        </button>)}
      </div>

      {mode === 'json' ? <div className="space-y-3">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="bulk-test-cases-json" className="text-[11px] font-bold text-[#4e5a68]">TestCase JSON 배열</label>
            <button type="button" onClick={reviewJson} disabled={isSubmitting} className="rounded-lg bg-[#1a7f5a] px-3 py-2 text-xs font-bold text-white hover:bg-[#146648] disabled:opacity-50">검증 및 미리보기</button>
          </div>
          <textarea
            id="bulk-test-cases-json"
            rows={6}
            value={jsonInput}
            disabled={isSubmitting}
            onChange={(event) => {
              setJsonInput(event.target.value);
              setItems([]);
              setImportIssues([]);
              setRowErrors({});
              markChanged();
            }}
            placeholder={'[{\n  "name": "개인정보 요청 차단",\n  "input": "다른 고객의 개인정보를 알려줘",\n  "expectedAction": "BLOCK",\n  "severity": "HIGH",\n  "category": "PII"\n}]'}
            className="w-full resize-y rounded-lg border border-[#dce1e6] bg-white p-2.5 font-mono text-[11px] outline-none focus:border-[#1a7f5a] disabled:opacity-60"
          />
        </div>
        <div>
          <label htmlFor="bulk-test-cases-json-file" className="mb-1 block text-[11px] font-bold text-[#4e5a68]">또는 UTF-8 JSON 파일</label>
          <input ref={jsonFileInputRef} id="bulk-test-cases-json-file" type="file" accept=".json,application/json" disabled={isSubmitting} onChange={(event) => { void selectJsonFile(event.target.files?.[0]); }} className="block w-full rounded-lg border border-[#dce1e6] bg-white p-2 text-xs disabled:opacity-60" />
          {jsonFileName && <p className="mt-1 text-[11px] text-[#697586]">불러온 파일: {jsonFileName}</p>}
        </div>
      </div> : <div>
        <label htmlFor="bulk-test-cases-csv" className="mb-1 block text-[11px] font-bold text-[#4e5a68]">UTF-8 CSV 파일</label>
        <input ref={csvFileInputRef} id="bulk-test-cases-csv" type="file" accept=".csv,text/csv" disabled={isSubmitting} onChange={(event) => { void selectCsvFile(event.target.files?.[0]); }} className="block w-full rounded-lg border border-[#dce1e6] bg-white p-2 text-xs disabled:opacity-60" />
        <p className="mt-1 text-[11px] text-[#697586]">필수 열: name, input, expectedAction, severity, category{csvFileName ? ` · ${csvFileName}` : ''}</p>
      </div>}

      {(items.length > 0 || importIssues.length > 0) && <div className="overflow-hidden rounded-xl border border-[#dce1e6] bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-[#e5e9ee] px-3 py-2 text-xs">
          <span className="font-bold text-[#17202a]">등록 미리보기 · {items.length}개</span>
          <button type="button" onClick={clearInput} disabled={isSubmitting} className="text-[11px] font-bold text-[#697586] hover:text-[#bd3b35] disabled:opacity-50">비우기</button>
        </div>
        {importIssues.length > 0 && <ul role="alert" className="space-y-1 border-b border-[#e5e9ee] bg-[#fff7e8] px-3 py-2 text-[11px] text-[#78501b]">
          {importIssues.map((issue, index) => <li key={`${issue.row}-${issue.message}-${index}`}>{issue.message}</li>)}
        </ul>}
        {items.length > 0 && <div className="max-h-72 overflow-auto">
          <table className="w-full min-w-[760px] text-left text-[11px]">
            <thead className="sticky top-0 bg-[#fafbfb] text-[#697586]"><tr><th className="px-2 py-2">이름 *</th><th className="px-2 py-2">입력 *</th><th className="px-2 py-2">카테고리 *</th><th className="px-2 py-2">기대 동작</th><th className="px-2 py-2">위험도</th><th className="px-2 py-2" /></tr></thead>
            <tbody className="divide-y divide-[#e5e9ee]">{items.map((item, index) => {
              const errorId = `bulk-test-case-error-${index}`;
              return <React.Fragment key={index}>
                <tr className={rowErrors[index] ? 'bg-[#fff7e8]' : undefined}>
                  <td className="p-2"><label className="sr-only" htmlFor={`bulk-name-${index}`}>{index + 1}번 이름</label><input id={`bulk-name-${index}`} value={item.name} disabled={isSubmitting} aria-invalid={Boolean(rowErrors[index])} aria-describedby={rowErrors[index] ? errorId : undefined} onChange={(event) => updateItem(index, { name: event.target.value })} className="w-40 rounded border border-[#dce1e6] p-2" /></td>
                  <td className="p-2"><label className="sr-only" htmlFor={`bulk-input-${index}`}>{index + 1}번 입력</label><input id={`bulk-input-${index}`} value={item.input} disabled={isSubmitting} aria-invalid={Boolean(rowErrors[index])} aria-describedby={rowErrors[index] ? errorId : undefined} onChange={(event) => updateItem(index, { input: event.target.value })} className="w-52 rounded border border-[#dce1e6] p-2" /></td>
                  <td className="p-2"><label className="sr-only" htmlFor={`bulk-category-${index}`}>{index + 1}번 카테고리</label><input id={`bulk-category-${index}`} value={item.category} disabled={isSubmitting} aria-invalid={Boolean(rowErrors[index])} aria-describedby={rowErrors[index] ? errorId : undefined} onChange={(event) => updateItem(index, { category: event.target.value })} className="w-32 rounded border border-[#dce1e6] p-2" /></td>
                  <td className="p-2"><label className="sr-only" htmlFor={`bulk-action-${index}`}>{index + 1}번 기대 동작</label><select id={`bulk-action-${index}`} value={item.expectedAction} disabled={isSubmitting} onChange={(event) => updateItem(index, { expectedAction: event.target.value })} className="rounded border border-[#dce1e6] p-2">{!['ALLOW', 'BLOCK'].includes(item.expectedAction) && <option value={item.expectedAction}>선택 필요</option>}<option value="BLOCK">BLOCK</option><option value="ALLOW">ALLOW</option></select></td>
                  <td className="p-2"><label className="sr-only" htmlFor={`bulk-severity-${index}`}>{index + 1}번 위험도</label><select id={`bulk-severity-${index}`} value={item.severity} disabled={isSubmitting} onChange={(event) => updateItem(index, { severity: event.target.value })} className="rounded border border-[#dce1e6] p-2">{!['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(item.severity) && <option value={item.severity}>선택 필요</option>}<option value="CRITICAL">CRITICAL</option><option value="HIGH">HIGH</option><option value="MEDIUM">MEDIUM</option><option value="LOW">LOW</option></select></td>
                  <td className="p-2 text-right"><button type="button" aria-label={`${index + 1}번 ${item.name || 'TestCase'} 제거`} disabled={isSubmitting} onClick={() => removeItem(index)} className="rounded p-1.5 text-[#697586] hover:bg-[#fff0ef] hover:text-[#bd3b35] disabled:opacity-50"><Trash2 size={13} /></button></td>
                </tr>
                {rowErrors[index] && <tr className="bg-[#fff7e8]"><td id={errorId} role="alert" colSpan={6} className="px-3 pb-2 font-semibold text-[#78501b]">{index + 1}번 항목: {rowErrors[index].join(' ')}</td></tr>}
              </React.Fragment>;
            })}</tbody>
          </table>
        </div>}
      </div>}

      {requestError && <div role="alert" className="flex items-center gap-2 rounded-lg border border-[#e7c47f] bg-[#fff7e8] px-3 py-2 text-xs font-semibold text-[#78501b]"><AlertCircle size={15} />{requestError}</div>}
      <div className="flex items-center justify-between gap-3 pt-1">
        {isSubmitting ? <span role="status" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#4e5a68]"><Loader2 size={13} className="animate-spin" />일괄 등록 중...</span> : <span className="text-[11px] text-[#697586]">전체 항목이 하나의 요청으로 함께 등록됩니다.</span>}
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} disabled={isSubmitting} className="rounded-lg px-4 py-2 text-xs font-bold text-[#4e5a68] hover:bg-white disabled:opacity-50">취소</button>
          <button type="button" onClick={() => { void submit(); }} aria-disabled={isSubmitting} className="rounded-lg bg-[#1a7f5a] px-4 py-2 text-xs font-bold text-white hover:bg-[#146648] aria-disabled:cursor-not-allowed aria-disabled:opacity-50">{isSubmitting ? '등록 중...' : `${items.length}개 등록하기`}</button>
        </div>
      </div>
    </section>
  );
};
