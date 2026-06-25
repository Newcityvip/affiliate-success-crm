(function (window) {
  'use strict';

  async function login() {
    return {
      success: false,
      message: 'Authentication will be connected in Sprint 1.'
    };
  }

  async function logout() {
    return {
      success: true,
      message: 'No active session exists in the Sprint 0 scaffold.'
    };
  }

  function getCurrentSession() {
    return null;
  }

  window.AffiliateSuccessAuth = Object.freeze({
    login: login,
    logout: logout,
    getCurrentSession: getCurrentSession
  });
})(window);
