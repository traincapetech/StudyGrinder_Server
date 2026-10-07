#!/bin/bash

# Keep-alive script for StudyGrinder Server
# This script monitors the server and restarts it if it goes down

echo "🔄 Starting server keep-alive monitor..."

# Function to check if server is running
check_server() {
    if curl -s http://localhost:8080 > /dev/null 2>&1; then
        return 0  # Server is running
    else
        return 1  # Server is down
    fi
}

# Function to start server
start_server() {
    echo "📡 Starting server..."
    nohup node index.js > server.log 2>&1 &
    sleep 3
    
    if check_server; then
        echo "✅ Server started successfully!"
        return 0
    else
        echo "❌ Failed to start server"
        return 1
    fi
}

# Function to stop server
stop_server() {
    echo "🛑 Stopping server..."
    PID=$(lsof -ti:8080)
    if [ ! -z "$PID" ]; then
        kill $PID
        sleep 2
        echo "✅ Server stopped"
    else
        echo "ℹ️  No server running on port 8080"
    fi
}

# Main monitoring loop
monitor_server() {
    echo "👀 Monitoring server on port 8080..."
    echo "Press Ctrl+C to stop monitoring"
    
    while true; do
        if check_server; then
            echo "✅ Server is running - $(date)"
        else
            echo "❌ Server is down - $(date)"
            echo "🔄 Attempting to restart server..."
            start_server
        fi
        
        # Check every 30 seconds
        sleep 30
    done
}

# Handle script arguments
case "$1" in
    "start")
        if check_server; then
            echo "✅ Server is already running"
        else
            start_server
        fi
        ;;
    "stop")
        stop_server
        ;;
    "restart")
        stop_server
        sleep 2
        start_server
        ;;
    "status")
        if check_server; then
            echo "✅ Server is running"
        else
            echo "❌ Server is down"
        fi
        ;;
    "monitor")
        monitor_server
        ;;
    "logs")
        tail -f server.log
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|monitor|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the server"
        echo "  stop    - Stop the server"
        echo "  restart - Restart the server"
        echo "  status  - Check server status"
        echo "  monitor - Monitor and auto-restart server"
        echo "  logs    - Show server logs"
        exit 1
        ;;
esac
