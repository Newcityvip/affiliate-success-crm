function getInteractions(user) {
  const items = filterInteractionsForUser(safeReadSheetObjects(SHEET_NAMES.INTERACTION_LOG), user);
  return {
    count: items.length,
    items: items
  };
}
