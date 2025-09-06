# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Building and Development
- **Build TypeScript**: `npm run build` - Compile TypeScript to JavaScript in `dist/`
- **Development mode**: `npm run dev` - Watch mode compilation with TypeScript
- **Clean build**: `npm run clean && npm run build` - Remove dist/ and rebuild
- **Prepare for publishing**: `npm run prepublishOnly` - Clean, build, and prepare package

### Testing
- **Run tests**: `npm test` - Execute Jest test suite with jsdom environment
- **Watch tests**: `npm run test:watch` - Run tests in watch mode during development
- **Coverage report**: `npm run test:coverage` - Generate test coverage reports

### Gateway/Proxy Server
- **Start gateway**: `npm run gateway` - Run the compiled gateway server
- **Build and run gateway**: `npm run build:gateway` - Compile and start gateway
- **Full gateway start**: `npm run start:gateway` - Clean build and start gateway
- **Test gateway**: `npm run test:gateway` - Run gateway-specific test runner
- **Quick gateway test**: `npm run test:gateway:quick` - Fast gateway tests
- **API gateway test**: `npm run test:gateway:api` - Test gateway API endpoints

### Proxy Development
- **Run standalone proxy**: `npm run proxy` - Build and run standalone proxy server

### Running Single Tests
For Jest tests, use: `npx jest tests/path/to/your/test.test.js`
For component tests: `npx jest tests/vanilla/components/YourComponent.test.js`

## Architecture Overview

### Core Framework Structure
This is an **ultra-lightweight vanilla JavaScript framework** for MCP (Model Context Protocol) servers with these key architectural layers:

#### 1. **Core Layer** (`src/vanilla/core/`)
- **BaseComponent.js**: Foundation class providing:
  - Built-in XSS protection through automatic HTML sanitization
  - Perfect CSP compliance (no eval, no Function constructor)
  - Secure event handling with validation and rate limiting
  - Session-based authentication
  - Smart DOM diffing for efficient updates

#### 2. **Component Layer** (`src/vanilla/components/`)
- **ListComponent.js**: Generic lists with CRUD operations
- **TableComponent.js**: Data tables with sorting/filtering  
- **ModalComponent.js**: Modal system with accessibility
- **StatsComponent.js**: Statistics display with animations
- **StatusComponent.js**: Status indicators and notifications
- **DashboardComponent.js**: Dashboard layouts

#### 3. **Server Layer** (`src/server/`)
- **GenericUIServer.ts**: Modular HTTP server with schema-driven resource loading
- **ResourceManager.ts**: Handles static assets and dynamic resource serving
- **TemplateEngine.ts**: Pluggable template rendering system
- **UIServerConfig.ts**: Configuration management with builder pattern

#### 4. **Session Management** (`src/session/`)
- **SessionManager.ts**: Unified session handling supporting both:
  - **Direct Mode**: Local memory + port management (development)
  - **Proxy Mode**: MongoDB + JWT tokens (production/distributed)

#### 5. **Gateway/Proxy** (`src/proxy/`)
- **GatewayProxyServer.ts**: External proxy for multi-instance deployments
- **TokenRegistry.ts**: Distributed session security with JWT validation

### Key Design Principles

#### Configuration Over Hardcoding
Components are driven by configuration objects rather than hardcoded behavior:
```javascript
// Components accept flexible config
const list = new ListComponent(element, data, {
    list: {
        enableCategories: true,
        enablePriorities: true,
        maxItemLength: 500,
        itemActions: ['edit', 'delete', 'toggle']
    }
});
```

#### Progressive Enhancement
Components work with minimal config and allow progressive enhancement:
```javascript
// Minimal - works with defaults
const basicList = new ListComponent(element, data, {});

// Enhanced - adds features as needed
const advancedList = new ListComponent(element, data, {
    list: { enableSearch: true, enableFilters: true }
});
```

#### Security-First Design
- **Zero Dependencies**: No external libraries, no supply chain risks
- **CSP Compliant**: Perfect Content Security Policy compliance
- **XSS Protection**: Automatic sanitization of all user input
- **Rate Limiting**: Intelligent API call protection without blocking UI

### Framework Usage Patterns

#### Main Entry Point
```typescript
import { MCPWebUI, createTodoSchema } from 'mcp-web-ui';

const webUI = new MCPWebUI({
    schema: createTodoSchema("Your App"),
    dataSource: async (userId) => await getData(userId),
    onUpdate: async (action, data, userId) => await handleUpdate(action, data, userId),
    sessionTimeout: 30 * 60 * 1000,
    pollInterval: 2000
});
```

#### Session Management Modes
- **Direct Mode** (default): `http://localhost:12345?token=uuid` - Local development
- **Proxy Mode**: `http://domain.com/mcp/jwt-token/` - Production/distributed

Enable proxy mode via:
```typescript
const webUI = new MCPWebUI({
    // ... config
    proxyMode: true,
    mongoUrl: 'mongodb://localhost:27017',
    jwtSecret: 'your-secret'
});
```

### Critical Development Patterns

#### JavaScript Inheritance Timing
**This is the #1 cause of component failures - follow exactly:**
```javascript
class YourComponent extends BaseComponent {
    constructor(element, data, config) {
        // 1. ALWAYS call super() FIRST
        super(element, data, config);
        
        // 2. Set properties AFTER super()
        this.componentConfig = { /* config */ };
        
        // 3. Re-render AFTER properties set
        this.render();
    }
    
    // 4. Override init() to prevent premature rendering
    init() {
        if (this.isDestroyed) return;
        this.bindEvents();
        this.startPolling();
    }
}
```

#### Schema-Driven UI Generation
Use schemas to define UI structure:
```javascript
const schema = {
    title: "Dashboard",
    components: [{
        type: "list",
        id: "item-list", 
        config: {
            fields: [
                { key: "name", label: "Name", type: "text", sortable: true },
                { key: "status", label: "Status", type: "badge" }
            ]
        }
    }],
    actions: [{ id: "create", type: "button", label: "Add Item" }]
};
```

### Environment Configuration

#### Port Configuration
```bash
MCP_WEB_UI_PORT_MIN=11000
MCP_WEB_UI_PORT_MAX=12000
MCP_WEB_UI_BLOCKED_PORTS=11434,3000,8080  # Block Ollama, etc.
```

#### Proxy Mode Settings
```bash
MCP_WEB_UI_PROXY_MODE=true
MCP_WEB_UI_MONGO_URL=mongodb://localhost:27017
MCP_WEB_UI_MONGO_DB_NAME=mcp_webui
MCP_WEB_UI_JWT_SECRET=your-secret
MCP_WEB_UI_PROXY_PREFIX=/mcp
```

### Performance Characteristics
- **Bundle Size**: 2-3KB total (vs 8KB+ frameworks)
- **Smart Polling**: Only polls when page visible
- **Efficient Updates**: DOM diffing updates only changed elements
- **Memory Management**: Automatic cleanup of expired sessions

### File Structure Navigation
- `src/index.ts` - Main exports and utility schema creators
- `src/MCPWebUI.ts` - Primary framework orchestration class
- `src/vanilla/` - Pure JavaScript components (no TypeScript compilation needed)
- `examples/` - Usage examples and integration patterns
- `docs/` - Comprehensive design documents and guides
- `tests/` - Jest test suite with jsdom environment

### Common Pitfalls to Avoid
1. **Never mock the framework** - Always use the actual `mcp-web-ui` package
2. **Don't skip the inheritance pattern** - Follow the exact timing requirements
3. **Don't disable security features** - Keep XSS protection and rate limiting enabled
4. **Don't hardcode behavior** - Use configuration objects for flexibility
5. **Don't create eval/Function** - Maintain CSP compliance

This framework is specifically designed for AI agents to rapidly create secure, performant web interfaces for MCP servers with minimal dependencies and maximum flexibility.
