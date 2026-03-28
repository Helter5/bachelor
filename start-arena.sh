#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Arena Local Instance Startup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    echo -e "${YELLOW}Please start Docker Desktop and try again${NC}"
    exit 1
fi

# Navigate to arena directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/arena"

# Start Arena services
echo -e "${GREEN}Starting Arena services...${NC}"
echo -e "${YELLOW}(This may take several minutes on first run)${NC}"
echo ""

docker-compose up -d

echo ""
echo -e "${BLUE}Waiting for Arena to be ready...${NC}"
echo ""

# Wait for nginx to be ready
timeout=120
counter=0
until curl -sf http://localhost:8080 > /dev/null 2>&1; do
    sleep 2
    counter=$((counter+2))
    if [ $counter -ge $timeout ]; then
        echo -e "${RED}TIMEOUT: Arena did not start within 2 minutes${NC}"
        echo -e "${YELLOW}Check logs with: cd arena && docker-compose logs${NC}"
        exit 1
    fi
    if [ $((counter % 10)) -eq 0 ]; then
        echo -e "${YELLOW}Still waiting... ($counter seconds)${NC}"
    fi
done

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Arena is running!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Arena:  ${BLUE}http://localhost:8080${NC}"
echo -e "Redis:  ${BLUE}localhost:16370${NC}"
echo ""
echo -e "To view logs: ${YELLOW}./arena-logs.sh${NC}"
echo -e "To stop:      ${YELLOW}./stop-arena.sh${NC}"
echo ""
