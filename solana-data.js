const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');
const { CORE_TOKENS } = require('./token-config');
require('dotenv').config();
const axios = require('axios');

// Add delay between requests
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class SolanaDataCollector {
    constructor() {
        // Use Helius RPC URL or fallback to public endpoint
        const rpcUrl = process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
        this.connection = new web3.Connection(rpcUrl, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
        });
        this.retryCount = 0;
    }

    // Get all token addresses from CORE_TOKENS
    static get MEMECOIN_ADDRESSES() {
        return Object.entries(CORE_TOKENS).reduce((acc, [name, data]) => {
            acc[name] = data.contract;
            return acc;
        }, {});
    }

    async getTokenMetrics(address) {
        const tokenPublicKey = new web3.PublicKey(address);
        
        try {
            console.log(`\nFetching metrics for ${address}...`);
            
            // Get basic token info with retry logic
            const tokenInfo = await this.retryWithBackoff(
                () => this.connection.getParsedAccountInfo(tokenPublicKey)
            );
            
            const supply = await this.retryWithBackoff(
                () => this.connection.getTokenSupply(tokenPublicKey)
            );

            // Get recent transactions with volume
            const signatures = await this.retryWithBackoff(
                () => this.connection.getSignaturesForAddress(
                    tokenPublicKey,
                    { limit: 1000 }  // Increased from 25 to 1000
                )
            );

            // Filter signatures by timestamp
            const now = Math.floor(Date.now() / 1000);
            const oneDayAgo = now - (24 * 60 * 60);
            const recentSignatures = signatures.filter(sig => 
                sig.blockTime && sig.blockTime >= oneDayAgo
            );

            // Get previous day's signatures
            const twoDaysAgo = now - (48 * 60 * 60);
            const previousDaySignatures = signatures.filter(sig => 
                sig.blockTime && sig.blockTime >= twoDaysAgo && sig.blockTime < oneDayAgo
            );

            // Calculate volumes with larger sample size
            const currentVolume = await this.calculateVolume(recentSignatures.slice(0, 100));
            const previousVolume = await this.calculateVolume(previousDaySignatures.slice(0, 100));
            
            const volumeChange = previousVolume > 0 
                ? ((currentVolume - previousVolume) / previousVolume) * 100 
                : 0;

            // Get SOL price from CoinGecko
            const solPrice = await this.getSolPrice();

            // Simplified metrics return
            return {
                token: address,
                supply: supply.value,
                mint_info: tokenInfo.value.data.parsed.info,
                metrics: {
                    transactions: {
                        count_24h: recentSignatures.length
                    },
                    volume: {
                        current_24h: currentVolume,
                        previous_24h: previousVolume,
                        change_percentage: volumeChange,
                        sol_amount: currentVolume,
                        usd_amount: currentVolume * solPrice
                    },
                    activity_score: this.calculateActivityScore(
                        recentSignatures.length,
                        volumeChange,
                        currentVolume,
                        volumeChange
                    )
                }
            };
        } catch (error) {
            console.error(`Failed to get metrics for token ${address}:`, error.message);
            throw error;
        }
    }

    // Add new retry method
    async retryWithBackoff(operation, maxRetries = 5) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Shorter delays with Helius
                const delay = Math.min(Math.pow(2, attempt) * 500, 10000); // Max 10 second delay
                await sleep(delay);
                
                return await operation();
            } catch (error) {
                if (error.message.includes('429')) {
                    console.log(`Rate limited (attempt ${attempt}/${maxRetries}). Waiting ${delay/1000} seconds...`);
                    if (attempt === maxRetries) throw error;
                    continue;
                }
                throw error;
            }
        }
    }

    async calculateVolume(signatures) {
        let totalVolume = 0;
        
        for (const sig of signatures) {
            try {
                const tx = await this.retryWithBackoff(
                    () => this.connection.getParsedTransaction(sig.signature, {
                        maxSupportedTransactionVersion: 0
                    })
                );

                if (tx && tx.meta && tx.meta.preBalances && tx.meta.postBalances) {
                    const balanceChanges = tx.meta.preBalances.map((pre, i) => 
                        Math.abs(pre - tx.meta.postBalances[i])
                    );
                    totalVolume += Math.max(...balanceChanges) / 1e9;
                }
            } catch (error) {
                console.error(`Error getting transaction details: ${error.message}`);
            }
        }
        
        return totalVolume;
    }

    analyzeTransactions(signatures) {
        return {
            count: signatures.length
        };
    }

    calculateActivityScore(txCount, volumeChange, solVolume, solVolumeChange) {
        // Normalize transaction count (assuming max 5000 daily transactions)
        const txScore = Math.min(txCount / 5000, 1);
        
        // Normalize volume changes to -1 to 1 range
        const tokenVolumeScore = Math.min(Math.max(volumeChange, -100), 100) / 100;
        const solVolumeScore = Math.min(Math.max(solVolumeChange, -100), 100) / 100;
        
        // Normalize SOL volume (assuming max 1000 SOL daily volume)
        const solVolumeNormalized = Math.min(solVolume / 1000, 1);

        const activityScore = (
            txScore * 0.4 +                    // 40% weight: Transaction count
            (tokenVolumeScore + 1) / 2 * 0.2 + // 20% weight: Token volume change
            solVolumeNormalized * 0.2 +        // 20% weight: SOL volume
            (solVolumeScore + 1) / 2 * 0.2     // 20% weight: SOL volume change
        ) * 100;
        
        return Math.min(activityScore, 100);
    }

    async getAllMemecoinMetrics() {
        try {
            const metrics = {};
            
            // Get metrics for each token
            for (const [name, address] of Object.entries(SolanaDataCollector.MEMECOIN_ADDRESSES)) {
                try {
                    metrics[name] = await this.getTokenMetrics(address);
                    console.log(`Successfully collected metrics for ${name}`);
                } catch (error) {
                    console.error(`Failed to get metrics for ${name}, skipping...`);
                    continue; // Skip this token and continue with others
                }
            }

            if (Object.keys(metrics).length === 0) {
                throw new Error('No valid token metrics collected');
            }

            // Calculate average metrics across all tokens
            const averageMetrics = this.calculateAverageMetrics(metrics);

            return {
                market_metrics: averageMetrics,
                token_metrics: metrics
            };
        } catch (error) {
            console.error('Failed to get memecoin metrics:', error);
            throw error;
        }
    }

    calculateAverageMetrics(metrics) {
        return {
            total_transactions_24h: Object.values(metrics).reduce((sum, token) => 
                sum + token.metrics.transactions.count_24h, 0),
            average_activity_score: Object.values(metrics).reduce((sum, token) => 
                sum + token.metrics.activity_score, 0) / Object.values(metrics).length,
            average_error_rate: Object.values(metrics).reduce((sum, token) => 
                sum + token.metrics.transactions.error_rate, 0) / Object.values(metrics).length
        };
    }

    // Add method to get SOL price
    async getSolPrice() {
        try {
            const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
                params: {
                    ids: 'solana',
                    vs_currencies: 'usd'
                }
            });
            return response.data.solana.usd;
        } catch (error) {
            console.error('Failed to fetch SOL price:', error);
            return 0; // Return 0 instead of a hardcoded value
        }
    }
}

module.exports = {
    SolanaDataCollector,
    MEMECOIN_ADDRESSES: SolanaDataCollector.MEMECOIN_ADDRESSES
}; 