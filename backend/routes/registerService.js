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
        let services = [];

        // Check if the JSON file exists and read it
        try {
            const fileContent = await fs.readFile(servicesFilePath, 'utf8');
            // Parse JSON content, handle potential empty file or invalid JSON
            services = fileContent ? JSON.parse(fileContent) : [];
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`Services file not found at ${servicesFilePath}, starting with an empty array.`);
                services = []; // File doesn't exist, start with empty array
            } else {
                console.error('Error reading services file:', error);
                // Re-throw other errors
                throw error; // Re-throw other errors
            }
        }

        // Create a new service object with a unique ID
        const newService = {
            id: uuidv4(), // Generate a unique ID
            name: name,
            url: url,
            port: port,
            // Status can be added later, or initialized here if needed
            // status: 'unknown'
        };

        // Add the new service to the array
        services.push(newService);

        // Write the updated array back to the JSON file
        await fs.writeFile(servicesFilePath, JSON.stringify(services, null, 2), 'utf8');

        console.log(`Service '${name}' registered and saved to ${servicesFilePath}`);
        res.status(201).json({ message: 'Service registered successfully', service: newService });

    } catch (error) {
        console.error('Error registering service:', error);
        res.status(500).json({ message: 'Failed to register service', error: error.message });
    }
});

module.exports = router; 