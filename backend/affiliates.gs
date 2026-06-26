function getAffiliates(user) {
  const items = filterAffiliatesForUser(safeReadSheetObjects(SHEET_NAMES.AFFILIATES), user);
  return {
    count: items.length,
    items: items
  };
}
