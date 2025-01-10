const axios = require('axios');
const { CORE_TOKENS, MARKET_TOKENS } = require('./token-config');
require('dotenv').config();

class CoinGecko {
    constructor() {
        this.apiKey = process.env.COINGECKO_API_KEY;
        this.baseUrl = 'https://pro-api.coingecko.com/api/v3';
        this.validTokenIds = this.getValidTokenIds();
    }

    getValidTokenIds() {
        const coreIds = Object.values(CORE_TOKENS)
            .map(token => token.coingeckoId)
            .filter(id => id !== null);
        
        const marketIds = Object.values(MARKET_TOKENS)
            .map(token => token.coingeckoId);
        
        return [...coreIds, ...marketIds];
    }

    async getMarketData() {
        try {
            console.log('Using API Key:', this.apiKey);
            
            const response = await axios.get(`${this.baseUrl}/coins/markets`, {
                params: {
                    vs_currency: 'usd',
                    ids: this.validTokenIds.join(','),
                    order: 'market_cap_desc',
                    per_page: 20,
                    page: 1,
                    sparkline: false,
                    price_change_percentage: '24h',
                    x_cg_pro_api_key: this.apiKey
                },
                headers: {
                    'x-cg-pro-api-key': this.apiKey
                }
            });

            const availableTokens = response.data || [];
            if (availableTokens.length === 0) {
                throw new Error('No token data available');
            }

            console.log('Retrieved data for tokens:', availableTokens.map(t => t.id));

            const aggregateData = availableTokens.reduce((acc, token) => {
                acc.price_changes.push(token.price_change_percentage_24h || 0);
                acc.volumes.push(token.total_volume || 0);
                acc.market_cap_changes.push(token.market_cap_change_percentage_24h || 0);
                return acc;
            }, { price_changes: [], volumes: [], market_cap_changes: [] });

            const avgPriceChange = aggregateData.price_changes.reduce((a, b) => a + b, 0) / aggregateData.price_changes.length;
            const totalVolume = aggregateData.volumes.reduce((a, b) => a + b, 0);
            const avgMarketCapChange = aggregateData.market_cap_changes.reduce((a, b) => a + b, 0) / aggregateData.market_cap_changes.length;

            return {
                price_change_percentage_24h: avgPriceChange,
                volume_change_24h: totalVolume,
                market_cap_change_percentage_24h: avgMarketCapChange,
                change_percentage: avgPriceChange,
                available_tokens: availableTokens.map(t => t.id),
                token_count: availableTokens.length
            };
        } catch (error) {
            const errorMessage = error.response?.data?.error || error.message;
            console.error('Failed to fetch CoinGecko data:', errorMessage);
            throw new Error(`CoinGecko API Error: ${errorMessage}`);
        }
    }
}

module.exports = CoinGecko;