#!/bin/bash

# Script to replace all path aliases with relative imports in TypeScript files

echo "Fixing path aliases in backend code..."

# Function to replace aliases in a file
fix_file() {
    file="$1"
    echo "Processing: $file"
    
    # Create a temporary file
    temp_file="${file}.tmp"
    
    # Replace all @alias/ imports with relative paths
    sed -E "
        s|from '@config/|from '../config/|g
        s|from '@models/|from '../models/|g
        s|from '@controllers/|from '../controllers/|g
        s|from '@services/|from '../services/|g
        s|from '@utils/|from '../utils/|g
        s|from '@types/|from '../types/|g
        s|from '@middleware/|from '../middleware/|g
        s|from '@validators/|from '../validators/|g
        s|from '@socket/|from '../socket/|g
        s|from '@routes/|from '../routes/|g
        s|from '@/|from '../|g
    " "$file" > "$temp_file"
    
    # Some files might need ../../ instead of ../
    if [[ "$file" == *"/routes/"* ]] || [[ "$file" == *"/middleware/"* ]]; then
        sed -E "
            s|from '\.\./config/|from '../config/|g
            s|from '\.\./models/|from '../models/|g
            s|from '\.\./controllers/|from '../controllers/|g
            s|from '\.\./services/|from '../services/|g
            s|from '\.\./utils/|from '../utils/|g
            s|from '\.\./types/|from '../types/|g
        " "$temp_file" > "${temp_file}2"
        mv "${temp_file}2" "$temp_file"
    fi
    
    # Replace the original file
    mv "$temp_file" "$file"
}

# Find all TypeScript files and fix them
find src -name "*.ts" -type f | while read -r file; do
    fix_file "$file"
done

echo "All TypeScript files have been updated to use relative imports"
echo "Now rebuilding the project..."

# Remove old dist folder
rm -rf dist

# Build the project
npm run build

echo "Build complete! Files are ready for deployment."