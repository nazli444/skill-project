#!/bin/bash


echo "=========================================="
echo "Node.js Version: $(node --version)"
echo "npm Version: $(npm --version)"
echo ""

if ! command -v node &> /dev/null; then
    echo "Node.js not found. Please install Node.js 18+"
    echo "You can install it with: brew install node"
    exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Node.js version 18+ required. Current version: $(node --version)"
    exit 1
fi

if command -v pnpm &> /dev/null; then
    PACKAGE_MANAGER="pnpm"
    echo "Using pnpm package manager"
else
    PACKAGE_MANAGER="npm"
    echo "Using npm package manager (pnpm recommended)"
fi

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm install
    else
        npm install
    fi

    if [ $? -ne 0 ]; then
        echo "Dependency installation failed"
        exit 1
    fi
fi

echo "Starting Next.js development server..."
echo "Frontend will be available at: http://localhost:3000"
echo "It will connect to backend at: http://localhost:8080"
echo "Press Ctrl+C to stop the application"
echo "=========================================="

if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
    pnpm dev
else
    npm run dev
fi
