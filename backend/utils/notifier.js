const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const axios = require('axios');

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

// Send email using nodemailer
async function sendEmail(subject, text, recipients) {
  const emailConfig = getEmailConfig();
  if (!emailConfig.host || !emailConfig.username || !emailConfig.password) {
    console.error('Email config is incomplete.');
    return;
  }
  const transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: parseInt(emailConfig.port, 10) || 587,
    secure: !!emailConfig.useSsl || false,
    auth: {
      user: emailConfig.username,
      pass: emailConfig.password,
    },
  });
  const from = `${emailConfig.fromName || 'Service Health Monitor'} <${emailConfig.fromEmail || emailConfig.username}>`;
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
async function sendSms(message, numbers) {
  for (const number of numbers) {
    try {
      const response = await axios.post('http://localhost:9090/text', {
        number,
        message,
        key: 'textbelt',
      });
      console.log('Textbelt SMS response:', response.data);
      if (response.data.success) {
        console.log('Notification SMS sent to:', number);
      } else {
        console.error('Failed to send SMS:', response.data);
      }
    } catch (err) {
      console.error('Error sending SMS:', err.message);
    }
  }
}

// Main notification function
async function sendNotification({ serviceName, timestamp, type, message }) {
  const settings = getUserSettings();
  const notificationSettings = settings.notificationSettings || {};
  const emails = notificationSettings.emails || [];
  const phones = notificationSettings.phones || [];

  // Compose notification text
  const notifText = `Service: ${serviceName}\nTime: ${timestamp}\nType: ${type}\nMessage: ${message}`;
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