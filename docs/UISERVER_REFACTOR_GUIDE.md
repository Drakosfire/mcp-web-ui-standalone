# UIServer Refactor Guide - From Monolithic to Generic Architecture

## Current Architecture Problems

After reviewing the current `UIServer.ts` against our Generic Component Architecture principles, several critical issues were identified:

### ❌ **Major Violations**

1. **Configuration Over Hardcoding** - VIOLATED
   - Hardcoded CSS routes for each application type
   - Hardcoded template structure
   - Hardcoded inline styles and JavaScript bundling

2. **Separation of Concerns** - VIOLATED
   - Single class handling: HTTP server + template rendering + static files + CSS generation
   - 900+ lines of mixed responsibilities

3. **Composition Over Inheritance** - VIOLATED
   - Monolithic class with no composability
   - No plugin system or modular architecture

4. **Progressive Enhancement** - VIOLATED
   - All-or-nothing resource loading
   - No conditional feature loading based on schema

## Recommended Refactor Architecture

### **🏗️ New Modular Structure**

```
src/server/
├── UIServer.ts              # Slim HTTP server only
├── UIServerConfig.ts        # Configuration system
├── ResourceManager.ts       # Schema-driven resource loading
├── TemplateEngine.ts        # Modular template rendering
├── plugins/
│   ├── ThemePlugin.ts       # Custom theme support
│   └── SecurityPlugin.ts    # Security middleware
└── templates/
    ├── VanillaRenderer.ts   # Vanilla JS renderer
    └── CustomRenderer.ts    # Custom template renderers
```

### **📊 Before vs After Comparison**

| Aspect | Current (Monolithic) | Refactored (Modular) |
|--------|---------------------|---------------------|
| CSS Loading | Hardcoded routes for each app | Schema-driven theme detection |
| Template Rendering | 200+ lines in one method | Pluggable renderer system |
| Resource Bundling | Hardcoded file lists | Configuration-driven bundling |
| Extensibility | Modify core code | Plugin-based extensions |
| Configuration | Constructor parameters | Rich configuration system |
| Testing | Hard to unit test | Each module testable |

## Implementation Example

### **Step 1: Configuration-Driven Setup**

```typescript
// Before: Hardcoded setup
const server = new UIServer(session, schema, dataSource, onUpdate);

// After: Configuration-driven setup
const config = UIServerConfigBuilder.create()
    .withCustomCSS('todoodles', { 
        schemaTitle: ['todoodles', 'todo'] 
    })
    .withCustomCSS('grocery', { 
        schemaTitle: ['grocery'] 
    })
    .withTheme({
        name: 'dark-mode',
        files: ['dark-theme.css'],
        conditions: { userAgent: ['Dark'] },
        priority: 20
    })
    .build();

const server = new GenericUIServer(session, schema, dataSource, onUpdate, config);
```

### **Step 2: Schema-Driven Resource Loading**

```typescript
// Before: Hardcoded CSS routes
this.app.get('/static/grocery-styles.css', (req, res) => {
    // Hardcoded grocery CSS handling
});
this.app.get('/static/todoodles-styles.css', (req, res) => {
    // Hardcoded todoodles CSS handling
});

// After: Dynamic resource resolution
const resourceManager = new ResourceManager(config, projectRoot);
const resources = resourceManager.getRequiredResources(schema);

// Automatically includes:
// - /static/styles.css (base)
// - /static/todoodles-styles.css (if schema matches)
// - Inline CSS with custom properties
// - Preload links for performance
```

### **Step 3: Modular Template Rendering**

```typescript
// Before: 200+ line hardcoded template method
private renderVanillaTemplate(data: TemplateData): string {
    return `<!DOCTYPE html>...`; // Massive hardcoded template
}

// After: Pluggable renderer system
const templateEngine = new TemplateEngine(config, resourceManager);

// Register custom renderers
templateEngine.registerRenderer(new CustomTodoodlesRenderer());
templateEngine.registerRenderer(new DarkModeRenderer());

// Automatic renderer selection based on context
const html = await templateEngine.render(templateData);
```

### **Step 4: Plugin Architecture**

```typescript
// Add custom functionality without modifying core
class CustomThemePlugin implements UIServerPlugin {
    name = 'custom-theme';
    
    async initialize(server: GenericUIServer): Promise<void> {
        // Add custom routes, middleware, or renderers
        server.addRoute('/api/themes', this.handleThemeRequest.bind(this));
        server.registerRenderer(new CustomRenderer());
    }
}

// Enable via configuration
const config = UIServerConfigBuilder.create()
    .withPlugin('custom-theme', { 
        defaultTheme: 'dark',
        allowUserThemes: true 
    })
    .build();
```

## Migration Strategy

### **Phase 1: Extract Configuration System** ✅ COMPLETE

Create the configuration system and interfaces:
- ✅ `UIServerConfig.ts` - Configuration types and defaults
- ✅ `UIServerConfigBuilder` - Fluent configuration builder

### **Phase 2: Extract Resource Management** ✅ COMPLETE

Move resource loading logic:
- ✅ `ResourceManager.ts` - Schema-driven CSS/JS loading
- ✅ Schema-based theme detection
- ✅ Dynamic bundling capabilities

### **Phase 3: Extract Template Engine** ✅ COMPLETE

Separate template rendering:
- ✅ `TemplateEngine.ts` - Pluggable template system
- ✅ `VanillaTemplateRenderer` - Default renderer
- ✅ Plugin interface for custom renderers

### **Phase 4: Refactor UIServer** (NEXT)

Transform the monolithic UIServer:
```typescript
export class GenericUIServer {
    private app: express.Application;
    private resourceManager: ResourceManager;
    private templateEngine: TemplateEngine;
    private plugins: UIServerPlugin[] = [];

    constructor(
        private session: WebUISession,
        private schema: UISchema,
        private dataSource: DataSourceFunction,
        private onUpdate: UpdateHandler,
        private config: UIServerConfig = DEFAULT_UI_SERVER_CONFIG
    ) {
        this.app = express();
        this.resourceManager = new ResourceManager(config, this.getProjectRoot());
        this.templateEngine = new TemplateEngine(config, this.resourceManager);
        
        this.initializePlugins();
        this.setupMiddleware();
        this.setupRoutes();
    }

    // Much simpler, focused methods
    private setupRoutes(): void {
        // Main UI route
        this.app.get('/', async (req, res) => {
            const templateData = await this.buildTemplateData();
            const html = await this.templateEngine.render(templateData);
            res.send(html);
        });

        // Dynamic resource routes
        this.setupDynamicRoutes();
    }

    private setupDynamicRoutes(): void {
        // CSS route - handles all themes dynamically
        this.app.get('/static/:filename.css', async (req, res) => {
            const css = await this.resourceManager.resolveCSS(req.params.filename, this.schema);
            res.type('text/css').send(css);
        });

        // JS route - handles all components dynamically  
        this.app.get('/static/:filename.js', async (req, res) => {
            const js = await this.resourceManager.resolveJS(req.params.filename, this.schema);
            res.type('application/javascript').send(js);
        });
    }
}
```

### **Phase 5: Add Plugin System** (FUTURE)

Enable extensibility without core modifications:
```typescript
interface UIServerPlugin {
    name: string;
    initialize(server: GenericUIServer): Promise<void>;
    cleanup?(): Promise<void>;
}

// Example: Security Plugin
class SecurityPlugin implements UIServerPlugin {
    async initialize(server: GenericUIServer): Promise<void> {
        server.addMiddleware(this.rateLimitMiddleware);
        server.addSecurityHeaders(this.customHeaders);
    }
}

// Example: Analytics Plugin
class AnalyticsPlugin implements UIServerPlugin {
    async initialize(server: GenericUIServer): Promise<void> {
        server.onRequest(this.trackRequest.bind(this));
        server.addRoute('/api/analytics', this.handleAnalytics.bind(this));
    }
}
```

## Benefits of Refactored Architecture

### **🎯 Immediate Benefits**

1. **Extensibility**: Add new themes, templates, or features without modifying core code
2. **Testability**: Each module can be unit tested independently
3. **Maintainability**: Clear separation of concerns makes code easier to understand
4. **Performance**: Schema-driven loading only loads what's needed

### **📈 Long-term Benefits**

1. **Plugin Ecosystem**: Third parties can create plugins and themes
2. **Multiple Frameworks**: Support different frontend frameworks through renderers
3. **A/B Testing**: Easy to test different templates or themes
4. **Scaling**: Modules can be deployed separately if needed

### **🛡️ Security Benefits**

1. **Reduced Attack Surface**: Smaller, focused modules are easier to secure
2. **Plugin Isolation**: Plugins can't affect core functionality
3. **Resource Validation**: Dynamic loading includes validation
4. **Content Security**: Template engine provides built-in XSS protection

## Usage Examples

### **Example 1: Todoodles with Custom Theme**

```typescript
const todoodlesConfig = UIServerConfigBuilder.create()
    .withCustomCSS('todoodles', {
        schemaTitle: ['todoodles', 'todo']
    })
    .withTheme({
        name: 'todoodles-premium',
        files: ['todoodles-premium.css'],
        conditions: { 
            schemaTitle: ['todoodles'],
            userAgent: ['Premium'] 
        },
        priority: 15
    })
    .build();

const server = new GenericUIServer(session, schema, dataSource, onUpdate, todoodlesConfig);
```

### **Example 2: Multi-Application Server**

```typescript
const multiAppConfig = UIServerConfigBuilder.create()
    .withCustomCSS('todoodles', { schemaTitle: ['todo'] })
    .withCustomCSS('grocery', { schemaTitle: ['grocery'] })
    .withCustomCSS('calendar', { schemaTitle: ['calendar'] })
    .withPlugin('multi-tenant', {
        enableUserThemes: true,
        enableCustomBranding: true
    })
    .build();

// Automatically serves appropriate theme based on schema
const server = new GenericUIServer(session, schema, dataSource, onUpdate, multiAppConfig);
```

### **Example 3: Development vs Production**

```typescript
// Development: All features enabled
const devConfig = UIServerConfigBuilder.create()
    .withTheme({ name: 'debug', files: ['debug.css'], conditions: {}, priority: 1 })
    .withPlugin('dev-tools', { enableDebugging: true })
    .build();

// Production: Optimized for performance
const prodConfig = UIServerConfigBuilder.create()
    .withPlugin('performance', { 
        enableCompression: true,
        enableCaching: true,
        bundleResources: true
    })
    .build();
```

## Next Steps

1. ✅ **Created modular architecture components** (UIServerConfig, ResourceManager, TemplateEngine)
2. 🔄 **Test the new architecture** with existing todoodles use case
3. 📝 **Update UIServer.ts** to use the new modular approach
4. 🔌 **Implement plugin system** for maximum extensibility
5. 📚 **Create migration guide** for existing MCP servers

This refactored architecture transforms the UIServer from a monolithic, hardcoded solution into a truly generic, configurable, and extensible system that follows all the principles outlined in our Generic Component Architecture.

The new system supports:
- ✅ **Configuration over hardcoding**
- ✅ **Composition over inheritance** 
- ✅ **Separation of concerns**
- ✅ **Progressive enhancement**
- ✅ **Plugin-based extensibility**

This enables the MCP Web UI to scale from simple single-application servers to complex multi-tenant, multi-theme, multi-framework platforms while maintaining security and performance. 