function getFollowups() {
  const items = readSheetObjects(SHEET_NAMES.FOLLOWUP_QUEUE);
  return {
    count: items.length,
    items: items
  };
}
