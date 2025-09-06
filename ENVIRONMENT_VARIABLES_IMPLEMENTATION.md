# MCP Web UI Environment Variables Implementation Guide

## New Environment Variables

Your MCP Web UI library now supports these new environment variables for proxy-based deployment:

### **Core Variables**

```bash
# Proxy Configuration
MCP_WEB_UI_PROXY_PREFIX=/mcp/ui          # Proxy path prefix (e.g., /mcp/ui)
MCP_WEB_UI_BASE_URL=https://sizzek.dungeonmind.net  # Base URL for sessions
MCP_WEB_UI_BIND_ADDRESS=localhost        # Bind address for ephemeral servers
```

### **Existing Variables (Still Supported)**

```bash
# Port Configuration
MCP_WEB_UI_PORT_MIN=11000               # Minimum port for ephemeral UIs
MCP_WEB_UI_PORT_MAX=12000               # Maximum port for ephemeral UIs
MCP_WEB_UI_BLOCKED_PORTS=11434          # Comma-separated blocked ports

# CSS Configuration
MCP_WEB_UI_CSS_PATH=./static            # Path to CSS files
```

## Implementation Status

### **✅ Already Implemented in Library:**

1. **URL Generation Logic** (SessionManager.ts):
   ```typescript
   // Automatically generates correct URLs based on proxy mode
   if (proxyPrefix && proxyPrefix.trim().length > 0) {
       // Proxy mode: https://sizzek.dungeonmind.net/mcp/ui/11745/?token=abc123
       sessionUrl = `${protocol}://${baseUrl}${proxyPrefix}/${port}/?token=${token}`;
   } else {
       // Direct mode: https://sizzek.dungeonmind.net:11745/?token=abc123
       sessionUrl = `${protocol}://${baseUrl}:${port}?token=${token}`;
   }
   ```

2. **Bind Address Logic** (MCPWebUI.ts):
   ```typescript
   // Automatically sets bind address based on proxy mode
   if (process.env.MCP_WEB_UI_PROXY_PREFIX) {
       this.config.bindAddress = 'localhost';  // Always localhost for proxy
   } else if (process.env.MCP_WEB_UI_BIND_ADDRESS) {
       this.config.bindAddress = process.env.MCP_WEB_UI_BIND_ADDRESS;
   }
   ```

## How to Use in MCP Servers

### **Step 1: Update Environment Files**

Add these variables to each MCP server's `.env` file:

```bash
# For todoodles/.env
MCP_WEB_UI_PROXY_PREFIX=/mcp/ui
MCP_WEB_UI_BASE_URL=https://sizzek.dungeonmind.net
MCP_WEB_UI_BIND_ADDRESS=localhost
MCP_WEB_UI_PORT_MIN=11000
MCP_WEB_UI_PORT_MAX=12000
MCP_WEB_UI_BLOCKED_PORTS=11434
MCP_WEB_UI_CSS_PATH=./static
```

```bash
# For grocery-list/.env
MCP_WEB_UI_PROXY_PREFIX=/mcp/ui
MCP_WEB_UI_BASE_URL=https://sizzek.dungeonmind.net
MCP_WEB_UI_BIND_ADDRESS=localhost
MCP_WEB_UI_PORT_MIN=11000
MCP_WEB_UI_PORT_MAX=12000
MCP_WEB_UI_BLOCKED_PORTS=11434
MCP_WEB_UI_CSS_PATH=./static
```

### **Step 2: Update MCP Server Code (Optional)**

The environment variables are automatically read by the library, but you can also pass them explicitly:

```typescript
// In src/web-ui-integration.ts
this.webUI = new MCPWebUI<TodoodleItem>({
    dataSource: this.getDataSource.bind(this),
    schema,
    onUpdate: this.handleUIUpdate.bind(this),
    sessionTimeout: 30 * 60 * 1000,
    pollInterval: 2000,
    enableLogging: this.enableLogging,
    baseUrl: process.env.MCP_WEB_UI_BASE_URL || 'localhost',
    cssPath: process.env.MCP_WEB_UI_CSS_PATH || './static',
    portRange: [
        parseInt(process.env.MCP_WEB_UI_PORT_MIN || '11000'), 
        parseInt(process.env.MCP_WEB_UI_PORT_MAX || '12000')
    ],
    blockedPorts: process.env.MCP_WEB_UI_BLOCKED_PORTS ?
        process.env.MCP_WEB_UI_BLOCKED_PORTS.split(',')
            .map(p => parseInt(p.trim()))
            .filter(p => !isNaN(p)) : []
    // bindAddress is automatically set from environment
});
```

## URL Generation Examples

### **With Proxy Mode (Recommended):**
```bash
MCP_WEB_UI_PROXY_PREFIX=/mcp/ui
MCP_WEB_UI_BASE_URL=https://sizzek.dungeonmind.net
MCP_WEB_UI_BIND_ADDRESS=localhost
```

**Generated URL:**
```
https://sizzek.dungeonmind.net/mcp/ui/11745/?token=abc123-def456-ghi789
```

### **Without Proxy Mode (Legacy):**
```bash
# MCP_WEB_UI_PROXY_PREFIX not set or empty
MCP_WEB_UI_BASE_URL=https://sizzek.dungeonmind.net
MCP_WEB_UI_BIND_ADDRESS=0.0.0.0
```

**Generated URL:**
```
https://sizzek.dungeonmind.net:11745/?token=abc123-def456-ghi789
```

## Environment-Specific Configuration

### **Development Environment:**
```bash
MCP_WEB_UI_BASE_URL=https://dev.sizzek.dungeonmind.net
MCP_WEB_UI_PROXY_PREFIX=/mcp/ui
MCP_WEB_UI_BIND_ADDRESS=localhost
```

### **Production Environment:**
```bash
MCP_WEB_UI_BASE_URL=https://sizzek.dungeonmind.net
MCP_WEB_UI_PROXY_PREFIX=/mcp/ui
MCP_WEB_UI_BIND_ADDRESS=localhost
```

## Automatic Behavior

### **When MCP_WEB_UI_PROXY_PREFIX is Set:**
- ✅ **Bind Address**: Automatically set to `localhost`
- ✅ **URL Format**: Uses proxy path (`/mcp/ui/port/?token=...`)
- ✅ **Security**: Ephemeral servers only accessible via nginx proxy

### **When MCP_WEB_UI_PROXY_PREFIX is Not Set:**
- ✅ **Bind Address**: Uses `MCP_WEB_UI_BIND_ADDRESS` or defaults to `0.0.0.0`
- ✅ **URL Format**: Uses direct port access (`:port/?token=...`)
- ✅ **Security**: Ephemeral servers directly accessible (legacy mode)

## Testing the Implementation

### **1. Test URL Generation:**
```bash
# Start an MCP server with proxy mode
MCP_WEB_UI_PROXY_PREFIX=/mcp/ui \
MCP_WEB_UI_BASE_URL=https://sizzek.dungeonmind.net \
MCP_WEB_UI_BIND_ADDRESS=localhost \
npm start

# Check the generated URL in logs
# Should show: https://sizzek.dungeonmind.net/mcp/ui/11745/?token=...
```

### **2. Test Bind Address:**
```bash
# Check what address the ephemeral server binds to
netstat -tulpn | grep 11

# Should show: tcp 0 0 127.0.0.1:11745 0.0.0.0:* LISTEN
```

### **3. Test Proxy Access:**
```bash
# Test via nginx proxy
curl -I "https://sizzek.dungeonmind.net/mcp/ui/11745/?token=abc123"

# Should return 200 OK if proxy is configured correctly
```

## Troubleshooting

### **Common Issues:**

1. **URL Still Shows Port Number:**
   - Check that `MCP_WEB_UI_PROXY_PREFIX` is set and not empty
   - Verify the environment variable is loaded correctly

2. **Ephemeral Server Not Accessible:**
   - Check that `MCP_WEB_UI_BIND_ADDRESS=localhost` is set
   - Verify nginx proxy configuration is active

3. **CSS Not Loading:**
   - Check `MCP_WEB_UI_CSS_PATH` points to correct directory
   - Verify static files are accessible via nginx

### **Debug Commands:**
```bash
# Check environment variables
env | grep MCP_WEB_UI

# Check ephemeral server binding
netstat -tulpn | grep 11

# Test nginx proxy
curl -v "https://sizzek.dungeonmind.net/mcp/ui/11745/"

# Check nginx logs
tail -f /var/log/nginx/access.log | grep mcp
```

## Summary

The new environment variables are **fully implemented** in your MCP Web UI library. You just need to:

1. ✅ **Add the variables** to your MCP server `.env` files
2. ✅ **Update nginx configuration** (already documented)
3. ✅ **Test the implementation** using the commands above

The library automatically handles URL generation and bind address configuration based on these environment variables!
