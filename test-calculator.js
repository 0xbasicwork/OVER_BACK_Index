const OverBackCalculator = require('./over-back-calculator');
const DataStorage = require('./data-storage');
const { SolanaDataCollector } = require('./solana-data');
const CoinGecko = require('./coingecko');

async function testFullIndex() {
    try {
        console.log('\n=== Testing Over/Back Index ===\n');
        
        // Initialize components
        const calculator = new OverBackCalculator();
        const storage = new DataStorage();
        const solanaCollector = new SolanaDataCollector();
        const coingecko = new CoinGecko();
        
        await storage.initialize();

        // Get real on-chain data
        console.log('Fetching on-chain metrics...');
        const onChainData = await solanaCollector.getAllMemecoinMetrics();
        console.log('On-chain data collected');

        // Get real market data
        console.log('\nFetching market data...');
        const marketData = await coingecko.getMarketData();
        console.log('Market data collected');

        // Using mock Twitter data until Twitter API integration is complete
        console.log('\nUsing mock social sentiment data...');
        const twitterData = {
            overall_metrics: {
                sentiment_score: 0.03,    // Neutral-positive sentiment
                engagement_rate: 0.015,    // 1.5% engagement rate
                tweet_volume_change: 5     // 5% increase in volume
            },
            // Add mock data for each token if needed
            tokens: {
                BONK: { sentiment: 0.05, volume: 1000 },
                BACK: { sentiment: 0.04, volume: 500 },
                WIF: { sentiment: 0.03, volume: 750 },
                SAMO: { sentiment: 0.02, volume: 600 },
                BOME: { sentiment: 0.01, volume: 400 },
                MYRO: { sentiment: 0.02, volume: 450 },
                POPCAT: { sentiment: 0.01, volume: 300 }
            }
        };

        // Calculate index
        console.log('\nCalculating Over/Back Index...');
        const index = calculator.calculateIndex(marketData, twitterData, onChainData);
        
        // Store result
        await storage.storeDaily(index);
        const trend = await storage.getTrend();

        // Display detailed results
        console.log('\n=== Over/Back Index Results ===');
        console.log(`Score: ${index.score}`);
        console.log(`Status: ${index.label}`);
        console.log(`Trend: ${trend}`);
        
        console.log('\nComponent Scores:');
        console.log('Market Data (40%):', Math.round(index.components.market));
        console.log('Social Sentiment (15%):', Math.round(index.components.sentiment), '(using mock data)');
        console.log('On-chain Activity (45%):', Math.round(index.components.onChain));

        console.log('\nToken Details:');
        for (const [token, metrics] of Object.entries(onChainData.token_metrics)) {
            console.log(`\n${token}:`);
            console.log(`- Transactions: ${metrics.metrics.transactions.count_24h.toLocaleString()}`);
            console.log(`- Volume (SOL): ${metrics.metrics.volume.sol_amount.toLocaleString()}`);
            console.log(`- Volume Change: ${metrics.metrics.volume.change_percentage.toFixed(2)}%`);
            console.log(`- Activity Score: ${metrics.metrics.activity_score.toFixed(2)}`);
            console.log(`- Mock Sentiment: ${twitterData.tokens[token].sentiment.toFixed(2)}`);
        }

    } catch (error) {
        console.error('Test failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testFullIndex(); 