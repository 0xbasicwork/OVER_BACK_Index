const { SolanaDataCollector } = require('./solana-data');

// Import sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function compareTokenMetrics() {
    try {
        console.log('Comparing BONK and BACK metrics collection...');
        
        const collector = new SolanaDataCollector();
        
        // Test BONK first
        console.log('\nFetching BONK metrics...');
        const bonkMetrics = await collector.getTokenMetrics(SolanaDataCollector.MEMECOIN_ADDRESSES.BONK);
        console.log('\nBONK Metrics:');
        console.log('Transaction count (24h):', bonkMetrics.metrics.transactions.count_24h.toLocaleString());
        console.log('Supply:', bonkMetrics.supply.uiAmount.toLocaleString());
        console.log('24h Volume (SOL):', bonkMetrics.metrics.volume.sol_amount.toLocaleString(), 'SOL');
        console.log('24h Volume (USD):', `$${bonkMetrics.metrics.volume.usd_amount.toLocaleString()}`);
        console.log('Volume change:', bonkMetrics.metrics.volume.change_percentage.toFixed(2) + '%');
        console.log('Activity score:', bonkMetrics.metrics.activity_score.toFixed(2));
        console.log('Score components:');
        console.log('- Transaction weight: 40%');
        console.log('- Token volume change weight: 20%');
        console.log('- SOL volume weight: 20%');
        console.log('- SOL volume change weight: 20%');

        await sleep(5000);
        
        // Test BACK
        console.log('\nFetching BACK metrics...');
        const backMetrics = await collector.getTokenMetrics(SolanaDataCollector.MEMECOIN_ADDRESSES.BACK);
        console.log('\nBACK Metrics:');
        console.log('Transaction count (24h):', backMetrics.metrics.transactions.count_24h.toLocaleString());
        console.log('Supply:', backMetrics.supply.uiAmount.toLocaleString());
        console.log('24h Volume:', backMetrics.metrics.volume.current_24h.toLocaleString(), 'SOL');
        console.log('Volume change:', backMetrics.metrics.volume.change_percentage.toFixed(2) + '%');
        console.log('Activity score:', backMetrics.metrics.activity_score.toFixed(2));

    } catch (error) {
        console.error('Test failed:', error);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
    }
}

// Run comparison
compareTokenMetrics(); 