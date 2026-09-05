export function comparisonKey(currentRunId: string, comparisonRunId: string) {
  return currentRunId && comparisonRunId ? `${currentRunId}:${comparisonRunId}` : '';
}

export function shouldLoadComparison(requestedKey: string, loadedKey: string, failedKey: string) {
  return Boolean(requestedKey) && requestedKey !== loadedKey && requestedKey !== failedKey;
}

export function preserveSelectedCandidate(selectedId: string, candidateIds: string[]) {
  return candidateIds.includes(selectedId) ? selectedId : (candidateIds[0] ?? '');
}
