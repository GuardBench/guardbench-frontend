export function comparisonKey(currentRunId: string, comparisonRunId: string) {
  return currentRunId && comparisonRunId ? `${currentRunId}:${comparisonRunId}` : '';
}

export function shouldLoadComparison(requestedKey: string, loadedKey: string, failedKey: string) {
  return Boolean(requestedKey) && requestedKey !== loadedKey && requestedKey !== failedKey;
}

export function shouldLoadSummary(
  loadDetails: boolean,
  requestedKey: string,
  summaryLoadedKey: string,
  summaryFailedKey: string,
  comparisonLoadedKey: string,
) {
  return !loadDetails
    && comparisonLoadedKey !== requestedKey
    && shouldLoadComparison(requestedKey, summaryLoadedKey, summaryFailedKey);
}

export function preserveSelectedCandidate(selectedId: string, candidateIds: string[]) {
  return candidateIds.includes(selectedId) ? selectedId : (candidateIds[0] ?? '');
}

export function shouldRefreshRegressionAfterRunFinished(
  currentRunId: string,
  finishedRunId: string,
  notFinished: boolean,
) {
  return Boolean(currentRunId) && currentRunId === finishedRunId && notFinished;
}
