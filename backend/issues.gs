function getIssues() {
  const items = readSheetObjects(SHEET_NAMES.ISSUE_LOG);
  return {
    count: items.length,
    items: items
  };
}
