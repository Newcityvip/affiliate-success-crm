function getTasks(user) {
  const items = filterRowsForUser(safeReadSheetObjects(SHEET_NAMES.TASK_LOG), user);
  return {
    count: items.length,
    items: items
  };
}
