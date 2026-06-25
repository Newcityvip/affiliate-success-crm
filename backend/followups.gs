function getFollowups() {
  const items = enrichFollowups(readSheetObjects(SHEET_NAMES.FOLLOWUP_QUEUE));
  return {
    count: items.length,
    items: items
  };
}

function createFollowup(payload) {
  const data = normalizeFollowupPayload(payload);
  if (!data.Queue_ID) {
    data.Queue_ID = createSimpleId('FU');
  }

  appendSheetObject(SHEET_NAMES.FOLLOWUP_QUEUE, data);

  return {
    item: data
  };
}

function updateFollowup(payload) {
  const data = normalizeFollowupPayload(payload);
  const queueId = safeString(data.Queue_ID);

  if (!queueId) {
    throw new Error('Queue_ID is required.');
  }

  return {
    item: updateSheetObjectByKey(SHEET_NAMES.FOLLOWUP_QUEUE, 'Queue_ID', queueId, data)
  };
}

function completeFollowup(payload) {
  const queueId = safeString(payload && payload.Queue_ID);

  if (!queueId) {
    throw new Error('Queue_ID is required.');
  }

  return {
    item: updateSheetObjectByKey(SHEET_NAMES.FOLLOWUP_QUEUE, 'Queue_ID', queueId, {
      Status: 'Completed'
    })
  };
}

function normalizeFollowupPayload(payload) {
  const source = payload || {};
  return {
    Queue_ID: safeString(source.Queue_ID),
    Affiliate_ID: safeString(source.Affiliate_ID),
    Assigned_Staff: safeString(source.Assigned_Staff),
    Followup_Date: safeString(source.Followup_Date),
    Priority: safeString(source.Priority),
    Status: safeString(source.Status) || 'Open',
    Generated_From: safeString(source.Generated_From)
  };
}

function enrichFollowups(items) {
  const affiliateMap = {};

  readSheetObjects(SHEET_NAMES.AFFILIATES).forEach(function (affiliate) {
    const affiliateId = safeString(affiliate.Affiliate_ID);
    if (affiliateId) {
      affiliateMap[affiliateId] = affiliate;
    }
  });

  return items.map(function (item) {
    const affiliate = affiliateMap[safeString(item.Affiliate_ID)] || {};
    item.Affiliate_Name = affiliate.Affiliate_Name || '';
    item.Brand = affiliate.Brand || '';
    return item;
  });
}
