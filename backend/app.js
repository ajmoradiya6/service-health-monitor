const express = require('express');
const path = require('path');
// LiveReload middleware is loaded conditionally in development
const axios = require('axios');

const app = express();
const apiRoutes = require('./routes/api');

app.use(express.json());

//  Inject LiveReload script into HTML (development only)
if (process.env.NODE_ENV !== 'production') {
  try {
    const connectLivereload = require('connect-livereload');
    app.use(connectLivereload());
  } catch (e) {
    // connect-livereload not installed; ignore
  }
}

//  Login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

//  Home page
app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

//  Redirect root to /login
app.get('/', (req, res) => {
  res.redirect('/login');
});

//  Serve frontend static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../frontend')));

//  Mount API routes under /api
app.use('/api', apiRoutes);

//  Proxy endpoint for rooms API to avoid CORS issues
app.get('/api/rooms', async (req, res) => {
  try {
    console.log('Attempting to fetch rooms from:', 'http://localhost:8080/CVWeb/cvapp/getRooms');
    
    const response = await axios.get('http://localhost:8080/CVWeb/cvapp/getRooms', {
      timeout: 10000, // 10 second timeout
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Rooms API response status:', response.status);
    console.log('Rooms API response data:', response.data);
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching rooms - Full error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    
    if (error.code === 'ECONNREFUSED') {
      res.status(503).json({ 
        error: 'Connection refused to rooms API. Please ensure the API server is running on localhost:8080',
        details: error.message 
      });
    } else if (error.code === 'ENOTFOUND') {
      res.status(503).json({ 
        error: 'Could not resolve hostname. Please check the API URL',
        details: error.message 
      });
    } else if (error.response) {
      res.status(error.response.status).json({ 
        error: 'API server returned an error',
        status: error.response.status,
        details: error.response.data 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to fetch rooms',
        details: error.message 
      });
    }
  }
});

module.exports = app;
