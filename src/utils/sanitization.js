/**
 * Utility functions for input sanitization
 */

/**
 * Sanitizes a string by trimming whitespace and stripping HTML tags.
 * @param {string} str - The string to sanitize
 * @returns {string} - The sanitized string
 */
export const sanitizeString = (str) => {
    if (!str || typeof str !== 'string') return str;
    
    // 1. Strip HTML tags using regex
    // This is a basic protection against <script>, <b>, etc.
    const cleanStr = str.replace(/<[^>]*>?/gm, '');
    
    // 2. Trim whitespace
    return cleanStr.trim();
};

/**
 * Sanitizes multiple fields in an object.
 * @param {Object} obj - The object containing fields to sanitize
 * @param {string[]} keys - The keys of the fields to sanitize
 * @returns {Object} - A new object with sanitized fields
 */
export const sanitizeObject = (obj, keys) => {
    const newObj = { ...obj };
    keys.forEach(key => {
        if (newObj[key]) {
            newObj[key] = sanitizeString(newObj[key]);
        }
    });
    return newObj;
};
