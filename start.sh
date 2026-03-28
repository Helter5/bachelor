#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Wrestling App Startup Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found${NC}"
    echo -e "${YELLOW}Creating .env from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}Created .env file${NC}"
        echo -e "${YELLOW}Please edit .env with your configuration before starting${NC}"
        exit 1
    else
        echo -e "${RED}Error: .env.example not found${NC}"
        exit 1
    fi
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    echo -e "${YELLOW}Please start Docker Desktop and try again${NC}"
    exit 1
fi

# Start services (creates if not exists, otherwise just starts)
echo -e "${GREEN}Starting services...${NC}"
docker compose up -d

# Wait for services to be healthy
echo ""
echo -e "${BLUE}Waiting for services to be ready...${NC}"
echo -e "${YELLOW}(This may take a minute on first run)${NC}"
echo ""

# Wait for database
echo -n "Database (wf-db):     "
timeout=60
counter=0
until docker compose exec -T wf-db pg_isready > /dev/null 2>&1; do
    sleep 1
    counter=$((counter+1))
    if [ $counter -ge $timeout ]; then
        echo -e "${RED}TIMEOUT${NC}"
        exit 1
    fi
done
echo -e "${GREEN}READY${NC}"

# Wait for backend
echo -n "API (wf-api):         "
timeout=90
counter=0
until curl -sf http://localhost:8000/health > /dev/null 2>&1; do
    sleep 1
    counter=$((counter+1))
    if [ $counter -ge $timeout ]; then
        echo -e "${RED}TIMEOUT${NC}"
        exit 1
    fi
done
echo -e "${GREEN}READY${NC}"

# Wait for frontend
echo -n "Web (wf-web):         "
timeout=60
counter=0
until curl -sf http://localhost:5173 > /dev/null 2>&1; do
    sleep 1
    counter=$((counter+1))
    if [ $counter -ge $timeout ]; then
        echo -e "${RED}TIMEOUT${NC}"
        exit 1
    fi
done
echo -e "${GREEN}READY${NC}"

# Wait for pgAdmin
echo -n "pgAdmin (wf-pgadmin): "
timeout=60
counter=0
until curl -sf http://localhost:5050 > /dev/null 2>&1; do
    sleep 1
    counter=$((counter+1))
    if [ $counter -ge $timeout ]; then
        echo -e "${RED}TIMEOUT${NC}"
        exit 1
    fi
done
echo -e "${GREEN}READY${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  All services are running!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Web:       ${BLUE}http://localhost:5173${NC}"
echo -e "API:       ${BLUE}http://localhost:8000${NC}"
echo -e "pgAdmin:   ${BLUE}http://localhost:5050${NC}"
echo -e "Database:  ${BLUE}localhost:5433${NC}"
echo ""
echo -e "To view logs: ${YELLOW}docker compose logs -f${NC}"
echo -e "To stop:      ${YELLOW}./stop.sh${NC}"
echo ""
