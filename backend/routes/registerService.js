const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises; // Use the promises API
const { v4: uuidv4 } = require('uuid'); // Import uuid

// Update the path to point to the JSON file in the database folder
const servicesFilePath = path.join(__dirname, '..', '..' ,'database', 'RegisteredServices.json');

// POST endpoint to register a new service
router.post('/', async (req, res) => {
    const { name, url, port } = req.body;

    if (!name || !url || !port) {
        return res.status(400).json({ message: 'Service name, URL, and port are required.' });
    }

    try {
        let data = {};
        // Read and parse the file, or initialize new structure
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
        if (!Array.isArray(data.windowsServices)) data.windowsServices = [];
        // Create a new service object with a unique ID
        const newService = {
            id: uuidv4(),
            name,
            url,
            port
        };
        data.windowsServices.push(newService);
        await fs.writeFile(servicesFilePath, JSON.stringify(data, null, 2), 'utf8');
        res.status(201).json({ message: 'Service registered successfully', service: newService });
    } catch (error) {
        console.error('Error registering service:', error);
        res.status(500).json({ message: 'Failed to register service', error: error.message });
    }
});

module.exports = router; 