const fs = require('fs');
const { summarizeLogForUser } = require('../utils/openRouterLLM');
const { sendNotification } = require('../utils/notifier');

/**
 * Process a log and generate a user-friendly notification.
 * @param {object} logMessage - Should include serviceName, timestamp, type, and message.
 * @returns {Promise<string>} - The user-friendly notification message.
 */
async function createUserNotificationFromLog(logMessage) {
  // Defensive check for required fields
  if (
    typeof logMessage !== 'object' ||
    !logMessage.serviceName ||
    !logMessage.timestamp ||
    !logMessage.type ||
    !logMessage.message
  ) {
    console.warn('Notification skipped: missing required fields (serviceName, timestamp, type, message). Received:', logMessage);
    return;
  }

  let aiAssistEnabled = false;
  try {
    const settingsPath = require('path').resolve(__dirname, '../../database/UserSettingsData.json');
    const raw = fs.readFileSync(settingsPath, 'utf-8');
    const json = JSON.parse(raw);
    aiAssistEnabled = json['user-settings']?.notificationSettings?.aiAssistEnabled || false;
  } catch (err) {
    console.error('Failed to read AI Assist toggle:', err);
  }

  let userFriendlyMessage = logMessage.message || logMessage;
  if (aiAssistEnabled) {
    const aiSummary = await summarizeLogForUser(logMessage.message || logMessage);
    if (!aiSummary || aiSummary.trim() === '' || aiSummary.trim() === 'An error occurred, but we are unable to provide more details at this time.') {
      userFriendlyMessage = logMessage.message || logMessage;
    } else {
      userFriendlyMessage = aiSummary;
    }
  }

  // Send notification via email/SMS if toggles are on
  if (typeof logMessage === 'object' && logMessage.serviceName && logMessage.timestamp && logMessage.type) {
    await sendNotification({
      serviceName: logMessage.serviceName,
      timestamp: logMessage.timestamp,
      type: logMessage.type,
      message: userFriendlyMessage,
    });
  }
  return userFriendlyMessage;
}

module.exports = { createUserNotificationFromLog };
