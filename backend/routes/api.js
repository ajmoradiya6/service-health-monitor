const express = require('express');
const router = express.Router();
const { getAllServices } = require('../services/healthService');

router.get('/services', async (req, res) => {
    const data = await getAllServices();
    res.json(data);
});

module.exports = router;
