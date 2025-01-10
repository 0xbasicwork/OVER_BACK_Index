require('dotenv').config();
const axios = require('axios');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const Analyzer = require('natural').SentimentAnalyzer;
const stemmer = require('natural').PorterStemmer;
const analyzer = new Analyzer("English", stemmer, "afinn");

// Twitter API v2 endpoints
const TWITTER_API_BASE_URL = 'https://api.twitter.com/2';

// Configure Twitter API credentials
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

// Keywords and hashtags to track
const MEMECOIN_KEYWORDS = {
    'BONK': ['$BONK', '#BONK', 'bonkcoin', 'bonksolana'],
    'SAMO': ['$SAMO', '#SAMO', 'samoyedcoin'],
    'WIF': ['$WIF', '#WIF', 'dogwifhat'],
    'POPCAT': ['$POPCAT', '#POPCAT', 'popcatsolana'],
    'BOME': ['$BOME', '#BOME', 'bookofmeme'],
    'MYRO': ['$MYRO', '#MYRO', 'myrocoin']
};

// Add rate limit handling constants
const INITIAL_RETRY_DELAY = 5000; // 5 seconds
const MAX_RETRIES = 3;
const BETWEEN_REQUESTS_DELAY = 3000; // 3 seconds between requests
const MAX_RESULTS_PER_COIN = 50;  // Reduced from 100
const DAILY_BUDGET = 500;  // ~15,000 per month
const COINS_COUNT = Object.keys(MEMECOIN_KEYWORDS).length;  // Currently 6 coins

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, config, retries = MAX_RETRIES, delay = INITIAL_RETRY_DELAY) {
    try {
        console.log(`Waiting ${delay/1000} seconds before request...`);
        await sleep(delay);
        const response = await axios.get(url, config);
        return response;
    } catch (error) {
        if (error.response && error.response.status === 429 && retries > 0) {
            const resetTime = error.response.headers['x-rate-limit-reset'];
            const waitTime = resetTime ? (new Date(resetTime * 1000) - new Date()) : delay * 2;
            console.log(`Rate limited, waiting ${waitTime/1000} seconds before retry...`);
            await sleep(waitTime);
            return fetchWithRetry(url, config, retries - 1, delay * 2);
        }
        throw error;
    }
}

async function fetchTweetSentiment(coin, timeframe = '24h') {
    try {
        const startTime = new Date();
        startTime.setHours(startTime.getHours() - 24);
        
        const keywords = MEMECOIN_KEYWORDS[coin]
            .map(keyword => `"${keyword}"`)
            .join(' OR ');
            
        console.log(`Fetching tweets for ${coin} with query: ${keywords}`);
        
        const config = {
            headers: {
                'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`
            },
            params: {
                'query': `(${keywords}) lang:en -is:retweet`,
                'max_results': Math.min(MAX_RESULTS_PER_COIN, Math.floor(DAILY_BUDGET / COINS_COUNT)),
                'tweet.fields': 'public_metrics,created_at,author_id',
                'expansions': 'author_id',
                'user.fields': 'public_metrics',
                'start_time': startTime.toISOString()
            }
        };

        const response = await fetchWithRetry(
            `${TWITTER_API_BASE_URL}/tweets/search/recent`,
            config
        );

        if (!response.data.data) {
            console.log(`No tweets found for ${coin}`);
            return createEmptyMetrics(coin);
        }

        const tweets = response.data.data;
        return analyzeTweets(tweets, coin);
    } catch (error) {
        console.error(`Error fetching tweets for ${coin}:`, error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        return createEmptyMetrics(coin);
    }
}

function createEmptyMetrics(coin) {
    return {
        coin,
        metrics: {
            tweet_count: 0,
            average_sentiment: 0,
            sentiment_distribution: { positive: 0, negative: 0, neutral: 0 },
            engagement: {
                total_likes: 0,
                total_retweets: 0,
                total_replies: 0,
                engagement_rate: 0
            }
        }
    };
}

function analyzeTweets(tweets, coin) {
    let totalSentiment = 0;
    let totalLikes = 0;
    let totalRetweets = 0;
    let totalReplies = 0;
    let sentimentCounts = { positive: 0, negative: 0, neutral: 0 };

    tweets.forEach(tweet => {
        // Sentiment analysis
        const words = tokenizer.tokenize(tweet.text);
        const sentiment = analyzer.getSentiment(words);
        totalSentiment += sentiment;

        // Categorize sentiment
        if (sentiment > 0) sentimentCounts.positive++;
        else if (sentiment < 0) sentimentCounts.negative++;
        else sentimentCounts.neutral++;

        // Engagement metrics
        const metrics = tweet.public_metrics;
        totalLikes += metrics.like_count;
        totalRetweets += metrics.retweet_count;
        totalReplies += metrics.reply_count;
    });

    return {
        coin,
        metrics: {
            tweet_count: tweets.length,
            average_sentiment: tweets.length > 0 ? totalSentiment / tweets.length : 0,
            sentiment_distribution: {
                positive: (sentimentCounts.positive / tweets.length) * 100,
                negative: (sentimentCounts.negative / tweets.length) * 100,
                neutral: (sentimentCounts.neutral / tweets.length) * 100
            },
            engagement: {
                total_likes: totalLikes,
                total_retweets: totalRetweets,
                total_replies: totalReplies,
                engagement_rate: tweets.length > 0 ? 
                    (totalLikes + totalRetweets + totalReplies) / tweets.length : 0
            }
        }
    };
}

// Add usage tracking
let dailyTweetCount = 0;

async function fetchAllMemecoinSentiment() {
    try {
        // Reset daily count if it's a new day
        const now = new Date();
        if (global.lastFetchDate && now.getDate() !== global.lastFetchDate.getDate()) {
            dailyTweetCount = 0;
        }
        global.lastFetchDate = now;

        const coins = Object.keys(MEMECOIN_KEYWORDS);
        const results = [];
        
        const tweetsPerCoin = Math.floor(DAILY_BUDGET / coins.length);
        console.log(`Budget: ${tweetsPerCoin} tweets per coin`);

        for (const coin of coins) {
            try {
                if (dailyTweetCount >= DAILY_BUDGET) {
                    console.log('Daily tweet budget exceeded');
                    results.push(createEmptyMetrics(coin));
                    continue;
                }

                console.log(`\nProcessing ${coin}...`);
                const result = await fetchTweetSentiment(coin);
                dailyTweetCount += result.metrics.tweet_count;
                results.push(result);

                console.log(`Daily tweet count: ${dailyTweetCount}/${DAILY_BUDGET}`);
                await sleep(BETWEEN_REQUESTS_DELAY);
            } catch (error) {
                console.error(`Failed to process ${coin}:`, error.message);
                results.push(createEmptyMetrics(coin));
                await sleep(BETWEEN_REQUESTS_DELAY);
            }
        }

        return {
            coins: results,
            overall_metrics: calculateOverallMetrics(results),
            usage_metrics: {
                daily_tweets_used: dailyTweetCount,
                daily_budget: DAILY_BUDGET,
                remaining: DAILY_BUDGET - dailyTweetCount
            }
        };
    } catch (error) {
        console.error('Error fetching memecoin sentiment:', error);
        throw error;
    }
}

function calculateOverallMetrics(results) {
    const totalTweets = results.reduce((sum, result) => sum + result.metrics.tweet_count, 0);
    const weightedSentiment = results.reduce((sum, result) => 
        sum + (result.metrics.average_sentiment * result.metrics.tweet_count), 0) / totalTweets;

    return {
        total_tweets: totalTweets,
        average_sentiment: weightedSentiment,
        total_engagement: results.reduce((sum, result) => 
            sum + result.metrics.engagement.total_likes + 
            result.metrics.engagement.total_retweets + 
            result.metrics.engagement.total_replies, 0)
    };
}

// Add rate limit check before making requests
async function checkRateLimits() {
    try {
        const response = await axios.get(`${TWITTER_API_BASE_URL}/tweets/search/recent`, {
            headers: { 'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}` },
            params: { 'query': 'test', 'max_results': 1 }
        });
        const remaining = response.headers['x-rate-limit-remaining'];
        const resetTime = response.headers['x-rate-limit-reset'];
        return { remaining: parseInt(remaining), resetTime };
    } catch (error) {
        console.error('Rate limit check failed:', error.message);
        return { remaining: 0, resetTime: Date.now() + 900000 }; // Wait 15 minutes if check fails
    }
}

module.exports = {
    fetchAllMemecoinSentiment,
    fetchTweetSentiment
}; 