/**
 * Utility functions for form validation
 */

/**
 * Validates email format
 * @param {string} email 
 * @returns {boolean}
 */
export const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
};

/**
 * Validates password length (minimum 6 characters)
 * @param {string} password 
 * @returns {boolean}
 */
export const validatePassword = (password) => {
    return password && password.length >= 6;
};

/**
 * Validates phone number format (basic check)
 * @param {string} phone 
 * @returns {boolean}
 */
export const validatePhone = (phone) => {
    // Basic check: at least 8 digits, allows spaces, plus, and dashes
    const re = /^[\d\s\-+]{8,}$/;
    return re.test(phone);
};

/**
 * Validates that all required fields are present
 * @param {Object} fields - Key-value pairs of fields to check
 * @returns {string|null} - Returns the first missing field name or null
 */
export const getMissingFields = (fields) => {
    for (const [key, value] of Object.entries(fields)) {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
            return key;
        }
    }
    return null;
};
