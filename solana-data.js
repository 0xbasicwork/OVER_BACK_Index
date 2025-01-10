const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');

const MEMECOIN_ADDRESSES = {
    'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    'SAMO': '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    'WIF': 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    'POPCAT': 'A98UDy7z8MfmWnTQt6tySsHN4ib1NpX9MMPegE6zXwj2',
    'BOME': '9aeip1LRK4tWDPBNJVwbhkqdH12MH4JjbfnU108EQ5jX',
    'MYRO': 'HhJpBhRRuXPZQpVxUHHhXhp9MtKLaJD8t8kXkXjgy9Ew'
};

class SolanaDataCollector {
    constructor() {
        this.connection = new web3.Connection(
            'https://api.mainnet-beta.solana.com',
            'confirmed'
        );
    }

    async getTokenMetrics(address) {
        const tokenPublicKey = new web3.PublicKey(address);
        
        // Get basic token info
        const tokenInfo = await this.connection.getParsedAccountInfo(tokenPublicKey);
        const supply = await this.connection.getTokenSupply(tokenPublicKey);
        
        // Get recent transactions with volume
        const now = Math.floor(Date.now() / 1000);
        const oneDayAgo = now - 24 * 60 * 60;
        const signatures = await this.connection.getSignaturesForAddress(
            tokenPublicKey,
            { until: oneDayAgo }
        );

        // Get previous day's data for volume comparison
        const twoDaysAgo = now - 48 * 60 * 60;
        const previousDaySignatures = await this.connection.getSignaturesForAddress(
            tokenPublicKey,
            { until: twoDaysAgo, until: oneDayAgo }
        );

        // Calculate volumes
        const currentVolume = await this.calculateVolume(signatures);
        const previousVolume = await this.calculateVolume(previousDaySignatures);
        const volumeChange = previousVolume > 0 
            ? ((currentVolume - previousVolume) / previousVolume) * 100 
            : 0;

        // Analyze transactions
        const txMetrics = this.analyzeTransactions(signatures);

        return {
            token: address,
            supply: supply.value,
            mint_info: tokenInfo.value.data.parsed.info,
            metrics: {
                transactions: {
                    count_24h: signatures.length,
                    successful_24h: txMetrics.successful,
                    failed_24h: txMetrics.failed,
                    error_rate: txMetrics.errorRate
                },
                volume: {
                    current_24h: currentVolume,
                    previous_24h: previousVolume,
                    change_percentage: volumeChange
                },
                activity_score: this.calculateActivityScore(
                    signatures.length, 
                    txMetrics.errorRate,
                    volumeChange
                )
            }
        };
    }

    async calculateVolume(signatures) {
        let totalVolume = 0;
        
        for (const sig of signatures) {
            try {
                const tx = await this.connection.getParsedTransaction(sig.signature);
                if (tx && tx.meta && tx.meta.preBalances && tx.meta.postBalances) {
                    // Calculate the difference in balances
                    const balanceChanges = tx.meta.preBalances.map((pre, i) => 
                        Math.abs(pre - tx.meta.postBalances[i])
                    );
                    totalVolume += Math.max(...balanceChanges) / 1e9; // Convert lamports to SOL
                }
            } catch (error) {
                console.error(`Error getting transaction details: ${error.message}`);
            }
        }
        
        return totalVolume;
    }

    analyzeTransactions(signatures) {
        const successful = signatures.filter(tx => tx.err === null).length;
        const failed = signatures.length - successful;
        const errorRate = failed / signatures.length;

        return {
            successful,
            failed,
            errorRate
        };
    }

    calculateActivityScore(txCount, errorRate, volumeChange) {
        const volumeScore = Math.min(Math.max(volumeChange, -100), 100) / 100;
        const activityScore = (
            (txCount / 1000) * 0.4 +
            (1 - errorRate) * 0.3 +
            (volumeScore + 1) / 2 * 0.3
        ) * 100;
        
        return Math.min(activityScore, 100);
    }

    async getAllMemecoinMetrics() {
        const results = [];
        
        for (const [name, address] of Object.entries(MEMECOIN_ADDRESSES)) {
            try {
                console.log(`Fetching metrics for ${name}...`);
                const metrics = await this.getTokenMetrics(address);
                results.push({
                    name,
                    ...metrics
                });
                
                // Add delay between requests
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`Failed to fetch metrics for ${name}:`, error.message);
            }
        }

        return {
            tokens: results,
            market_metrics: this.calculateMarketMetrics(results)
        };
    }

    calculateMarketMetrics(results) {
        return {
            total_transactions_24h: results.reduce((sum, token) => 
                sum + token.metrics.transactions.count_24h, 0),
            average_activity_score: results.reduce((sum, token) => 
                sum + token.metrics.activity_score, 0) / results.length,
            average_error_rate: results.reduce((sum, token) => 
                sum + token.metrics.transactions.error_rate, 0) / results.length
        };
    }
}

module.exports = {
    SolanaDataCollector,
    MEMECOIN_ADDRESSES
}; 