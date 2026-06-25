function getBrands() {
  const items = readSheetObjects(SHEET_NAMES.BRAND_LIST);
  return {
    count: items.length,
    items: items
  };
}
