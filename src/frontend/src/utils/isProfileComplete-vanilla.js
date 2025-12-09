/**
 * Validates if a user profile is complete with all required fields.
 * Vanilla JS version
 * 
 * @param {Object} user - User profile object
 * @param {string} user.full_name - User's full name
 * @param {string} user.university - User's university
 * @param {string} user.degree - User's degree
 * @param {number} user.course - User's course number
 * @param {Object} user.home_address - User's home address
 * @returns {boolean} true if profile is complete, false otherwise
 */
function isProfileComplete(user) {
  if (!user) return false;

  // Check full_name
  if (!user.full_name || !user.full_name.trim()) {
    return false;
  }

  // Check university
  if (!user.university || !user.university.trim()) {
    return false;
  }

  // Check degree
  if (!user.degree || !user.degree.trim()) {
    return false;
  }

  // Check course
  if (!user.course || user.course <= 0) {
    return false;
  }

  // Check home_address - all fields must be present
  if (
    !user.home_address ||
    !user.home_address.formatted_address ||
    !user.home_address.place_id ||
    user.home_address.lat === null ||
    user.home_address.lat === undefined ||
    user.home_address.lng === null ||
    user.home_address.lng === undefined
  ) {
    return false;
  }

  return true;
}

/**
 * Get list of missing profile fields
 * @param {Object} user - User profile object
 * @returns {Array<string>} Array of missing field names
 */
function getMissingFields(user) {
  const missing = [];

  if (!user) return ['user object'];

  if (!user.full_name || !user.full_name.trim()) {
    missing.push('full_name');
  }

  if (!user.university || !user.university.trim()) {
    missing.push('university');
  }

  if (!user.degree || !user.degree.trim()) {
    missing.push('degree');
  }

  if (!user.course || user.course <= 0) {
    missing.push('course');
  }

  if (!user.home_address || 
      !user.home_address.formatted_address || 
      !user.home_address.place_id) {
    missing.push('home_address');
  }

  return missing;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { isProfileComplete, getMissingFields };
}
