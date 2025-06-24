const nodemailer = require('nodemailer');
const config = require('./lib/config'); // assuming your config file is named config.js

const transporter = nodemailer.createTransport(config.transport);

const mailOptions = {
  from: config.mailOptions.from,
  to: 'akshay@computhink.com', // 🔁 Replace with the recipient email
  subject: '🚨 Service Health Monitor Test Alert',
  text: 'This is a test alert from your Service Health Monitor setup.',
};

if (config.debugEnabled) {
  console.log('Mail config:', mailOptions);
}

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    return console.error('❌ Error sending email:', error);
  }
  console.log('✅ Email sent successfully!');
  console.log('📨 Response:', info.response);
});