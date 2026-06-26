function getAffiliates(user) {
  const items = filterAffiliatesForUser(readSheetObjects(SHEET_NAMES.AFFILIATES), user);
  return {
    count: items.length,
    items: items
  };
}
