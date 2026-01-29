/**
 * Permission Helper Functions
 * Central location for all permission checks
 */

/**
 * Check if user has permission to void transactions
 * @param {Object} userData - User data from localStorage
 * @returns {boolean}
 */
export function canVoidTransactions(userData) {
  if (!userData) {
    console.warn('[Permission] No user data found')
    return false
  }
  console.log('[Permission] Checking void permission:', {
    canVoidTransactions: userData.canVoidTransactions,
    isAdmin: userData.isAdmin,
    isPrincipal: userData.isPrincipal
  })
  return !!userData.canVoidTransactions
}

/**
 * Check if user is admin
 * @param {Object} userData - User data from localStorage
 * @returns {boolean}
 */
export function isAdmin(userData) {
  if (!userData) return false
  return !!userData.isAdmin
}

/**
 * Check if user is principal
 * @param {Object} userData - User data from localStorage
 * @returns {boolean}
 */
export function isPrincipal(userData) {
  if (!userData) return false
  return !!userData.isPrincipal
}

/**
 * Check if user is teacher
 * @param {Object} userData - User data from localStorage
 * @returns {boolean}
 */
export function isTeacher(userData) {
  if (!userData) return false
  return !!userData.isTeacher
}

/**
 * Get user data from localStorage safely
 * @returns {Object|null}
 */
export function getUserData() {
  try {
    const raw = localStorage.getItem('user_data')
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    console.error('Error parsing user_data from localStorage:', error)
    return null
  }
}
