#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Stopping Wrestling App${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Stop containers (keep them for next start)
docker compose stop

echo ""
echo -e "${GREEN}All services stopped${NC}"
echo ""
echo -e "${YELLOW}To start again: ${NC}./start.sh"
echo -e "${YELLOW}To remove everything: ${NC}docker compose down -v"
echo ""
