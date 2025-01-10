require('dotenv').config();
const axios = require('axios');

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
// Let's try both endpoints to debug
const COINGECKO_PUBLIC_API_BASE_URL = 'https://api.coingecko.com/api/v3';
const COINGECKO_PRO_API_BASE_URL = 'https://pro-api.coingecko.com/api/v3';

// List of Solana memecoins to track
const SOLANA_MEMECOINS = [
    'samoyedcoin',     // SAMO
    'bonk',            // BONK
    'dogwifcoin',      // WIF (correct ID from CoinGecko API)
    'popcat',          // POPCAT
    'book-of-meme',    // BOME
    'myro',            // MYRO
];

async function fetchMemecoinData(memecoinId) {
    try {
        // Try Pro API first
        try {
            const proResponse = await axios.get(
                `${COINGECKO_PRO_API_BASE_URL}/coins/${memecoinId}`,
                {
                    headers: {
                        'x-cg-pro-api-key': COINGECKO_API_KEY
                    },
                    params: {
                        localization: false,
                        tickers: false,
                        community_data: false,
                        developer_data: false,
                        sparkline: false
                    }
                }
            );
            console.log(`Successfully fetched ${memecoinId} from Pro API`);
            return formatCoinData(proResponse.data);
        } catch (proError) {
            console.log(`Pro API failed for ${memecoinId}, trying public API...`);
            // If Pro API fails, try public API
            const publicResponse = await axios.get(
                `${COINGECKO_PUBLIC_API_BASE_URL}/coins/${memecoinId}`,
                {
                    params: {
                        localization: false,
                        tickers: false,
                        community_data: false,
                        developer_data: false,
                        sparkline: false
                    }
                }
            );
            console.log(`Successfully fetched ${memecoinId} from public API`);
            return formatCoinData(publicResponse.data);
        }
    } catch (error) {
        console.error(`Error fetching data for ${memecoinId}:`, error.message);
        throw error;
    }
}

function formatCoinData(data) {
    return {
        id: data.id,
        name: data.name,
        symbol: data.symbol,
        market_data: {
            current_price_usd: data.market_data.current_price.usd,
            market_cap_usd: data.market_data.market_cap.usd,
            total_volume_usd: data.market_data.total_volume.usd,
            price_change_24h: data.market_data.price_change_percentage_24h,
            price_change_7d: data.market_data.price_change_percentage_7d,
            price_change_30d: data.market_data.price_change_percentage_30d,
            market_cap_change_24h: data.market_data.market_cap_change_percentage_24h,
            volume_change_24h: data.market_data.volume_change_24h,
            circulating_supply: data.market_data.circulating_supply,
            total_supply: data.market_data.total_supply
        }
    };
}

async function fetchSolanaMemecoinData() {
    try {
        // Try each coin individually and filter out failures
        const results = await Promise.allSettled(
            SOLANA_MEMECOINS.map(id => fetchMemecoinData(id))
        );
        
        // Log any failures
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.log(`Failed to fetch ${SOLANA_MEMECOINS[index]}: ${result.reason.message}`);
            }
        });

        // Get successful results
        const memecoinDataArray = results
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);

        if (memecoinDataArray.length === 0) {
            throw new Error('No coin data could be fetched');
        }

        // Calculate additional market metrics
        const totalMarketCap = memecoinDataArray.reduce((sum, coin) => 
            sum + coin.market_data.market_cap_usd, 0);

        const enrichedData = memecoinDataArray.map(coin => ({
            ...coin,
            market_metrics: {
                market_dominance: (coin.market_data.market_cap_usd / totalMarketCap) * 100,
                volatility_24h: Math.abs(coin.market_data.price_change_24h),
                volume_to_market_cap_ratio: coin.market_data.total_volume_usd / coin.market_data.market_cap_usd
            }
        }));

        // Calculate market-wide metrics
        const marketMetrics = {
            total_market_cap: totalMarketCap,
            average_24h_change: memecoinDataArray.reduce((sum, coin) => 
                sum + coin.market_data.price_change_24h, 0) / memecoinDataArray.length,
            average_volume_change_24h: memecoinDataArray.reduce((sum, coin) => 
                sum + coin.market_data.volume_change_24h, 0) / memecoinDataArray.length,
            total_24h_volume: memecoinDataArray.reduce((sum, coin) => 
                sum + coin.market_data.total_volume_usd, 0)
        };

        return {
            memecoins: enrichedData,
            market_metrics: marketMetrics
        };
    } catch (error) {
        console.error('Error in fetchSolanaMemecoinData:', error);
        throw error;
    }
}

module.exports = {
    fetchSolanaMemecoinData,
    SOLANA_MEMECOINS
};