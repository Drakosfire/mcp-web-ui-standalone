#!/bin/bash

# Test script for Gateway Proxy API Routing Fix
# This script tests if API calls are properly routed through the gateway

echo "🧪 Testing Gateway Proxy API Routing Fix"
echo "========================================="

# Configuration
GATEWAY_URL="http://localhost:3082"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkZWZhdWx0Iiwic2VydmVyTmFtZSI6InRvZG9vZGxlcyIsInNlc3Npb25JZCI6IjMyNTdjMGQ1LTUyMjMtNDAxZC04NjlhLWJiNmFlMjdiYjRjOSIsImlhdCI6MTc1Njg3MTgxNiwiZXhwIjoxNzU2ODczNjE2fQ.7mKuBoSincJ6ax01WCV6E0rhIZGLalcnCXpBjotXWWU"

echo ""
echo "📋 Test Configuration:"
echo "   Gateway URL: $GATEWAY_URL"
echo "   Token: ${TOKEN:0:20}..."
echo ""

# Test 1: Check if gateway is running
echo "1️⃣  Testing Gateway Health..."
curl -s -w "\n  Status: %{http_code}\n  Time: %{time_total}s\n" \
  "$GATEWAY_URL/health" | jq . 2>/dev/null || echo "  Response: $(curl -s $GATEWAY_URL/health)"

echo ""

# Test 2: Test API routing through gateway
echo "2️⃣  Testing API Routing (GET /api/health)..."
curl -s -w "\n  Status: %{http_code}\n  Time: %{time_total}s\n" \
  "$GATEWAY_URL/mcp/$TOKEN/api/health" | jq . 2>/dev/null || echo "  Response: $(curl -s $GATEWAY_URL/mcp/$TOKEN/api/health)"

echo ""

# Test 3: Test API routing with different endpoint
echo "3️⃣  Testing API Routing (GET /api/status)..."
curl -s -w "\n  Status: %{http_code}\n  Time: %{time_total}s\n" \
  "$GATEWAY_URL/mcp/$TOKEN/api/status" | jq . 2>/dev/null || echo "  Response: $(curl -s $GATEWAY_URL/mcp/$TOKEN/api/status)"

echo ""

# Test 4: Test main HTML routing still works
echo "4️⃣  Testing HTML Routing (GET /)..."
curl -s -w "\n  Status: %{http_code}\n  Content-Type: %{content_type}\n  Time: %{time_total}s\n" \
  -H "Accept: text/html" \
  "$GATEWAY_URL/mcp/$TOKEN/" | head -n 10

echo ""

echo "✅ Test Results Summary:"
echo "   - If API calls return JSON (not HTML), the fix is working"
echo "   - If you see '[ApiProxy]' in gateway logs, the new middleware is being used"
echo "   - Static resources should still work with '[StaticProxy]' logs"

echo ""
echo "📝 To get a session token:"
echo "   curl -X POST $GATEWAY_URL/create-session \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"userId\":\"test\",\"serverName\":\"test\",\"backend\":{\"type\":\"tcp\",\"host\":\"localhost\",\"port\":12569}}'"
