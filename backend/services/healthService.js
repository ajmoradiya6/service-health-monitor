const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const { summarizeLogForUser } = require('../utils/openRouterLLM');
const { sendNotification } = require('../utils/notifier');

const servicesFilePath = path.join(__dirname, '..', '..' ,'database', 'RegisteredServices.json');

async function getAllServices() {
    try {
        const fileContent = await fsp.readFile(servicesFilePath, 'utf8');
        const data = fileContent ? JSON.parse(fileContent) : {};
        return {
            windowsServices: Array.isArray(data.windowsServices) ? data.windowsServices : [],
            tomcatService: data.tomcatService || null
        };
    } catch (error) {
        if (error.code === 'ENOENT') {
            return { windowsServices: [], tomcatService: null };
        } else {
            throw error;
        }
    }
}

async function updateService(serviceId, updatedService) {
    try {
        const fileContent = await fsp.readFile(servicesFilePath, 'utf8').catch(() => '{}');
        let data = fileContent ? JSON.parse(fileContent) : { windowsServices: [], tomcatService: null };
        let found = false;
        // Update in windowsServices
        if (Array.isArray(data.windowsServices)) {
            const idx = data.windowsServices.findIndex(s => s.id === serviceId);
            if (idx !== -1) {
                data.windowsServices[idx] = { ...data.windowsServices[idx], ...updatedService };
                found = true;
            }
        }
        // Update tomcatService
        if (!found && data.tomcatService && data.tomcatService.id === serviceId) {
            data.tomcatService = { ...data.tomcatService, ...updatedService };
            found = true;
        }
        if (!found) {
            throw new Error(`Service with ID ${serviceId} not found.`);
        }
        await fsp.writeFile(servicesFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        throw error;
    }
}

async function deleteService(serviceId) {
    try {
        const fileContent = await fsp.readFile(servicesFilePath, 'utf8').catch(() => '{}');
        let data = fileContent ? JSON.parse(fileContent) : { windowsServices: [], tomcatService: null };
        let changed = false;
        // Remove from windowsServices
        if (Array.isArray(data.windowsServices)) {
            const origLen = data.windowsServices.length;
            data.windowsServices = data.windowsServices.filter(s => s.id !== serviceId);
            if (data.windowsServices.length !== origLen) changed = true;
        }
        // Remove tomcatService
        if (data.tomcatService && data.tomcatService.id === serviceId) {
            data.tomcatService = null;
            changed = true;
        }
        if (!changed) {
            throw new Error(`Service with ID ${serviceId} not found.`);
        }
        await fsp.writeFile(servicesFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        throw error;
    }
}

/**
 * Example function to process a log and generate a user-friendly notification.
 * Call this function when you want to create a notification from a log entry.
 * @param {object} logMessage - The log message object. Should include serviceName, timestamp, type, and message.
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

  // Only log actual errors or skipped notifications
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

module.exports = { getAllServices, updateService, deleteService, createUserNotificationFromLog };
