function getBrands(user) {
  const items = filterBrandsForUser(
    safeReadSheetObjects(SHEET_NAMES.BRAND_LIST),
    safeReadSheetObjects(SHEET_NAMES.AFFILIATES),
    user
  );
  return {
    count: items.length,
    items: items
  };
}
