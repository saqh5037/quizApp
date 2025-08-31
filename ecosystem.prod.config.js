module.exports = {
  apps: [
    {
      name: 'aristotest-backend-prod',
      script: 'npm',
      args: 'run dev',
      cwd: '/Users/samuelquiroz/Documents/proyectos/quiz-app/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        DB_HOST: 'ec2-3-91-26-178.compute-1.amazonaws.com',
        DB_PORT: 5432,
        DB_NAME: 'aristotest1',
        DB_USER: 'labsis',
        DB_PASSWORD: ',U8x=]N02SX4'
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};