class OverBackCalculator {
    // Further adjusted weights to be more conservative
    static WEIGHTS = {
        MARKET_DATA: 40,      // Increased market influence more
        SOCIAL_SENTIMENT: 15,  // Further reduced social weight
        ON_CHAIN: 45          // Kept on-chain as is
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
        // Calculate individual components
        const marketScore = this.calculateMarketScore(marketData);
        const sentimentScore = this.calculateSentimentScore(twitterData);
        const onChainScore = this.calculateOnChainScore(onChainData);

        // Combine weighted scores
        const totalScore = (
            (marketScore * OverBackCalculator.WEIGHTS.MARKET_DATA +
            sentimentScore * OverBackCalculator.WEIGHTS.SOCIAL_SENTIMENT +
            onChainScore * OverBackCalculator.WEIGHTS.ON_CHAIN) / 100
        );

        // Get corresponding label
        const label = this.getScaleLabel(totalScore);

        return {
            score: Math.round(totalScore),
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
        const metrics = this.normalizeMarketMetrics(marketData);
        
        return (
            metrics.priceChange * 0.4 +
            metrics.volumeChange * 0.3 +
            metrics.marketCapChange * 0.3
        ) * 100;
    }

    calculateSentimentScore(twitterData) {
        const metrics = this.normalizeSentimentMetrics(twitterData);
        
        return (
            metrics.sentimentScore * 0.4 +
            metrics.engagementScore * 0.3 +
            metrics.volumeScore * 0.3
        ) * 100;
    }

    calculateOnChainScore(onChainData) {
        const metrics = this.normalizeOnChainMetrics(onChainData);
        
        return (
            metrics.activityScore * 0.4 +
            metrics.successRate * 0.3 +
            metrics.volumeScore * 0.3
        ) * 100;
    }

    normalizeMarketMetrics(marketData) {
        return {
            // Even more conservative ranges for market metrics
            priceChange: this.normalize(marketData.price_change_percentage_24h, -20, 20),
            volumeChange: this.normalize(marketData.volume_change_24h, -50, 50),
            marketCapChange: this.normalize(marketData.market_cap_change_percentage_24h, -25, 25)
        };
    }

    normalizeSentimentMetrics(twitterData) {
        return {
            // Stricter sentiment normalization
            sentimentScore: this.normalize(twitterData.overall_metrics.sentiment_score, -0.3, 0.3),
            engagementScore: this.normalize(twitterData.overall_metrics.engagement_rate, 0, 0.03),
            volumeScore: this.normalize(twitterData.overall_metrics.tweet_volume_change, -30, 30)
        };
    }

    normalizeOnChainMetrics(onChainData) {
        return {
            activityScore: this.normalize(onChainData.market_metrics.average_activity_score, 0, 60),
            successRate: 1 - (onChainData.market_metrics.average_error_rate * 2),
            volumeScore: this.normalize(onChainData.market_metrics.volume.change_percentage, -50, 50)
        };
    }

    normalize(value, min, max) {
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