function getIssues() {
  const items = safeReadSheetObjects(SHEET_NAMES.ISSUE_LOG);
  return {
    count: items.length,
    items: items
  };
}
