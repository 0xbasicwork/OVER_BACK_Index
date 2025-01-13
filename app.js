const express = require('express');
const path = require('path');
const cors = require('cors');
const DataStorage = require('./data-storage');
const fs = require('fs').promises;

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

// Sensitive patterns to filter
const sensitivePatterns = [
    /api[-_]?key/i,
    /bearer[-_]?token/i,
    /CG-[A-Za-z0-9]+/,
    /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/  // JWT pattern
];

function filterSensitiveData(message) {
    let filtered = message;
    sensitivePatterns.forEach(pattern => {
        filtered = filtered.replace(new RegExp(pattern, 'gi'), '[FILTERED]');
    });
    return filtered;
}

// Helper function to clean messages
const cleanMessage = (message) => {
    // Remove technical prefixes
    message = message.replace(/\d+\|over-bac \| /, '');
    
    // Clean up query messages
    if (message.includes('query:')) {
        const tickerMatch = message.match(/Fetching tweets for (\w+) with query: .*/);
        if (tickerMatch) {
            const ticker = tickerMatch[1];
            const symbol = ticker.length > 6 ? '#' : '$';
            message = `→ Checking Twitter for ${symbol}${ticker}`;
        }
    }
    
    // Clean up processing messages
    if (message.includes('Processing')) {
        message = message.replace('Processing', '→ Analyzing data for');
        // Add appropriate symbol to ticker
        const tickerMatch = message.match(/for (\w+)\.\.\./);
        if (tickerMatch) {
            const ticker = tickerMatch[1];
            const symbol = ticker.length > 6 ? '#' : '$';
            message = message.replace(/for \w+\.\.\./, `for ${symbol}${ticker}...`);
        }
    }
    
    // Clean up budget messages
    if (message.includes('Budget:')) {
        message = message.replace('Budget:', '• Tweet limit per coin:');
    }
    
    // Clean up tweet count messages
    if (message.includes('tweet count')) {
        message = message.replace('Daily tweet count:', '✓ Processed tweets:');
    }

    // Clean up market data messages
    if (message.includes('Retrieved data for tokens:')) {
        message = '✓ Retrieved market data for all tracked tokens';
    }

    // Clean up blockchain messages
    if (message.includes('Fetching metrics for')) {
        message = '→ Fetching on-chain metrics...';
    }

    // Clean up initialization messages
    if (message.includes('Over & Back Index scheduler started')) {
        message = '• ' + message;
    }

    // Clean up phase completion messages
    if (message.includes('data collection complete')) {
        message = '✓ ' + message;
    }

    // Add arrow to fetching messages
    if (message.includes('Fetching')) {
        message = '→ ' + message;
    }

    // Add appropriate symbol to any remaining bare ticker symbols
    const tickers = ['BONK', 'WIF', 'POPCAT', 'PENGU', 'MOODENG', 'PNUT', 'GIGACHAD', 'BACK', 'AI16Z', 'FART'];
    tickers.forEach(ticker => {
        const symbol = ticker.length > 6 ? '#' : '$';
        const regex = new RegExp(`(?<![$#])\\b${ticker}\\b`, 'g');  // Only match if not preceded by $ or #
        message = message.replace(regex, `${symbol}${ticker}`);
    });
    
    return message;
};

// Helper function to format date
const formatDate = (date) => {
    return new Date(date).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'UTC'
    }) + ' UTC';
};

// API endpoint for console data
app.get('/api/console', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        
        // Read PM2 log files
        const schedulerOutPath = '/root/.pm2/logs/over-back-scheduler-out-1.log';
        const schedulerErrPath = '/root/.pm2/logs/over-back-scheduler-error-1.log';
        const webOutPath = '/root/.pm2/logs/over-back-web-out-0.log';
        const webErrPath = '/root/.pm2/logs/over-back-web-error-0.log';
        
        // Read all log files
        const [schedulerOut, schedulerErr, webOut, webErr] = await Promise.all([
            fs.readFile(schedulerOutPath, 'utf8').catch(() => ''),
            fs.readFile(schedulerErrPath, 'utf8').catch(() => ''),
            fs.readFile(webOutPath, 'utf8').catch(() => ''),
            fs.readFile(webErrPath, 'utf8').catch(() => '')
        ]);
        
        // Process logs
        const logs = [];
        let currentPhase = null;
        let phaseData = {};
        
        // Helper function to process log lines
        const processLogLines = (content, logType, source) => {
            if (!content) return;
            
            const lines = content.split('\n')
                .filter(line => line.trim())
                .filter(line => !line.includes('DeprecationWarning')); // Filter out deprecation warnings
            
            lines.forEach(line => {
                // Check for phase headers
                if (line.includes('=== ')) {
                    const phase = line.match(/===\s*(.*?)\s*===/)[1];
                    if (!phaseData[phase]) {
                        phaseData[phase] = [];
                    }
                    currentPhase = phase;
                    return;
                }
                
                // Only include relevant messages
                if (line.includes('Processing') || 
                    line.includes('Fetching') || 
                    line.includes('Budget:') || 
                    line.includes('tweet count') ||
                    line.includes('Over & Back Index') ||
                    line.includes('Score:') ||
                    line.includes('Status:') ||
                    line.includes('Retrieved data for tokens')) {
                        
                    const filteredMessage = filterSensitiveData(line);
                    const cleanedMessage = cleanMessage(filteredMessage);
                    
                    const logEntry = {
                        time: formatDate(new Date()),
                        message: cleanedMessage
                    };
                    
                    if (currentPhase) {
                        phaseData[currentPhase].push(logEntry);
                    } else {
                        logs.push(logEntry);
                    }
                }
            });
        };
        
        // Process each log file
        processLogLines(schedulerOut, 'log', 'scheduler');
        processLogLines(schedulerErr, 'error', 'scheduler');
        processLogLines(webOut, 'log', 'web');
        processLogLines(webErr, 'error', 'web');
        
        // Sort logs within each phase by timestamp (most recent first)
        Object.keys(phaseData).forEach(phase => {
            phaseData[phase].reverse();
            if (limit) {
                phaseData[phase] = phaseData[phase].slice(0, limit);
            }
        });
        
        // Format the output as plain text
        let output = "Over & Back Index - Data Collection Progress\n";
        output += "Last Updated: " + formatDate(new Date()) + "\n\n";

        // Add phases in specific order with descriptions
        const phaseOrder = [
            {
                name: "Starting Data Collection Process",
                description: "Initializing data collection for the Over & Back Index",
                icon: "🚀"
            },
            {
                name: "Collecting Market Data",
                description: "Gathering price and volume data from CoinGecko",
                icon: "📊"
            },
            {
                name: "Collecting Twitter Data",
                description: "Analyzing social sentiment from Twitter",
                icon: "🐦"
            },
            {
                name: "Collecting On-Chain Data",
                description: "Fetching real-time blockchain metrics from Solana",
                icon: "⛓️"
            }
        ];

        phaseOrder.forEach(phase => {
            if (phaseData[phase.name]) {
                // Add phase header
                output += phase.icon + " " + phase.name + "\n";
                output += "   " + phase.description + "\n";
                
                // Remove duplicates and sort by progress indicators
                const uniqueMessages = new Map();
                phaseData[phase.name].forEach(log => {
                    uniqueMessages.set(log.message, log);
                });

                // Sort messages by progress indicators
                const sortedLogs = Array.from(uniqueMessages.values())
                    .sort((a, b) => {
                        const getWeight = (msg) => {
                            if (msg.startsWith('•')) return 1;
                            if (msg.startsWith('→')) return 2;
                            if (msg.startsWith('✓')) return 3;
                            return 0;
                        };
                        return getWeight(a.message) - getWeight(b.message);
                    });

                // Add logs
                sortedLogs.forEach(log => {
                    output += "   " + log.time + ": " + log.message + "\n";
                });
                
                output += "\n"; // Add blank line between phases
            }
        });

        // Set content type to plain text
        res.setHeader('Content-Type', 'text/plain');
        res.send(output);
    } catch (error) {
        console.error('Error reading logs:', error);
        res.status(500).send('Failed to read logs');
    }
});

// API endpoint for historical console data
app.get('/api/console/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        
        // Read PM2 log files
        const schedulerOutPath = '/root/.pm2/logs/over-back-scheduler-out-1.log';
        const schedulerErrPath = '/root/.pm2/logs/over-back-scheduler-error-1.log';
        const webOutPath = '/root/.pm2/logs/over-back-web-out-0.log';
        const webErrPath = '/root/.pm2/logs/over-back-web-error-0.log';
        
        // Read all log files with detailed error handling
        let logs = {
            schedulerOut: null,
            schedulerErr: null,
            webOut: null,
            webErr: null
        };

        try {
            logs.schedulerOut = await fs.readFile(schedulerOutPath, 'utf8');
        } catch (err) {
            console.error('Error reading scheduler out log:', err.message);
        }

        try {
            logs.schedulerErr = await fs.readFile(schedulerErrPath, 'utf8');
        } catch (err) {
            console.error('Error reading scheduler error log:', err.message);
        }

        try {
            logs.webOut = await fs.readFile(webOutPath, 'utf8');
        } catch (err) {
            console.error('Error reading web out log:', err.message);
        }

        try {
            logs.webErr = await fs.readFile(webErrPath, 'utf8');
        } catch (err) {
            console.error('Error reading web error log:', err.message);
        }

        // Check if we got any logs
        if (!logs.schedulerOut && !logs.schedulerErr && !logs.webOut && !logs.webErr) {
            throw new Error('No log files could be read');
        }
        
        // Process logs
        const processedLogs = [];
        let currentPhase = null;
        let phaseData = {};
        
        // Helper function to process log lines
        const processLogLines = (content, logType, source) => {
            if (!content) return;
            
            const lines = content.split('\n')
                .filter(line => line.trim())
                .filter(line => !line.includes('DeprecationWarning')); // Filter out deprecation warnings
            
            lines.forEach(line => {
                // Extract timestamp if present
                const timestampMatch = line.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
                const timestamp = timestampMatch ? new Date(timestampMatch[0]) : new Date();
                
                // Only include logs from the last 24 hours
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                if (timestamp < twentyFourHoursAgo) return;
                
                // Check for phase headers
                if (line.includes('=== ')) {
                    const phaseMatch = line.match(/===\s*(.*?)\s*===/);
                    if (phaseMatch) {
                        const phase = phaseMatch[1];
                        if (!phaseData[phase]) {
                            phaseData[phase] = new Map(); // Use Map to store unique messages
                        }
                        currentPhase = phase;
                    }
                    return;
                }
                
                // Only include relevant messages
                if (line.includes('Processing') || 
                    line.includes('Fetching') || 
                    line.includes('Budget:') || 
                    line.includes('tweet count') ||
                    line.includes('Over & Back Index') ||
                    line.includes('Score:') ||
                    line.includes('Status:') ||
                    line.includes('Retrieved data for tokens')) {
                        
                    const filteredMessage = filterSensitiveData(line);
                    const cleanedMessage = cleanMessage(filteredMessage);
                    
                    const logEntry = {
                        time: formatDate(timestamp),
                        message: cleanedMessage,
                        type: logType
                    };
                    
                    // Use message as key to prevent duplicates
                    if (currentPhase) {
                        phaseData[currentPhase].set(cleanedMessage, logEntry);
                    } else {
                        // For unphased logs, store in a Map to remove duplicates
                        const key = `${cleanedMessage}-${logEntry.time}`; // Include time to differentiate between same messages at different times
                        processedLogs.push(logEntry);
                    }
                }
            });
        };
        
        // Process each log file
        processLogLines(logs.schedulerOut, 'log', 'scheduler');
        processLogLines(logs.schedulerErr, 'error', 'scheduler');
        processLogLines(logs.webOut, 'log', 'web');
        processLogLines(logs.webErr, 'error', 'web');

        // Format the output as plain text
        let output = "Over & Back Index - Historical Data Collection Progress (Last 24 Hours)\n";
        output += "Last Updated: " + formatDate(new Date()) + "\n\n";

        // Add phases in specific order with descriptions
        const phaseOrder = [
            {
                name: "Starting Data Collection Process",
                description: "Initializing data collection for the Over & Back Index",
                icon: "🚀"
            },
            {
                name: "Collecting Market Data",
                description: "Gathering price and volume data from CoinGecko",
                icon: "📊"
            },
            {
                name: "Collecting Twitter Data",
                description: "Analyzing social sentiment from Twitter",
                icon: "🐦"
            },
            {
                name: "Collecting On-Chain Data",
                description: "Fetching real-time blockchain metrics from Solana",
                icon: "⛓️"
            }
        ];

        phaseOrder.forEach(phase => {
            if (phaseData[phase.name]) {
                // Add phase header
                output += phase.icon + " " + phase.name + "\n";
                output += "   " + phase.description + "\n";
                
                // Convert Map values to array and sort by progress indicators and time
                const logs = Array.from(phaseData[phase.name].values())
                    .sort((a, b) => {
                        const getWeight = (msg) => {
                            if (msg.startsWith('•')) return 1;
                            if (msg.startsWith('→')) return 2;
                            if (msg.startsWith('✓')) return 3;
                            return 0;
                        };
                        const weightDiff = getWeight(a.message) - getWeight(b.message);
                        if (weightDiff !== 0) return weightDiff;
                        return new Date(b.time) - new Date(a.time);
                    });

                // Add logs
                logs.slice(0, limit).forEach(log => {
                    output += "   " + log.time + ": " + log.message + "\n";
                });
                
                output += "\n"; // Add blank line between phases
            }
        });

        // Add unphased logs if any
        if (processedLogs.length > 0) {
            output += "Other Logs:\n";
            processedLogs.sort((a, b) => new Date(b.time) - new Date(a.time))
                .slice(0, limit)
                .forEach(log => {
                    output += "   " + log.time + ": " + log.message + "\n";
                });
        }

        // Set content type to plain text
        res.setHeader('Content-Type', 'text/plain');
        res.send(output);
    } catch (error) {
        console.error('Error processing historical logs:', error);
        res.status(500).send('Failed to read historical logs: ' + error.message);
    }
});

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
                timestamp: formatDate(new Date())
            });
        }

        res.json({
            score: latestData.score,
            label: latestData.label,
            components: latestData.components,
            timestamp: formatDate(new Date(latestData.timestamp))
        });
    } catch (error) {
        console.error('Error fetching latest data:', error);
        res.status(500).json({ 
            error: 'Failed to fetch data',
            timestamp: formatDate(new Date())
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

        // Format timestamps in history data
        const formattedHistory = history.map(entry => ({
            ...entry,
            timestamp: formatDate(new Date(entry.timestamp))
        }));

        res.json(formattedHistory);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ 
            error: 'Failed to fetch history',
            timestamp: formatDate(new Date())
        });
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