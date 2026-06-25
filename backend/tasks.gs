function getTasks() {
  const items = readSheetObjects(SHEET_NAMES.TASK_LOG);
  return {
    count: items.length,
    items: items
  };
}
