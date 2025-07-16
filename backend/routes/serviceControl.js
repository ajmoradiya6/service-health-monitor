const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

const servicesFilePath = path.join(__dirname, '..', '..', 'database', 'RegisteredServices.json');

// Helper to get service name by ID
async function getServiceById(serviceId) {
    const fileContent = await fs.readFile(servicesFilePath, 'utf8');
    const data = fileContent ? JSON.parse(fileContent) : {};
    // Check windowsServices array
    if (Array.isArray(data.windowsServices)) {
        const found = data.windowsServices.find(s => s.id === serviceId);
        if (found) return found;
    }
    // Check tomcatService object
    if (data.tomcatService && data.tomcatService.id === serviceId) {
        return data.tomcatService;
    }
    return null;
}

// Start service
router.post('/:id/start', async (req, res) => {
    try {
        const service = await getServiceById(req.params.id);
        if (!service) return res.status(404).json({ error: 'Service not found' });
        exec(`powershell.exe Start-Service -Name '${service.name}'`, (err, stdout, stderr) => {
            if (err) return res.status(500).json({ error: stderr || err.message });
            res.json({ status: 'started', stdout });
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Stop service
router.post('/:id/stop', async (req, res) => {
    try {
        const service = await getServiceById(req.params.id);
        if (!service) return res.status(404).json({ error: 'Service not found' });
        exec(`powershell.exe Stop-Service -Name '${service.name}'`, (err, stdout, stderr) => {
            if (err) return res.status(500).json({ error: stderr || err.message });
            res.json({ status: 'stopped', stdout });
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get service status
router.get('/:id/status', async (req, res) => {
    try {
        const service = await getServiceById(req.params.id);
        if (!service) return res.status(404).json({ error: 'Service not found' });
        exec(`powershell.exe (Get-Service -Name '${service.name}').Status`, (err, stdout, stderr) => {
            if (err) return res.status(500).json({ error: stderr || err.message });
            res.json({ status: stdout.trim() });
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router; 