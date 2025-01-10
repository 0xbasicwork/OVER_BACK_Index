const OverBackCalculator = require('./over-back-calculator');
const DataStorage = require('./data-storage');

// Even more conservative mock data
const mockMarketData = {
    price_change_percentage_24h: 3.2,    // Further reduced
    volume_change_24h: 15.5,             // Further reduced
    market_cap_change_percentage_24h: 2.8 // Further reduced
};

const mockTwitterData = {
    overall_metrics: {
        sentiment_score: 0.03,           // Further reduced
        engagement_rate: 0.015,          // Further reduced
        tweet_volume_change: 5           // Further reduced
    },
    coins: [
        {
            name: 'BONK',
            metrics: {
                sentiment: 0.07,
                engagement: { likes: 252, retweets: 46, replies: 64 },
                distribution: { positive: 61, negative: 12, neutral: 27 }
            }
        }
    ]
};

// Updated mock on-chain data to match new structure
const mockOnChainData = {
    market_metrics: {
        average_activity_score: 35.5,
        average_error_rate: 0.3,
        volume: {
            current_24h: 25000,
            previous_24h: 30000,
            change_percentage: -16.67  // (25000 - 30000) / 30000 * 100
        },
        total_transactions_24h: 2500
    }
};

async function testCalculator() {
    try {
        // Initialize calculator and storage
        const calculator = new OverBackCalculator();
        const storage = new DataStorage();
        await storage.initialize();

        // Calculate index
        const index = calculator.calculateIndex(mockMarketData, mockTwitterData, mockOnChainData);
        
        // Store result
        await storage.storeDaily(index);
        const trend = await storage.getTrend();

        // Display results              
        console.log('\n=== Over & Back Index Test Results ===');
        console.log(`Score: ${index.score}`);
        console.log(`Status: ${index.label}`);
        console.log(`Trend: ${trend}`);
        
        console.log('\nComponent Scores:');
        console.log('Market Data:', Math.round(index.components.market));
        console.log('Social Sentiment:', Math.round(index.components.sentiment));
        console.log('On-chain Activity:', Math.round(index.components.onChain));

        console.log('\nDetailed Metrics:');
        console.log('Market:', index.details.marketMetrics);
        console.log('Sentiment:', index.details.sentimentMetrics);
        console.log('On-chain:', index.details.onChainMetrics);

    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run test
testCalculator(); 