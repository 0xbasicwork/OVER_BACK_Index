const schedule = require('node-schedule');
const OverBackCalculator = require('./over-back-calculator');
const DataStorage = require('./data-storage');
const CoinGecko = require('./coingecko');
const TwitterSentiment = require('./twitter-sentiment');
const { SolanaDataCollector } = require('./solana-data');

async function calculateAndStoreIndex() {
    try {
        console.log('\n=== Starting Data Collection Process ===');
        
        // Initialize services
        console.log('Initializing services...');
        const calculator = new OverBackCalculator();
        const storage = new DataStorage();
        const coingecko = new CoinGecko();
        const solanaCollector = new SolanaDataCollector();
        
        await storage.initialize();
        console.log('Services initialized successfully');

        // Get real data from all sources
        console.log('\n=== Collecting Market Data ===');
        console.log('Fetching data from CoinGecko...');
        const marketData = await coingecko.getMarketData();
        console.log('Market data collection complete');
        
        console.log('\n=== Collecting Twitter Data ===');
        console.log('Starting Twitter sentiment analysis...');
        const twitterData = await TwitterSentiment.fetchAllMemecoinSentiment();
        console.log('Twitter data collection complete');
        
        console.log('\n=== Collecting On-Chain Data ===');
        console.log('Fetching Solana blockchain metrics...');
        const onChainData = await solanaCollector.getAllMemecoinMetrics();
        console.log('On-chain data collection complete');

        console.log('\n=== Processing Collected Data ===');
        console.log('Data being passed to calculator:');
        console.log('Market Data:', JSON.stringify(marketData, null, 2));
        console.log('Twitter Data:', JSON.stringify(twitterData, null, 2));
        console.log('On-Chain Data:', JSON.stringify(onChainData, null, 2));

        // Calculate index using real data
        console.log('\n=== Calculating Index ===');
        const index = calculator.calculateIndex(marketData, twitterData, onChainData);
        
        // Store result
        console.log('\n=== Storing Results ===');
        await storage.storeDaily(index);
        
        console.log('\n=== Update Complete ===');
        console.log(`Over & Back Index updated at ${new Date().toISOString()}`);
        console.log(`Score: ${index.score}`);
        console.log(`Status: ${index.label}`);
        console.log('=== End of Update Process ===\n');
        
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