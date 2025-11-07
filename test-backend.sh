#!/bin/bash
# Test script to check backend connectivity

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Backend Connectivity Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test 1: Backend API domain
echo -e "${BLUE}[1/4] Testing: https://api.yardsalefinders.com${NC}"
if curl -s -o /dev/null -w "%{http_code}" --max-time 5 https://api.yardsalefinders.com/api/me > /dev/null 2>&1; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 https://api.yardsalefinders.com/api/me 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        echo -e "${GREEN}✓ Backend is reachable (HTTP $HTTP_CODE)${NC}"
    else
        echo -e "${YELLOW}⚠ Backend responded with HTTP $HTTP_CODE${NC}"
    fi
else
    echo -e "${RED}✗ Cannot reach https://api.yardsalefinders.com${NC}"
fi
echo ""

# Test 2: Backend via IP
echo -e "${BLUE}[2/4] Testing: http://10.1.2.165:8000${NC}"
if curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://10.1.2.165:8000/api/me > /dev/null 2>&1; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://10.1.2.165:8000/api/me 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        echo -e "${GREEN}✓ Backend is reachable via IP (HTTP $HTTP_CODE)${NC}"
    else
        echo -e "${YELLOW}⚠ Backend responded with HTTP $HTTP_CODE${NC}"
    fi
else
    echo -e "${RED}✗ Cannot reach http://10.1.2.165:8000${NC}"
fi
echo ""

# Test 3: Frontend server
echo -e "${BLUE}[3/4] Testing: http://localhost:3000${NC}"
if curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3000 > /dev/null 2>&1; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3000 2>/dev/null)
    echo -e "${GREEN}✓ Frontend server is running (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ Frontend server is not running on port 3000${NC}"
fi
echo ""

# Test 4: Test /api/login endpoint through frontend (should proxy to backend)
echo -e "${BLUE}[4/4] Testing: http://localhost:3000/api/login${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 -X POST http://localhost:3000/api/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}' 2>/dev/null)

if [ "$HTTP_CODE" = "404" ]; then
    echo -e "${RED}✗ Frontend returns 404 for /api/login (nginx proxy not configured)${NC}"
    echo -e "${YELLOW}  This is the problem! Nginx needs to proxy /api/* to backend${NC}"
elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "422" ] || [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✓ Frontend proxies /api/login to backend (HTTP $HTTP_CODE - expected for invalid credentials)${NC}"
elif [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Frontend proxies /api/login to backend (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${YELLOW}⚠ Frontend returned HTTP $HTTP_CODE${NC}"
fi
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Complete${NC}"
echo -e "${BLUE}========================================${NC}"

