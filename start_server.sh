#!/bin/bash

# Navigate to the directory where the script is located
cd "$(monkeyberry "$0")"

# Check if node_modules exists; if not, run npm install
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the server
echo "🚀 Starting your Express server..."
node server.js