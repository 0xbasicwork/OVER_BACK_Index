const fs = require('fs/promises');
const path = require('path');

class DataStorage {
    constructor() {
        this.dataDir = path.join(__dirname, 'data');
        this.historyFile = path.join(this.dataDir, 'over-back-history.json');
    }

    async initialize() {
        try {
            // Create data directory if it doesn't exist
            await fs.mkdir(this.dataDir, { recursive: true });
            
            // Create history file if it doesn't exist
            try {
                await fs.access(this.historyFile);
            } catch {
                await fs.writeFile(this.historyFile, JSON.stringify({ history: [] }));
            }
        } catch (error) {
            console.error('Failed to initialize storage:', error);
            throw error;
        }
    }

    async storeDaily(data) {
        try {
            const timestamp = new Date().toISOString();
            const entry = {
                timestamp,
                ...data
            };

            // Read existing history
            const content = await fs.readFile(this.historyFile, 'utf8');
            const history = JSON.parse(content);

            // Add new entry
            history.history.push(entry);

            // Keep only last 365 days
            if (history.history.length > 365) {
                history.history = history.history.slice(-365);
            }

            // Save updated history
            await fs.writeFile(this.historyFile, JSON.stringify(history, null, 2));

            // Store detailed daily data
            const dailyFile = path.join(this.dataDir, `${timestamp.split('T')[0]}.json`);
            await fs.writeFile(dailyFile, JSON.stringify(data, null, 2));

            return entry;
        } catch (error) {
            console.error('Failed to store daily data:', error);
            throw error;
        }
    }

    async getHistory(days = 30) {
        try {
            const content = await fs.readFile(this.historyFile, 'utf8');
            const history = JSON.parse(content);
            return history.history.slice(-days);
        } catch (error) {
            console.error('Failed to read history:', error);
            throw error;
        }
    }

    async getLatest() {
        try {
            const history = await this.getHistory(1);
            return history[0];
        } catch (error) {
            console.error('Failed to get latest data:', error);
            throw error;
        }
    }

    async getTrend() {
        try {
            const history = await this.getHistory(7); // Last 7 days
            if (history.length < 2) return 'insufficient_data';

            const latest = history[history.length - 1].score;
            const previous = history[0].score;
            const change = latest - previous;

            if (Math.abs(change) < 5) return 'stable';
            return change > 0 ? 'increasing' : 'decreasing';
        } catch (error) {
            console.error('Failed to calculate trend:', error);
            throw error;
        }
    }
}

module.exports = DataStorage; 