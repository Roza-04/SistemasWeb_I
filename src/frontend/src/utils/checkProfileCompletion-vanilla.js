/**
 * Validates if a user profile is complete with all required fields.
 * This is a duplicate of isProfileComplete.ts with the same functionality
 * Vanilla JS version
 * 
 * @param {Object} user - User profile object
 * @returns {boolean} true if profile is complete, false otherwise
 */
function checkProfileCompletion(user) {
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
 * Get profile completion percentage
 * @param {Object} user - User profile object
 * @returns {number} Completion percentage (0-100)
 */
function getProfileCompletionPercentage(user) {
  if (!user) return 0;

  const fields = [
    user.full_name && user.full_name.trim(),
    user.university && user.university.trim(),
    user.degree && user.degree.trim(),
    user.course && user.course > 0,
    user.home_address && user.home_address.formatted_address && user.home_address.place_id
  ];

  const completed = fields.filter(Boolean).length;
  return Math.round((completed / fields.length) * 100);
}

/**
 * Get detailed profile completion status
 * @param {Object} user - User profile object
 * @returns {Object} Detailed status object
 */
function getProfileCompletionStatus(user) {
  return {
    isComplete: checkProfileCompletion(user),
    percentage: getProfileCompletionPercentage(user),
    fields: {
      full_name: !!(user?.full_name && user.full_name.trim()),
      university: !!(user?.university && user.university.trim()),
      degree: !!(user?.degree && user.degree.trim()),
      course: !!(user?.course && user.course > 0),
      home_address: !!(user?.home_address && user.home_address.formatted_address)
    }
  };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    checkProfileCompletion, 
    getProfileCompletionPercentage,
    getProfileCompletionStatus
  };
}
