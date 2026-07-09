function getIssues(user) {
  const affiliates = safeReadSheetObjects(SHEET_NAMES.AFFILIATES);
  const items = enrichIssues(filterRowsForUser(safeReadSheetObjects(SHEET_NAMES.ISSUE_LOG), user), affiliates);
  return {
    count: items.length,
    items: items
  };
}

function enrichIssues(issues, affiliates) {
  const affiliateMap = {};

  (affiliates || []).forEach(function (affiliate) {
    const affiliateId = safeString(affiliate.Affiliate_ID);
    if (affiliateId) {
      affiliateMap[affiliateId] = affiliate;
    }
  });

  return (issues || []).map(function (row) {
    const item = copyRow(row);
    const affiliate = affiliateMap[safeString(item.Affiliate_ID)] || {};
    item.Affiliate_Name = item.Affiliate_Name || safeString(affiliate.Affiliate_Name);
    item.Brand = item.Brand || safeString(affiliate.Brand);
    return item;
  });
}
