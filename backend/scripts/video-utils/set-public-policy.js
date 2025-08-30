const { Client } = require('minio');

const minioClient = new Client({
  endPoint: 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: 'aristotest',
  secretKey: 'AristoTest2024!'
});

const BUCKET_NAME = 'aristotest-videos';

async function setPublicPolicy() {
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: '*',
        Action: [
          's3:GetBucketLocation',
          's3:ListBucket'
        ],
        Resource: `arn:aws:s3:::${BUCKET_NAME}`
      },
      {
        Effect: 'Allow',
        Principal: '*',
        Action: 's3:GetObject',
        Resource: `arn:aws:s3:::${BUCKET_NAME}/*`
      }
    ]
  };

  try {
    await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
    console.log(`Public read policy set for bucket ${BUCKET_NAME}`);
  } catch (error) {
    console.error('Error setting bucket policy:', error);
  }
}

setPublicPolicy();
