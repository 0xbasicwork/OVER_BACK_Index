const express = require('express');
const path = require('path');
const cors = require('cors');
const DataStorage = require('./data-storage');

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
    origin: ['https://sobackitsover.xyz', 'http://localhost:3000', 'http://45.76.10.9:3000'],
    methods: ['GET'],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.static('public'));

// Set up EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Create storage instance
const storage = new DataStorage();

// Root route
app.get('/', async (req, res) => {
    try {
        const latestData = await storage.getLatest();
        res.render('index', {
            error: null,
            score: latestData?.score,
            label: latestData?.label,
            components: latestData?.components,
            lastUpdated: latestData?.timestamp
        });
    } catch (error) {
        console.error('Error rendering index:', error);
        res.render('index', { error: 'Failed to load index data' });
    }
});

// API Routes
app.get('/api/latest', async (req, res) => {
    try {
        const latestData = await storage.getLatest();
        
        // Set cache headers
        res.set({
            'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
            'Access-Control-Allow-Origin': corsOptions.origin
        });

        if (!latestData) {
            return res.status(404).json({
                error: 'No index data available',
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            score: latestData.score,
            label: latestData.label,
            components: latestData.components,
            timestamp: latestData.timestamp
        });
    } catch (error) {
        console.error('Error fetching latest data:', error);
        res.status(500).json({ 
            error: 'Failed to fetch data',
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/history', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const history = await storage.getHistory(days);
        
        res.set({
            'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            'Access-Control-Allow-Origin': corsOptions.origin
        });

        res.json(history);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

app.get('/api/trend', async (req, res) => {
    try {
        const trend = await storage.getTrend();
        
        res.set({
            'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
            'Access-Control-Allow-Origin': corsOptions.origin
        });

        res.json({ trend });
    } catch (error) {
        console.error('Error fetching trend:', error);
        res.status(500).json({ error: 'Failed to fetch trend' });
    }
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
}); 