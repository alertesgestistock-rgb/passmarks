const DAY_MS = 24 * 60 * 60 * 1000;

export function adminDateRangeToRpc(dateFilter) {
  if (dateFilter?.range?.from) {
    const from = new Date(dateFilter.range.from);
    const to = new Date(dateFilter.range.to || dateFilter.range.from);
    to.setHours(24, 0, 0, 0);
    return { p_from: from.toISOString(), p_to: to.toISOString() };
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const preset = dateFilter?.preset || 'Last 7 days';

  if (preset === 'Total') return { p_from: null, p_to: null };
  if (preset === 'Today') return { p_from: startOfToday.toISOString(), p_to: now.toISOString() };
  if (preset === '24h') return { p_from: new Date(now.getTime() - DAY_MS).toISOString(), p_to: now.toISOString() };
  if (preset === 'Yesterday') {
    return { p_from: new Date(startOfToday.getTime() - DAY_MS).toISOString(), p_to: startOfToday.toISOString() };
  }
  if (preset === 'This month') {
    return { p_from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), p_to: now.toISOString() };
  }
  const days = preset === 'Last 30 days' ? 30 : 7;
  return { p_from: new Date(now.getTime() - days * DAY_MS).toISOString(), p_to: now.toISOString() };
}
