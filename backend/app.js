const express = require('express');
const path = require('path');
const connectLivereload = require('connect-livereload'); // ✅ Add this

const app = express();
const apiRoutes = require('./routes/api');

app.use(express.json());

//  Inject LiveReload script into HTML
app.use(connectLivereload());

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

module.exports = app;
