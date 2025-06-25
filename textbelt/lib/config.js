const fs = require('fs');
const path = require('path');

// Load emailConfig from UserSettingsData.json
function getEmailConfig() {
  const configPath = path.resolve(__dirname, '../../database/UserSettingsData.json');
  let emailConfig = {};
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const json = JSON.parse(raw);
    emailConfig = json['user-settings']?.emailConfig || {};
  } catch (err) {
    console.error('Failed to load emailConfig:', err);
  }
  return emailConfig;
}

const emailConfig = getEmailConfig();

const SMTP_TRANSPORT = {
  host: emailConfig.host || 'smtp.office365.com',
  port: parseInt(emailConfig.port, 10) || 587,
  pool: true,
  maxConnections: 1,
  maxMessages: 5,
  auth: {
    user: emailConfig.username || '',
    pass: emailConfig.password || '',
  },
  tls: {
    ciphers: 'SSLv3',
  },
};

module.exports = {
  transport: SMTP_TRANSPORT,
  mailOptions: {
    from: `"${emailConfig.fromName || 'Service Health Monitor'}" <${emailConfig.fromEmail || ''}>`,
  },
  debugEnabled: true,
};
