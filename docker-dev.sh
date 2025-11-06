#!/bin/bash
# Development Docker script

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Building development Docker image...${NC}"
docker build -f Dockerfile.dev -t svelte-yard-sale:dev .

echo -e "${BLUE}Stopping and removing existing container (if any)...${NC}"
docker stop svelte-dev 2>/dev/null || true
docker rm -f svelte-dev 2>/dev/null || true

echo -e "${BLUE}Starting development container...${NC}"
docker run -d \
  --name svelte-dev \
  -p 5173:5173 \
  -v "$(pwd):/app" \
  -v /app/node_modules \
  -e VITE_API_BASE_URL=http://10.1.2.165:8000 \
  svelte-yard-sale:dev

echo -e "${GREEN}Development server running on http://localhost:5173${NC}"
echo -e "${BLUE}View logs with: docker logs -f svelte-dev${NC}"
echo -e "${BLUE}Stop with: docker stop svelte-dev${NC}"

