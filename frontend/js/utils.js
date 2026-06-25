(function (window) {
  'use strict';

  function safeText(value) {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value).trim();
  }

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function setText(element, value) {
    if (element) {
      element.textContent = safeText(value);
    }
  }

  window.AffiliateSuccessUtils = Object.freeze({
    safeText: safeText,
    qs: qs,
    setText: setText
  });
})(window);
