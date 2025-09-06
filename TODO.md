# MCP Web UI Development TODOs

## 🎯 **Gateway Proxy Implementation** - IN PROGRESS

### ✅ **Completed**
- [x] **Verify running container has updated mcp-web-ui installed**
- [x] **Audit SessionManager gateway branch and debug logs present in code**
- [x] **Review todoodles web-ui integration to ensure gateway mode/env flags propagate**
- [x] **Identify any legacy/fallback path returning <token> URLs**
- [x] **Allocate real backend port in createGatewaySession and set session.port**
- [x] **Add backend host resolution with environment variable override**
- [x] **Implement token forwarding in gateway proxy (query param + Authorization header)**
- [x] **Add separate static resource routing in gateway proxy**
- [x] **Update documentation with current progress and debug commands**

### 🔄 **In Progress**
- [ ] **Fix static resource MIME types** - CSS/JS files returning HTML instead of proper content types
- [ ] **Test end-to-end UI loading** - Verify complete functionality through gateway proxy

### 🚧 **Next Steps**
- [ ] **Performance optimization** - Optimize proxy routing and caching
- [ ] **Integration testing** - Test with various MCP server configurations
- [ ] **Production deployment** - Deploy to production environment
- [ ] **Monitoring and alerting** - Add health checks and metrics

## 🔍 **Current Status Summary**

### **What's Working Now**
- ✅ Gateway session creation with real backend ports
- ✅ Token validation and routing to backend servers  
- ✅ UI loading and data display (showing todoodles data!)
- ✅ JWT token forwarding to backend servers
- ✅ Separate routing for static vs. dynamic content

### **What Was Fixed**
- **Port Allocation**: Backend servers now get real ports instead of `:0`
- **Token Forwarding**: JWT tokens are now properly forwarded to backend servers
- **Static Resource Handling**: Gateway now handles CSS/JS files separately
- **Backend Host Detection**: Auto-detects container network interfaces

### **Current Issue**
The gateway proxy is successfully routing requests and forwarding tokens, but static resources (CSS/JS) are returning HTML content instead of their proper MIME types. This prevents the MCP framework from loading properly.

## 🚀 **Immediate Next Actions**

1. **Investigate static resource MIME type issue** in the gateway proxy
2. **Test end-to-end flow** to ensure complete UI functionality
3. **Validate performance** under load
4. **Update integration guides** for production deployment

---

## 📚 **Architecture & Design**

### **Gateway Proxy Flow**
```
1. Client requests /mcp/:token/
2. Gateway validates JWT token against MongoDB
3. Gateway looks up backend server details
4. Gateway proxies request to backend with token forwarded
5. Backend processes request and returns response
6. Gateway returns response to client
```

### **Key Components**
- **SessionManager**: Creates gateway sessions with real backend ports
- **GatewayProxyServer**: Routes requests and forwards tokens
- **TokenRegistry**: MongoDB-backed session management
- **Static Resource Handler**: Separate routing for CSS/JS files

## 🔧 **Debugging & Testing**

### **Test Commands**
```bash
# Test gateway session creation
docker exec LibreChat node -e "..." # See README for full command

# Check gateway logs
docker logs LibreChat 2>&1 | grep -E "\\[GATEWAY-DEBUG\\]" | tail -50

# Test static resource access
curl -H "Authorization: Bearer TOKEN" http://localhost:3082/mcp/TOKEN/static/styles.css
```

### **Environment Variables**
```bash
MCP_WEB_UI_USE_GATEWAY=true
MCP_WEB_UI_GATEWAY_URL=http://host.docker.internal:3082
MCP_WEB_UI_BASE_URL=https://dev.sizzek.dungeonmind.net
```

---

## 🎉 **Success Metrics**

- [x] **Session Creation**: Gateway creates sessions with real backend ports
- [x] **Token Forwarding**: JWT tokens properly forwarded to backend servers
- [x] **UI Loading**: Basic UI loads and displays data through gateway
- [ ] **Static Resources**: CSS/JS files load with proper MIME types
- [ ] **Full Functionality**: Complete MCP framework functionality through gateway
- [ ] **Performance**: Sub-100ms response times for proxy requests
- [ ] **Reliability**: 99.9% uptime for gateway service
