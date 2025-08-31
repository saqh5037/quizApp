#!/bin/bash

# ========================================
# AristoTest - Script de Reparación Completa
# ========================================

set -e  # Detener en caso de error

echo "================================================"
echo "🔧 REPARACIÓN COMPLETA DE ARISTOTEST"
echo "================================================"
echo ""

# Variables
REMOTE_USER="dynamtek"
REMOTE_HOST="ec2-52-55-189-120.compute-1.amazonaws.com"
SSH_KEY="/Users/samuelquiroz/Desktop/certificados/labsisapp.pem"
REMOTE_PATH="/home/dynamtek/aristoTEST"

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}1. Actualizando configuración del backend...${NC}"

# Crear archivo de configuración corregido
cat > /tmp/fix-backend-config.js << 'EOF'
const fs = require('fs');
const path = require('path');

// Actualizar .env
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const updatedEnv = envContent
  .replace(/DB_NAME=.*/, 'DB_NAME=aristotest2')
  .replace(/NODE_ENV=.*/, 'NODE_ENV=production')
  + '\nTENANT_ID=1\n';

fs.writeFileSync(envPath, updatedEnv);
console.log('✓ .env actualizado');

// Actualizar ecosystem.config.js
const ecoPath = path.join(__dirname, 'ecosystem.config.js');
const ecoContent = `const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });

module.exports = {
  apps: [{
    name: 'aristotest-backend',
    script: './src/server.ts',
    interpreter: 'node',
    interpreter_args: '-r ts-node/register/transpile-only -r tsconfig-paths/register',
    exec_mode: 'fork',
    instances: 1,
    max_memory_restart: '2G',
    autorestart: true,
    watch: false,
    error_file: '/home/dynamtek/aristoTEST/backend/logs/error.log',
    out_file: '/home/dynamtek/aristoTEST/backend/logs/out.log',
    log_file: '/home/dynamtek/aristoTEST/backend/logs/combined.log',
    time: true,
    env: {
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      PORT: 3001,
      DB_NAME: 'aristotest2',
      DB_HOST: 'ec2-3-91-26-178.compute-1.amazonaws.com',
      DB_PORT: 5432,
      DB_USER: 'labsis',
      DB_PASSWORD: ',U8x=]N02SX4',
      DB_DIALECT: 'postgres',
      JWT_SECRET: 'aristotest-qa-jwt-secret-2025',
      JWT_REFRESH_SECRET: 'aristotest-qa-refresh-secret-2025',
      JWT_EXPIRES_IN: '24h',
      JWT_REFRESH_EXPIRES_IN: '7d',
      CORS_ORIGIN: 'http://52.55.189.120,http://ec2-52-55-189-120.compute-1.amazonaws.com',
      SOCKET_CORS_ORIGIN: 'http://52.55.189.120,http://ec2-52-55-189-120.compute-1.amazonaws.com',
      FRONTEND_URL: 'http://52.55.189.120',
      MINIO_ENDPOINT: 'localhost',
      MINIO_PORT: 9000,
      MINIO_USE_SSL: false,
      MINIO_ACCESS_KEY: 'aristotest',
      MINIO_SECRET_KEY: 'AristoTest2024!',
      MINIO_BUCKET_NAME: 'aristotest-videos',
      GEMINI_API_KEY: 'AIzaSyAGlwn2nDECzKnqRYqHo4hVUlNqGMsp1mw',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      TEMP_DIR: '/tmp/video-transcription',
      UPLOAD_DIR: '/tmp/video-uploads',
      TS_NODE_TRANSPILE_ONLY: 'true',
      TENANT_ID: '1',
      DEFAULT_TENANT_ID: '1'
    }
  }]
};`;

fs.writeFileSync(ecoPath, ecoContent);
console.log('✓ ecosystem.config.js actualizado');

// Crear directorios de logs si no existen
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('✓ Directorio de logs creado');
}
EOF

# Copiar y ejecutar script de configuración
scp -i "$SSH_KEY" /tmp/fix-backend-config.js "$REMOTE_USER@$REMOTE_HOST:/tmp/"
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_PATH/backend && node /tmp/fix-backend-config.js"

echo -e "${GREEN}✓ Configuración actualizada${NC}"

echo -e "${YELLOW}2. Creando script de procesamiento de videos...${NC}"

# Crear script para procesar videos con error
cat > /tmp/fix-video-processing.js << 'EOF'
const { Sequelize } = require('sequelize');
const Minio = require('minio');
const fs = require('fs');
const path = require('path');

const sequelize = new Sequelize('aristotest2', 'labsis', ',U8x=]N02SX4', {
  host: 'ec2-3-91-26-178.compute-1.amazonaws.com',
  dialect: 'postgres',
  logging: false
});

const minioClient = new Minio.Client({
  endPoint: 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: 'aristotest',
  secretKey: 'AristoTest2024!'
});

async function fixVideos() {
  try {
    // Obtener videos con error
    const [videos] = await sequelize.query(
      "SELECT id, title, status FROM videos WHERE status = 'error' OR status = 'processing'"
    );
    
    console.log(`Encontrados ${videos.length} videos con problemas`);
    
    for (const video of videos) {
      console.log(`Procesando video ${video.id}: ${video.title}`);
      
      // Verificar si existen archivos procesados
      const processedPath = path.join(__dirname, 'storage/processed', video.id.toString());
      const hlsPath = path.join(processedPath, 'hls/master.m3u8');
      
      if (fs.existsSync(hlsPath)) {
        // Actualizar estado a ready
        await sequelize.query(
          `UPDATE videos SET 
            status = 'ready',
            processing_progress = 100,
            error_message = NULL,
            processed_path = 'videos/processed/${video.id}',
            hls_playlist_url = 'videos/hls/${video.id}/master.m3u8'
          WHERE id = ${video.id}`
        );
        
        // Subir a MinIO
        await uploadToMinio(video.id, processedPath);
        
        console.log(`✓ Video ${video.id} reparado`);
      } else {
        // Marcar como pendiente de procesamiento manual
        await sequelize.query(
          `UPDATE videos SET 
            status = 'pending',
            processing_progress = 0,
            error_message = 'Requiere procesamiento manual'
          WHERE id = ${video.id}`
        );
        console.log(`⚠ Video ${video.id} requiere procesamiento manual`);
      }
    }
    
    // Insertar calidades de video faltantes
    await sequelize.query(`
      INSERT INTO video_qualities (video_id, quality, width, height, bitrate, file_path)
      SELECT v.id, q.quality, q.width, q.height, q.bitrate, 
             'videos/hls/' || v.id || '/' || q.quality || '/playlist.m3u8'
      FROM videos v
      CROSS JOIN (
        VALUES 
          ('360p', 640, 360, 800000),
          ('480p', 854, 480, 1200000),
          ('720p', 1280, 720, 2500000)
      ) AS q(quality, width, height, bitrate)
      WHERE v.status = 'ready'
        AND NOT EXISTS (
          SELECT 1 FROM video_qualities vq 
          WHERE vq.video_id = v.id AND vq.quality = q.quality
        )
    `);
    
    console.log('✓ Calidades de video actualizadas');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

async function uploadToMinio(videoId, localPath) {
  const bucketName = 'aristotest-videos';
  
  async function uploadDirectory(localDir, minioPath) {
    const files = fs.readdirSync(localDir);
    
    for (const file of files) {
      const fullPath = path.join(localDir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        await uploadDirectory(fullPath, minioPath + '/' + file);
      } else {
        const minioKey = minioPath + '/' + file;
        const fileStream = fs.createReadStream(fullPath);
        const contentType = file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 
                           file.endsWith('.ts') ? 'video/mp2t' : 
                           file.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream';
        
        await minioClient.putObject(bucketName, minioKey, fileStream, stat.size, {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600'
        });
      }
    }
  }
  
  // Subir archivos HLS
  const hlsPath = path.join(localPath, 'hls');
  if (fs.existsSync(hlsPath)) {
    await uploadDirectory(hlsPath, 'videos/hls/' + videoId);
  }
  
  // Subir thumbnail
  const thumbnailPath = path.join(localPath, 'thumbnail.jpg');
  if (fs.existsSync(thumbnailPath)) {
    const fileStream = fs.createReadStream(thumbnailPath);
    const stat = fs.statSync(thumbnailPath);
    await minioClient.putObject(bucketName, 'videos/thumbnails/' + videoId + '.jpg', fileStream, stat.size, {
      'Content-Type': 'image/jpeg'
    });
  }
}

fixVideos();
EOF

scp -i "$SSH_KEY" /tmp/fix-video-processing.js "$REMOTE_USER@$REMOTE_HOST:/tmp/"

echo -e "${GREEN}✓ Script de procesamiento creado${NC}"

echo -e "${YELLOW}3. Configurando política de MinIO...${NC}"

# Configurar política pública de MinIO
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'REMOTE_SCRIPT'
cd /home/dynamtek/aristoTEST/backend

cat > set-minio-public-policy.js << 'EOF'
const Minio = require('minio');

const minioClient = new Minio.Client({
  endPoint: 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: 'aristotest',
  secretKey: 'AristoTest2024!'
});

const bucketName = 'aristotest-videos';

const policy = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: { AWS: ['*'] },
      Action: ['s3:GetObject'],
      Resource: ['arn:aws:s3:::' + bucketName + '/*']
    }
  ]
};

minioClient.setBucketPolicy(bucketName, JSON.stringify(policy), (err) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('✓ Política pública configurada');
  }
});
EOF

node set-minio-public-policy.js
REMOTE_SCRIPT

echo -e "${GREEN}✓ MinIO configurado${NC}"

echo -e "${YELLOW}4. Reiniciando servicios...${NC}"

ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'REMOTE_COMMANDS'
# Detener servicios
pm2 stop aristotest-backend

# Limpiar logs antiguos
pm2 flush aristotest-backend

# Reiniciar backend con nueva configuración
cd /home/dynamtek/aristoTEST/backend
pm2 start ecosystem.config.js --update-env

# Esperar a que inicie
sleep 5

# Verificar estado
pm2 status
pm2 logs aristotest-backend --lines 20 --nostream | grep "Connected to"

# Ejecutar reparación de videos
node /tmp/fix-video-processing.js

echo "✓ Servicios reiniciados"
REMOTE_COMMANDS

echo -e "${GREEN}✓ Servicios actualizados${NC}"

echo ""
echo "================================================"
echo -e "${GREEN}✅ REPARACIÓN COMPLETA EXITOSA${NC}"
echo "================================================"
echo ""
echo "Accesos:"
echo "- Aplicación: http://52.55.189.120"
echo "- API: http://52.55.189.120:3001/api/v1"
echo "- MinIO: http://52.55.189.120:9000"
echo ""
echo "Base de datos: aristotest2"
echo "Usuario: admin@aristotest.com / admin123"
echo ""