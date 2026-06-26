function getIssues(user) {
  const items = filterRowsForUser(safeReadSheetObjects(SHEET_NAMES.ISSUE_LOG), user);
  return {
    count: items.length,
    items: items
  };
}
