import type { ViewType } from '../types';

export type AppRoute =
  | { view: 'dashboard' }
  | { view: 'suites' }
  | { view: 'new-run' }
  | { view: 'runs' }
  | { view: 'result'; runId: string }
  | { view: 'regression'; runId: string }
  | { view: 'architecture' };

const staticPaths: Record<Exclude<ViewType, 'result' | 'regression'>, string> = {
  dashboard: '/',
  suites: '/suites',
  'new-run': '/runs/new',
  runs: '/runs',
  architecture: '/architecture',
};

const normalizePathname = (pathname: string) => {
  const normalized = pathname.replace(/\/+$/, '');
  return normalized || '/';
};

const decodeRunId = (encodedRunId: string) => {
  try {
    return decodeURIComponent(encodedRunId);
  } catch {
    return encodedRunId;
  }
};

export const parseRoute = (pathname: string): AppRoute => {
  const path = normalizePathname(pathname);
  if (path === '/') return { view: 'dashboard' };
  if (path === '/suites') return { view: 'suites' };
  if (path === '/runs/new') return { view: 'new-run' };
  if (path === '/runs') return { view: 'runs' };
  if (path === '/architecture') return { view: 'architecture' };

  const regressionMatch = path.match(/^\/runs\/([^/]+)\/regression$/);
  if (regressionMatch) return { view: 'regression', runId: decodeRunId(regressionMatch[1]) };

  const resultMatch = path.match(/^\/runs\/([^/]+)$/);
  if (resultMatch) return { view: 'result', runId: decodeRunId(resultMatch[1]) };

  return { view: 'dashboard' };
};

export const routePath = (route: AppRoute): string => {
  if (route.view === 'result') return `/runs/${encodeURIComponent(route.runId)}`;
  if (route.view === 'regression') return `/runs/${encodeURIComponent(route.runId)}/regression`;
  return staticPaths[route.view];
};

export const routeForView = (view: ViewType, selectedRunId: string): AppRoute => {
  if (view === 'result') return selectedRunId ? { view, runId: selectedRunId } : { view: 'runs' };
  if (view === 'regression') return selectedRunId ? { view, runId: selectedRunId } : { view: 'runs' };
  return { view };
};
