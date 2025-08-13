const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { getAllServices } = require('../services/fetchServices');
const { createUserNotificationFromLog } = require('../services/createUserNotificationFromLog');
const { getServicesStatus } = require('../services/serviceStatus');
const serviceControlRouter = require('./serviceControl');

// Track previous service statuses in memory to detect changes
const previousStatuses = {};

router.use('/service-control', serviceControlRouter);
router.get('/services', async (req, res) => {
    const data = await getAllServices();
    // Return both windowsServices and tomcatService
    res.json({
        windowsServices: data.windowsServices || [],
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
            if (prev && prev !== status) {
                const isRunning = typeof status === 'string' && status.toLowerCase() === 'running';
                const notif = {
                    serviceName: id,
                    timestamp: new Date().toISOString(),
                    type: isRunning ? 'info' : 'error',
                    message: `Service ${id} is now ${status}`
                };
                notifications.push({ message: notif.message, type: isRunning ? 'success' : 'error' });
                await createUserNotificationFromLog(notif);
            }
            previousStatuses[id] = status;
        }

        res.json({ statuses, notifications });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch service statuses', details: err.message });
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
