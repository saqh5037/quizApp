module.exports = {
  apps: [
    {
      name: 'aristotest-backend',
      script: 'npm',
      args: 'run dev',
      cwd: '/Users/samuelquiroz/Documents/proyectos/quiz-app/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'minio',
      script: '/opt/homebrew/bin/minio',
      args: 'server /Users/samuelquiroz/Documents/proyectos/quiz-app/backend/storage/minio-data --console-address :9001',
      cwd: '/Users/samuelquiroz/Documents/proyectos/quiz-app',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        MINIO_ROOT_USER: 'aristotest',
        MINIO_ROOT_PASSWORD: 'AristoTest2024!'
      },
      error_file: './logs/minio-error.log',
      out_file: './logs/minio-out.log',
      log_file: './logs/minio-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ],

  deploy: {
    production: {
      user: 'dynamtek',
      host: 'ec2-52-55-189-120.compute-1.amazonaws.com',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/aristotest.git',
      path: '/home/dynamtek/aristoTEST',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};