const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const axios = require('axios');
const dayjs = require('dayjs');
const textbeltConfig = require('../../textbelt/lib/config');

// Helper to read user settings
function getUserSettings() {
  const settingsPath = path.resolve(__dirname, '../../database/UserSettingsData.json');
  try {
    const raw = fs.readFileSync(settingsPath, 'utf-8');
    const json = JSON.parse(raw);
    return json['user-settings'] || {};
  } catch (err) {
    console.error('Failed to load user settings:', err);
    return {};
  }
}

// Helper to get email config
function getEmailConfig() {
  const settings = getUserSettings();
  return settings.emailConfig || {};
}

// Shared transporter using centralized config
const transporter = nodemailer.createTransport(textbeltConfig.transport);

// Send email using nodemailer
async function sendEmail(subject, text, recipients) {
  if (!recipients || recipients.length === 0) return;
  const from = textbeltConfig.mailOptions.from || 'Service Health Monitor <no-reply@example.com>';
  const mailOptions = {
    from,
    to: recipients.join(','),
    subject,
    text,
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log('Notification email sent to:', recipients);
  } catch (err) {
    console.error('Failed to send notification email:', err);
  }
}

// Send SMS using local textbelt server
const textbeltHost = process.env.TEXTBELT_HOST || 'http://localhost';
const textbeltPort = process.env.TEXTBELT_PORT || '9090';
console.log('Textbelt config:', `${textbeltHost}:${textbeltPort}`);
const textbeltUrl = `${textbeltHost}:${textbeltPort}/text`;

async function sendSms(message, numbers) {
  for (const number of numbers) {
    try {
      const response = await axios.post(textbeltUrl, {
        number,
        message,
        key: 'textbelt',
      });
      if (response.data.success) {
        console.log('Notification SMS sent to:', number);
      } else {
        // Only log errors
        console.error('Failed to send SMS:', response.data);
      }
    } catch (err) {
      // Only log errors
      console.error('Error sending SMS:', err.message);
    }
    // Add a 3-second delay between each SMS
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

// Main notification function
async function sendNotification({ serviceName, timestamp, type, message }) {
  const settings = getUserSettings();
  const notificationSettings = settings.notificationSettings || {};
  const emails = notificationSettings.emails || [];
  const phones = notificationSettings.phones || [];

  // Format the timestamp
  let formattedTime = timestamp;
  try {
    formattedTime = dayjs(timestamp).format('YYYY/MM/DD, hh:mm A');
  } catch (e) {
    // fallback to original if formatting fails
  }

  // Compose notification text in the new format
  const notifText = `${message}\nTime: ${formattedTime}\nService: ${serviceName}`;
  const subject = `[${type.toUpperCase()}] ${serviceName} - Service Health Monitor`;

  // Email
  if (notificationSettings.emailEnabled && emails.length > 0) {
    await sendEmail(subject, notifText, emails);
  }
  // SMS
  if (notificationSettings.smsEnabled && phones.length > 0) {
    await sendSms(notifText, phones);
  }
}

module.exports = { sendNotification }; 