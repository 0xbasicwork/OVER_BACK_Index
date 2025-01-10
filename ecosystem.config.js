module.exports = {
  apps: [{
    name: "over-back-index",
    script: "app.js",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
      BASE_URL: "https://sobackitsover.xyz/overbackindex"
    }
  }]
}; 