const express = require('express');
const path = require('path');
const cors = require('cors');
const DataStorage = require('./data-storage');

const app = express();
const port = process.env.PORT || 3000;

// Add CORS middleware
app.use(cors());

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

// Widget route
app.get('/widget', async (req, res) => {
    try {
        // Get latest index data
        const latestData = await storage.getLatest();
        
        if (!latestData) {
            return res.render('widget', {
                error: 'No index data available yet',
                lastUpdated: null
            });
        }

        // Format the timestamp
        const lastUpdated = new Date(latestData.timestamp).toLocaleString();

        res.render('widget', {
            score: latestData.score,
            label: latestData.label,
            components: latestData.components,
            lastUpdated,
            error: null
        });
    } catch (error) {
        console.error('Error fetching index:', error);
        res.render('widget', {
            error: 'Failed to load index data',
            lastUpdated: null
        });
    }
});

// Widget embed code route
app.get('/embed.js', (req, res) => {
    res.type('application/javascript');
    res.send(`
        (function() {
            const container = document.createElement('div');
            container.style.width = '100%';
            container.style.maxWidth = '400px';
            container.style.margin = '0 auto';
            
            const iframe = document.createElement('iframe');
            iframe.src = 'https://sobackitsover.xyz/overbackindex/widget';
            iframe.style.width = '100%';
            iframe.style.height = '400px';
            iframe.style.border = 'none';
            iframe.style.overflow = 'hidden';
            
            container.appendChild(iframe);
            document.currentScript.parentElement.appendChild(container);
        })();
    `);
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
}); 