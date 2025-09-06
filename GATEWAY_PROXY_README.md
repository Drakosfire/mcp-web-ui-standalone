# Gateway Proxy for Ephemeral MCP Web UIs

## 🎯 Solution Overview

The Gateway Proxy solves the **ephemeral port range problem** by providing a single stable endpoint that proxies requests to ephemeral backends using secure tokens.

### ✅ Benefits
- **Single Port Exposure** - Only one gateway port needs to be published (default: 3082)
- **Fast Container Shutdown** - No pre-mapped port ranges (eliminates 93+ second shutdown)
- **Real-time Support** - WebSockets, SSE, and long-polling work seamlessly
- **Secure Access** - JWT tokens with MongoDB-backed validation and TTL
- **External Domain Support** - Works with reverse proxies and custom domains
- **Auto-Discovery** - MCP servers self-register their ports with the gateway
- **Robust Proxying** - Handles all HTTP methods with proper request body forwarding

### 🏗️ Architecture

```
Internet → Gateway Proxy (Port 3082) → MCP Web UI Server (Auto-discovered Port)
           ↓                              ↓
    Token Validation (MongoDB)      Server Registration (MongoDB)
           ↓                              ↓
    Server Discovery                Backend: 172.18.0.x:12xxx
           ↓
    HTTP/WebSocket/SSE Proxying
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd mcp-web-ui-standalone
npm install
```

### 2. Environment Variables
```bash
# Required for gateway mode
export MCP_WEB_UI_USE_GATEWAY=true
export MCP_WEB_UI_GATEWAY_URL=http://localhost:3082
export MCP_WEB_UI_MONGO_URL=mongodb://localhost:27017

# Optional configuration
export MCP_WEB_UI_MONGO_DB_NAME=mcp_webui
export MCP_WEB_UI_JWT_SECRET=your-secret-key
export MCP_WEB_UI_PROXY_PREFIX=/mcp
```

### 3. Run Standalone Proxy Server
```bash
npm run proxy
```

### 4. Use in MCP Servers
```typescript
import { MCPWebUI } from 'mcp-web-ui';

const webUI = new MCPWebUI({
    dataSource: getData,
    schema: mySchema,
    onUpdate: handleUpdate,
    
    // Enable gateway mode - servers auto-register with gateway
    baseUrl: process.env.MCP_WEB_UI_BASE_URL,
    portRange: [12000, 13000],
    serverName: 'my-mcp-server' // ✅ REQUIRED: Unique name for session isolation
});

// Session URLs will automatically use gateway format:
// http://gateway:3082/mcp/:token/
// Each server gets isolated sessions with composite keys:
// userId:my-mcp-server:mcp-webui
const session = await webUI.createSession(userId);
```

## 📖 URL Pattern

### Before (Direct Port Access)
```
❌ https://domain.com:12345/?token=abc123
❌ https://domain.com:12346/?token=def456
❌ https://domain.com:12347/?token=ghi789
```

### After (Gateway Proxy)
```
✅ https://domain.com/mcp/jwt-token-abc123/
✅ https://domain.com/mcp/jwt-token-def456/
✅ https://domain.com/mcp/jwt-token-ghi789/
```

## 🔧 Integration Examples

### Docker Compose
```yaml
services:
  librechat:
    ports:
      - "${PORT}:${PORT}"
      - "127.0.0.1:3082:3082"  # Gateway proxy only
      # No need for 12000-13000:12000-13000 anymore!
    environment:
      - MCP_WEB_UI_USE_GATEWAY=true
      - MCP_WEB_UI_GATEWAY_URL=http://localhost:3082
      - MCP_WEB_UI_MONGO_URL=mongodb://mongodb:27017
```

### Nginx Reverse Proxy
```nginx
# Supports HTTP, WebSocket, and SSE
location /mcp/ {
    proxy_pass http://localhost:3082/mcp/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $host;
}
```

## 🔐 Security Features

- **JWT Tokens** with embedded user context and expiration
- **Composite Session Keys** for server isolation (`userId:serverName:serverType`)
- **MongoDB TTL** for automatic session cleanup
- **User-based Access Control** with scopes
- **CORS Configuration** for domain restrictions
- **Token Validation** on every request
- **Session Isolation** prevents cross-server session conflicts

## 🌐 Real-time Communication

The proxy fully supports bidirectional real-time communication:

```javascript
// WebSockets - work seamlessly through proxy
const ws = new WebSocket('wss://domain.com/mcp/token123/ws');

// Server-Sent Events - work seamlessly through proxy  
const eventSource = new EventSource('/mcp/token123/events');

// Long polling - work seamlessly through proxy
const response = await fetch('/mcp/token123/poll');
```

## 📊 Monitoring

```bash
# Health check
curl http://localhost:3081/health

# Statistics
curl http://localhost:3081/stats

# Debug logging
DEBUG=true npm run proxy
```

## 🔑 Session Isolation with Composite Keys

### **Problem Solved**
Previously, multiple MCP servers for the same user would share sessions, causing routing conflicts and "Bad Gateway" errors when one server's backend became unavailable.

### **Solution: Composite Session Keys**
Each session now uses a unique composite key: `userId:serverName:serverType`

```typescript
// Each server gets isolated sessions
scheduled-tasks: userId:scheduled-tasks:mcp-webui
todoodles:       userId:todoodles:mcp-webui  
grocery-list:    userId:grocery-list:mcp-webui
movies:          userId:movies:mcp-webui
```

### **Required Configuration**
```typescript
// ✅ REQUIRED: Set unique serverName for each MCP server
const webUI = new MCPWebUI({
    // ... other config
    serverName: 'your-unique-server-name' // Prevents session conflicts
});
```

### **Benefits**
- **No Cross-Server Conflicts**: Each server maintains isolated sessions
- **Proper Routing**: Gateway routes to correct backend for each server
- **No "Bad Gateway" Errors**: Sessions don't interfere with each other
- **Scalable**: Supports unlimited MCP servers per user

## 🔄 Migration from Direct Ports

### 1. Update Docker Compose
```yaml
# Remove port range mapping
# ports:
#   - "12000-13000:12000-13000"  # ❌ Remove this

# Add single proxy port
ports:
  - "127.0.0.1:3081:3081"        # ✅ Add this
```

### 2. Update Environment Variables
```bash
# Remove old port range config
# MCP_WEB_UI_PORT_MIN=12000
# MCP_WEB_UI_PORT_MAX=13000

# Add proxy mode config
MCP_WEB_UI_PROXY_MODE=true
MCP_WEB_UI_MONGO_URL=mongodb://localhost:27017
```

### 3. Add Server Names to MCP Servers
```typescript
// ✅ REQUIRED: Add unique serverName to each MCP server
const webUI = new MCPWebUI({
    // ... existing config
    serverName: 'your-server-name' // Unique per server
});
```

## 📁 File Structure

```
src/proxy/
├── TokenRegistry.ts          # MongoDB-backed token management
├── GatewayProxyServer.ts     # Express server with WebSocket support
└── index.ts                  # Exports

examples/
├── standalone-proxy-server.ts  # Ready-to-run proxy server
└── proxy-config-examples.md   # Comprehensive configuration guide
```

## 🎯 Use Cases

1. **LibreChat Integration** - Replace port range mapping with single proxy
2. **Standalone Service** - Run proxy as independent service for multiple apps
3. **Development** - Local testing with MongoDB and proxy
4. **Production** - External domain access with SSL and reverse proxy

## 🚨 Breaking Changes

This is a **non-breaking addition**. Existing direct port access continues to work. Proxy mode is opt-in via configuration.

## 🏗️ **Technical Architecture**

### **Core Components**

1. **Gateway Proxy Server** (`GatewayProxyServer.ts`)
   - Express-based HTTP/WebSocket proxy
   - Token-based routing: `/mcp/:token/*` → Backend server
   - Conditional middleware: body parsing skipped for proxy routes
   - Real-time communication support (HTTP/WS/SSE)

2. **Server Registration System** (`TokenRegistry.ts`)
   - MCP servers self-register their actual ports with MongoDB
   - Gateway discovers registered servers instead of guessing ports
   - Automatic cleanup of stale registrations

3. **Smart Session Management** (`SessionManager.ts`)
   - Checks for registered servers before allocating new ports
   - Falls back to port allocation if no registration found
   - Gateway session creation with proper backend discovery

### **Request Flow**

```
Client Request: POST /mcp/jwt-token/api/update
        ↓
Gateway validates JWT token against MongoDB
        ↓
Gateway queries server registration for 'todoodles'
        ↓
Gateway forwards to: http://172.18.0.5:12861/api/update
        ↓
MCP server processes request and returns JSON
        ↓
Gateway forwards response back to client
```

### **Key Features**

- **Self-Registration**: MCP servers register `{serverName, host, port}` on startup
- **Smart Discovery**: Gateway session creation queries registered servers first
- **Composite Session Keys**: Unique session isolation using `userId:serverName:serverType`
- **Robust Proxying**: All HTTP methods with proper request body forwarding
- **Token Security**: JWT tokens with MongoDB TTL and validation
- **Session Isolation**: Prevents cross-server session conflicts and routing errors
- **Production Ready**: Used in live deployments with nginx reverse proxy

## 📚 Next Steps

1. Install dependencies: `npm install`
2. Run standalone gateway: `npm run gateway`
3. Configure MCP servers with gateway environment variables
4. Deploy with your preferred reverse proxy (nginx, traefik, etc.)

## 📊 Monitoring

```bash
# Gateway health check
curl http://localhost:3082/health

# View active sessions
curl http://localhost:3082/stats

# Check registered servers
curl http://localhost:3082/discover-server/todoodles
```
