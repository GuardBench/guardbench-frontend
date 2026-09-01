import React, { useState, useEffect } from 'react';
import type { TestCase, TestSuite } from '../../types';
import { X, Plus, Trash2, Edit2, AlertCircle, Loader2 } from 'lucide-react';
import { getTestCases, createTestCase, deleteTestCase } from '../../services/testCaseService';
import { presentApiError } from '../../services/apiClient';
import { RequestErrorBanner } from './RequestErrorBanner';
import { useDialogFocus } from '../../hooks/useDialogFocus';

interface SuiteDetailModalProps {
  suite: TestSuite | null;
  onClose: () => void;
  onNotify: (msg: string) => void;
}

export const SuiteDetailModal: React.FC<SuiteDetailModalProps> = ({ suite, onClose, onNotify }) => {
  const [cases, setCases] = useState<TestCase[]>([]);
  const [casesOwnerSuiteId, setCasesOwnerSuiteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [newCase, setNewCase] = useState<Partial<TestCase>>({
    name: '',
    input: '',
    expectedAction: 'BLOCK',
    severity: 'HIGH',
    category: 'PII',
  });
  const dialogRef = useDialogFocus({ isOpen: suite !== null, onClose });

  useEffect(() => {
    if (!suite) return undefined;

    let isMounted = true;
    const fetchCases = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const cleanSuiteId = suite.id.replace('suite-', '');
        const res = await getTestCases(cleanSuiteId);
        if (isMounted) {
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
          setCasesOwnerSuiteId(suite.id);
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
  }, [suite, reloadToken]);

  if (!suite) return null;

  const isCurrentSuiteLoaded = casesOwnerSuiteId === suite.id;
  const visibleCases = isCurrentSuiteLoaded ? cases : [];

  const handleAddCase = async () => {
    if (!newCase.name || !newCase.input) {
      onNotify('테스트 케이스 이름과 입력값을 모두 입력해 주세요.');
      return;
    }

    try {
      const cleanSuiteId = suite.id.replace('suite-', '');
      const response = await createTestCase(cleanSuiteId, {
        name: newCase.name,
        input: newCase.input,
        expectedAction: newCase.expectedAction || 'BLOCK',
        severity: newCase.severity || 'HIGH',
        category: newCase.category || 'PII',
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

      setCases((currentCases) => [...currentCases, created]);
      setCasesOwnerSuiteId(suite.id);
      setIsAdding(false);
      setNewCase({ name: '', input: '', expectedAction: 'BLOCK', severity: 'HIGH', category: 'PII' });
      onNotify(`새 테스트 케이스 '${created.name}'가 추가되었습니다 (POST /test-suites/${cleanSuiteId}/test-cases).`);
    } catch (error) {
      const presented = presentApiError(error, '테스트 케이스를 추가하지 못했습니다.');
      onNotify(`[추가 실패 · ${presented.code}] ${presented.message}`);
    }
  };

  const handleDeleteCase = async (id: string, name: string) => {
    try {
      const cleanCaseId = id.replace('tc-', '');
      await deleteTestCase(cleanCaseId);
      // 삭제 성공 시에만 UI 상태 업데이트
      setCases((currentCases) => currentCases.filter((c) => c.id !== id));
      onNotify(`테스트 케이스 '${name}'가 삭제되었습니다.`);
    } catch (error) {
      const presented = presentApiError(error, `'${name}' 삭제에 실패했습니다.`);
      onNotify(`[삭제 실패 · ${presented.code}] ${presented.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-rise">
      <div className="absolute inset-0" aria-hidden="true" />

      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="suite-detail-title" tabIndex={-1} className="relative z-10 w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#e5e9ee] flex flex-col max-h-[90vh]">
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
              stale={visibleCases.length > 0}
              onRetry={() => setReloadToken((token) => token + 1)}
            />
          )}
          {/* Header & Add Button */}
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-[#17202a]">
              소속 테스트 케이스 목록 ({visibleCases.length}개)
            </h3>
            <button
              onClick={() => setIsAdding(!isAdding)}
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
                  <label className="block text-[11px] font-bold text-[#4e5a68] mb-1">케이스 이름</label>
                  <input
                    type="text"
                    placeholder="예: 카드번호 유출 시도"
                    value={newCase.name || ''}
                    onChange={(e) => setNewCase({ ...newCase, name: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-[#dce1e6] bg-white outline-none focus:border-[#1a7f5a]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#4e5a68] mb-1">카테고리</label>
                  <input
                    type="text"
                    placeholder="예: PII, PROMPT INJECTION"
                    value={newCase.category || ''}
                    onChange={(e) => setNewCase({ ...newCase, category: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-[#dce1e6] bg-white outline-none focus:border-[#1a7f5a]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[#4e5a68] mb-1">입력 프롬프트 (Input)</label>
                  <textarea
                    rows={2}
                    placeholder="LLM에 전달할 입력 텍스트"
                    value={newCase.input || ''}
                    onChange={(e) => setNewCase({ ...newCase, input: e.target.value })}
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
                    onChange={(e) => setNewCase({ ...newCase, severity: e.target.value as any })}
                    className="w-full p-2.5 rounded-lg border border-[#dce1e6] bg-white outline-none"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>
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
                {!isLoading && !loadError && isCurrentSuiteLoaded && visibleCases.length === 0 && (
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

        {/* Footer */}
        <div className="p-4 border-t border-[#e5e9ee] bg-[#fafbfb] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#17202a] text-white text-xs font-bold hover:bg-[#253545]"
          >
            닫기
          </button>
        </div>
      </section>
    </div>
  );
};
