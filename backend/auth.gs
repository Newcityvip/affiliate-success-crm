/**
 * Sprint 4A authentication foundation.
 * Temporary dev auth uses Login_ID only. Password/PIN verification should be
 * added in a later security sprint without exposing secrets to the frontend.
 */

function loginStaff(loginId) {
  const normalizedLogin = normalizeAuthValue(loginId);
  const staffResult = getStaffRowsForAuth();
  const staffRows = staffResult.rows;
  var user;

  if (!normalizedLogin) {
    throwCodedError('AUTH_REQUIRED_FIELD', 'Login ID is required.');
  }

  user = findStaffUser(normalizedLogin, staffRows);

  if (!user && staffRows.length === 0 && normalizedLogin.toUpperCase() === 'ADMIN01') {
    user = createDevAdminUser(normalizedLogin);
  }

  if (!user && staffResult.error) {
    throwCodedError('AUTH_CONFIG_ERROR', 'Staff authentication could not read Staff_List.');
  }

  if (!user) {
    throwCodedError('AUTH_INVALID_LOGIN', 'Login ID was not found.');
  }

  if (!isActiveStaffUser(user.raw || {})) {
    throwCodedError('AUTH_INACTIVE_USER', 'This staff account is inactive.');
  }

  return createSession(user);
}

function getSession(sessionToken) {
  const token = safeString(sessionToken);
  const stored = token ? readSessionData(token) : null;

  if (!stored) {
    return {
      valid: false,
      user: null
    };
  }

  if (stored.expiresAt && new Date(stored.expiresAt).getTime() < new Date().getTime()) {
    destroySession(token);
    return {
      valid: false,
      user: null
    };
  }

  return {
    valid: true,
    sessionToken: token,
    expiresAt: stored.expiresAt,
    user: sanitizeUser(stored.user || {})
  };
}

function logout(sessionToken) {
  destroySession(sessionToken);
  return {
    loggedOut: true
  };
}

function validateSession(sessionToken) {
  return getSession(sessionToken);
}

function createSession(user) {
  const token = Utilities.getUuid() + '-' + Utilities.getUuid();
  const expiresAt = new Date(new Date().getTime() + SESSION_CONFIG.ttlMinutes * 60 * 1000).toISOString();
  const session = {
    user: sanitizeUser(user),
    expiresAt: expiresAt,
    createdAt: getTimestamp()
  };
  const serialized = JSON.stringify(session);

  CacheService.getScriptCache().put(getSessionCacheKey(token), serialized, Math.min(21600, SESSION_CONFIG.ttlMinutes * 60));
  PropertiesService.getScriptProperties().setProperty(getSessionPropertyKey(token), serialized);

  return {
    sessionToken: token,
    expiresAt: expiresAt,
    user: session.user
  };
}

function destroySession(sessionToken) {
  const token = safeString(sessionToken);
  if (!token) {
    return {
      destroyed: false
    };
  }

  CacheService.getScriptCache().remove(getSessionCacheKey(token));
  PropertiesService.getScriptProperties().deleteProperty(getSessionPropertyKey(token));

  return {
    destroyed: true
  };
}

function getCurrentUserFromRequest(e) {
  const sessionToken = getSessionTokenFromRequest(e);
  const session = getSession(sessionToken);
  return session.valid ? session.user : null;
}

function requireAuth(e) {
  const user = getCurrentUserFromRequest(e);
  if (!user) {
    throwCodedError('UNAUTHORIZED', 'Unauthorized');
  }

  return user;
}

function requireRole(user, allowedRoles) {
  const role = normalizeRole(user && user.role);
  if ((allowedRoles || []).indexOf(role) === -1) {
    throwCodedError('FORBIDDEN', 'Restricted access');
  }

  return true;
}

function isAdminUser(user) {
  const role = normalizeRole(user && user.role);
  return role === AUTH_ROLES.ADMIN || role === AUTH_ROLES.SUPER_ADMIN;
}

function isAssignedToUser(row, user) {
  const assigned = safeString(getFirstValue(row || {}, [
    'Assigned_Staff',
    'Assigned Staff',
    'Assigned_To',
    'Assigned To',
    'Staff',
    'Owner',
    'Staff_ID',
    'Staff ID',
    'Email'
  ])).toLowerCase();
  const identifiers = getUserIdentifiers(user);

  if (!assigned) {
    return false;
  }

  return identifiers.indexOf(assigned) !== -1;
}

function filterRowsForUser(rows, user) {
  if (isAdminUser(user)) {
    return rows || [];
  }

  return (rows || []).filter(function (row) {
    return isAssignedToUser(row, user);
  });
}

function filterAffiliatesForUser(rows, user) {
  if (isAdminUser(user)) {
    return rows || [];
  }

  return (rows || []).filter(function (row) {
    return isAssignedToUser(row, user);
  });
}

function filterInteractionsForUser(rows, user) {
  if (isAdminUser(user)) {
    return rows || [];
  }

  return (rows || []).filter(function (row) {
    return isAssignedToUser(row, user);
  });
}

function filterPerformanceForUser(rows, user) {
  if (isAdminUser(user)) {
    return rows || [];
  }

  return (rows || []).filter(function (row) {
    return isAssignedToUser(row, user);
  });
}

function filterBrandsForUser(rows, affiliates, user) {
  const allowedBrands = {};

  if (isAdminUser(user)) {
    return rows || [];
  }

  filterAffiliatesForUser(affiliates || [], user).forEach(function (row) {
    const brand = safeString(getFirstValue(row, ['Brand', 'Brand_Name', 'Brand Name', 'Name']));
    if (brand) {
      allowedBrands[brand.toLowerCase()] = true;
    }
  });

  return (rows || []).filter(function (row) {
    const brand = safeString(getFirstValue(row, ['Brand', 'Brand_Name', 'Brand Name', 'Name']));
    return brand && allowedBrands[brand.toLowerCase()];
  });
}

function buildLimitedSettingsSummary(user) {
  return {
    profile: sanitizeUser(user),
    items: [
      {
        label: 'Signed in as',
        value: getUserDisplayName(user)
      },
      {
        label: 'Role',
        value: normalizeRole(user && user.role)
      },
      {
        label: 'Editable settings',
        value: 'Restricted to administrators'
      },
      {
        label: 'IP allowlist',
        value: 'Prepared for later enforcement'
      }
    ]
  };
}

function getClientIp(e) {
  const headers = (e && e.headers) || {};
  return safeString(headers['X-Forwarded-For'] || headers['x-forwarded-for'] || headers['X-Real-IP'] || headers['x-real-ip']);
}

function getSessionTokenFromRequest(e) {
  const params = (e && e.parameter) || {};
  const contents = e && e.postData && e.postData.contents ? e.postData.contents : '';
  var body = {};

  if (contents) {
    try {
      body = JSON.parse(contents);
    } catch (error) {
      body = {};
    }
  }

  return safeString(params.sessionToken || params.session_token || body.sessionToken || body.session_token);
}

function getStaffRowsForAuth() {
  try {
    return {
      rows: readSheetObjectsRequired(SHEET_NAMES.STAFF_LIST),
      error: null
    };
  } catch (error) {
    return getStaffRowsForAuthDirect(error);
  }
}

function getStaffRowsForAuthDirect(originalError) {
  try {
    const spreadsheet = getSpreadsheet();
    const sheet = spreadsheet.getSheetByName('Staff_List') || getSheetByNameSafe(SHEET_NAMES.STAFF_LIST);
    return {
      rows: sheet ? readSheetObjectsFromSheet(sheet) : [],
      error: sheet ? null : (originalError || new Error('Missing required sheet: Staff_List'))
    };
  } catch (fallbackError) {
    return {
      rows: [],
      error: originalError || fallbackError
    };
  }
}

function getAuthDebug(loginId) {
  const normalizedLogin = normalizeAuthValue(loginId);
  const result = getStaffRowsForAuth();
  const headers = getSheetHeadersSafe(SHEET_NAMES.STAFF_LIST);
  var match = findStaffUser(normalizedLogin, result.rows);
  var raw = match && match.raw ? match.raw : {};

  if (!match && result.rows.length) {
    match = findStaffUser(normalizedLogin, result.rows);
    raw = match && match.raw ? match.raw : {};
  }

  return {
    staffSheetFound: headers.length > 0 || result.rows.length > 0,
    sheetFound: headers.length > 0 || result.rows.length > 0,
    headers: headers,
    rowCount: result.rows.length,
    loginIdSearched: safeString(loginId),
    loginIdFound: !!match,
    matchedStaffId: match ? safeString(match.staffId) : '',
    matchedName: match ? safeString(match.name) : '',
    activeRaw: safeString(getFirstValue(raw, ['Active', 'Status'])),
    activeParsed: match ? isActiveStaffUser(raw) : false,
    roleRaw: safeString(getFirstValue(raw, ['Role'])),
    permissionRaw: safeString(getFirstValue(raw, ['Permission_Level', 'Permission Level'])),
    normalizedRole: match ? normalizeRole(match.role) : '',
    errorCode: result.error ? 'AUTH_CONFIG_ERROR' : '',
    errorMessage: result.error ? 'Staff_List could not be read.' : ''
  };
}

function findStaffUser(loginId, staffRows) {
  const login = normalizeAuthValue(loginId).toLowerCase();
  var match = null;

  (staffRows || []).some(function (row) {
    const candidates = [
      getFirstValue(row, ['Login_ID', 'Login ID', 'LoginID', 'loginId', 'login_id']),
      getFirstValue(row, ['Staff_ID', 'Staff ID', 'StaffID', 'staffId', 'staff_id']),
      getFirstValue(row, ['Email']),
      getFirstValue(row, ['Staff_Name', 'Staff Name', 'Name'])
    ].map(function (value) {
      return normalizeAuthValue(value).toLowerCase();
    });

    if (candidates.indexOf(login) !== -1) {
      match = rowToUser(row, loginId);
      return true;
    }

    return false;
  });

  return match;
}

function rowToUser(row, loginId) {
  const roleValue = safeString(getFirstValue(row, ['Role']));
  const permissionValue = safeString(getFirstValue(row, ['Permission_Level', 'Permission Level']));
  const login = safeString(getFirstValue(row, ['Login_ID', 'Login ID', 'LoginID', 'loginId', 'login_id'])) || safeString(loginId);

  return {
    staffId: safeString(getFirstValue(row, ['Staff_ID', 'Staff ID', 'StaffID', 'staffId', 'staff_id'])),
    loginId: login,
    name: safeString(getFirstValue(row, ['Staff_Name', 'Staff Name', 'Name'])) || login,
    email: safeString(getFirstValue(row, ['Email'])),
    team: safeString(getFirstValue(row, ['Team'])),
    role: normalizeRole(roleValue || permissionValue || (login.toUpperCase() === 'ADMIN01' ? AUTH_ROLES.SUPER_ADMIN : AUTH_ROLES.STAFF)),
    raw: row
  };
}

function createDevAdminUser(loginId) {
  return {
    staffId: 'ADMIN01',
    loginId: safeString(loginId),
    name: 'Super Admin',
    email: '',
    team: 'Administration',
    role: AUTH_ROLES.SUPER_ADMIN,
    raw: {
      Login_ID: 'ADMIN01',
      Status: 'Active',
      Active: 'Yes'
    }
  };
}

function isActiveStaffUser(row) {
  const status = safeString(getFirstValue(row, ['Status'])).toLowerCase();
  const active = safeString(getFirstValue(row, ['Active'])).toLowerCase();

  if (status && ['inactive', 'disabled', 'blocked', 'suspended'].indexOf(status) !== -1) {
    return false;
  }

  if (active && ['yes', 'true', 'active', '1'].indexOf(active) !== -1) {
    return true;
  }

  if (active && ['no', 'false', '0', 'inactive', 'disabled'].indexOf(active) !== -1) {
    return false;
  }

  return true;
}

function sanitizeUser(user) {
  return {
    staffId: safeString(user.staffId),
    loginId: safeString(user.loginId),
    name: safeString(user.name) || safeString(user.loginId) || 'Staff User',
    email: safeString(user.email),
    team: safeString(user.team),
    role: normalizeRole(user.role)
  };
}

function normalizeRole(role) {
  const normalized = safeString(role).toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');

  if (normalized === AUTH_ROLES.SUPER_ADMIN || normalized === 'SUPERADMIN' || normalized === 'SUPER_ADMINISTRATOR') {
    return AUTH_ROLES.SUPER_ADMIN;
  }

  if (normalized === AUTH_ROLES.ADMIN || normalized === 'ADMINISTRATOR') {
    return AUTH_ROLES.ADMIN;
  }

  return AUTH_ROLES.STAFF;
}

function normalizeAuthValue(value) {
  return safeString(value).replace(/\s+/g, '');
}

function getUserIdentifiers(user) {
  const values = [
    user && user.staffId,
    user && user.loginId,
    user && user.name,
    user && user.email
  ];
  const identifiers = [];

  values.forEach(function (value) {
    const normalized = safeString(value).toLowerCase();
    if (normalized && identifiers.indexOf(normalized) === -1) {
      identifiers.push(normalized);
    }
  });

  return identifiers;
}

function getUserDisplayName(user) {
  return safeString(user && user.name) || safeString(user && user.loginId) || 'Staff User';
}

function getSessionCacheKey(token) {
  return 'crm_session_' + token;
}

function getSessionPropertyKey(token) {
  return 'crm_session_' + token;
}

function readSessionData(token) {
  const cacheKey = getSessionCacheKey(token);
  const propertyKey = getSessionPropertyKey(token);
  var serialized = CacheService.getScriptCache().get(cacheKey);

  if (!serialized) {
    serialized = PropertiesService.getScriptProperties().getProperty(propertyKey);
    if (serialized) {
      CacheService.getScriptCache().put(cacheKey, serialized, Math.min(21600, SESSION_CONFIG.ttlMinutes * 60));
    }
  }

  if (!serialized) {
    return null;
  }

  try {
    return JSON.parse(serialized);
  } catch (error) {
    return null;
  }
}
