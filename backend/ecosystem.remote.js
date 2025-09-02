module.exports = {
  apps: [{
    name: 'aristotest-backend',
    script: './dist/server.js',
    node_args: '-r dotenv/config -r ./register-paths.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      DB_HOST: 'ec2-3-91-26-178.compute-1.amazonaws.com',
      DB_PORT: 5432,
      DB_NAME: 'aristotest2',
      DB_USER: 'labsis',
      DB_PASSWORD: ',U8x=]N02SX4',
      JWT_SECRET: 'aristotest-jwt-secret-2024',
      JWT_REFRESH_SECRET: 'aristotest-refresh-secret-2024',
      CORS_ORIGIN: 'http://52.55.189.120',
      SOCKET_CORS_ORIGIN: 'http://52.55.189.120',
      MINIO_ENDPOINT: 'localhost',
      MINIO_PORT: 9000,
      MINIO_ACCESS_KEY: 'aristotest',
      MINIO_SECRET_KEY: 'AristoTest2024!',
      MINIO_BUCKET_NAME: 'aristotest-videos'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    autorestart: true,
    max_restarts: 10
  }]
};
