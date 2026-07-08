function getFollowups(user) {
  const items = getCombinedFollowups(user);
  return {
    count: items.length,
    items: items,
    followupSourceCounts: getFollowupSourceCounts(items)
  };
}

function getCombinedFollowups(user, rawFollowups, rawAffiliates) {
  const affiliates = rawAffiliates || safeReadSheetObjects(SHEET_NAMES.AFFILIATES);
  const derived = buildAffiliateNextFollowups(filterAffiliatesForUser(affiliates, user));
  const derivedKeys = {};
  const rawQueue = rawFollowups || safeReadSheetObjects(SHEET_NAMES.FOLLOWUP_QUEUE);
  var queue;

  derived.forEach(function (row) {
    const key = buildFollowupMergeKey(row.Affiliate_ID, row.Followup_Date);
    if (key) {
      derivedKeys[key] = true;
    }
  });

  queue = enrichFollowups(filterRowsForUser(rawQueue, user), affiliates).filter(function (row) {
    return !derivedKeys[buildFollowupMergeKey(row.Affiliate_ID, row.Followup_Date)];
  });

  return derived.concat(queue).map(decorateFollowupBucket);
}

function buildAffiliateNextFollowups(affiliates) {
  return (affiliates || []).filter(function (affiliate) {
    const date = safeString(getFirstValue(affiliate, ['Next_Followup_Date', 'Next Followup Date', 'Next_Followup', 'Next Followup']));
    const active = safeString(getFirstValue(affiliate, ['Active', 'Status'])).toLowerCase();
    const affiliateId = safeString(affiliate.Affiliate_ID);

    if (!affiliateId || !date) {
      return false;
    }

    if (active && ['no', 'false', 'inactive', 'closed'].indexOf(active) !== -1) {
      return false;
    }

    return true;
  }).map(function (affiliate) {
    const date = safeString(getFirstValue(affiliate, ['Next_Followup_Date', 'Next Followup Date', 'Next_Followup', 'Next Followup']));
    const dateKey = getFollowupDateKey(date);
    return {
      Queue_ID: '',
      Affiliate_ID: safeString(affiliate.Affiliate_ID),
      Affiliate_Name: safeString(affiliate.Affiliate_Name),
      Brand: safeString(affiliate.Brand),
      Assigned_Staff: safeString(affiliate.Assigned_Staff),
      Followup_Date: dateKey || date,
      Next_Followup_Date: dateKey || date,
      Priority: safeString(affiliate.Priority),
      Status: 'Pending',
      Generated_From: 'Affiliate Next Follow-up',
      Source: 'Affiliate Next Follow-up',
      Next_Action: safeString(affiliate.Next_Action),
      Notes: safeString(affiliate.Notes),
      isAffiliateNextFollowup: true
    };
  });
}

function buildFollowupMergeKey(affiliateId, dateValue) {
  const date = normalizeFollowupDateKey(dateValue);
  const id = safeString(affiliateId);
  return id && date ? id + '|' + date : '';
}

function normalizeFollowupDateKey(value) {
  const date = parseFollowupDate(value);
  return date ? formatFollowupDateKey(date) : '';
}

function getFollowupDateKey(value) {
  return normalizeFollowupDateKey(value);
}

function getTodayFollowupDateKey() {
  return formatFollowupDateKey(new Date());
}

function getFollowupTimezone() {
  if (typeof Session !== 'undefined' && Session.getScriptTimeZone) {
    return Session.getScriptTimeZone() || 'Asia/Dhaka';
  }

  return 'Asia/Dhaka';
}

function formatFollowupDateKey(date) {
  const tz = getFollowupTimezone();
  if (typeof Utilities !== 'undefined') {
    return Utilities.formatDate(date, tz, 'yyyy-MM-dd');
  }

  return date.getFullYear() + '-' + padNumber(date.getMonth() + 1, 2) + '-' + padNumber(date.getDate(), 2);
}

function parseFollowupDate(value) {
  const text = safeString(value);
  var match;
  var parsed;

  if (!text) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    return new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
  }

  match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  parsed = new Date(text);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function decorateFollowupBucket(row) {
  const item = copyRow(row || {});
  const followupDateKey = getFollowupDateKey(getFirstValue(item, [
    'Followup_Date',
    'Followup Date',
    'Next_Followup_Date',
    'Next Followup Date',
    'Due_Date',
    'Due Date',
    'Date'
  ]));
  const todayKey = getTodayFollowupDateKey();
  var bucket;

  if (isCompletedFollowupStatus(item)) {
    bucket = 'completed';
  } else if (!followupDateKey || followupDateKey === todayKey) {
    bucket = 'today';
  } else if (followupDateKey < todayKey) {
    bucket = 'overdue';
  } else {
    bucket = 'upcoming';
  }

  item.bucket = bucket;
  item.followupDateKey = followupDateKey;
  item.todayKey = todayKey;
  item.timezone = getFollowupTimezone();
  item.source = safeString(getFirstValue(item, ['source', 'Source', 'Generated_From', 'Generated From'])) || 'Followup_Queue';

  return item;
}

function isCompletedFollowupStatus(row) {
  const status = safeString(getFirstValue(row || {}, ['Status', 'Followup_Status', 'Followup Status'])).toLowerCase();
  return ['done', 'complete', 'completed', 'closed', 'resolved'].indexOf(status) !== -1;
}

function getFollowupSourceCounts(items) {
  const counts = {
    queue: 0,
    affiliateNextFollowup: 0
  };

  (items || []).forEach(function (item) {
    if (item && item.isAffiliateNextFollowup) {
      counts.affiliateNextFollowup += 1;
    } else {
      counts.queue += 1;
    }
  });

  return counts;
}

function createFollowup(payload, user) {
  const data = normalizeFollowupPayload(payload);

  requireScopedWrite(data, user);

  if (!isAdminUser(user)) {
    data.Assigned_Staff = getUserDisplayName(user);
  }

  validateFollowupData(data);

  if (!data.Queue_ID) {
    data.Queue_ID = nextSheetId(SHEET_NAMES.FOLLOWUP_QUEUE, 'Queue_ID', 'Q', 4);
  }

  appendSheetObject(SHEET_NAMES.FOLLOWUP_QUEUE, data);
  logActivity(user, 'create', 'Follow-up', data.Queue_ID, buildActivitySummary('Follow-up', data, 'created'));

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

  if (!isAdminUser(user) && !userCanViewAll(user) && !isAssignedToUser(existing, user)) {
    throwCodedError('FORBIDDEN', 'You can only update your assigned follow-ups.');
  }

  if (!isAdminUser(user)) {
    data.Assigned_Staff = getUserDisplayName(user);
  }

  validateFollowupData(data);

  const updated = updateSheetObjectByKey(SHEET_NAMES.FOLLOWUP_QUEUE, 'Queue_ID', queueId, data);
  logActivity(user, 'update', 'Follow-up', queueId, buildActivitySummary('Follow-up', updated, 'updated'));

  return {
    item: updated
  };
}

function rescheduleFollowup(payload, user) {
  const data = normalizeFollowupPayload(payload);
  data.Status = data.Status || 'Rescheduled';
  return updateFollowup(data, user);
}

function completeFollowup(payload, user) {
  const queueId = safeString(payload && payload.Queue_ID);
  var existing;

  if (!queueId) {
    throw new Error('Queue_ID is required.');
  }

  existing = getFollowupByQueueId(queueId);

  if (!isAdminUser(user) && !userCanViewAll(user) && !isAssignedToUser(existing, user)) {
    throwCodedError('FORBIDDEN', 'You can only complete your assigned follow-ups.');
  }

  const updated = updateSheetObjectByKey(SHEET_NAMES.FOLLOWUP_QUEUE, 'Queue_ID', queueId, {
    Status: 'Completed'
  });
  logActivity(user, 'complete', 'Follow-up', queueId, buildActivitySummary('Follow-up', updated, 'completed'));

  return {
    item: updated
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
    Generated_From: safeString(source.Generated_From),
    Notes: safeString(source.Notes)
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

function enrichFollowups(items, affiliates) {
  const affiliateMap = {};

  (affiliates || safeReadSheetObjects(SHEET_NAMES.AFFILIATES)).forEach(function (affiliate) {
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
