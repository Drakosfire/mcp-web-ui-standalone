# MCP Ephemeral Web UI Proxy Deployment Guide

## Overview
This guide explains how to deploy the new proxy-based ephemeral web UI system that eliminates the need to expose high ports externally while maintaining HTTPS end-to-end.

## What Changed
- **Before**: Ephemeral URLs like `https://sizzek.dungeonmind.net:11745/?token=...`
- **After**: Proxy URLs like `https://sizzek.dungeonmind.net/mcp/ui/11745/?token=...`

## Benefits
- ✅ No high ports exposed externally
- ✅ HTTPS termination at Nginx (no SSL certs needed for ephemeral servers)
- ✅ Works with Cloudflare on port 443
- ✅ Better security isolation
- ✅ Cleaner URLs

## Deployment Steps

### 1. Update mcp-web-ui Package
The package has been updated to version 1.1.1 with proxy support. Update on remote server:

```bash
ssh alan@srv586875 "cd ~/projects/Sizzek/mcp-servers/todoodles && npm install mcp-web-ui@latest"
```

### 2. Update MCP Server Environment Variables
Add these environment variables to each MCP server's `.env` file:

```bash
# For todoodles, grocery-list, memory, etc.
MCP_WEB_UI_PROXY_PREFIX=/mcp/ui
MCP_WEB_UI_BASE_URL=https://sizzek.dungeonmind.net
MCP_WEB_UI_BIND_ADDRESS=localhost
```

### 3. Update MCP Server Code
Add the `bindAddress` parameter to the MCPWebUI constructor in each MCP server:

**File**: `src/web-ui-integration.ts` (for todoodles)
```typescript
this.webUI = new MCPWebUI<TodoodleItem>({
    dataSource: this.getDataSource.bind(this),
    schema,
    onUpdate: this.handleUIUpdate.bind(this),
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    pollInterval: 2000, // 2 seconds
    enableLogging: this.enableLogging,
    baseUrl: process.env.MCP_WEB_UI_BASE_URL || 'localhost',
    // Explicit CSS path for todoodles
    cssPath: process.env.MCP_WEB_UI_CSS_PATH || './static',
    portRange: [parseInt(process.env.MCP_WEB_UI_PORT_MIN || '11000'), parseInt(process.env.MCP_WEB_UI_PORT_MAX || '12000')],
    // NEW: Bind to localhost for security
    bindAddress: process.env.MCP_WEB_UI_BIND_ADDRESS || 'localhost'
});
```

### 4. Add Nginx Proxy Configuration
Add the proxy configuration to the sizzek.dungeonmind.net server block:

```nginx
# Add these locations to the server { listen 443 ssl; server_name sizzek.dungeonmind.net; ... } block

# Proxy ephemeral UIs by port via path, keep TLS on 443
# Handles: /mcp/ui/<port>/?token=...
location ~ ^/mcp/ui/(11[0-9]{3}|12[0-9]{3})/?$ {
    set $mcp_port $1;
    proxy_pass http://127.0.0.1:$mcp_port/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    
    # Add CORS headers for web UI
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
    add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization";
    
    # Handle preflight requests
    if ($request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization";
        add_header Content-Length 0;
        add_header Content-Type text/plain;
        return 204;
    }
}

# Handles nested asset/API routes: /mcp/ui/<port>/... and preserves query args
location ~ ^/mcp/ui/(11[0-9]{3}|12[0-9]{3})/(.*)$ {
    set $mcp_port $1;
    set $mcp_path $2;
    proxy_pass http://127.0.0.1:$mcp_port/$mcp_path$is_args$args;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    
    # Add CORS headers for web UI
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
    add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization";
    
    # Handle preflight requests
    if ($request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization";
        add_header Content-Length 0;
        add_header Content-Type text/plain;
        return 204;
    }
}
```

### 5. Rebuild and Restart MCP Servers
```bash
# For each MCP server (todoodles, grocery-list, etc.)
ssh alan@srv586875 "cd ~/projects/Sizzek/mcp-servers/todoodles && npm run build && npm start"
```

### 6. Reload Nginx
```bash
ssh alan@srv586875 "sudo nginx -t && sudo systemctl reload nginx"
```

## Testing
After deployment, test by:
1. Access LibreChat at https://sizzek.dungeonmind.net
2. Use an MCP server (e.g., todoodles)
3. Request a web interface
4. Verify the URL format: `https://sizzek.dungeonmind.net/mcp/ui/11xxx/?token=...`

## Security Notes
- Ephemeral servers now bind to localhost only (not 0.0.0.0)
- No high ports exposed externally
- All traffic goes through Nginx with proper TLS termination
- CORS headers configured for web UI functionality
- Port range limited to 11000-12000 via regex

## Rollback Plan
If issues occur, you can quickly rollback by:
1. Removing the nginx proxy locations
2. Setting `MCP_WEB_UI_PROXY_PREFIX=` (empty) in .env files
3. Setting `MCP_WEB_UI_BIND_ADDRESS=0.0.0.0` in .env files
4. Restarting MCP servers and reloading nginx
