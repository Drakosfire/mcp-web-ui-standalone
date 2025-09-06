# Debug Scratchpad: Static Resource MIME Type Mismatch
**Date**: 2025-09-03  
**Investigator**: Assistant  
**Priority**: High  
**Status**: Active

## Quick Reference
- **Issue ID**: STATIC-MIME-001
- **Affected System**: Gateway Proxy Static Resource Handling
- **First Reported**: 2025-09-03 01:27
- **Last Updated**: 2025-09-03 01:37

## Current Understanding
**What we know**:
- Gateway proxy is successfully routing requests to backend servers
- JWT tokens are being forwarded correctly (both query param and Authorization header)
- UI loads and displays data, but static resources (CSS/JS) are blocked
- Static resources return HTML content instead of proper MIME types
- Browser blocks resources due to MIME type mismatch with X-Content-Type-Options: nosniff
- MCP framework can't load, causing "MCP is not defined" error
- **NEW**: Static resources DO work on the correct backend port (12755)
- **NEW**: There's a port allocation mismatch - SessionManager allocates port 12633 but actual server runs on 12755

**What we don't know**:
- Why SessionManager allocates different ports than where the UI server actually runs
- Whether there are multiple UI servers running or just one
- If there's a timing issue between port allocation and server startup
- Why the gateway is trying to use the allocated port instead of the actual running port

## Active Hypotheses
### Hypothesis 1: Port Allocation vs Server Startup Mismatch
- **Confidence**: High
- **Evidence For**: 
  - SessionManager allocates port 12633
  - Actual UI server runs on port 12755
  - Static resources work on 12755 but not on 12633
- **Evidence Against**:
  - The port allocation system should coordinate with server startup
- **Next Test**: Investigate why SessionManager allocates different ports than actual server ports

### Hypothesis 2: Multiple UI Servers Running
- **Confidence**: Medium
- **Evidence For**: 
  - Multiple ports are listening (12205, 12755)
  - SessionManager might be creating new servers instead of reusing existing ones
- **Evidence Against**:
  - We only see one todoodles MCP server process (PID 150)
- **Next Test**: Check if there are multiple UI servers or if ports are being reused

### Hypothesis 3: SessionManager Not Coordinating with UI Server
- **Confidence**: High
- **Evidence For**: 
  - SessionManager allocates ports independently
  - UI server starts on different ports
  - Gateway tries to use allocated port, not actual server port
- **Evidence Against**:
  - The system should coordinate port allocation with server startup
- **Next Test**: Examine how SessionManager and UI server coordinate port usage

## Investigation Log
### [01:32] - Initial Assessment
- **What**: Created debug scratchpad and identified the core issue
- **Result**: Static resources (CSS/JS) returning HTML with wrong MIME types
- **Evidence**: Browser console errors showing MIME type mismatch
- **Insight**: Gateway proxy is working but static resource handling has a configuration issue
- **Next**: Check backend file structure and test direct access to static resources

### [01:37] - Port Allocation Mismatch Discovered
- **What**: Investigated backend file structure and port allocation
- **Result**: Found that static resources work on port 12755, but SessionManager allocates port 12633
- **Evidence**: 
  - Static CSS file exists and serves content correctly on 12755
  - SessionManager allocates port 12633 for new sessions
  - Gateway tries to use 12633 but server runs on 12755
- **Insight**: The issue is port coordination, not static resource serving
- **Next**: Investigate why SessionManager allocates different ports than actual server ports

### [01:43] - Root Cause Identified and Fixed
- **What**: Found that MCPWebUI.createSession() always creates GenericUIServer regardless of gateway mode
- **Result**: Implemented fix to skip UI server creation when in proxy/gateway mode
- **Evidence**: 
  - MCPWebUI was creating UI servers on allocated ports (12633, 12343)
  - But these ports don't have actual servers running
  - Gateway tries to proxy to allocated ports, gets ECONNREFUSED
- **Insight**: The issue was architectural - MCPWebUI should not create UI servers in gateway mode
- **Next**: Test the fix and verify that sessions now work without port allocation conflicts

## Evidence Collection
### Logs Analyzed
- [x] Application logs: [Found port allocation logs - SessionManager allocates 12633, but server runs on 12755]
- [x] Gateway logs: [Found ECONNREFUSED errors when trying to proxy to allocated ports]
- [ ] System logs: [Not applicable yet]
- [x] Network logs: [Found listening ports 12205, 12755 but not 12633 or 12343]
- [ ] Database logs: [Not applicable for static resources]

### Metrics Collected
- [ ] CPU usage: [Not measured yet]
- [ ] Memory usage: [Not measured yet]
- [ ] Disk I/O: [Not measured yet]
- [ ] Network traffic: [Not measured yet]
- [ ] Application metrics: [Not measured yet]

### Tests Performed
- [x] Reproduction attempt: [Confirmed - static resources consistently return HTML]
- [x] Isolation test: [Found that static resources work on correct port 12755]
- [x] Root cause analysis: [Identified MCPWebUI always creating UI servers in gateway mode]
- [x] Code fix implementation: [Modified MCPWebUI to skip UI server creation in proxy mode]
- [ ] Fix validation: [Need to test the implemented fix]
- [ ] Stress test: [Not performed yet]
- [ ] A/B test: [Not performed yet]
- [ ] Dependency test: [Not performed yet]

## Key Commands/Queries
```bash
# Check backend file structure
docker exec LibreChat ls -la /app/mcp-servers/todoodles/static/
docker exec LibreChat find /app -name "*.css" -o -name "*.js" | head -20

# Test direct backend access
curl http://172.18.0.5:12633/static/styles.css  # ❌ Connection refused
curl http://172.18.0.5:12755/static/styles.css  # ✅ Works - returns CSS content

# Check gateway logs for static requests
docker logs LibreChat 2>&1 | grep -E "static|css|js" | tail -50

# Check listening ports
docker exec LibreChat netstat -tlnp 2>/dev/null | grep -E ":(12[0-9]{3}|13[0-9]{3})"

# Check running processes
docker exec LibreChat ps aux | grep -E "(node|mcp)" | grep -v grep

# Test the fix - create new session
docker exec LibreChat node -e "(async()=>{try{const {MCPWebUI}=await import('mcp-web-ui'); const schema={title:'Test UI',description:'',components:[],actions:[],polling:{enabled:false,intervalMs:2000}}; const webui=new MCPWebUI({dataSource:async()=>[],schema,onUpdate:()=>{}, baseUrl: process.env.MCP_WEB_UI_BASE_URL || 'http://localhost', cssPath: '/app/mcp-servers/todoodles/static', portRange:[12000,13000], blockedPorts: (process.env.MCP_WEB_UI_BLOCKED_PORTS||'').split(',').map(s=>parseInt(s)).filter(n=>!isNaN(n))}); const s=await webui.createSession('test-fix'); console.log('FIXED_SESSION_URL',s.url); console.log('FIXED_SESSION_PORT',s.port);}catch(e){console.error('ERROR',e?.message||e);}})();"
```

## Resources & References
- **Documentation**: GATEWAY_IMPLEMENTATION_PROGRESS.md, GATEWAY_PROXY_README.md
- **Previous Issues**: Gateway session creation and token forwarding (resolved)
- **Team Members**: [User working on gateway proxy implementation]
- **Tools**: Docker, curl, browser dev tools, gateway proxy logs

## Next Actions
### Immediate (Next 1-2 hours)
- [x] Check what static files exist in backend server
- [x] Test direct access to backend static endpoints
- [x] Verify gateway proxy routing for static resources
- [x] Investigate port allocation vs server startup coordination
- [x] Check if multiple UI servers are running or if ports are being reused
- [x] **COMPLETED**: Fix MCPWebUI to skip UI server creation in gateway mode
- [ ] **NEW**: Test the implemented fix to verify it resolves the port coordination issue

### Short-term (Next 4-8 hours)
- [ ] Validate that sessions now work without port allocation conflicts
- [ ] Test complete end-to-end UI loading through gateway
- [ ] Validate MCP framework functionality

### If Still Stuck
- [ ] Escalate to [user] for additional debugging context
- [ ] Request additional resources: [access to backend server configuration]
- [ ] Consider alternative approaches: [serve static files directly from gateway]

## Notes & Observations
- The gateway proxy architecture is working correctly for dynamic content
- Static resource handling was recently implemented with separate middleware
- **CRITICAL FINDING**: Static resources work perfectly on the correct backend port (12755)
- **ROOT CAUSE IDENTIFIED**: MCPWebUI was always creating UI servers regardless of gateway mode
- **FIX IMPLEMENTED**: Modified MCPWebUI to skip UI server creation when in proxy/gateway mode
- **EXPECTED OUTCOME**: Sessions should now work without port allocation conflicts
- The gateway proxy will handle all routing without needing local UI servers

---
**Template Usage**: This scratchpad will be updated as we test the implemented fix.
