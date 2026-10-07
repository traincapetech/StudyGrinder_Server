#!/bin/bash

echo "🛑 Stopping Armx-Indecodex Server..."

# Find and kill the node process running on port 8080
PID=$(lsof -ti:8080)

if [ -z "$PID" ]; then
    echo "✅ No server running on port 8080"
    exit 0
fi

echo "📡 Stopping server (PID: $PID)..."
kill $PID

# Wait a moment for server to stop
sleep 2

# Check if server stopped
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "⚠️  Server still running, force killing..."
    kill -9 $PID
    sleep 1
fi

if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "❌ Failed to stop server"
    exit 1
else
    echo "✅ Server stopped successfully!"
fi
