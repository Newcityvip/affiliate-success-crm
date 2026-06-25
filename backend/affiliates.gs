function getAffiliates() {
  const items = readSheetObjects(SHEET_NAMES.AFFILIATES);
  return {
    count: items.length,
    items: items
  };
}
