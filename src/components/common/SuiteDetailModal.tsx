import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Severity, TestCase, TestSuite } from '../../types';
import { X, Plus, Trash2, Edit2, AlertCircle, Loader2 } from 'lucide-react';
import { getTestCases, createTestCase, deleteTestCase, type TestCaseListApiResponse } from '../../services/testCaseService';
import { deleteTestSuite } from '../../services/testSuiteService';
import { ApiError, presentApiError } from '../../services/apiClient';
import { RequestErrorBanner } from './RequestErrorBanner';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { LAYER_CLASS } from '../../config/layers';

const TEST_CASE_PAGE_SIZE = 20;

const pageItems = (currentPage: number, totalPages: number): Array<number | 'ellipsis'> => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 3);
    pages.add(totalPages - 2);
    pages.add(totalPages - 1);
  }

  const sorted = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  return sorted.flatMap((page, index) => index > 0 && page - sorted[index - 1] > 1 ? ['ellipsis', page] : [page]);
};

interface SuiteDetailModalProps {
  suite: TestSuite | null;
  onClose: () => void;
  onDeleted: () => void;
  onNotify: (msg: string) => void;
}

type AddCaseValidationField = 'name' | 'input' | 'category' | 'request';

type AddCaseValidation = {
  field: AddCaseValidationField;
  message: string;
};

export const SuiteDetailModal: React.FC<SuiteDetailModalProps> = ({ suite, onClose, onDeleted, onNotify }) => {
  const [cases, setCases] = useState<TestCase[]>([]);
  const [casesOwnerSuiteId, setCasesOwnerSuiteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageMeta, setPageMeta] = useState<TestCaseListApiResponse['page'] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);
  const [addValidation, setAddValidation] = useState<AddCaseValidation | null>(null);
  const [newCase, setNewCase] = useState<Partial<TestCase>>({
    name: '',
    input: '',
    expectedAction: 'BLOCK',
    severity: 'HIGH',
    category: 'PII',
  });
  const caseNameRef = useRef<HTMLInputElement>(null);
  const caseInputRef = useRef<HTMLTextAreaElement>(null);
  const caseCategoryRef = useRef<HTMLInputElement>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const deleteInFlightRef = useRef(false);
  const dialogRef = useDialogFocus({ isOpen: suite !== null, onClose });
  const deleteConfirmDialogRef = useDialogFocus({
    isOpen: isDeleteConfirmOpen,
    onClose: () => {
      if (!isDeleting) setIsDeleteConfirmOpen(false);
    },
    initialFocusRef: cancelDeleteRef,
  });
  const suiteId = suite?.id;

  useEffect(() => {
    if (!suiteId) return undefined;

    let isMounted = true;
    const fetchCases = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const cleanSuiteId = suiteId.replace('suite-', '');
        const res = await getTestCases(cleanSuiteId, { page, size: TEST_CASE_PAGE_SIZE });
        if (isMounted) {
          // A deletion can make the requested last page invalid between requests.
          if (res.items.length === 0 && res.page.totalElements > 0 && res.page.totalPages > 0 && res.page.number > res.page.totalPages) {
            setPage(res.page.totalPages);
            return;
          }
          const mappedCases: TestCase[] = res.items.map((item) => ({
            id: `tc-${item.id}`,
            name: item.name,
            input: item.input,
            expectedAction: item.expectedAction,
            severity: item.severity,
            category: item.category,
            createdAt: item.createdAt || '방금 전',
          }));
          setCases(mappedCases);
          setCasesOwnerSuiteId(suiteId);
          setPageMeta(res.page);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchCases();
    return () => {
      isMounted = false;
    };
  }, [suiteId, page, reloadToken]);

  if (!suite) return null;

  const isCurrentSuiteLoaded = casesOwnerSuiteId === suite.id;
  const visibleCases = isCurrentSuiteLoaded ? cases : [];
  const visiblePageMeta = isCurrentSuiteLoaded ? pageMeta : null;
  const totalCaseCount = visiblePageMeta?.totalElements;

  const failAddValidation = (field: AddCaseValidationField, message: string) => {
    setAddValidation({ field, message });
    requestAnimationFrame(() => {
      const target = {
        name: caseNameRef.current,
        input: caseInputRef.current,
        category: caseCategoryRef.current,
        request: null,
      }[field];
      target?.focus();
    });
  };

  const clearAddValidation = (field: AddCaseValidationField) => {
    setAddValidation((current) => current?.field === field ? null : current);
  };

  const addCaseServerField = (field: string): AddCaseValidationField => {
    if (field.endsWith('name')) return 'name';
    if (field.endsWith('input')) return 'input';
    if (field.endsWith('category')) return 'category';
    return 'request';
  };

  const handleAddCase = async () => {
    const name = newCase.name?.trim() ?? '';
    const input = newCase.input?.trim() ?? '';
    const category = newCase.category?.trim() ?? '';
    if (!name) {
      failAddValidation('name', '테스트 케이스 이름을 입력해 주세요.');
      return;
    }
    if (!input) {
      failAddValidation('input', '테스트 케이스 입력값을 입력해 주세요.');
      return;
    }
    if (!category) {
      failAddValidation('category', '테스트 케이스 카테고리를 입력해 주세요.');
      return;
    }

    setAddValidation(null);
    try {
      const cleanSuiteId = suite.id.replace('suite-', '');
      const response = await createTestCase(cleanSuiteId, {
        name,
        input,
        expectedAction: newCase.expectedAction || 'BLOCK',
        severity: newCase.severity || 'HIGH',
        category,
      });

      const created: TestCase = {
        id: `tc-${response.id}`,
        name: response.name,
        input: response.input,
        expectedAction: response.expectedAction,
        severity: response.severity,
        category: response.category,
        createdAt: response.createdAt || '방금 전',
      };

      setReloadToken((token) => token + 1);
      setIsAdding(false);
      setAddValidation(null);
      setNewCase({ name: '', input: '', expectedAction: 'BLOCK', severity: 'HIGH', category: 'PII' });
      onNotify(`새 테스트 케이스 '${created.name}'가 추가되었습니다 (POST /test-suites/${cleanSuiteId}/test-cases).`);
    } catch (error) {
      const presented = presentApiError(error, '테스트 케이스를 추가하지 못했습니다.');
      if (error instanceof ApiError && error.fieldErrors?.length) {
        failAddValidation(addCaseServerField(error.fieldErrors[0].field), presented.message);
      } else {
        failAddValidation('request', presented.message);
      }
      onNotify(`[추가 실패 · ${presented.code}] ${presented.message}`);
    }
  };

  const handleDeleteCase = async (id: string, name: string) => {
    try {
      const cleanCaseId = id.replace('tc-', '');
      await deleteTestCase(cleanCaseId);
      // 삭제 뒤 서버 메타데이터를 다시 읽어, 비어 버린 마지막 페이지는 자동으로 이전 페이지로 이동한다.
      setReloadToken((token) => token + 1);
      onNotify(`테스트 케이스 '${name}'가 삭제되었습니다.`);
    } catch (error) {
      const presented = presentApiError(error, `'${name}' 삭제에 실패했습니다.`);
      onNotify(`[삭제 실패 · ${presented.code}] ${presented.message}`);
    }
  };

  const openDeleteConfirmation = () => {
    setDeleteError(null);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteSuite = async () => {
    if (deleteInFlightRef.current) return;

    deleteInFlightRef.current = true;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const cleanSuiteId = suite.id.replace('suite-', '');
      await deleteTestSuite(cleanSuiteId);
      deleteInFlightRef.current = false;
      setIsDeleting(false);
      onNotify(`테스트 스위트 '${suite.name}'가 삭제되었습니다.`);
      onDeleted();
    } catch (error) {
      deleteInFlightRef.current = false;
      setIsDeleting(false);
      setDeleteError(error);
      const presented = presentApiError(error, `'${suite.name}' 삭제에 실패했습니다.`);
      onNotify(`[스위트 삭제 실패 · ${presented.code}] ${presented.message}`);
    }
  };

  return createPortal(
    <div className={`fixed inset-0 ${LAYER_CLASS.dialog} flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-rise`}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-hidden={isDeleteConfirmOpen} aria-labelledby="suite-detail-title" tabIndex={-1} className="relative z-10 w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#e5e9ee] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-[#e5e9ee] flex justify-between items-start bg-[#fafbfb]">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl grid place-items-center text-xl font-bold"
              style={{ backgroundColor: suite.tintBg }}
            >
              {suite.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 id="suite-detail-title" className="text-xl font-extrabold text-[#17202a]">{suite.name}</h2>
                {isLoading && <Loader2 size={14} className="animate-spin text-[#1a7f5a]" />}
              </div>
              <p className="text-xs text-[#697586]">{suite.description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="테스트 스위트 상세 창 닫기"
            className="p-2 rounded-xl text-[#697586] hover:bg-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Notice Banner */}
        <div className="px-6 py-3 bg-[#edf6fc] border-b border-[#cfe6dd] text-[#245a80] text-xs flex items-center gap-2">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>
            <b>Snapshot 규칙</b>: 테스트 케이스를 수정/삭제해도 <b>기존 생성된 Run의 Snapshot은 유지</b>되며, 이후 생성되는 새 Run 대상에서만 반영됩니다.
          </span>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loadError !== null && (
            <RequestErrorBanner
              error={loadError}
              fallbackMessage="테스트 케이스 목록을 불러오지 못했습니다."
              stale={isCurrentSuiteLoaded}
              onRetry={() => setReloadToken((token) => token + 1)}
            />
          )}
          {/* Header & Add Button */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-[#17202a]">
                소속 테스트 케이스 목록 ({totalCaseCount ?? '—'}개)
              </h3>
              {isCurrentSuiteLoaded && isLoading && (
                <p role="status" className="mt-1 text-[11px] text-[#697586]">현재 페이지를 갱신하는 중입니다.</p>
              )}
            </div>
            <button
              onClick={() => {
                setIsAdding(!isAdding);
                setAddValidation(null);
              }}
              disabled={!isCurrentSuiteLoaded || isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#17202a] text-white text-xs font-bold hover:bg-[#253545] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={14} /> {isAdding ? '취소' : '케이스 추가'}
            </button>
          </div>

          {/* Add Form (If active) */}
          {isAdding && (
            <div className="p-4 rounded-xl border border-[#1a7f5a]/30 bg-[#f1faf6] space-y-4">
              <h4 className="text-xs font-extrabold text-[#1a7f5a]">새 TestCase 추가</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label htmlFor="new-case-name" className="block text-[11px] font-bold text-[#4e5a68] mb-1">케이스 이름 *</label>
                  <input
                    ref={caseNameRef}
                    id="new-case-name"
                    type="text"
                    placeholder="예: 카드번호 유출 시도"
                    value={newCase.name || ''}
                    onChange={(e) => { setNewCase({ ...newCase, name: e.target.value }); clearAddValidation('name'); }}
                    aria-invalid={addValidation?.field === 'name'}
                    aria-describedby={addValidation?.field === 'name' ? 'add-case-validation-summary' : undefined}
                    className="w-full p-2.5 rounded-lg border border-[#dce1e6] bg-white outline-none focus:border-[#1a7f5a]"
                  />
                </div>
                <div>
                  <label htmlFor="new-case-category" className="block text-[11px] font-bold text-[#4e5a68] mb-1">카테고리 *</label>
                  <input
                    ref={caseCategoryRef}
                    id="new-case-category"
                    type="text"
                    placeholder="예: PII, PROMPT INJECTION"
                    value={newCase.category || ''}
                    onChange={(e) => { setNewCase({ ...newCase, category: e.target.value }); clearAddValidation('category'); }}
                    aria-invalid={addValidation?.field === 'category'}
                    aria-describedby={addValidation?.field === 'category' ? 'add-case-validation-summary' : undefined}
                    className="w-full p-2.5 rounded-lg border border-[#dce1e6] bg-white outline-none focus:border-[#1a7f5a]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="new-case-input" className="block text-[11px] font-bold text-[#4e5a68] mb-1">입력 프롬프트 (Input) *</label>
                  <textarea
                    ref={caseInputRef}
                    id="new-case-input"
                    rows={2}
                    placeholder="LLM에 전달할 입력 텍스트"
                    value={newCase.input || ''}
                    onChange={(e) => { setNewCase({ ...newCase, input: e.target.value }); clearAddValidation('input'); }}
                    aria-invalid={addValidation?.field === 'input'}
                    aria-describedby={addValidation?.field === 'input' ? 'add-case-validation-summary' : undefined}
                    className="w-full p-2.5 rounded-lg border border-[#dce1e6] bg-white outline-none focus:border-[#1a7f5a]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#4e5a68] mb-1">Expected Action</label>
                  <select
                    value={newCase.expectedAction}
                    onChange={(e) => setNewCase({ ...newCase, expectedAction: e.target.value as 'ALLOW' | 'BLOCK' })}
                    className="w-full p-2.5 rounded-lg border border-[#dce1e6] bg-white outline-none"
                  >
                    <option value="BLOCK">BLOCK (차단)</option>
                    <option value="ALLOW">ALLOW (허용)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#4e5a68] mb-1">Severity (심각도)</label>
                  <select
                    value={newCase.severity}
                    onChange={(e) => setNewCase({ ...newCase, severity: e.target.value as Severity })}
                    className="w-full p-2.5 rounded-lg border border-[#dce1e6] bg-white outline-none"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>
              {addValidation && (
                <div id="add-case-validation-summary" className="rounded-lg border border-[#e7c47f] bg-[#fff7e8] px-3 py-2 text-xs font-semibold text-[#78501b]">
                  {addValidation.message}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={handleAddCase}
                  className="px-4 py-2 rounded-lg bg-[#1a7f5a] text-white text-xs font-bold hover:bg-[#146648]"
                >
                  저장하기
                </button>
              </div>
            </div>
          )}

          {/* TestCase Table */}
          <div className="border border-[#e5e9ee] rounded-xl overflow-hidden">
            <div className="max-h-[38vh] overflow-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#fafbfb] border-b border-[#e5e9ee] text-[#7a8592] font-bold uppercase text-[10px]">
                  <th className="p-3">케이스명 / 카테고리</th>
                  <th className="p-3">입력 프롬프트</th>
                  <th className="p-3">Expected</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e9ee]">
                {visibleCases.map((c) => (
                  <tr key={c.id} className="hover:bg-[#fafcfb]">
                    <td className="p-3">
                      <b className="block text-[#17202a]">{c.name}</b>
                      <small className="text-[#697586]">{c.category}</small>
                    </td>
                    <td className="p-3 font-mono text-[#697586] max-w-xs truncate">{c.input}</td>
                    <td className="p-3 font-mono font-bold">
                      <span className={c.expectedAction === 'BLOCK' ? 'text-[#1a7f5a]' : 'text-[#246fa8]'}>
                        {c.expectedAction}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[9px] font-black bg-[#eef1f4] text-[#566271]">
                        {c.severity}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <button
                        onClick={() => onNotify(`'${c.name}' 편집 화면으로 이동합니다.`)}
                        className="p-1.5 rounded text-[#697586] hover:bg-gray-100"
                        title="수정"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteCase(c.id, c.name)}
                        className="p-1.5 rounded text-[#bd3b35] hover:bg-[#fff0ef]"
                        title="삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!isCurrentSuiteLoaded && isLoading && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[#697586]">
                      테스트 케이스 목록을 불러오는 중입니다.
                    </td>
                  </tr>
                )}
                {isCurrentSuiteLoaded && visibleCases.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[#697586]">
                      등록된 테스트 케이스가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="grid grid-cols-3 items-center gap-3 border-t border-[#e5e9ee] bg-[#fafbfb] p-4">
          <button
            type="button"
            onClick={openDeleteConfirmation}
            disabled={isDeleting}
            className="justify-self-start inline-flex items-center gap-1.5 rounded-xl border border-[#e7aaa5] bg-[#fff0ef] px-4 py-2 text-xs font-bold text-[#a82f2a] hover:bg-[#ffe0de] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={14} /> 스위트 삭제
          </button>
          <nav aria-label="테스트 케이스 페이지네이션" className="justify-self-center -translate-x-3 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, (visiblePageMeta?.number ?? page) - 1))}
              disabled={!visiblePageMeta?.hasPrevious || isLoading}
              className="rounded-lg border border-[#dce1e6] px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
            >
              이전
            </button>
            {visiblePageMeta && pageItems(visiblePageMeta.number, visiblePageMeta.totalPages).map((item, index) => item === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} aria-hidden="true" className="px-1 text-xs text-[#697586]">…</span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => setPage(item)}
                disabled={isLoading}
                aria-current={item === visiblePageMeta.number ? 'page' : undefined}
                aria-label={`${item}페이지`}
                className={`min-w-8 rounded-lg px-2 py-2 text-xs font-bold disabled:cursor-not-allowed ${item === visiblePageMeta.number ? 'bg-[#17202a] text-white' : 'text-[#4e5a68] hover:bg-[#eef1f4]'}`}
              >
                {item}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((visiblePageMeta?.number ?? page) + 1)}
              disabled={!visiblePageMeta?.hasNext || isLoading}
              className="rounded-lg border border-[#dce1e6] px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
            >
              다음
            </button>
          </nav>
          <button
            onClick={onClose}
            className="justify-self-end px-4 py-2 rounded-xl bg-[#17202a] text-white text-xs font-bold hover:bg-[#253545]"
          >
            닫기
          </button>
        </div>
      </section>
      {isDeleteConfirmOpen && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-4">
          <section
            ref={deleteConfirmDialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-suite-title"
            aria-describedby="delete-suite-description"
            tabIndex={-1}
            className="w-full max-w-md rounded-2xl border border-[#f1c4bf] bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fff0ef] text-[#bd3b35]">
                <Trash2 size={19} />
              </div>
              <div>
                <h2 id="delete-suite-title" className="text-base font-extrabold text-[#17202a]">테스트 스위트를 삭제할까요?</h2>
                <p id="delete-suite-description" className="mt-2 text-xs leading-relaxed text-[#586473]">
                  <b className="text-[#17202a]">{suite.name}</b>과 현재 소속된 TestCase가 영구 삭제됩니다. 기존 Run과 Snapshot, 실행·평가 결과는 유지됩니다.
                </p>
              </div>
            </div>
            {deleteError !== null && (
              <div className="mt-4">
                <RequestErrorBanner
                  error={deleteError}
                  fallbackMessage="테스트 스위트를 삭제하지 못했습니다."
                  onRetry={handleDeleteSuite}
                />
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                ref={cancelDeleteRef}
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={isDeleting}
                className="rounded-lg border border-[#dce1e6] px-4 py-2 text-xs font-bold text-[#4e5a68] hover:bg-[#f5f7f8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteSuite}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#bd3b35] px-4 py-2 text-xs font-bold text-white hover:bg-[#9f2f2a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting && <Loader2 size={14} className="animate-spin" />} {isDeleting ? '삭제 중...' : '삭제하기'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>,
    document.body,
  );
};
