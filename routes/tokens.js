const express = require('express');
const router = express.Router();
const DataStorage = require('../data-storage');
const storage = new DataStorage();

// Get all tracked tokens
router.get('/', async (req, res) => {
  try {
    // Use your existing token tracking logic
    const trackedTokens = await storage.getTokens(); // or whatever method you use
    res.json(trackedTokens);
  } catch (error) {
    console.error('Error fetching tokens:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific token data
router.get('/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    // Use your existing token data fetching logic
    const tokenData = await storage.getTokenData(tokenAddress); // or whatever method you use
    res.json(tokenData);
  } catch (error) {
    console.error('Error fetching token data:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 