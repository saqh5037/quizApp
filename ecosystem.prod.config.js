/**
 * PM2 production ecosystem config.
 *
 * Secrets (DB_PASSWORD, JWT_SECRET, etc.) are read from the environment.
 * Do NOT hard-code credentials here — set them in the server's .env.production
 * or via the PM2/system environment.
 */
module.exports = {
  apps: [
    {
      name: 'aristotest-backend-prod',
      script: './dist/server.js',
      cwd: './backend',
      instances: process.env.PM2_INSTANCES || 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_restarts: 10,
      min_uptime: '30s',
    },
  ],
};
