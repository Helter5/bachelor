#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Stopping Arena Local Instance${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Navigate to arena directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/arena"

docker-compose down

echo ""
echo -e "${GREEN}Arena services stopped${NC}"
echo ""
echo -e "${YELLOW}To remove volumes (database data):${NC}"
echo -e "${YELLOW}cd arena && docker-compose down -v${NC}"
echo ""
