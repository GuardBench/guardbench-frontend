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
import { parseRoute, routeForView, routePath, type AppRoute } from './routing/routes';

export function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseRoute(window.location.pathname));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const currentView = route.view;
  const selectedRunId = 'runId' in route ? route.runId : '';

  useEffect(() => {
    const syncRoute = () => setRoute(parseRoute(window.location.pathname));
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

  return (
    <div className="min-h-screen flex bg-[#f6f7f9] text-[#17202a]">
      <Sidebar
        currentView={currentView}
        onSelectView={handleSelectView}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          currentView={currentView}
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onHelpClick={() => {
            handleSelectView('architecture');
            showToast('Notion 설계 문서를 바탕으로 구성한 아키텍처 뷰입니다.');
          }}
        />

        <main className="flex-1 p-6 sm:p-8 max-w-[1500px] w-full mx-auto">
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
            <div className="space-y-6">
              <ResultDetailView
                key={selectedRunId}
                selectedRunId={selectedRunId}
                onGoNewRun={() => handleSelectView('new-run')}
              />
              <RegressionSummaryEntry
                runId={selectedRunId}
                onOpenDetail={handleOpenRegression}
              />
            </div>
          )}
          {currentView === 'regression' && (
            <RegressionDetailView
              runId={selectedRunId}
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
