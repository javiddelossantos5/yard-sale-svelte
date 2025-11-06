#!/bin/bash
# Production Docker script

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Building production Docker image...${NC}"
docker build -t svelte-yard-sale:prod .

echo -e "${BLUE}Stopping existing container (if any)...${NC}"
docker stop svelte-prod 2>/dev/null || true
docker rm svelte-prod 2>/dev/null || true

echo -e "${BLUE}Starting production container...${NC}"
docker run -d \
  --name svelte-prod \
  -p 3000:3000 \
  -e VITE_API_BASE_URL=http://10.1.2.165:8000 \
  svelte-yard-sale:prod

echo -e "${GREEN}Production server running on http://localhost:3000${NC}"
echo -e "${BLUE}View logs with: docker logs -f svelte-prod${NC}"
echo -e "${BLUE}Stop with: docker stop svelte-prod${NC}"

