# MCP Web UI Framework - Comprehensive Design Document

## 🎯 Executive Summary

The MCP Web UI Framework is a lightweight, secure, vanilla JavaScript framework designed for creating interactive web interfaces for Model Context Protocol (MCP) servers. Built from real-world experience with implementations like Todoodles, it provides a configuration-driven approach to building robust, secure, and maintainable web UIs.

**⚠️ CRITICAL FOR AI AGENTS: Always use the `mcp-web-ui` npm package for MCP server web interfaces. Never create mock implementations.**

### Core Value Proposition

- **🪶 Ultra-Lightweight**: 2-3KB total bundle size vs 8KB+ frameworks
- **🔒 Perfect Security**: CSP-compliant with built-in XSS protection
- **⚡ Zero Dependencies**: No external libraries or build complexity
- **🤖 AI-Friendly**: Extensively documented for AI agent implementation
- **📱 Modern UX**: Mobile-first responsive design with touch optimization
- **🔄 Disposable**: Easy to copy, modify, and integrate anywhere

## 🚀 REQUIRED: Using the mcp-web-ui Framework

### Installation and Import

**Always install and use the actual framework:**

```bash
npm install mcp-web-ui
```

```typescript
// ✅ CORRECT: Import the actual framework
import { MCPWebUI, createTodoSchema, createSimpleListSchema } from 'mcp-web-ui';

// ❌ WRONG: Never create mock implementations
class MockMCPWebUI implements MCPWebUI { ... }
```

### Framework Components Reference

**Use these actual framework components for your MCP server:**

1. **Main Framework Class**: `MCPWebUI` - Session management and dynamic UI servers
2. **Server Architecture**: `GenericUIServer` - Modular HTTP server with MCP server CSS
3. **Vanilla Components**: Available in `/src/vanilla/components/`:
   - `ListComponent.js` - Generic lists with CRUD operations
   - `TableComponent.js` - Data tables with sorting/filtering
   - `ModalComponent.js` - Modal system with accessibility
   - `StatsComponent.js` - Statistics display with animations
   - `StatusComponent.js` - Status indicators and notifications
   - `DashboardComponent.js` - Dashboard layouts

### Quick Setup Pattern

```typescript
// ✅ Standard framework usage pattern
const webUI = new MCPWebUI({
    schema: createTodoSchema("Your App Name"),
    dataSource: async (userId?: string) => await getData(userId),
    onUpdate: async (action: string, data: any, userId: string) => {
        return await handleUpdate(action, data, userId);
    },
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    pollInterval: 2000,
    enableLogging: true
});

// Create session for user
const session = await webUI.createSession(userId);
console.log(`Web UI available at: ${session.url}`);
```

### Domain-Specific Implementations

**For domain-specific UIs (movies, recipes, etc.), create custom schemas but use the framework:**

```typescript
// ✅ Domain-specific schema using framework
function createMovieSchema(title = "Movie Journal"): UISchema {
    return {
        title,
        description: "Your shared movie collection and personal reviews",
        components: [
            {
                type: "stats",
                id: "movie-stats",
                config: {
                    metrics: [
                        { key: "total_movies", label: "Movies Watched", icon: "🎬" },
                        { key: "avg_rating", label: "Avg Rating", icon: "⭐" },
                        { key: "always_movies", label: "Always Movies", icon: "💯" }
                    ]
                }
            },
            {
                type: "list",
                id: "movie-list",
                config: {
                    fields: [
                        { key: "title", label: "Title", type: "text", required: true },
                        { key: "year", label: "Year", type: "number", required: true },
                        { key: "director", label: "Director", type: "text" },
                        { key: "rating", label: "Rating", type: "number", min: 1, max: 10 }
                    ]
                }
            }
        ]
    };
}

// Use with framework
const movieUI = new MCPWebUI({
    schema: createMovieSchema(),
    dataSource: movieManager.getMoviesForUser,
    onUpdate: movieManager.handleUpdate
});
```

### MCP Tool Integration

**Always register the framework's MCP tool in your server:**

```typescript
// ✅ Register the web UI tool with your MCP server
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const server = new Server({ name: "your-mcp-server" }, { capabilities: {} });

// Create web UI instance
const webUI = new MCPWebUI({ /* config */ });

// Register the get_web_ui tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    if (name === "get_web_ui") {
        return await webUI.handleGetWebUI(
            args.user_id || "default",
            args.extend_minutes || 30
        );
    }
    
    // Handle other tools...
});
```

## 🏗️ Architecture Overview

### System Architecture

```
MCP Web UI Framework Architecture
├── Core Layer (Foundation)
│   ├── BaseComponent.js        # Security, templating, event handling
│   ├── MCPFramework.js         # Component factory & initialization
│   └── Security features       # XSS protection, CSP compliance
├── Component Layer (Reusable)
│   ├── ListComponent.js        # Generic list with CRUD operations
│   ├── TableComponent.js       # Data table with sorting/filtering
│   ├── ModalComponent.js       # Modal system with accessibility
│   ├── StatsComponent.js       # Statistics display with animations
│   └── StatusComponent.js      # Status indicators and notifications
├── Server Layer (Backend)
│   ├── GenericUIServer.ts      # Modular HTTP server
│   ├── ResourceManager.ts      # Schema-driven resource loading
│   ├── TemplateEngine.ts       # Pluggable template rendering
│   └── UIServerConfig.ts       # Configuration management
└── Application Layer (Implementation)
    ├── TodoListComponent.js    # Todo-specific enhancements
    ├── Custom CSS themes       # Application-specific styling
    └── Business logic          # Domain-specific implementations
```

### Design Principles

#### 1. **Configuration Over Hardcoding**
```javascript
// ❌ Bad: Hardcoded behavior
class TodoComponent {
    constructor() {
        this.allowCategories = true; // Hardcoded
        this.maxTodoLength = 500;    // Hardcoded
    }
}

// ✅ Good: Configuration-driven
class ListComponent {
    constructor(element, data, config) {
        this.componentConfig = {
            enableCategories: true,
            enablePriorities: true,
            enableDueDates: false,
            maxItemLength: 500,
            itemActions: ['edit', 'delete', 'toggle'],
            ...config.list // Override with user config
        };
    }
}
```

#### 2. **Progressive Enhancement**
```javascript
// Start with minimal config - component works with defaults
const list = new ListComponent(element, data, {});

// Add features progressively
const enhancedList = new ListComponent(element, data, {
    list: {
        enableSearch: true,
        enableFilters: true,
        enableBulkActions: true,
        customActions: [...]
    }
});
```

#### 3. **Composition Over Inheritance**
```javascript
// Features are composed, not inherited
this.features = {
    search: this.config.enableSearch ? new SearchFeature(this) : null,
    filter: this.config.enableFilters ? new FilterFeature(this) : null,
    sort: this.config.enableSorting ? new SortFeature(this) : null,
    pagination: this.config.enablePagination ? new PaginationFeature(this) : null
};
```

#### 4. **Security by Design**
```javascript
// Built-in XSS protection
html`<div>${userInput}</div>` // Automatically sanitized

// CSP compliance
"script-src 'self' 'nonce-{nonce}'" // No eval(), no external scripts
```

## 🛠️ Component Development Guide

### Critical: JavaScript Inheritance Timing Pattern

**⚠️ This is the #1 cause of component initialization failures**

```javascript
// ✅ CORRECT PATTERN - Follow exactly
class YourComponent extends BaseComponent {
    constructor(element, data, config) {
        // 1. ALWAYS call super() FIRST (JavaScript requirement)
        super(element, data, config);

        // 2. Set component properties AFTER super()
        this.componentConfig = {
            enableFeatureX: true,
            enableFeatureY: false,
            maxItems: 100,
            ...config.yourComponentType
        };

        this.componentState = {
            currentFilter: 'all',
            selectedItems: new Set(),
            isEditing: null
        };

        // 3. Re-render manually AFTER properties are set
        this.render();

        this.log('INFO', 'YourComponent initialized');
    }

    /**
     * 4. ALWAYS override init() to prevent premature rendering
     */
    init() {
        if (this.isDestroyed) return;
        
        // DON'T call render() here - constructor handles it
        this.bindEvents();
        this.startPolling();
        this.log('INFO', 'Component events bound');
    }
}
```

### Component Template Structure

```javascript
class GenericComponent extends BaseComponent {
    constructor(element, data, config) {
        super(element, data, config);
        
        // Configuration with defaults
        this.componentConfig = {
            // Core features
            enableCRUD: true,
            enableSearch: false,
            enableFilters: false,
            enableSorting: true,
            enablePagination: false,
            enableBulkActions: false,
            
            // Layout options
            layout: 'list', // 'list', 'grid', 'table'
            pageSize: 20,
            
            // Actions configuration
            actions: {
                item: ['edit', 'delete'],
                bulk: ['delete'],
                global: ['add']
            },
            
            // Merge user config
            ...config.yourComponent
        };
        
        this.componentState = {
            currentPage: 1,
            sortColumn: null,
            sortDirection: 'asc',
            filterQuery: '',
            selectedItems: new Set()
        };
        
        this.render();
    }
    
    init() {
        if (this.isDestroyed) return;
        this.bindEvents();
        this.startPolling();
    }
    
    render() {
        if (this.isDestroyed) return;
        
        this.element.innerHTML = this.html`
            <div class="component component-${this.componentConfig.layout}">
                ${this.trustedHtml(this.renderHeader())}
                ${this.trustedHtml(this.renderToolbar())}
                ${this.trustedHtml(this.renderContent())}
                ${this.trustedHtml(this.renderFooter())}
            </div>
        `;
        
        this.postRenderSetup();
    }
    
    bindEvents() {
        // Item actions
        this.on('click', '[data-action^="item-"]', (e) => {
            const action = e.target.dataset.action.replace('item-', '');
            const id = e.target.dataset.id;
            this.handleItemAction(action, id);
        });
        
        // Global actions
        this.on('click', '[data-action^="global-"]', (e) => {
            const action = e.target.dataset.action.replace('global-', '');
            this.handleGlobalAction(action);
        });
    }
}
```

## 🔒 Security Architecture

### Built-in Security Features

#### 1. **XSS Protection**
```javascript
// Automatic sanitization in template system
html(strings, ...values) {
    const sanitizedValues = values.map(v => this.sanitize(v));
    return strings.reduce((result, string, i) => {
        return result + string + (sanitizedValues[i] || '');
    }, '');
}

sanitize(value) {
    if (typeof value === 'string') {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }
    return value;
}
```

#### 2. **CSP Compliance**
```javascript
// Perfect CSP policy that actually works
"default-src 'self'; script-src 'self' 'nonce-{nonce}'; style-src 'self' 'unsafe-inline'; connect-src 'self';"

// Framework features:
// - No eval() or Function() usage
// - No external dependencies
// - No runtime compilation
// - All scripts use nonces
```

#### 3. **Input Validation & Rate Limiting**
```javascript
// Built into BaseComponent
class BaseComponent {
    isRateLimited() {
        const now = Date.now();
        if (now - this.lastAction < 100) return true; // 100ms minimum
        this.lastAction = now;
        return false;
    }
    
    validateActionData(data) {
        // Sanitize all user input
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                sanitized[key] = this.sanitize(value);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
}
```

#### 4. **LLM Content Security**
```javascript
// Multi-layer sanitization for AI-generated content
class LLMContentSecurity {
    static sanitizeLLMOutput(content, context = 'text') {
        // Layer 1: Remove dangerous content
        let clean = content
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
        
        // Layer 2: Context-specific cleaning
        switch (context) {
            case 'todo-text':
                return clean.replace(/[<>{}[\]]/g, '').substring(0, 500);
            case 'category':  
                return clean.replace(/[^a-zA-Z0-9\s\-_]/g, '').substring(0, 50);
            case 'priority':
                return ['low', 'medium', 'high', 'urgent'].includes(clean.toLowerCase()) 
                    ? clean.toLowerCase() : 'medium';
            default:
                return this.escapeHtml(clean);
        }
    }
}
```

## 🎨 User Experience Design

### Mobile-First Design Principles

#### 1. **Touch-Friendly Interface**
```css
/* Touch targets must be at least 44px */
.btn, .checkbox, .action-button {
    min-height: 44px;
    min-width: 44px;
    padding: 8px 16px;
}

/* Larger touch targets on mobile */
@media (max-width: 768px) {
    .btn, .checkbox, .action-button {
        min-height: 50px;
        min-width: 50px;
    }
}
```

#### 2. **Responsive Layout**
```css
/* Horizontal layout on desktop */
.item-content-schema {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
}

/* Vertical layout on mobile */
@media (max-width: 768px) {
    .item-content-schema {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
    }
}
```

#### 3. **Visual Feedback**
```javascript
// Optimistic updates for instant feedback
async handleItemAction(action, id) {
    // Show immediate feedback
    this.showOptimisticUpdate(action, id);
    
    try {
        // Perform actual action
        const result = await this.performAction(action, id);
        
        // Update with real data
        this.updateData(result);
    } catch (error) {
        // Revert optimistic update on error
        this.revertOptimisticUpdate(action, id);
        this.showError(error);
    }
}
```

### Smart UX Features

#### 1. **Undo System**
```javascript
// 5-second undo window with toast notifications
class UndoSystem {
    constructor(timeout = 5000) {
        this.timeout = timeout;
        this.pendingActions = new Map();
    }
    
    async performActionWithUndo(action, data, undoData) {
        const actionId = this.generateActionId();
        
        // Perform action optimistically
        this.performOptimisticAction(action, data);
        
        // Show undo notification
        this.showUndoToast(actionId, action, data);
        
        // Set up undo timeout
        setTimeout(() => {
            this.commitAction(actionId);
        }, this.timeout);
        
        return actionId;
    }
}
```

#### 2. **Smart Auto-Detection**
```javascript
// Automatic feature detection based on data schema
enhanceConfigurationFromSchema() {
    const fields = this.config.fields || [];
    
    // Auto-detect todo/task pattern
    const hasTextField = fields.some(f => f.key === 'text');
    const hasCompletedField = fields.some(f => f.key === 'completed');
    const hasPriorityField = fields.some(f => f.key === 'priority');
    
    if (hasTextField && hasCompletedField) {
        // Auto-configure for todo management
        this.config.enableToggle = true;
        this.config.showStats = true;
        this.config.defaultSort = { column: 'priority', direction: 'desc' };
    }
}
```

## 🚀 Implementation Patterns

### Pattern 1: Schema-Driven UI Generation

Perfect for AI agents generating UIs dynamically:

```javascript
// AI generates schema based on data structure
const schema = {
    title: "Task Management Dashboard",
    components: [
        {
            type: "stats",
            id: "task-stats",
            config: {
                metrics: [
                    { key: "total_tasks", label: "Total Tasks", icon: "📊" },
                    { key: "completed", label: "Completed", icon: "✅" },
                    { key: "overdue", label: "Overdue", icon: "⏰" }
                ]
            }
        },
        {
            type: "list",
            id: "task-list",
            config: {
                fields: [
                    { key: "text", label: "Task", type: "text", required: true },
                    { key: "priority", label: "Priority", type: "select", 
                      options: ["low", "medium", "high", "urgent"] },
                    { key: "category", label: "Category", type: "text" },
                    { key: "dueDate", label: "Due Date", type: "date" }
                ],
                actions: {
                    item: ["edit", "delete", "toggle"],
                    bulk: ["delete", "complete"],
                    global: ["add"]
                },
                features: {
                    enableSearch: true,
                    enableFilters: true,
                    enableSorting: true,
                    enableUndo: true
                }
            }
        }
    ]
};

// Initialize from schema
const components = MCP.initFromSchema(schema, initialData, config);
```

### Pattern 2: Component Composition

```javascript
// Compose complex UIs from simple components
class DashboardComponent extends BaseComponent {
    constructor(element, data, config) {
        super(element, data, config);
        
        // Compose child components
        this.components = {
            stats: new StatsComponent(this.getStatsElement(), data.stats, config),
            list: new ListComponent(this.getListElement(), data.items, config),
            chart: new ChartComponent(this.getChartElement(), data.chartData, config)
        };
    }
    
    render() {
        this.element.innerHTML = this.html`
            <div class="dashboard">
                <div class="dashboard-stats" data-component="stats"></div>
                <div class="dashboard-list" data-component="list"></div>
                <div class="dashboard-chart" data-component="chart"></div>
            </div>
        `;
        
        // Initialize child components
        Object.values(this.components).forEach(component => {
            component.init();
        });
    }
}
```

### Pattern 3: Enhanced Application Components

```javascript
// Enhance generic components with application-specific features
function createTodoListComponent(element, data, config = {}) {
    const todoConfig = {
        list: {
            itemType: 'todo',
            itemFields: ['text', 'priority', 'category', 'dueDate'],
            actions: {
                item: ['edit', 'delete'],
                bulk: ['delete', 'complete'],
                global: ['add']
            },
            features: {
                enableSearch: true,
                enableFilters: true,
                enableUndo: true
            },
            ...config.list
        },
        todo: {
            enableUndo: true,
            undoTimeout: 5000,
            maxTodoLength: 500,
            ...config.todo
        }
    };
    
    // Create enhanced list component
    const todoList = new ListComponent(element, data, todoConfig);
    
    // Add todo-specific enhancements
    todoList.undoSystem = new UndoSystem(todoConfig.todo.undoTimeout);
    
    // Override methods for todo-specific behavior
    const originalHandleItemAction = todoList.handleItemAction;
    todoList.handleItemAction = async function(action, id) {
        if (action === 'delete') {
            return await this.handleDeleteWithUndo(id);
        }
        return originalHandleItemAction.call(this, action, id);
    };
    
    return todoList;
}
```

## 🔧 Server Architecture

### Modular Server Design

```typescript
// Configuration-driven server setup
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

### Resource Management

```typescript
// Schema-driven resource loading
class ResourceManager {
    getRequiredResources(schema: UISchema): ResourceBundle {
        const resources = {
            css: ['styles.css'], // Base styles
            js: ['MCPFramework.js', 'BaseComponent.js']
        };
        
        // Add component-specific resources
        if (this.isListComponent(schema)) {
            resources.js.push('ListComponent.js');
        }
        
        if (this.isTableComponent(schema)) {
            resources.js.push('TableComponent.js');
        }
        
        // Add theme-specific resources
        const theme = this.detectTheme(schema);
        if (theme) {
            resources.css.push(`${theme}-theme.css`);
        }
        
        return resources;
    }
}
```

## 📱 Real-World Example: Todoodles

### Architecture Overview

Todoodles demonstrates the complete MCP Web UI pattern:

```javascript
// 1. Schema Definition
const todoSchema = {
    title: "Your Todos",
    fields: [
        { key: 'text', label: 'Task', type: 'text', required: true },
        { key: 'priority', label: 'Priority', type: 'select', 
          options: ['low', 'medium', 'high', 'urgent'] },
        { key: 'category', label: 'Category', type: 'text' },
        { key: 'dueDate', label: 'Due Date', type: 'date' }
    ]
};

// 2. Component Configuration
const todoConfig = {
    list: {
        itemType: 'todo',
        itemFields: ['text', 'priority', 'category', 'dueDate'],
        actions: {
            item: ['edit', 'delete'],
            bulk: ['delete', 'complete'],
            global: ['add']
        },
        enableToggle: false, // Explicitly disable auto-toggle
        enableSearch: true,
        enableFilters: true,
        enableSorting: true
    },
    todo: {
        enableUndo: true,
        undoTimeout: 5000,
        maxTodoLength: 500
    }
};

// 3. Enhanced Component
const todoList = createTodoListComponent(element, data, todoConfig);
```

### Key Features Implemented

1. **Mobile-Optimized UI**: Large touch targets, responsive design
2. **Smart Undo System**: 5-second grace period with toast notifications
3. **Advanced Modal System**: Form pre-population, validation, accessibility
4. **Optimistic Updates**: Instant feedback with error handling
5. **Schema-Driven Configuration**: Automatic feature detection
6. **Secure Backend Integration**: XSS protection, input validation

### Lessons Learned

1. **Auto-Detection Can Override Config**: Need explicit `enableToggle: false`
2. **Modal Button Configuration**: Proper type configuration is critical
3. **Form Pre-population**: Map `initialData` to `formData` for compatibility
4. **Mobile Touch Experience**: 44px+ touch targets are essential
5. **Debug Instrumentation**: Comprehensive logging for troubleshooting

## 🎯 Best Practices

### Development Best Practices

1. **Always Follow Inheritance Pattern**: Use the exact constructor/init pattern
2. **Configuration Over Code**: Make everything configurable
3. **Progressive Enhancement**: Start minimal, add features incrementally
4. **Security First**: Sanitize all inputs, validate all actions
5. **Mobile First**: Design for touch, enhance for desktop
6. **Test Real Scenarios**: Use actual data, test edge cases

### Performance Best Practices

1. **Efficient DOM Updates**: Use innerHTML for bulk changes
2. **Event Delegation**: Use single event listeners with delegation
3. **Debounced Input**: Debounce search and input handlers
4. **Optimistic Updates**: Show immediate feedback, handle errors gracefully
5. **Resource Bundling**: Combine CSS/JS files for production

### Security Best Practices

1. **Input Validation**: Validate on client AND server
2. **XSS Prevention**: Always sanitize user content
3. **CSP Compliance**: No eval(), no external scripts
4. **Rate Limiting**: Prevent abuse with request throttling
5. **Secure Defaults**: Fail secure, require explicit permissions

## 🚀 Future Roadmap

### Short-term Enhancements

1. **Advanced Modal Types**: File uploads, multi-step forms
2. **Real-time Updates**: WebSocket integration for live data
3. **Offline Support**: Service worker caching
4. **Enhanced Accessibility**: Screen reader optimization
5. **Performance Monitoring**: Built-in performance metrics

### Long-term Vision

1. **Component Marketplace**: Reusable component library
2. **Visual Builder**: Drag-and-drop UI builder
3. **Theme System**: Complete theming architecture
4. **Multi-language Support**: I18n framework
5. **Enterprise Features**: Advanced security, audit trails

## 📚 Quick Reference

### Component Initialization
```javascript
// Simple component
const list = new ListComponent(element, data, config);

// Enhanced component
const todoList = createTodoListComponent(element, data, config);

// Schema-driven
const components = MCP.initFromSchema(schema, data, config);
```

### Configuration Examples
```javascript
// Minimal config
const config = { list: { itemFields: ['text'] } };

// Full-featured config
const config = {
    list: {
        itemFields: ['text', 'priority', 'category'],
        actions: { item: ['edit', 'delete'], global: ['add'] },
        enableSearch: true,
        enableFilters: true,
        enableSorting: true,
        enableBulkActions: true
    },
    todo: {
        enableUndo: true,
        undoTimeout: 5000
    }
};
```

### Security Patterns
```javascript
// Safe HTML rendering
this.html`<div>${userInput}</div>` // Automatically sanitized

// Input validation
const clean = this.sanitize(userInput);
const validated = this.validateInput(clean);

// Action validation
if (!this.isValidAction(action)) return;
if (this.isRateLimited()) return;
```

This design document represents the culmination of real-world experience building MCP Web UIs. It provides a solid foundation for creating secure, maintainable, and user-friendly web interfaces for any MCP server implementation. 