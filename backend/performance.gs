function getPerformance(user) {
  const items = filterPerformanceForUser(safeReadSheetObjects(SHEET_NAMES.MONTHLY_PERFORMANCE), user);
  return {
    count: items.length,
    items: items
  };
}
