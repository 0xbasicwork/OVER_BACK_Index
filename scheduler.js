const schedule = require('node-schedule');
const OverBackCalculator = require('./over-back-calculator');
const DataStorage = require('./data-storage');
// Import any other required data sources
const CoinGecko = require('./coingecko');

async function calculateAndStoreIndex() {
    try {
        // Initialize services
        const calculator = new OverBackCalculator();
        const storage = new DataStorage();
        const coingecko = new CoinGecko();
        
        await storage.initialize();

        // Get real data from your sources
        const marketData = await coingecko.getMarketData();
        // Get Twitter data from your Twitter service
        // Get on-chain data from your blockchain service
        
        // For now using mock data (replace with real data later)
        const mockTwitterData = {
            overall_metrics: {
                sentiment_score: 0.03,
                engagement_rate: 0.015,
                tweet_volume_change: 5
            }
        };
        
        const mockOnChainData = {
            market_metrics: {
                average_activity_score: 35.5,
                average_error_rate: 0.3,
                volume: {
                    current_24h: 25000,
                    previous_24h: 30000,
                    change_percentage: -16.67
                },
                total_transactions_24h: 2500
            }
        };

        // Calculate index
        const index = calculator.calculateIndex(marketData, mockTwitterData, mockOnChainData);
        
        // Store result
        await storage.storeDaily(index);
        
        console.log(`Over & Back Index updated at ${new Date().toISOString()}`);
        console.log(`Score: ${index.score}`);
        console.log(`Status: ${index.label}`);
        
    } catch (error) {
        console.error('Failed to update Over & Back Index:', error);
    }
}

// Schedule daily updates at 8:00 AM EST
const rule = new schedule.RecurrenceRule();
rule.tz = 'America/New_York';
rule.hour = 8;
rule.minute = 0;

schedule.scheduleJob(rule, calculateAndStoreIndex);

// Run immediately on startup
calculateAndStoreIndex();

console.log('Over & Back Index scheduler started. Will update daily at 8:00 AM EST'); 