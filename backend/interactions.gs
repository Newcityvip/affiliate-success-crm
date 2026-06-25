function getInteractions() {
  const items = readSheetObjects(SHEET_NAMES.INTERACTION_LOG);
  return {
    count: items.length,
    items: items
  };
}
