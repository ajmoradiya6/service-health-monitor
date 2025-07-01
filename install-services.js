const { Service } = require('node-windows');
const path = require('path');

/* --- Service 1: Health Monitor (port 3003) --- */
const monitorService = new Service({
  name: 'Contentverse Service Health Monitoring Service',
  description: 'Monitors registered Windows services via Express app on port 3003',
  script: path.join(__dirname, 'backend', 'server.js'),
  env: {
    name: "NODE_ENV",
    value: "production"
  }
});

monitorService.on('install', () => {
  console.log('Contentverse Service Health Monitoring Service installed. Starting...');
  monitorService.start();
});

/* --- Service 2: SMTP Email Sender (port 9090) --- */
const mailService = new Service({
  name: 'Contentverse SMTP Mailer Service',
  description: 'Handles sending email and sms notifications via SMTP on port 9090',
  script: path.join(__dirname, 'textbelt', 'server', 'app.js'),
  env: {
    name: "NODE_ENV",
    value: "production"
  }
});

mailService.on('install', () => {
  console.log('Contentverse SMTP Mailer Service installed. Starting...');
  mailService.start();
});

/* Install both services */
monitorService.install();
mailService.install();
