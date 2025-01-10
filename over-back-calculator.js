class OverBackCalculator {
    // Adjusted weights with further increased social sentiment
    static WEIGHTS = {
        MARKET_DATA: 38,      // Increased market influence
        SOCIAL_SENTIMENT: 30,  // Further increased from 25
        ON_CHAIN: 32          // Reduced to balance
    };

    constructor() {
        this.scale = [
            { max: 10, label: "It's so over." },
            { max: 25, label: "It's over." },
            { max: 35, label: "Fuck it, we ball." },
            { max: 50, label: "It is what it is." },
            { max: 65, label: "We vibing." },
            { max: 75, label: "We're back." },
            { max: 90, label: "We are so back." },
            { max: 100, label: "LET'S FUCKING GOOO!" }
        ];
    }

    calculateIndex(marketData, twitterData, onChainData) {
        // Calculate individual components with default values if undefined
        const marketScore = this.calculateMarketScore(marketData) || 50;
        const sentimentScore = this.calculateSentimentScore(twitterData) || 50;
        const onChainScore = this.calculateOnChainScore(onChainData) || 50;

        // Combine weighted scores
        const totalScore = (
            (marketScore * OverBackCalculator.WEIGHTS.MARKET_DATA +
            sentimentScore * OverBackCalculator.WEIGHTS.SOCIAL_SENTIMENT +
            onChainScore * OverBackCalculator.WEIGHTS.ON_CHAIN) / 100
        );

        // Ensure the score is valid
        const validScore = Math.max(0, Math.min(100, totalScore || 50));

        // Get corresponding label
        const label = this.getScaleLabel(validScore);

        return {
            score: Math.round(validScore),
            label,
            components: {
                market: marketScore,
                sentiment: sentimentScore,
                onChain: onChainScore
            },
            details: {
                marketMetrics: this.normalizeMarketMetrics(marketData),
                sentimentMetrics: this.normalizeSentimentMetrics(twitterData),
                onChainMetrics: this.normalizeOnChainMetrics(onChainData)
            }
        };
    }

    calculateMarketScore(marketData) {
        if (!marketData) return 50;
        const metrics = this.normalizeMarketMetrics(marketData);
        
        return (
            metrics.priceChange * 0.4 +
            metrics.volumeChange * 0.3 +
            metrics.marketCapChange * 0.3
        ) * 100;
    }

    calculateSentimentScore(twitterData) {
        if (!twitterData?.overall_metrics) return 50;
        const metrics = this.normalizeSentimentMetrics(twitterData);
        
        return (
            metrics.sentimentScore * 0.4 +
            metrics.engagementScore * 0.3 +
            metrics.volumeScore * 0.3
        ) * 100;
    }

    calculateOnChainScore(onChainData) {
        if (!onChainData?.market_metrics) return 50;
        const metrics = this.normalizeOnChainMetrics(onChainData);
        
        return (
            metrics.activityScore * 0.4 +
            metrics.successRate * 0.3 +
            metrics.volumeScore * 0.3
        ) * 100;
    }

    normalizeMarketMetrics(marketData) {
        if (!marketData) return {
            priceChange: 0.5,
            volumeChange: 0.5,
            marketCapChange: 0.5
        };

        return {
            priceChange: this.normalize(marketData.price_change_percentage_24h || 0, -20, 20),
            volumeChange: this.normalize(marketData.volume_change_24h || 0, -50, 50),
            marketCapChange: this.normalize(marketData.market_cap_change_percentage_24h || 0, -25, 25)
        };
    }

    normalizeSentimentMetrics(twitterData) {
        if (!twitterData?.overall_metrics) return {
            sentimentScore: 0.5,
            engagementScore: 0.5,
            volumeScore: 0.5
        };

        return {
            sentimentScore: this.normalize(twitterData.overall_metrics.sentiment_score || 0, -0.3, 0.3),
            engagementScore: this.normalize(twitterData.overall_metrics.engagement_rate || 0, 0, 0.03),
            volumeScore: this.normalize(twitterData.overall_metrics.tweet_volume_change || 0, -30, 30)
        };
    }

    normalizeOnChainMetrics(onChainData) {
        try {
            if (!onChainData?.market_metrics) return {
                activityScore: 0.5,
                successRate: 0.5,
                volumeScore: 0.5
            };

            // Get the volume change percentage, default to 0 if not available
            const volumeChange = onChainData.market_metrics?.volume?.change_percentage ?? 0;
            
            // Normalize metrics to 0-1 scale
            const activityScore = this.normalize(
                onChainData.market_metrics?.average_activity_score ?? 50, 
                0, 
                100
            );
            
            const successRate = 1 - this.normalize(
                onChainData.market_metrics?.average_error_rate ?? 0,
                0,
                1
            );
            
            const volumeScore = this.normalize(
                volumeChange,
                -50,
                50
            );
            
            return {
                activityScore,
                successRate,
                volumeScore
            };
        } catch (error) {
            console.error('Error normalizing on-chain metrics:', error);
            // Return default values if normalization fails
            return {
                activityScore: 0.5,
                successRate: 0.5,
                volumeScore: 0.5
            };
        }
    }

    normalize(value, min, max) {
        if (typeof value !== 'number' || isNaN(value)) return 0.5;
        return Math.max(0, Math.min(1, (value - min) / (max - min)));
    }

    getScaleLabel(score) {
        for (const level of this.scale) {
            if (score <= level.max) {
                return level.label;
            }
        }
        return this.scale[this.scale.length - 1].label;
    }
}

module.exports = OverBackCalculator; 