function getTasks() {
  const items = safeReadSheetObjects(SHEET_NAMES.TASK_LOG);
  return {
    count: items.length,
    items: items
  };
}
