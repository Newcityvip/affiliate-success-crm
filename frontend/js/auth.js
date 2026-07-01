(function (window) {
  'use strict';

  var STORAGE_KEY = 'affiliateSuccessSession';
  var api = window.AffiliateSuccessApi;

  function getCurrentSession() {
    var raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    try {
      var session = JSON.parse(raw);
      if (session.expiresAt && new Date(session.expiresAt).getTime() < new Date().getTime()) {
        clearSession();
        return null;
      }
      return session;
    } catch (error) {
      clearSession();
      return null;
    }
  }

  function saveSession(data) {
    var session = {
      sessionToken: data.sessionToken,
      expiresAt: data.expiresAt,
      user: data.user || {}
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  function clearSession() {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  async function login(loginId) {
    var result = await api.login({
      loginId: loginId
    });

    if (!result.ok) {
      clearSession();
      result.message = friendlyAuthMessage(result);
      return result;
    }

    return {
      ok: true,
      success: true,
      data: saveSession(result.data || {}),
      message: result.message || 'Login successful.'
    };
  }

  function friendlyAuthMessage(result) {
    var code = result && (result.code || (result.error && result.error.code));
    if (code === 'AUTH_IP_NOT_ALLOWED') {
      return 'This login is not allowed from your current IP.';
    }
    if (code === 'AUTH_IP_UNKNOWN') {
      return 'Could not verify your IP. Please contact admin.';
    }
    return result && result.message ? result.message : 'Unable to sign in.';
  }

  async function refreshSession() {
    var session = getCurrentSession();
    var result;

    if (!session || !session.sessionToken) {
      return {
        ok: false,
        code: 'UNAUTHORIZED',
        message: 'No active session.'
      };
    }

    result = await api.getSession();
    if (!result.ok || !result.data || !result.data.valid) {
      clearSession();
      return {
        ok: false,
        code: 'UNAUTHORIZED',
        message: 'Session expired.'
      };
    }

    saveSession({
      sessionToken: session.sessionToken,
      expiresAt: result.data.expiresAt || session.expiresAt,
      user: result.data.user || session.user
    });

    return result;
  }

  async function logout() {
    var result = await api.logout();
    clearSession();
    return result;
  }

  function getUser() {
    var session = getCurrentSession();
    return session ? session.user : null;
  }

  function isAdmin(user) {
    var role = String(user && user.role || '').toUpperCase();
    return role === 'ADMIN' || role === 'SUPER_ADMIN';
  }

  window.AffiliateSuccessAuth = Object.freeze({
    login: login,
    logout: logout,
    refreshSession: refreshSession,
    getCurrentSession: getCurrentSession,
    getUser: getUser,
    isAdmin: isAdmin,
    clearSession: clearSession,
    storageKey: STORAGE_KEY
  });
})(window);
