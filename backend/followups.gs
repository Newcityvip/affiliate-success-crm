function getFollowups(user) {
  const items = enrichFollowups(filterRowsForUser(safeReadSheetObjects(SHEET_NAMES.FOLLOWUP_QUEUE), user));
  return {
    count: items.length,
    items: items
  };
}

function createFollowup(payload, user) {
  const data = normalizeFollowupPayload(payload);

  if (!isAdminUser(user)) {
    data.Assigned_Staff = getUserDisplayName(user);
  }

  validateFollowupData(data);

  if (!data.Queue_ID) {
    data.Queue_ID = createSimpleId('FU');
  }

  appendSheetObject(SHEET_NAMES.FOLLOWUP_QUEUE, data);

  return {
    item: data
  };
}

function updateFollowup(payload, user) {
  const data = normalizeFollowupPayload(payload);
  const queueId = safeString(data.Queue_ID);
  var existing;

  if (!queueId) {
    throw new Error('Queue_ID is required.');
  }

  existing = getFollowupByQueueId(queueId);

  if (!isAdminUser(user) && !isAssignedToUser(existing, user)) {
    throwCodedError('FORBIDDEN', 'You can only update your assigned follow-ups.');
  }

  if (!isAdminUser(user)) {
    data.Assigned_Staff = getUserDisplayName(user);
  }

  validateFollowupData(data);

  return {
    item: updateSheetObjectByKey(SHEET_NAMES.FOLLOWUP_QUEUE, 'Queue_ID', queueId, data)
  };
}

function completeFollowup(payload, user) {
  const queueId = safeString(payload && payload.Queue_ID);
  var existing;

  if (!queueId) {
    throw new Error('Queue_ID is required.');
  }

  existing = getFollowupByQueueId(queueId);

  if (!isAdminUser(user) && !isAssignedToUser(existing, user)) {
    throwCodedError('FORBIDDEN', 'You can only complete your assigned follow-ups.');
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

function validateFollowupData(data) {
  if (!safeString(data.Affiliate_ID)) {
    throwCodedError('VALIDATION_ERROR', 'Affiliate_ID is required.');
  }

  if (!safeString(data.Assigned_Staff)) {
    throwCodedError('VALIDATION_ERROR', 'Assigned_Staff is required.');
  }

  if (!safeString(data.Followup_Date)) {
    throwCodedError('VALIDATION_ERROR', 'Followup_Date is required.');
  }
}

function getFollowupByQueueId(queueId) {
  const id = safeString(queueId);
  const matches = safeReadSheetObjects(SHEET_NAMES.FOLLOWUP_QUEUE).filter(function (row) {
    return safeString(row.Queue_ID) === id;
  });

  if (!matches.length) {
    throwCodedError('NOT_FOUND', 'Follow-up was not found.');
  }

  return matches[0];
}

function enrichFollowups(items) {
  const affiliateMap = {};

  safeReadSheetObjects(SHEET_NAMES.AFFILIATES).forEach(function (affiliate) {
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
