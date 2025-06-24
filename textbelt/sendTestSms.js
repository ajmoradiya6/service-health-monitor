const axios = require('axios');

const sendSms = async () => {
  try {
    const response = await axios.post('http://localhost:9090/text', {
      number: '5623916700', // Replace with your own phone number
      //number: '2177615652', // Replace with your own phone number
      message: '🚨 Test SMS from Service Health Monitor.',
      key: 'textbelt', // For self-hosted, this is the default key
      //region: 'us' // ✅ Explicitly specify region
    });

    if (response.data.success) {
      console.log('✅ SMS sent successfully!');
    } else {
      console.log('❌ Failed to send SMS:', response.data);
    }
  } catch (error) {
    console.error('❌ Error sending SMS:', error.message);
  }
};

sendSms();
