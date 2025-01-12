module.exports = {
  apps: [{
    name: "over-back-web",
    script: "app.js",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: "production",
      PORT: 3000
    }
  }, {
    name: "over-back-scheduler",
    script: "scheduler.js",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: "production"
    }
  }]
}; 