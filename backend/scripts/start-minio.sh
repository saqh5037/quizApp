#!/bin/bash

# MinIO Configuration
export MINIO_ROOT_USER=aristotest
export MINIO_ROOT_PASSWORD=AristoTest2024!
export MINIO_BROWSER=on

# Directory where MinIO will store files
MINIO_DATA_DIR="./storage/minio-data"

# Create directory if it doesn't exist
mkdir -p "$MINIO_DATA_DIR"

echo "Starting MinIO server..."
echo "Access keys:"
echo "  Username: aristotest"
echo "  Password: AristoTest2024!"
echo ""
echo "MinIO API endpoint: http://localhost:9000"
echo "MinIO Console: http://localhost:9001"
echo ""

# Start MinIO server
minio server "$MINIO_DATA_DIR" --console-address ":9001"