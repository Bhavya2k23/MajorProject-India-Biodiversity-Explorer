# ============================================================
# Start AI Service Script (Windows PowerShell)
# ============================================================
# This script starts the Python FastAPI AI service for image
# recognition. Run this BEFORE starting the Node.js server.
#
# Usage:
#   .\scripts\start-ai-service.ps1
#
# Or start manually:
#   cd backend/ai_service
#   pip install -r requirements.txt
#   python main.py
# ============================================================

param(
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AiServiceDir = Join-Path (Split-Path -Parent $ScriptDir) "ai_service"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  India Biodiversity AI Service Starter" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  AI Service directory: $AiServiceDir" -ForegroundColor Gray
Write-Host "  Port: $Port" -ForegroundColor Gray
Write-Host ""

# Check if Python is available
try {
    $PythonVersion = python --version 2>&1
    Write-Host "Found: $PythonVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Python not found. Please install Python 3.8+" -ForegroundColor Red
    exit 1
}

# Check pip
try {
    $PipVersion = python -m pip --version 2>&1
    Write-Host "pip available" -ForegroundColor Green
} catch {
    Write-Host "WARNING: pip not found" -ForegroundColor Yellow
}

# Create virtual environment if it doesn't exist
$VenvDir = Join-Path $AiServiceDir ".venv"
if (-not (Test-Path $VenvDir)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv $VenvDir
    Write-Host "Virtual environment created at: $VenvDir" -ForegroundColor Green
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& (Join-Path $VenvDir "Scripts" "Activate.ps1")

# Install dependencies
Write-Host "Installing AI service dependencies..." -ForegroundColor Yellow
Set-Location $AiServiceDir
python -m pip install -r requirements.txt

Write-Host ""
Write-Host "Starting AI service on http://localhost:$Port" -ForegroundColor Cyan
Write-Host "API docs available at http://localhost:$Port/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the service" -ForegroundColor Gray
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# Start the AI service
python main.py