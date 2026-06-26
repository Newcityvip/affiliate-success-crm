function getInteractions() {
  const items = safeReadSheetObjects(SHEET_NAMES.INTERACTION_LOG);
  return {
    count: items.length,
    items: items
  };
}
