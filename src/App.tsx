import { useCallback, useEffect, useState } from 'react';
import type { ViewType } from './types';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { DashboardView } from './components/views/DashboardView';
import { SuitesView } from './components/views/SuitesView';
import { NewRunView } from './components/views/NewRunView';
import { RunsView } from './components/views/RunsView';
import { ResultDetailView } from './components/views/ResultDetailView';
import { RegressionSummaryEntry } from './components/views/RegressionSummaryEntry';
import { RegressionDetailView } from './components/views/RegressionDetailView';
import { ArchitectureView } from './components/views/ArchitectureView';
import { runtimeConfig } from './config/runtimeConfig';
import { LAYER_CLASS } from './config/layers';
import {
  parseRoute,
  routeForView,
  routePath,
  selectedRunIdForRoute,
  type AppRoute,
} from './routing/routes';
import { useRegressionComparison } from './hooks/useRegressionComparison';
import { shouldRefreshRegressionAfterRunFinished } from './hooks/regressionComparisonState';

export function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseRoute(window.location.pathname));
  const [rememberedRunId, setRememberedRunId] = useState(() => selectedRunIdForRoute(route, ''));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const currentView = route.view;
  const layoutView = route.view === 'invalid-run' ? route.sourceView : route.view;
  const selectedRunId = selectedRunIdForRoute(route, rememberedRunId);
  const regression = useRegressionComparison(selectedRunId, currentView === 'regression');
  const {
    runId: regressionRunId,
    notFinished: regressionNotFinished,
    retry: retryRegression,
  } = regression.summary;

  useEffect(() => {
    const syncRoute = () => {
      const nextRoute = parseRoute(window.location.pathname);
      setRememberedRunId((current) => selectedRunIdForRoute(nextRoute, current));
      setRoute(nextRoute);
    };
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 2800);
  };

  const navigate = useCallback((nextRoute: AppRoute) => {
    const nextPath = routePath(nextRoute);
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
    setRememberedRunId((current) => selectedRunIdForRoute(nextRoute, current));
    setRoute(nextRoute);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSelectView = (view: ViewType) => {
    navigate(routeForView(view, selectedRunId));
  };

  const handleSelectRun = (runId: string) => {
    navigate({ view: 'result', runId });
  };

  const handleOpenRegression = () => {
    if (!selectedRunId) return;
    navigate({ view: 'regression', runId: selectedRunId });
  };

  const handleRunFinished = useCallback((finishedRunId: string) => {
    const shouldRefresh = shouldRefreshRegressionAfterRunFinished(
      regressionRunId,
      finishedRunId,
      regressionNotFinished,
    );
    if (!shouldRefresh) return false;
    retryRegression();
    return true;
  }, [regressionNotFinished, regressionRunId, retryRegression]);

  const regressionSummary = (
    <RegressionSummaryEntry
      regression={regression.summary}
      onOpenDetail={handleOpenRegression}
    />
  );

  return (
    <div className="min-h-screen flex bg-[#f6f7f9] text-[#17202a]">
      <Sidebar
        currentView={layoutView}
        onSelectView={handleSelectView}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          currentView={layoutView}
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onHelpClick={() => {
            handleSelectView('architecture');
            showToast('Notion 설계 문서를 바탕으로 구성한 아키텍처 뷰입니다.');
          }}
        />

        <main className="flex-1 p-6 sm:p-8 max-w-[1500px] w-full mx-auto">
          {currentView === 'invalid-run' && (
            <section role="alert" className="rounded-xl border border-red-200 bg-white p-6 space-y-3">
              <h1 className="text-xl font-bold">잘못된 실행 주소입니다.</h1>
              <p className="text-sm text-[#697586]">Run ID가 올바르지 않습니다. 실행 이력에서 확인할 실행을 선택해 주세요.</p>
              <button
                onClick={() => navigate({ view: 'runs' })}
                className="rounded-lg bg-[#14231d] px-4 py-2 text-sm font-bold text-white"
              >
                실행 이력으로 이동
              </button>
            </section>
          )}
          {runtimeConfig.dataMode === 'demo' && (
            <div className="mb-5 rounded-xl border border-[#e6c979] bg-[#fff7e8] px-4 py-3 text-xs font-bold text-[#78501b]">
              DEMO 데이터 모드입니다. 화면의 데모·정적 정보는 실제 API 결과가 아닙니다.
            </div>
          )}
          {currentView === 'dashboard' && (
            <DashboardView
              onGoNewRun={() => handleSelectView('new-run')}
              onGoRuns={() => handleSelectView('runs')}
            />
          )}
          {currentView === 'suites' && <SuitesView onNotify={showToast} />}
          {currentView === 'new-run' && (
            <NewRunView
              onNotify={showToast}
              onRunCreated={(runId) => {
                handleSelectRun(runId);
              }}
            />
          )}
          {currentView === 'runs' && (
            <RunsView
              onGoNewRun={() => handleSelectView('new-run')}
              onSelectRun={handleSelectRun}
            />
          )}
          {currentView === 'result' && (
            // ResultDetailView의 Run별 UI 상태는 key에 의해 함께 초기화된다.
            <ResultDetailView
              key={selectedRunId}
              selectedRunId={selectedRunId}
              onGoNewRun={() => handleSelectView('new-run')}
              onRunFinished={handleRunFinished}
              onRefreshRegression={retryRegression}
              regressionRefreshing={regression.summary.loading}
              regressionSummary={regressionSummary}
            />
          )}
          {currentView === 'regression' && (
            <RegressionDetailView
              regression={regression.detail}
              onBack={() => navigate({ view: 'result', runId: selectedRunId })}
            />
          )}
          {currentView === 'architecture' && <ArchitectureView />}
        </main>
      </div>

      {toastMessage && (
        <div className={`fixed bottom-6 right-6 ${LAYER_CLASS.toast} bg-[#14231d] text-white px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold animate-rise flex items-center gap-2`}>
          <span>✓</span>
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default App;
