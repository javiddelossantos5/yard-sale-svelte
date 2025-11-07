#!/bin/bash
# Frontend Docker Deployment Script
# Run this script on your server to build and deploy the frontend

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="svelte-yard-sale"
CONTAINER_NAME="svelte-prod"
PORT="3000"
API_BASE_URL="http://10.1.2.165:8000"
NETWORK_NAME="svelte-network"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Frontend Docker Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "Dockerfile" ]; then
    echo -e "${RED}Error: Dockerfile not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Step 1: Build the Docker image
echo -e "${BLUE}[1/5] Building Docker image...${NC}"
if docker build -t ${IMAGE_NAME}:prod .; then
    echo -e "${GREEN}✓ Image built successfully${NC}"
else
    echo -e "${RED}✗ Image build failed${NC}"
    exit 1
fi
echo ""

# Step 2: Stop and remove old container
echo -e "${BLUE}[2/5] Stopping old container (if exists)...${NC}"
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    docker stop ${CONTAINER_NAME} 2>/dev/null || true
    docker rm -f ${CONTAINER_NAME} 2>/dev/null || true
    echo -e "${GREEN}✓ Old container removed${NC}"
else
    echo -e "${YELLOW}No existing container found${NC}"
fi
echo ""

# Step 3: Create network if it doesn't exist
echo -e "${BLUE}[3/5] Checking Docker network...${NC}"
if ! docker network ls --format '{{.Name}}' | grep -q "^${NETWORK_NAME}$"; then
    docker network create ${NETWORK_NAME} 2>/dev/null || true
    echo -e "${GREEN}✓ Network '${NETWORK_NAME}' created${NC}"
else
    echo -e "${YELLOW}Network '${NETWORK_NAME}' already exists${NC}"
fi
echo ""

# Step 4: Start new container
echo -e "${BLUE}[4/5] Starting new container...${NC}"
if docker run -d \
    --name ${CONTAINER_NAME} \
    -p ${PORT}:3000 \
    -e VITE_API_BASE_URL=${API_BASE_URL} \
    --network ${NETWORK_NAME} \
    --restart unless-stopped \
    ${IMAGE_NAME}:prod; then
    echo -e "${GREEN}✓ Container started successfully${NC}"
else
    echo -e "${RED}✗ Container start failed${NC}"
    exit 1
fi
echo ""

# Step 5: Verify container is running
echo -e "${BLUE}[5/5] Verifying container...${NC}"
sleep 2
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${GREEN}✓ Container is running${NC}"
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Deployment Successful!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "Container: ${BLUE}${CONTAINER_NAME}${NC}"
    echo -e "Port: ${BLUE}${PORT}${NC}"
    echo -e "API Base URL: ${BLUE}${API_BASE_URL}${NC}"
    echo ""
    echo -e "Useful commands:"
    echo -e "  View logs: ${YELLOW}docker logs -f ${CONTAINER_NAME}${NC}"
    echo -e "  Stop: ${YELLOW}docker stop ${CONTAINER_NAME}${NC}"
    echo -e "  Restart: ${YELLOW}docker restart ${CONTAINER_NAME}${NC}"
    echo -e "  Remove: ${YELLOW}docker rm -f ${CONTAINER_NAME}${NC}"
    echo ""
else
    echo -e "${RED}✗ Container failed to start${NC}"
    echo -e "${YELLOW}Check logs with: docker logs ${CONTAINER_NAME}${NC}"
    exit 1
fi

