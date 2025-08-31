#!/bin/bash

# Deploy Educational Resources Tables Script
# This script creates the study_guides and flash_cards tables on your database

echo "Educational Resources Tables Deployment Script"
echo "============================================="
echo ""

# Check if we're using local or remote database
read -p "Deploy to (1) Local or (2) Remote database? [1/2]: " DB_CHOICE

if [ "$DB_CHOICE" = "1" ]; then
    # Local database
    DB_HOST="localhost"
    DB_USER="aristotest"
    DB_NAME="aristotest"
    echo "Using local database..."
    
    # Run the SQL script
    PGPASSWORD=AristoTest2024 psql -U $DB_USER -h $DB_HOST -d $DB_NAME -f scripts/create-educational-resources-tables.sql
    
    if [ $? -eq 0 ]; then
        echo "✅ Tables created successfully on local database!"
    else
        echo "❌ Error creating tables on local database"
        exit 1
    fi
    
elif [ "$DB_CHOICE" = "2" ]; then
    # Remote database - you'll need to update these values
    echo ""
    echo "Please enter remote database credentials:"
    read -p "Database Host: " DB_HOST
    read -p "Database Port [5432]: " DB_PORT
    DB_PORT=${DB_PORT:-5432}
    read -p "Database Name: " DB_NAME
    read -p "Database User: " DB_USER
    read -s -p "Database Password: " DB_PASSWORD
    echo ""
    
    # Run the SQL script on remote database
    PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -f scripts/create-educational-resources-tables.sql
    
    if [ $? -eq 0 ]; then
        echo "✅ Tables created successfully on remote database!"
    else
        echo "❌ Error creating tables on remote database"
        exit 1
    fi
else
    echo "Invalid choice. Please run the script again and choose 1 or 2."
    exit 1
fi

echo ""
echo "Verifying tables..."
if [ "$DB_CHOICE" = "1" ]; then
    PGPASSWORD=AristoTest2024 psql -U $DB_USER -h $DB_HOST -d $DB_NAME -c "\dt study_guides"
    PGPASSWORD=AristoTest2024 psql -U $DB_USER -h $DB_HOST -d $DB_NAME -c "\dt flash_cards"
else
    PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "\dt study_guides"
    PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "\dt flash_cards"
fi

echo ""
echo "Deployment complete! The Educational Resources module is now ready."
echo ""
echo "Next steps:"
echo "1. Restart your backend server to recognize the new tables"
echo "2. Test the resource generation from the frontend"
echo "3. Monitor the logs for any issues"