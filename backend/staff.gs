function getStaff() {
  const items = safeReadSheetObjects(SHEET_NAMES.STAFF_LIST);
  return {
    count: items.length,
    items: items
  };
}
