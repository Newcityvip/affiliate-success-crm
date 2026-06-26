function getPerformance() {
  const items = safeReadSheetObjects(SHEET_NAMES.MONTHLY_PERFORMANCE);
  return {
    count: items.length,
    items: items
  };
}
