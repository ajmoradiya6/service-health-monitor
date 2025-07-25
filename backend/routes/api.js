﻿const express = require('express');
const router = express.Router();
const { getAllServices, updateService, deleteService, createUserNotificationFromLog } = require('../services/healthService');
const registerServiceRouter = require('./registerService');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

router.get('/services', async (req, res) => {
    const data = await getAllServices();
    // Return both windowsServices and tomcatService
    res.json({
        windowsServices: data.windowsServices || [],
        tomcatService: data.tomcatService || null
    });
});

router.put('/services/:id', async (req, res) => {
    const serviceId = req.params.id;
    const updatedServiceData = req.body;
    if (!updatedServiceData || !updatedServiceData.name || !updatedServiceData.url || !updatedServiceData.port) {
        return res.status(400).json({ error: 'Missing required service fields' });
    }
    try {
        await updateService(serviceId, updatedServiceData);
        res.status(200).json({ message: 'Service updated successfully' });
    } catch (error) {
        if (error.message.includes('not found')) {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Failed to update service' });
        }
    }
});

router.delete('/services/:id', async (req, res) => {
    const serviceId = req.params.id;

    try {
        await deleteService(serviceId);
        res.status(200).json({ message: 'Service deleted successfully' });
    } catch (error) {
        console.error('Error deleting service:', error);
        if (error.message.includes('not found')) {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Failed to delete service' });
        }
    }
});

router.post('/services', async (req, res) => {
    const { name, url, port } = req.body;
    if (!name || !url || !port) {
        return res.status(400).json({ error: 'Service name, URL, and port are required.' });
    }
    try {
        const servicesFilePath = path.join(__dirname, '..', '..', 'database', 'RegisteredServices.json');
        let data = {};
        try {
            const fileContent = await fs.readFile(servicesFilePath, 'utf8');
            data = fileContent ? JSON.parse(fileContent) : {};
        } catch (error) {
            if (error.code === 'ENOENT') {
                data = { windowsServices: [], tomcatService: null };
            } else {
                throw error;
            }
        }
        if (name.toLowerCase().includes('tomcat')) {
            // Save as tomcatService
            const newTomcat = { id: uuidv4(), name, url, port };
            data.tomcatService = newTomcat;
            await fs.writeFile(servicesFilePath, JSON.stringify(data, null, 2), 'utf8');
            res.status(201).json({ message: 'Tomcat service registered successfully', service: newTomcat });
        } else {
            // Save as windowsService
            if (!Array.isArray(data.windowsServices)) data.windowsServices = [];
            const newService = { id: uuidv4(), name, url, port };
            data.windowsServices.push(newService);
            await fs.writeFile(servicesFilePath, JSON.stringify(data, null, 2), 'utf8');
            res.status(201).json({ message: 'Service registered successfully', service: newService });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to register service', details: error.message });
    }
});

router.use('/register-service', registerServiceRouter);

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
