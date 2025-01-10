const OverBackCalculator = require('./over-back-calculator');

// Sample market data structure
const sampleMarketData = {
    price_change_percentage_24h: 5.2,
    volume_change_24h: 15.5,
    market_cap_change_percentage_24h: 4.8
};

// Sample Twitter data structure
const sampleTwitterData = {
    overall_metrics: {
        sentiment_score: 0.15,
        engagement_rate: 0.02,
        tweet_volume_change: 10
    }
};

// Sample on-chain data structure
const sampleOnChainData = {
    market_metrics: {
        average_activity_score: 65.5,
        average_error_rate: 0.2,
        volume: {
            change_percentage: 25.5
        }
    }
};

async function testCalculator() {
    try {
        const calculator = new OverBackCalculator();
        
        // Calculate index with sample data
        const result = calculator.calculateIndex(
            sampleMarketData,
            sampleTwitterData,
            sampleOnChainData
        );
        
        console.log('\nTest Results:');
        console.log('=============');
        console.log(`Overall Score: ${result.score}`);
        console.log(`Status: ${result.label}`);
        console.log('\nComponent Scores:');
        console.log('----------------');
        console.log(`Market Score: ${result.components.market.toFixed(2)}`);
        console.log(`Sentiment Score: ${result.components.sentiment.toFixed(2)}`);
        console.log(`On-Chain Score: ${result.components.onChain.toFixed(2)}`);
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test
testCalculator(); 