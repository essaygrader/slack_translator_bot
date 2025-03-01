/**
 * Channel preferences management for the Slack Translator Bot
 * Allows enabling/disabling translations per channel
 */

// In-memory store for channel preferences
// In a production environment, this should be replaced with a persistent database
const channelPreferences = new Map();

/**
 * Check if translations are enabled for a channel
 * @param {string} channelId - The Slack channel ID
 * @returns {boolean} - Whether translations are enabled
 */
function isTranslationEnabled(channelId) {
  // Default to enabled if no preference is set
  return channelPreferences.get(channelId) !== false;
}

/**
 * Enable translations for a channel
 * @param {string} channelId - The Slack channel ID
 */
function enableTranslation(channelId) {
  channelPreferences.set(channelId, true);
}

/**
 * Disable translations for a channel
 * @param {string} channelId - The Slack channel ID
 */
function disableTranslation(channelId) {
  channelPreferences.set(channelId, false);
}

/**
 * Toggle translation status for a channel
 * @param {string} channelId - The Slack channel ID
 * @returns {boolean} - The new status (true = enabled, false = disabled)
 */
function toggleTranslation(channelId) {
  const currentStatus = isTranslationEnabled(channelId);
  channelPreferences.set(channelId, !currentStatus);
  return !currentStatus;
}

/**
 * Get all channel preferences
 * @returns {Object} - Object with channel IDs as keys and boolean status as values
 */
function getAllChannelPreferences() {
  return Object.fromEntries(channelPreferences);
}

module.exports = {
  isTranslationEnabled,
  enableTranslation,
  disableTranslation,
  toggleTranslation,
  getAllChannelPreferences
}; 