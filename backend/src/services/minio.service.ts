import * as Minio from 'minio';
import { config } from '../config/config';
import fs from 'fs';
import path from 'path';

class MinioService {
  private client: Minio.Client;
  private bucketName: string;

  constructor() {
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'aristotest',
      secretKey: process.env.MINIO_SECRET_KEY || 'AristoTest2024!'
    });

    this.bucketName = process.env.MINIO_BUCKET_NAME || 'aristotest-videos';
    this.initializeBucket();
  }

  private async initializeBucket(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucketName);
      if (!exists) {
        await this.client.makeBucket(this.bucketName, 'us-east-1');
        console.log(`Bucket ${this.bucketName} created successfully`);

        // Set bucket policy for public read access (optional)
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/public/*`]
            }
          ]
        };
        
        await this.client.setBucketPolicy(
          this.bucketName,
          JSON.stringify(policy)
        );
      }
    } catch (error) {
      console.error('Error initializing MinIO bucket:', error);
    }
  }

  async uploadFile(
    filePath: string,
    objectName: string,
    metadata?: Record<string, string>
  ): Promise<Minio.UploadedObjectInfo> {
    const fileStream = fs.createReadStream(filePath);
    const fileStat = await fs.promises.stat(filePath);

    return await this.client.putObject(
      this.bucketName,
      objectName,
      fileStream,
      fileStat.size,
      metadata
    );
  }

  async uploadFromBuffer(
    buffer: Buffer,
    objectName: string,
    metadata?: Record<string, string>
  ): Promise<Minio.UploadedObjectInfo> {
    return await this.client.putObject(
      this.bucketName,
      objectName,
      buffer,
      buffer.length,
      metadata
    );
  }

  async downloadFile(objectName: string, filePath: string): Promise<void> {
    return await this.client.fGetObject(this.bucketName, objectName, filePath);
  }

  async getObject(objectName: string): Promise<NodeJS.ReadableStream> {
    return await this.client.getObject(this.bucketName, objectName);
  }

  async deleteFile(objectName: string): Promise<void> {
    return await this.client.removeObject(this.bucketName, objectName);
  }

  async deleteFiles(objectNames: string[]): Promise<void> {
    return await this.client.removeObjects(this.bucketName, objectNames);
  }

  async listObjects(prefix?: string, recursive = true): Promise<Minio.BucketItem[]> {
    const objects: Minio.BucketItem[] = [];
    const stream = this.client.listObjectsV2(
      this.bucketName,
      prefix,
      recursive
    );

    return new Promise((resolve, reject) => {
      stream.on('data', (obj) => objects.push(obj));
      stream.on('error', reject);
      stream.on('end', () => resolve(objects));
    });
  }

  async getObjectUrl(objectName: string, expiry = 3600): Promise<string> {
    return await this.client.presignedGetObject(
      this.bucketName,
      objectName,
      expiry
    );
  }

  async getUploadUrl(objectName: string, expiry = 3600): Promise<string> {
    return await this.client.presignedPutObject(
      this.bucketName,
      objectName,
      expiry
    );
  }

  async statObject(objectName: string): Promise<Minio.BucketItemStat> {
    return await this.client.statObject(this.bucketName, objectName);
  }

  async copyObject(
    sourceObject: string,
    destObject: string
  ): Promise<Minio.CopyObjectResult> {
    return await this.client.copyObject(
      this.bucketName,
      destObject,
      `/${this.bucketName}/${sourceObject}`,
      new Minio.CopyConditions()
    );
  }

  async objectExists(objectName: string): Promise<boolean> {
    try {
      await this.statObject(objectName);
      return true;
    } catch (error) {
      return false;
    }
  }

  getPublicUrl(objectName: string, requestHost?: string): string {
    let endpoint = process.env.MINIO_ENDPOINT || 'localhost';
    const port = process.env.MINIO_PORT || '9000';
    const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
    
    // If MINIO_PUBLIC_ENDPOINT is set, use it (for production)
    if (process.env.MINIO_PUBLIC_ENDPOINT) {
      endpoint = process.env.MINIO_PUBLIC_ENDPOINT;
    }
    // If requestHost is provided and endpoint is localhost, use the request's host
    else if (requestHost && (endpoint === 'localhost' || endpoint === '127.0.0.1')) {
      // Extract just the hostname/IP from the requestHost (remove port if present)
      endpoint = requestHost.split(':')[0];
    }
    
    return `${protocol}://${endpoint}:${port}/${this.bucketName}/${objectName}`;
  }

  // Multipart upload for large files
  async createMultipartUpload(
    objectName: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    // MinIO handles multipart uploads automatically for putObject
    // This is a placeholder for custom multipart handling if needed
    return objectName;
  }

  async uploadPart(
    uploadId: string,
    partNumber: number,
    data: Buffer
  ): Promise<string> {
    // Placeholder for custom multipart handling
    return `${uploadId}-${partNumber}`;
  }

  async completeMultipartUpload(
    uploadId: string,
    parts: Array<{ partNumber: number; etag: string }>
  ): Promise<void> {
    // Placeholder for custom multipart handling
    return;
  }

  async abortMultipartUpload(uploadId: string): Promise<void> {
    // Placeholder for custom multipart handling
    return;
  }
}

export default new MinioService();