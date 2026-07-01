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
    var clientIp = await detectPublicIp();
    var payload = {
      loginId: loginId
    };
    var result;

    if (clientIp) {
      payload.userIp = clientIp;
      payload.ip = clientIp;
    }

    logLoginDebug({
      loginId: loginId,
      userIp: clientIp || '',
      ipDetected: Boolean(clientIp)
    });

    result = await api.login(payload);

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

  async function detectPublicIp() {
    var endpoints = [
      'https://api.ipify.org?format=json',
      'https://api64.ipify.org?format=json'
    ];
    var index;
    var ip;

    for (index = 0; index < endpoints.length; index += 1) {
      ip = await fetchIpWithTimeout(endpoints[index], 3000);
      if (ip) {
        return ip;
      }
    }

    return '';
  }

  async function fetchIpWithTimeout(url, timeoutMs) {
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timeout = null;

    try {
      if (controller) {
        timeout = window.setTimeout(function () {
          controller.abort();
        }, timeoutMs);
      }

      return await Promise.race([
        fetch(url, {
          method: 'GET',
          signal: controller ? controller.signal : undefined
        }).then(function (response) {
          if (!response.ok) {
            return '';
          }
          return response.json();
        }).then(function (payload) {
          return payload && payload.ip ? String(payload.ip).trim() : '';
        }),
        new Promise(function (resolve) {
          if (!controller) {
            window.setTimeout(function () {
              resolve('');
            }, timeoutMs);
          }
        })
      ]);
    } catch (error) {
      return '';
    } finally {
      if (timeout) {
        window.clearTimeout(timeout);
      }
    }
  }

  function logLoginDebug(details) {
    var isLocal = /^localhost$|^127\.0\.0\.1$/.test(window.location.hostname);
    var debugEnabled = isLocal || window.localStorage.getItem('affiliateSuccessDebug') === '1';

    if (debugEnabled && window.console && console.debug) {
      console.debug('[Affiliate Success Login Debug]', details);
    }
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
