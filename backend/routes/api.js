const express = require('express');
const router = express.Router();
const { getAllServices, updateService } = require('../services/healthService');
const registerServiceRouter = require('./registerService');

router.get('/services', async (req, res) => {
    const data = await getAllServices();
    res.json(data);
});

router.put('/services/:id', async (req, res) => {
    const serviceId = req.params.id;
    const updatedServiceData = req.body;

    // Basic validation (optional but recommended)
    if (!updatedServiceData || !updatedServiceData.name || !updatedServiceData.url || !updatedServiceData.port) {
        return res.status(400).json({ error: 'Missing required service fields' });
    }

    try {
        await updateService(serviceId, updatedServiceData);
        res.status(200).json({ message: 'Service updated successfully' });
    } catch (error) {
        console.error('Error updating service:', error);
        if (error.message.includes('not found')) {
             res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Failed to update service' });
        }
    }
});

router.use('/register-service', registerServiceRouter);

module.exports = router;
