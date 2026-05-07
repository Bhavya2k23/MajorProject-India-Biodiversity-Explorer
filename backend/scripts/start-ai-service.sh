#!/bin/bash
# ============================================================
# Start AI Service Script
# ============================================================
# This script starts the Python FastAPI AI service for image
# recognition. Run this BEFORE starting the Node.js server.
#
# Usage:
#   ./scripts/start-ai-service.sh    # macOS/Linux
#   bash scripts/start-ai-service.sh # Windows (via Git Bash/WSL)
#
# Or start manually:
#   cd backend/ai_service
#   pip install -r requirements.txt
#   python main.py
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AI_SERVICE_DIR="$(dirname "$SCRIPT_DIR")/ai_service"
PORT=8000

echo "=============================================="
echo "  India Biodiversity AI Service Starter"
echo "=============================================="
echo ""
echo "  AI Service directory: $AI_SERVICE_DIR"
echo "  Port: $PORT"
echo ""

# Check if Python 3 is available
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "ERROR: Python not found. Please install Python 3.8+"
    exit 1
fi

# Determine Python command
PYTHON_CMD="python3"
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
fi

echo "Using Python: $PYTHON_CMD"
echo ""

# Check if pip is available
if ! $PYTHON_CMD -m pip --version &> /dev/null; then
    echo "WARNING: pip not found. Trying to install dependencies anyway..."
fi

# Check if virtual environment exists, create if not
VENV_DIR="$AI_SERVICE_DIR/.venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    $PYTHON_CMD -m venv "$VENV_DIR"
    echo "Virtual environment created at: $VENV_DIR"
fi

# Activate virtual environment
echo "Activating virtual environment..."
source "$VENV_DIR/bin/activate" 2>/dev/null || source "$VENV_DIR/Scripts/activate" 2>/dev/null || true

# Install dependencies
echo "Installing AI service dependencies..."
cd "$AI_SERVICE_DIR"
$PYTHON_CMD -m pip install --quiet -r requirements.txt 2>/dev/null || $PYTHON_CMD -m pip install -r requirements.txt

echo ""
echo "Starting AI service on http://localhost:$PORT"
echo "API docs available at http://localhost:$PORT/docs"
echo ""
echo "Press Ctrl+C to stop the service"
echo "=============================================="
echo ""

# Start the AI service
$PYTHON_CMD main.py