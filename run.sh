#!/usr/bin/env bash
# WebHID Server - Setup and Run Script for Linux
# This script sets up the Python virtual environment and starts the server

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

if [ -z "${DISPLAY:-}" ]; then
    export DISPLAY=:0
fi

if [ -z "${XAUTHORITY:-}" ] && [ -f "$HOME/.Xauthority" ]; then
    export XAUTHORITY="$HOME/.Xauthority"
fi

echo
echo "============================================================"
echo "       WebHID Server - Setup and Run Script"
echo "============================================================"
echo

# Check if Python is installed
if ! command -v python3 >/dev/null 2>&1; then
    echo "[ERROR] Python 3 is not installed or not found in PATH"
    echo "Please install Python 3 and try again"
    read -r -p "Press Enter to continue..."
    exit 1
fi

echo "[OK] Python found"
python3 --version

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo
    echo "[INFO] Creating virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to create virtual environment"
        read -r -p "Press Enter to continue..."
        exit 1
    fi
    echo "[OK] Virtual environment created"
else
    echo "[OK] Virtual environment already exists"
fi

# Activate virtual environment
echo
echo "[INFO] Activating virtual environment..."
# shellcheck disable=SC1091
source venv/bin/activate
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to activate virtual environment"
    read -r -p "Press Enter to continue..."
    exit 1
fi
echo "[OK] Virtual environment activated"

# Install/upgrade pip
echo
echo "[INFO] Upgrading pip..."
python -m pip install --upgrade pip --quiet
if [ $? -ne 0 ]; then
    echo "[WARNING] Failed to upgrade pip, continuing anyway..."
fi

# Install required packages
echo
echo "[INFO] Installing required packages from requirements.txt..."
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install required packages"
    read -r -p "Press Enter to continue..."
    exit 1
fi
echo "[OK] All packages installed successfully"

# Run the server
echo
echo "============================================================"
echo "       Starting WebHID Server..."
echo "============================================================"
echo

python app.py

# Keep terminal open if there was an error
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
    echo
    echo "[ERROR] Server exited with error code $EXIT_CODE"
    read -r -p "Press Enter to continue..."
fi

exit $EXIT_CODE