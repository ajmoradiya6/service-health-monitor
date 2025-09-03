const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { getAllServices } = require('../services/fetchServices');
const { createUserNotificationFromLog } = require('../services/createUserNotificationFromLog');
const { getServicesStatus } = require('../services/serviceStatus');
const { getWindowsMetrics } = require('../services/windowsMetrics');
const serviceControlRouter = require('./serviceControl');
const windowsServiceControlRouter = require('../services/serviceControlWindows');

// Note: Authentication is handled by external Tomcat server
// This backend only handles service monitoring functionality

// Track previous service statuses in memory to detect changes
const previousStatuses = {};
// Throttle duplicate notifications: remember last notified status and time
const lastNotified = {}; // { [serviceId]: { status: string, at: number } }

// Authentication endpoint
router.post('/auth/login', async (req, res) => {
    try {
        const { username, password, serverName, roomName, localAddress } = req.body;
        
        // Validate required parameters
        if (!username || !password || !serverName || !roomName || !localAddress) {
            return res.status(400).json({ 
                error: 'Missing required parameters: username, password, serverName, roomName, localAddress' 
            });
        }
        
        // Login request to Tomcat server
        const loginResponse = await fetch('http://localhost:8080/CVWeb/cvapp/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&servername=${encodeURIComponent(serverName)}&roomname=${encodeURIComponent(roomName)}&localAddresss=${encodeURIComponent(localAddress)}`
        });
        
        const loginResult = await loginResponse.json();
        
        // Check if login was successful
        if (loginResult.includes('~cvweb')) {
            const sessionId = loginResult.split('~')[0];
            
            // Check if user is admin
            const adminResponse = await fetch(`http://localhost:8080/CVWeb/isAdmin?sessionId=${encodeURIComponent(sessionId)}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
            });
            
            const adminResult = await adminResponse.json();
            
            if (adminResult === 1) {
                // Authentication successful
                res.json({
                    success: true,
                    message: 'Authentication successful',
                    sessionId: sessionId,
                    user: {
                        username: username,
                        serverName: serverName,
                        roomName: roomName,
                        isAdmin: true
                    }
                });
            } else {
                res.status(401).json({ 
                    error: 'Access denied. Admin privileges required.',
                    code: 'ADMIN_REQUIRED'
                });
            }
        } else {
            // Handle login errors
            const errorCode = loginResult.trim();
            let errorMessage = 'Authentication failed.';
            
            switch (errorCode) {
                case '-800': errorMessage = 'Login count exceeded.'; break;
                case '-19': errorMessage = 'No More License Seats.'; break;
                case '-100': errorMessage = 'Failed to Authenticate user.'; break;
                case '-799': errorMessage = 'Access denied.'; break;
                case '-45': errorMessage = 'User Does Not Exist In DB.'; break;
                case '-110': errorMessage = 'Invalid Password.'; break;
                case '-13': errorMessage = 'Server Not Found.'; break;
                case '-33': errorMessage = 'Not Allowed Connections.'; break;
                case '-1000': errorMessage = 'Already session is active.'; break;
                case '-36': errorMessage = 'Server In-active.'; break;
                default: errorMessage = `Authentication failed. Error code: ${errorCode}`;
            }
            
            res.status(401).json({ 
                error: errorMessage,
                code: errorCode
            });
        }
        
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ 
            error: 'Failed to connect to authentication server',
            details: error.message 
        });
    }
});
// Session validation endpoint
router.post('/auth/isAdmin', async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({ error: 'sessionId is required' });
        }
        
        const response = await fetch(`http://localhost:8080/CVWeb/isAdmin?sessionId=${encodeURIComponent(sessionId)}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        
        const result = await response.json();
        res.send(result.toString());
        
    } catch (error) {
        console.error('Session validation error:', error);
        res.status(500).json({ error: 'Failed to validate session' });
    }
});

// Logout endpoint
router.get('/auth/logout', async (req, res) => {
    try {
        const { sessionId } = req.query;
        
        if (!sessionId) {
            return res.status(400).json({ error: 'sessionId is required' });
        }
        
        console.log('Logging out session:', sessionId);
        
        // Call Tomcat logout endpoint
        const response = await fetch(`http://localhost:8080/CVWeb/cvapp/logout?sessionid=${encodeURIComponent(sessionId)}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
            console.log('Session logged out successfully from Tomcat');
            res.json({ success: true, message: 'Logged out successfully' });
        } else {
            console.error('Tomcat logout failed:', response.status);
            res.status(500).json({ error: 'Failed to logout from server' });
        }
        
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
});

router.use('/service-control', serviceControlRouter);
router.use('/windows-service', windowsServiceControlRouter);
router.get('/services', async (req, res) => {
    const data = await getAllServices();
    // Return grouped windows services along with tomcat services
    res.json({
        webServices: data.webServices || [],
        coreServices: data.coreServices || [],
        tomcatService: data.tomcatService || null
    });
});

router.post('/status', async (req, res) => {
    const { services } = req.body || {};
    if (!Array.isArray(services) || services.length === 0) {
        return res.status(400).json({ error: 'services array is required' });
    }

    const identifiers = [...new Set(services.map(s => s.serviceName || s.displayName).filter(Boolean))];

    try {
        const statuses = await getServicesStatus(identifiers);
        const notifications = [];

        for (const [id, status] of Object.entries(statuses)) {
            const prev = previousStatuses[id];
            const changed = !!prev && prev !== status;
            // Update previous status immediately to avoid duplicate notifications from concurrent polls
            previousStatuses[id] = status;

            if (changed) {
                const statusStr = typeof status === 'string' ? status.toLowerCase() : String(status);
                // Suppress noisy transitions to Unknown (during start/stop)
                if (statusStr !== 'unknown') {
                    // Throttle duplicates within a short window for same resulting status
                    const now = Date.now();
                    const last = lastNotified[id];
                    if (!last || last.status !== status || (now - last.at) > 3000) {
                        const isRunning = statusStr === 'running';
                        const notif = {
                            serviceName: id,
                            timestamp: new Date().toISOString(),
                            type: isRunning ? 'info' : 'error',
                            message: `Service ${id} is now ${status}`
                        };
                        notifications.push(notif);
                        lastNotified[id] = { status, at: now };
                        try {
                            await createUserNotificationFromLog(notif);
                        } catch (e) {
                            // Log and continue; do not fail status endpoint
                            console.error('Failed to persist notification:', e?.message || e);
                        }
                    }
                }
            }
        }

        res.json({ statuses, notifications });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch service statuses', details: err.message });
    }
});

router.post('/windows/metrics', async (req, res) => {
    const { services } = req.body || {};
    if (!Array.isArray(services) || services.length === 0) {
        return res.status(400).json({ error: 'services array is required' });
    }

    const identifiers = services.map(s => s.serviceName || s.displayName || s).filter(Boolean);
    try {
        const metrics = await getWindowsMetrics(identifiers);
        res.json({ metrics });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch windows metrics', details: err.message });
    }
});



// POST endpoint to save user settings (emails, phone numbers, and all settings)
router.post('/user-settings', async (req, res) => {
    const userSettings = req.body;
    const settingsFilePath = path.join(__dirname, '..', '..', 'database', 'UserSettingsData.json');

    try {
        // Check if the file exists
        let fileExists = true;
        try {
            await fs.access(settingsFilePath);
        } catch (err) {
            if (err.code === 'ENOENT') {
                fileExists = false;
            } else {
                throw err;
            }
        }

        // If file does not exist, create it with an empty object
        let allSettings = {};
        if (!fileExists) {
            await fs.writeFile(settingsFilePath, JSON.stringify({}, null, 2), 'utf8');
        } else {
            // Read existing settings
            const fileContent = await fs.readFile(settingsFilePath, 'utf8');
            allSettings = fileContent ? JSON.parse(fileContent) : {};
        }

        // Extract the actual settings data, removing any nested user-settings
        const settingsData = userSettings['user-settings'] || userSettings;

        // Update user-settings with the clean data
        allSettings['user-settings'] = settingsData;

        // Write the updated settings back to the file
        await fs.writeFile(settingsFilePath, JSON.stringify(allSettings, null, 2), 'utf8');

        res.status(200).json({ message: 'User settings saved successfully.' });
    } catch (error) {
        console.error('Error saving user settings:', error);
        res.status(500).json({ message: 'Failed to save user settings', error: error.message });
    }
});

// GET endpoint to fetch user settings
router.get('/user-settings', async (req, res) => {
    const settingsFilePath = path.join(__dirname, '..', '..', 'database', 'UserSettingsData.json');
    try {
        let data = {};
        try {
            const fileContent = await fs.readFile(settingsFilePath, 'utf8');
            data = fileContent ? JSON.parse(fileContent) : {};
        } catch (err) {
            if (err.code !== 'ENOENT') throw err;
            // If file does not exist, return empty object
        }
        // Return the complete settings object
        res.status(200).json(data);
    } catch (error) {
        console.error('Error reading user settings:', error);
        res.status(500).json({ message: 'Failed to read user settings', error: error.message });
    }
});

// POST endpoint to generate a user-friendly notification summary from a log message
router.post('/notification-summary', async (req, res) => {
    const { logMessage } = req.body;
    console.log('[DEBUG] /api/notification-summary received:', req.body);
    if (!logMessage) {
        return res.status(400).json({ error: 'logMessage is required' });
    }
    try {
        const summary = await createUserNotificationFromLog(logMessage);
        res.status(200).json({ summary });
    } catch (error) {
        console.error('Error generating notification summary:', error);
        res.status(500).json({ error: 'Failed to generate notification summary' });
    }
});

// POST endpoint to receive notification from frontend and trigger backend notification logic
router.post('/notify', async (req, res) => {
    const notification = req.body;
    console.log('[DEBUG] /api/notify received:', req.body);
    try {
        await createUserNotificationFromLog(notification);
        res.status(200).json({ message: 'Notification processed.' });
    } catch (err) {
        console.error('Error processing notification:', err);
        res.status(500).json({ error: 'Failed to process notification.' });
    }
});

module.exports = router;
// Server-Sent Events stream for consolidated updates (statuses + Windows metrics)
router.get('/stream', async (req, res) => {
    try {
        const servicesCsv = String(req.query.services || '').trim();
        const identifiers = servicesCsv
            ? servicesCsv.split(',').map(s => s.trim()).filter(Boolean)
            : [];

        if (identifiers.length === 0) {
            res.status(400).json({ error: 'services query parameter is required (comma-separated)' });
            return;
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders && res.flushHeaders();

        let closed = false;
        req.on('close', () => {
            closed = true;
            clearInterval(timer);
        });

        async function sendUpdate() {
            try {
                const baseUrl = `${req.protocol}://${req.get('host')}`;
                const [statuses, metrics, tomcatMetrics, tomcatLogs] = await Promise.all([
                    getServicesStatus(identifiers),
                    getWindowsMetrics(identifiers).catch(() => ({})),
                    fetch(`${baseUrl}/api/service-control/tomcat/metrics`).then(r => r.ok ? r.json() : null).catch(() => null),
                    fetch(`${baseUrl}/api/service-control/tomcat/logs`).then(r => r.ok ? r.json() : null).catch(() => null)
                ]);

                // Build notifications based on status transitions (same rules as /status)
                const notifications = [];
                const now = Date.now();
                for (const [id, status] of Object.entries(statuses)) {
                    const prev = previousStatuses[id];
                    const changed = !!prev && prev !== status;
                    previousStatuses[id] = status; // update early to avoid duplicates
                    if (!changed) continue;

                    const statusStr = typeof status === 'string' ? status.toLowerCase() : String(status);
                    if (statusStr === 'unknown') continue; // suppress transient Unknown

                    const last = lastNotified[id];
                    if (!last || last.status !== status || (now - last.at) > 3000) {
                        const isRunning = statusStr === 'running';
                        const notif = {
                            serviceName: id,
                            timestamp: new Date().toISOString(),
                            type: isRunning ? 'info' : 'error',
                            message: `Service ${id} is now ${status}`
                        };
                        notifications.push(notif);
                        lastNotified[id] = { status, at: now };
                        try { await createUserNotificationFromLog(notif); } catch {}
                    }
                }

                const payload = { statuses, metrics, notifications, tomcat: { metrics: tomcatMetrics || undefined, logs: tomcatLogs || undefined } };
                res.write(`data: ${JSON.stringify(payload)}\n\n`);
            } catch (e) {
                // Send an error event but keep the stream open
                res.write(`event: error\n`);
                res.write(`data: ${JSON.stringify({ message: e.message || String(e) })}\n\n`);
            }
        }

        // Send first update immediately, then every 5s
        await sendUpdate();
        const timer = setInterval(() => { if (!closed) sendUpdate(); }, 5000);
    } catch (err) {
        res.status(500).json({ error: 'Failed to start stream', details: err.message });
    }
});
