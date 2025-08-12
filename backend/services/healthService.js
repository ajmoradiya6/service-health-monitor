const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const { summarizeLogForUser } = require('../utils/openRouterLLM');
const { sendNotification } = require('../utils/notifier');

const servicesFilePath = path.join(__dirname, '..', '..' ,'database', 'RegisteredServices.json');


const { exec } = require('child_process');

async function runPowerShellCommand(command) {
    return new Promise((resolve, reject) => {
        exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${command}"`, { maxBuffer: 1024 * 500 }, (error, stdout, stderr) => {
            if (error) {
                return reject(error);
            }
            if (stderr) {
                return reject(new Error(stderr));
            }
            resolve(stdout.trim());
        });
    });
}

async function getAllServices() {
    /*try {
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
    }*/
        try {
          // Fetch Contentverse services
          const contentverseCmd = `Get-Service | Where-Object { $_.Name -like 'Contentverse*' } | Select-Object Name, DisplayName | ConvertTo-Json -Compress`;
          const contentverseJson = await runPowerShellCommand(contentverseCmd);
          let windowsServices = [];
          try { windowsServices = JSON.parse(contentverseJson); } catch { windowsServices = []; }
          if (!Array.isArray(windowsServices)) windowsServices = [windowsServices].filter(Boolean);
  
          // Fetch Tomcat services
          const tomcatCmd = `Get-Service | Where-Object { $_.Name -like 'Tomcat*' } | Select-Object Name, DisplayName | ConvertTo-Json -Compress`;
          const tomcatJson = await runPowerShellCommand(tomcatCmd);
          let tomcatServices = [];
          try { tomcatServices = JSON.parse(tomcatJson); } catch { tomcatServices = []; }
          if (!Array.isArray(tomcatServices)) tomcatServices = [tomcatServices].filter(Boolean);
  
          return {
              windowsServices: windowsServices,
              tomcatService: tomcatServices
          };
      } catch (error) {
          console.error('Error fetching services:', error);
          return { windowsServices: [], tomcatService: [] };
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

module.exports = { getAllServices, createUserNotificationFromLog };
