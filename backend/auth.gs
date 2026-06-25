/**
 * Authentication scaffolding.
 * Real login and session validation are planned for Sprint 1.
 */

function validateSession() {
  return {
    valid: false,
    reason: 'Authentication is not connected yet.'
  };
}

function createSession() {
  return {
    created: false,
    reason: 'Session creation is not implemented yet.'
  };
}

function destroySession() {
  return {
    destroyed: false,
    reason: 'Session destruction is not implemented yet.'
  };
}
