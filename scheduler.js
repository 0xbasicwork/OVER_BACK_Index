const schedule = require('node-schedule');
const OverBackCalculator = require('./over-back-calculator');
const DataStorage = require('./data-storage');
const CoinGecko = require('./coingecko');
const TwitterSentiment = require('./twitter-sentiment');
const { SolanaDataCollector } = require('./solana-data');

async function calculateAndStoreIndex() {
    try {
        // Initialize services
        const calculator = new OverBackCalculator();
        const storage = new DataStorage();
        const coingecko = new CoinGecko();
        const solanaCollector = new SolanaDataCollector();
        
        await storage.initialize();

        // Get real data from all sources
        const marketData = await coingecko.getMarketData();
        const twitterData = await TwitterSentiment.fetchAllMemecoinSentiment();
        const onChainData = await solanaCollector.getAllMemecoinMetrics();

        console.log('\nData being passed to calculator:');
        console.log('Market Data:', JSON.stringify(marketData, null, 2));
        console.log('Twitter Data:', JSON.stringify(twitterData, null, 2));
        console.log('On-Chain Data:', JSON.stringify(onChainData, null, 2));

        // Calculate index using real data
        const index = calculator.calculateIndex(marketData, twitterData, onChainData);
        
        // Store result
        await storage.storeDaily(index);
        
        console.log(`Over & Back Index updated at ${new Date().toISOString()}`);
        console.log(`Score: ${index.score}`);
        console.log(`Status: ${index.label}`);
        
    } catch (error) {
        console.error('Failed to update Over & Back Index:', error);
    }
}

// Schedule daily updates at 12:00 UTC
const rule = new schedule.RecurrenceRule();
rule.tz = 'UTC';
rule.hour = 12;
rule.minute = 0;

schedule.scheduleJob(rule, calculateAndStoreIndex);

// Run immediately on startup
calculateAndStoreIndex();

console.log('Over & Back Index scheduler started. Will update daily at 12:00 UTC'); 