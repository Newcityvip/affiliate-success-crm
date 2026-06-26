function getBrands() {
  const items = safeReadSheetObjects(SHEET_NAMES.BRAND_LIST);
  return {
    count: items.length,
    items: items
  };
}
