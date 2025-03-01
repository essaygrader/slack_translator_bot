/**
 * Utility functions for the Slack Translator Bot
 */

/**
 * Safely parse environment variable as boolean
 * @param {string} value - The environment variable value
 * @param {boolean} defaultValue - Default value if parsing fails
 * @returns {boolean} - Parsed boolean value
 */
function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  
  if (typeof value === 'boolean') {
    return value;
  }
  
  if (typeof value === 'string') {
    const lowercased = value.toLowerCase().trim();
    if (lowercased === 'true' || lowercased === '1' || lowercased === 'yes') {
      return true;
    }
    if (lowercased === 'false' || lowercased === '0' || lowercased === 'no') {
      return false;
    }
  }
  
  return defaultValue;
}

/**
 * Safely parse comma-separated string into array
 * @param {string} value - The comma-separated string
 * @param {Array} defaultValue - Default value if parsing fails
 * @returns {Array} - Array of trimmed strings
 */
function parseCommaSeparatedList(value, defaultValue = []) {
  if (!value || typeof value !== 'string') {
    return defaultValue;
  }
  
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

/**
 * Log error with context information
 * @param {string} context - Context where the error occurred
 * @param {Error} error - The error object
 */
function logError(context, error) {
  console.error(`[ERROR] ${context}:`, error.message);
  if (parseBoolean(process.env.DEBUG)) {
    console.error(error.stack);
  }
}

/**
 * Log debug information if debug mode is enabled
 * @param {string} message - Debug message
 * @param {any} data - Optional data to log
 */
function debug(message, data) {
  if (parseBoolean(process.env.DEBUG)) {
    if (data !== undefined) {
      console.log(`[DEBUG] ${message}:`, data);
    } else {
      console.log(`[DEBUG] ${message}`);
    }
  }
}

module.exports = {
  parseBoolean,
  parseCommaSeparatedList,
  logError,
  debug
}; 