function getStaff(user) {
  requireRole(user, [AUTH_ROLES.SUPER_ADMIN, AUTH_ROLES.ADMIN]);
  const items = safeReadSheetObjects(SHEET_NAMES.STAFF_LIST);
  return {
    count: items.length,
    items: items
  };
}
