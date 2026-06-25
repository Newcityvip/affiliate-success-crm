function getPerformance() {
  const items = readSheetObjects(SHEET_NAMES.MONTHLY_PERFORMANCE);
  return {
    count: items.length,
    items: items
  };
}
