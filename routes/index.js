const express = require('express');
const router = express.Router();
const DataStorage = require('../data-storage');

// Create storage instance
const storage = new DataStorage();

// Get index data
router.get('/index', async (req, res) => {
  try {
    // Get latest index data
    const latestData = await storage.getLatest();
    
    if (!latestData) {
      return res.status(404).json({
        error: 'No index data available yet',
        lastUpdated: null
      });
    }

    // Format the timestamp
    const lastUpdated = new Date(latestData.timestamp).toLocaleString();

    res.json({
      score: latestData.score,
      label: latestData.label,
      components: latestData.components,
      lastUpdated,
    });
  } catch (error) {
    console.error('Error fetching index:', error);
    res.status(500).json({
      error: 'Failed to load index data',
      lastUpdated: null
    });
  }
});

// If you still need widget data
router.get('/widget', async (req, res) => {
  try {
    const latestData = await storage.getLatest();
    res.json(latestData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 