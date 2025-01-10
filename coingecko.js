const axios = require('axios');
require('dotenv').config();

class CoinGecko {
    constructor() {
        this.apiKey = process.env.COINGECKO_API_KEY;
        this.baseUrl = 'https://api.coingecko.com/api/v3';
    }

    async getMarketData() {
        try {
            const response = await axios.get(`${this.baseUrl}/simple/price`, {
                params: {
                    ids: 'bonk,samoyedcoin,wilder-world,popcat,bomber-coin,myro,back-finance',
                    vs_currencies: 'usd',
                    include_24hr_vol: true,
                    include_24hr_change: true,
                    include_market_cap: true,
                    x_cg_demo_api_key: this.apiKey
                }
            });

            return {
                price_change_percentage_24h: response.data.bonk?.usd_24h_change || 0,
                volume_change_24h: response.data.bonk?.usd_24h_vol || 0,
                market_cap_change_percentage_24h: response.data.bonk?.usd_market_cap || 0
            };
        } catch (error) {
            console.error('Failed to fetch CoinGecko data:', error.message);
            // Return default values if API fails
            return {
                price_change_percentage_24h: 0,
                volume_change_24h: 0,
                market_cap_change_percentage_24h: 0
            };
        }
    }
}

module.exports = CoinGecko;