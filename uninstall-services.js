const { Service } = require('node-windows');
const path = require('path');

/* --- Service 1: Health Monitor --- */
const monitorService = new Service({
  name: 'Contentverse Service Health Monitoring Service',
  script: path.join(__dirname, 'backend', 'server.js')
});

monitorService.on('uninstall', () => {
  console.log('Contentverse Service Health Monitoring Service uninstalled.');
});

/* --- Service 2: SMTP Mailer --- */
const mailService = new Service({
  name: 'Contentverse SMTP Mailer Service',
  script: path.join(__dirname, 'textbelt', 'server', 'app.js')
});

mailService.on('uninstall', () => {
  console.log('Contentverse SMTP Mailer Service uninstalled.');
});

/* Uninstall both */
monitorService.uninstall();
mailService.uninstall();
