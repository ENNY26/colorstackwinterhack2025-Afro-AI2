#!/bin/bash

echo "========================================"
echo "  Afro AI Backend Server Startup"
echo "========================================"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo ""
    echo "Please:"
    echo "1. Copy env.example.txt to .env"
    echo "2. Add your API keys to .env"
    echo "3. See SETUP_GUIDE.md for details"
    echo ""
    exit 1
fi

# Check API configuration
echo "Checking API configuration..."
npm run check-apis
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo ""
fi

# Check if MongoDB is configured
echo "Starting server..."
echo ""
echo "Make sure MongoDB is running if using local database!"
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
npm run dev












