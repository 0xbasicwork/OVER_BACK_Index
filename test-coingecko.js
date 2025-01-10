const CoinGecko = require('./coingecko');

async function testCoinGecko() {
    try {
        console.log('\n=== Testing CoinGecko API ===\n');
        
        const coingecko = new CoinGecko();
        
        console.log('Fetching market data...');
        const marketData = await coingecko.getMarketData();
        
        console.log('\nMarket Data Results:');
        console.log('Number of tokens tracked:', marketData.token_count);
        console.log('Available tokens:', marketData.available_tokens.join(', '));
        console.log('Average Price Change (24h):', marketData.price_change_percentage_24h.toFixed(2) + '%');
        console.log('Total Volume (24h):', marketData.volume_change_24h.toLocaleString() + ' USD');
        console.log('Average Market Cap Change (24h):', marketData.market_cap_change_percentage_24h.toFixed(2) + '%');
        
        console.log('\nRaw Response Data:');
        console.log(JSON.stringify(marketData, null, 2));

    } catch (error) {
        console.error('Test failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testCoinGecko(); 