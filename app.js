const express = require('express');
const path = require('path');
const DataStorage = require('./data-storage');

const app = express();
const port = process.env.PORT || 3000;

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

// Create storage instance
const storage = new DataStorage();

// Routes
app.get('/', async (req, res) => {
    try {
        // Get latest index data
        const latestData = await storage.getLatest();
        
        if (!latestData) {
            return res.render('index', {
                error: 'No index data available yet',
                lastUpdated: null
            });
        }

        // Format the timestamp
        const lastUpdated = new Date(latestData.timestamp).toLocaleString();

        res.render('index', {
            score: latestData.score,
            label: latestData.label,
            components: latestData.components,
            lastUpdated,
            error: null
        });
    } catch (error) {
        console.error('Error fetching index:', error);
        res.render('index', {
            error: 'Failed to load index data',
            lastUpdated: null
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 