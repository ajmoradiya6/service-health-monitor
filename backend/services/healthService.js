const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const { summarizeLogForUser } = require('../utils/openRouterLLM');
const { sendNotification } = require('../utils/notifier');

const servicesFilePath = path.join(__dirname, '..', '..' ,'database', 'RegisteredServices.json');

async function getAllServices() {
    try {
        const fileContent = await fsp.readFile(servicesFilePath, 'utf8');
        const services = fileContent ? JSON.parse(fileContent) : [];
        return services;

    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`Services file not found at ${servicesFilePath}, returning an empty array.`);
            return [];
        } else {
            console.error('Error reading services file:', error);
            throw error;
        }
    }
}

async function updateService(serviceId, updatedService) {
    try {
        const services = await getAllServices(); // Read existing services
        const index = services.findIndex(service => service.id === serviceId);

        if (index === -1) {
            throw new Error(`Service with ID ${serviceId} not found.`);
        }

        // Update the service properties
        services[index] = { ...services[index], ...updatedService };

        // Write the updated array back to the file
        await fsp.writeFile(servicesFilePath, JSON.stringify(services, null, 2), 'utf8');
        console.log(`Service with ID ${serviceId} updated successfully.`);

    } catch (error) {
        console.error('Error updating service:', error);
        throw error; // Re-throw the error for the caller to handle
    }
}

async function deleteService(serviceId) {
    try {
        const services = await getAllServices(); // Read existing services
        const initialLength = services.length;
        const updatedServices = services.filter(service => service.id !== serviceId);

        if (updatedServices.length === initialLength) {
            // No service was deleted, meaning the ID wasn't found
            throw new Error(`Service with ID ${serviceId} not found.`);
        }

        // Write the updated array back to the file
        await fsp.writeFile(servicesFilePath, JSON.stringify(updatedServices, null, 2), 'utf8');
        console.log(`Service with ID ${serviceId} deleted successfully.`);

    } catch (error) {
        console.error('Error deleting service:', error);
        throw error; // Re-throw the error for the caller to handle
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
  // Debug: Log the incoming logMessage
  console.log('createUserNotificationFromLog called with:', logMessage);
  // Read AI Assist toggle from UserSettingsData.json
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
    // Debug: Log the AI summary
    console.log('AI Assist summary:', aiSummary);
    // If AI summary is empty or fallback, use the original message
    if (!aiSummary || aiSummary.trim() === '' || aiSummary.trim() === 'An error occurred, but we are unable to provide more details at this time.') {
      userFriendlyMessage = logMessage.message || logMessage;
    } else {
      userFriendlyMessage = aiSummary;
    }
  }

  // Debug: Log the type and message to be sent
  console.log('Notification type:', logMessage.type, 'userFriendlyMessage:', userFriendlyMessage);

  // Send notification via email/SMS if toggles are on
  if (typeof logMessage === 'object' && logMessage.serviceName && logMessage.timestamp && logMessage.type) {
    await sendNotification({
      serviceName: logMessage.serviceName,
      timestamp: logMessage.timestamp,
      type: logMessage.type,
      message: userFriendlyMessage,
    });
  }
  // Here, you would save/display the userFriendlyMessage in your notification system
  return userFriendlyMessage;
}

module.exports = { getAllServices, updateService, deleteService, createUserNotificationFromLog };
