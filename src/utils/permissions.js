/**
 * Permission utility functions for checking user scopes
 */

/**
 * Check if user has a specific scope
 * @param {Object} user - User object with role and scopes
 * @param {string} scope - Scope to check (e.g., 'VIEW_SHIPMENTS', 'CREATE_SHIPMENTS')
 * @returns {boolean} - True if user has the scope
 */
export const hasScope = (user, scope) => {
  if (!user) return false;
  
  // Admin has all scopes
  if (user.role === 'ADMIN') {
    return true;
  }
  
  // Check if employee has the specific scope
  if (user.role === 'EMPLOYEE' && user.scopes && Array.isArray(user.scopes)) {
    return user.scopes.includes(scope);
  }
  
  return false;
};

/**
 * Check if user has any of the provided scopes
 * @param {Object} user - User object with role and scopes
 * @param {string[]} scopes - Array of scopes to check
 * @returns {boolean} - True if user has at least one scope
 */
export const hasAnyScope = (user, scopes) => {
  if (!user || !scopes || scopes.length === 0) return false;
  
  if (user.role === 'ADMIN') return true;
  
  if (user.role === 'EMPLOYEE' && user.scopes && Array.isArray(user.scopes)) {
    return scopes.some(scope => user.scopes.includes(scope));
  }
  
  return false;
};

/**
 * Check if user has all of the provided scopes
 * @param {Object} user - User object with role and scopes
 * @param {string[]} scopes - Array of scopes to check
 * @returns {boolean} - True if user has all scopes
 */
export const hasAllScopes = (user, scopes) => {
  if (!user || !scopes || scopes.length === 0) return false;
  
  if (user.role === 'ADMIN') return true;
  
  if (user.role === 'EMPLOYEE' && user.scopes && Array.isArray(user.scopes)) {
    return scopes.every(scope => user.scopes.includes(scope));
  }
  
  return false;
};

/**
 * Check if user is admin
 * @param {Object} user - User object
 * @returns {boolean} - True if user is admin
 */
export const isAdmin = (user) => {
  return user && user.role === 'ADMIN';
};

// Available scopes constants
export const SCOPES = {
  VIEW_SHIPMENTS: 'VIEW_SHIPMENTS',
  CREATE_SHIPMENTS: 'CREATE_SHIPMENTS',
  EDIT_SHIPMENTS: 'EDIT_SHIPMENTS',
  DELETE_SHIPMENTS: 'DELETE_SHIPMENTS',
  VIEW_ANALYTICS: 'VIEW_ANALYTICS',
  VIEW_REPORTS: 'VIEW_REPORTS',
  MANAGE_USERS: 'MANAGE_USERS',
};

