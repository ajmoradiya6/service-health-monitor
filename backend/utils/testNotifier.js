const { createUserNotificationFromLog } = require('../services/healthService');

console.log('Running testNotifier.js...');

createUserNotificationFromLog({
  serviceName: 'TestService',
  timestamp: new Date().toISOString(),
  type: 'test',
  message: 'This is a test notification'
}).then((result) => {
  console.log('Test notification sent. Result:', result);
}).catch(err => {
  console.error('Error sending test notification:', err);
}); 