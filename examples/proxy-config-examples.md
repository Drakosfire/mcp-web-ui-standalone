# Gateway Proxy Configuration Examples

## Overview

The Gateway Proxy provides a single stable endpoint for ephemeral MCP web UIs. Instead of exposing a range of ports, all web UIs are accessible through `/mcp/:token/*` on a single port with secure token validation.

## Key Benefits

✅ **Single Port Exposure** - Only one port (e.g., 3081) needs to be published  
✅ **Real-time Support** - WebSockets, SSE, and long-polling work seamlessly  
✅ **Secure Access** - JWT tokens with MongoDB-backed validation and TTL  
✅ **External Domain Support** - Works with reverse proxies and custom domains  
✅ **Fast Container Shutdown** - No pre-mapped port ranges  

## Quick Start

### 1. Environment Variables

```bash
# Required
MCP_WEB_UI_PROXY_MODE=true
MCP_WEB_UI_MONGO_URL=mongodb://localhost:27017

# Optional
MCP_WEB_UI_MONGO_DB_NAME=mcp_webui
MCP_WEB_UI_JWT_SECRET=your-secret-key
MCP_WEB_UI_PROXY_PREFIX=/mcp
MCP_WEB_UI_PROXY_BASE_URL=localhost:3081
```

### 2. Docker Compose Integration

```yaml
# docker-compose.yml
services:
  librechat:
    ports:
      - "${PORT}:${PORT}"
      - "127.0.0.1:3081:3081"  # Gateway proxy port
      # No need for ephemeral port ranges!
    environment:
      # Enable proxy mode for MCP web UIs
      - MCP_WEB_UI_PROXY_MODE=true
      - MCP_WEB_UI_MONGO_URL=mongodb://mongodb:27017
      - MCP_WEB_UI_MONGO_DB_NAME=LibreChat
      - MCP_WEB_UI_PROXY_BASE_URL=localhost:3081
    depends_on:
      - mongodb
      - gateway-proxy

  # Standalone gateway proxy server
  gateway-proxy:
    build:
      context: ./mcp-web-ui-standalone
      dockerfile: Dockerfile.proxy
    ports:
      - "127.0.0.1:3081:3081"
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - MONGO_DB_NAME=LibreChat
      - PROXY_PORT=3081
      - PROXY_HOST=0.0.0.0
      - JWT_SECRET=${MCP_JWT_SECRET}
    depends_on:
      - mongodb
```

### 3. Nginx Reverse Proxy Configuration

```nginx
# /etc/nginx/sites-available/your-domain.conf
server {
    listen 80;
    server_name your-domain.com;
    
    # Main application
    location / {
        proxy_pass http://localhost:3080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # MCP Web UI Gateway - supports HTTP, WebSocket, and SSE
    location /mcp/ {
        proxy_pass http://localhost:3081/mcp/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts for long-running connections
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        
        # Buffering settings for real-time data
        proxy_buffering off;
        proxy_cache off;
    }
}
```

## Configuration Options

### MCPWebUI Configuration

```typescript
import { MCPWebUI } from 'mcp-web-ui-standalone';

const webUI = new MCPWebUI({
    // ... existing configuration ...
    
    // Proxy mode settings
    proxyMode: true,
    mongoUrl: 'mongodb://localhost:27017',
    mongoDbName: 'mcp_webui',
    jwtSecret: 'your-secret-key',
    serverName: 'my-mcp-server' // Used for identification
});
```

### Standalone Proxy Server

```typescript
import { GatewayProxyServer } from 'mcp-web-ui-standalone/proxy';

const proxy = new GatewayProxyServer({
    port: 3081,
    host: '0.0.0.0',
    mongoUrl: 'mongodb://localhost:27017',
    mongoDbName: 'mcp_webui',
    proxyPrefix: '/mcp',
    corsOrigins: ['https://your-domain.com'],
    
    // Optional SSL
    ssl: {
        cert: '/path/to/cert.pem',
        key: '/path/to/key.pem'
    }
});

await proxy.start();
```

## URL Patterns

### Traditional (Direct Port Access)
```
❌ https://your-domain.com:12345/?token=abc123
❌ https://your-domain.com:12346/?token=def456
❌ https://your-domain.com:12347/?token=ghi789
```

### Gateway Proxy (Single Port)
```
✅ https://your-domain.com/mcp/abc123/
✅ https://your-domain.com/mcp/def456/
✅ https://your-domain.com/mcp/ghi789/
```

## Real-time Communication Support

The gateway proxy fully supports:

### WebSocket Connections
```javascript
// Frontend code - works seamlessly through proxy
const ws = new WebSocket('wss://your-domain.com/mcp/abc123/ws');
ws.onmessage = (event) => {
    console.log('Real-time update:', event.data);
};
```

### Server-Sent Events (SSE)
```javascript
// Frontend code - works seamlessly through proxy
const eventSource = new EventSource('/mcp/abc123/events');
eventSource.onmessage = (event) => {
    console.log('SSE update:', event.data);
};
```

### Long Polling
```javascript
// Frontend code - works seamlessly through proxy
async function longPoll() {
    const response = await fetch('/mcp/abc123/poll', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
    });
    const data = await response.json();
    // Handle data and continue polling
}
```

## Security Features

### Token Validation
- JWT tokens with embedded user context
- MongoDB-backed session registry with TTL
- Automatic cleanup of expired sessions
- User-based access control

### Session Management
```javascript
// Tokens automatically include:
{
    "userId": "user123",
    "serverName": "grocery-list",
    "sessionId": "uuid-here",
    "iat": 1640995200,
    "exp": 1640998800
}
```

### CORS Configuration
```typescript
const proxy = new GatewayProxyServer({
    corsOrigins: [
        'https://your-domain.com',
        'https://dev.your-domain.com',
        'http://localhost:3000' // For development
    ]
});
```

## Monitoring and Debugging

### Health Check
```bash
curl http://localhost:3081/health
```

### Statistics Endpoint
```bash
curl http://localhost:3081/stats
```

### Debug Logging
```bash
DEBUG=true node dist/examples/standalone-proxy-server.js
```

## Deployment Scenarios

### Scenario 1: Integrated with LibreChat
- Gateway proxy runs inside LibreChat container
- Shares MongoDB connection
- MCP servers auto-register sessions

### Scenario 2: Standalone Proxy Service
- Gateway proxy runs as separate container/service
- Independent MongoDB connection
- Multiple applications can use the same proxy

### Scenario 3: Development Mode
- Gateway proxy runs locally
- Local MongoDB instance
- Direct access for testing

## Migration Guide

### From Direct Port Mapping
```yaml
# OLD - Pre-mapped port ranges
services:
  app:
    ports:
      - "12000-13000:12000-13000"  # ❌ Slow shutdown

# NEW - Single gateway port
services:
  app:
    ports:
      - "127.0.0.1:3081:3081"      # ✅ Fast shutdown
```

### Environment Variables Update
```bash
# OLD
MCP_WEB_UI_PORT_MIN=12000
MCP_WEB_UI_PORT_MAX=13000

# NEW
MCP_WEB_UI_PROXY_MODE=true
MCP_WEB_UI_MONGO_URL=mongodb://localhost:27017
```

### Code Changes
```typescript
// OLD - Direct session creation
const session = await webUI.createSession(userId);
// URL: http://localhost:12345/?token=session-token

// NEW - Proxy mode (automatic)
const session = await webUI.createSession(userId);
// URL: http://localhost:3081/mcp/jwt-token/
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Verify gateway proxy is running on correct port
   - Check firewall rules for port 3081

2. **Invalid Token Errors**
   - Verify MongoDB connection
   - Check JWT secret consistency
   - Ensure session hasn't expired

3. **WebSocket Connection Failed**
   - Verify Nginx WebSocket configuration
   - Check proxy timeout settings
   - Ensure proper Upgrade headers

4. **CORS Errors**
   - Add your domain to corsOrigins
   - Verify Origin header in requests

### Debug Commands
```bash
# Check if proxy is running
curl -v http://localhost:3081/health

# Test token validation (replace TOKEN)
curl -v http://localhost:3081/mcp/TOKEN/

# Check MongoDB sessions
mongo mcp_webui --eval "db.ephemeral_webui_sessions.find()"

# Monitor proxy logs
docker logs -f gateway-proxy
```

This configuration provides a robust, scalable solution for ephemeral MCP web UIs with full real-time communication support!
