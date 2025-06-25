const { createUserNotificationFromLog } = require('../services/healthService');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

// console.log('Running testNotifier.js...');

async function runTests() {
  // Test notification (existing)
  await createUserNotificationFromLog({
    serviceName: 'TestService',
    timestamp: new Date().toISOString(),
    type: 'test',
    message: 'This is a test notification'
  });

  // Error notification
  await createUserNotificationFromLog({
    serviceName: 'PDF Service',
    timestamp: new Date().toISOString(),
    type: 'error',
    message: 'Failed to determine the https port for redirect.'
  });

  // Warning notification
  await createUserNotificationFromLog({
    serviceName: 'PDF Service',
    timestamp: new Date().toISOString(),
    type: 'warning',
    message: 'Disk space is running low.'
  });

  // console.log('All test notifications sent.');
}

runTests().catch(err => {
  console.error('Error sending test notifications:', err);
}); 