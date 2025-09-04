# MCP Web UI - Vanilla JavaScript Framework

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JS-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Size](https://img.shields.io/badge/Bundle_Size-2--3KB-green.svg)](https://github.com/Drakosfire/mcp-web-ui-standalone)
[![CSP](https://img.shields.io/badge/CSP-Compliant-blue.svg)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

**Ultra-Lightweight, Disposable Web UI Framework for MCP Servers**

A revolutionary vanilla JavaScript framework built from scratch for MCP (Model Context Protocol) servers. Zero dependencies, perfect security, and ultra-lightweight - designed to be copied, pasted, and customized for any use case.

---

## 🚀 **Why Vanilla JS?**

After extensive development with Alpine.js and other frameworks, we rebuilt from scratch with vanilla JavaScript to achieve:

- **🪶 Ultra-Lightweight**: 2-3KB total bundle size (vs 8KB+ frameworks)
- **🔒 Perfect Security**: CSP-compliant with built-in XSS protection  
- **⚡ Zero Dependencies**: No external libraries, no supply chain risks
- **🤖 AI-Friendly**: Extensively documented for AI agent implementation
- **🗂️ Disposable**: Easy to copy-paste and modify for any use case
- **⚙️ No Build Process**: Write JavaScript, serve JavaScript, done

---

## 🎯 **Quick Start**

### Copy & Paste Integration

No installation required! Just copy the framework files and start building:

```javascript
// 1. Include the framework
<script nonce="{nonce}" src="/static/mcp-framework.js"></script>

// 2. Initialize a todo list
<script nonce="{nonce}">
const todoList = MCP.TodoList('#todo-container', [
    { id: 1, text: "Learn vanilla JS", completed: false, priority: "high" },
    { id: 2, text: "Build awesome UI", completed: false, priority: "medium" }
], {
    sessionToken: 'your-session-token',
    pollInterval: 2000
});
</script>
```

### Schema-Driven Initialization

Perfect for AI agents that need to generate UIs dynamically:

```javascript
// AI generates this schema based on data structure
const schema = {
    title: "User Management Dashboard",
    components: [
        {
            type: "stats",
            id: "user-stats",
            config: {
                metrics: [
                    { key: "total_users", label: "Total Users", icon: "👥" },
                    { key: "active_today", label: "Active Today", icon: "🟢" }
                ]
            }
        },
        {
            type: "table", 
            id: "user-table",
            config: {
                fields: [
                    { key: "name", label: "Name", type: "text", sortable: true },
                    { key: "email", label: "Email", type: "text" },
                    { key: "status", label: "Status", type: "badge" }
                ],
                sortable: true,
                filterable: true
            }
        }
    ]
};

// Initialize from schema with port configuration
const components = MCP.initFromSchema(schema, initialData, {
    ...config,
    portRange: [11000, 12000], // Custom port range
    blockedPorts: [11434] // Block specific ports (e.g., Ollama)
});
```

---

## 🏗️ **Framework Architecture**

### **Core Layer**
- **BaseComponent.js**: Foundation with security, templating, and events
- Built-in XSS protection through automatic sanitization
- Rate limiting and input validation
- Smart DOM diffing for efficient updates

### **Component Layer**  
- **TodoListComponent.js**: Advanced todo list with undo functionality
- **TableComponent.js**: Feature-rich data table with sorting, filtering, pagination
- **StatsComponent.js**: Statistics display with animations and trends

### **Framework Layer**
- **MCPFramework.js**: Component factory and initialization system
- Schema-driven UI generation
- Global utilities and session management

### **Server Layer**
- **UIServer.ts**: Enhanced server with perfect CSP compliance
- Secure template rendering
- API endpoints with comprehensive validation

---

## 🔒 **Built-in Security Features**

### Perfect CSP Compliance

The framework generates perfect CSP headers with zero violations:

```http
Content-Security-Policy: default-src 'self'; 
  script-src 'self' 'nonce-{nonce}'; 
  style-src 'self' 'unsafe-inline'; 
  connect-src 'self';
```

- No `eval()` or `Function()` constructor usage
- No inline scripts without nonces  
- No external dependencies
- No runtime compilation

### Automatic XSS Protection

All user content is automatically sanitized:

```javascript
// Automatic sanitization in templates
this.html`<div>${userInput}</div>` // userInput is automatically escaped

// Advanced LLM content sanitization
sanitizeLLMContent(content, 'todo-text') // Context-aware cleaning
sanitizeLLMContent(content, 'category')  // Different rules per context
```

### Rate Limiting & Input Validation

```javascript
// Intelligent rate limiting - protects APIs without blocking UI
isRateLimited()           // Applied to API calls only (10 calls per 5 seconds)
sanitizeActionData(data)  // Cleans all user input
validateEvents()          // Ensures event authenticity

// Rate limiting configuration
const config = {
    rateLimitWindow: 5000,      // 5 second window
    maxActionsPerWindow: 10,    // 10 API calls per window
    security: {
        enableRateLimit: true   // Enable for production
    }
};
```

**Improved Rate Limiting (v1.0.5)**:
- ✅ UI interactions (button clicks, typing) are never rate limited
- ✅ Only API calls are rate limited to prevent server abuse  
- ✅ Reasonable limits: 10 API calls per 5 seconds
- ✅ No more "Action rate limited" errors during normal usage

---

## 🎨 **Available Components**

### Todo List Component

```javascript
const todoList = MCP.TodoList('#todo-container', todoData, {
    sessionToken: 'session-token',
    todo: {
        enableUndo: true,
        maxTodoLength: 500,
        allowCategories: true
    }
});
```

### Data Table Component

```javascript
const table = MCP.Table('#data-table', tableData, {
    sessionToken: 'session-token',  
    table: {
        columns: [
            { key: 'name', label: 'Name', type: 'text', sortable: true },
            { key: 'email', label: 'Email', type: 'text', sortable: true },
            { key: 'status', label: 'Status', type: 'badge', 
              badgeConfig: { colorMap: { active: 'green', inactive: 'red' } } },
            { key: 'actions', label: 'Actions', type: 'actions',
              actions: [
                { type: 'edit', label: 'Edit', icon: '✏️' },
                { type: 'delete', label: 'Delete', icon: '🗑️' }
              ]
            }
        ],
        sortable: true,
        filterable: true,
        exportable: true
    }
});
```

### Scheduled Tasks Component

Complete task management dashboard with modal form creation:

```javascript
// Schema-driven scheduled tasks interface
const taskSchema = {
    title: "Scheduled Tasks Dashboard",
    components: [
        {
            type: "stats",
            id: "task-overview", 
            config: {
                metrics: [
                    { key: "total_tasks", label: "Total Tasks", icon: "📋" },
                    { key: "active_tasks", label: "Active", icon: "🟢" },
                    { key: "completed_today", label: "Completed Today", icon: "✅" }
                ]
            }
        },
        {
            type: "table",
            id: "tasks-list",
            config: {
                fields: [
                    { key: "name", label: "Task Name", type: "text", sortable: true },
                    { key: "schedule", label: "Schedule", type: "text" },
                    { key: "status", label: "Status", type: "badge" },
                    { key: "nextRun", label: "Next Run", type: "datetime" },
                    { key: "actions", label: "Actions", type: "actions" }
                ]
            }
        }
    ],
    actions: [
        { id: "create-task", type: "button", label: "Create New Task", icon: "➕" },
        { id: "toggle-enabled", type: "inline", handler: "toggle" },
        { id: "run-now", type: "inline", handler: "run-now" },
        { id: "delete", type: "inline", handler: "delete" }
    ]
};

// Initialize the dashboard
const components = MCP.initFromSchema(taskSchema, taskData, {
    sessionToken: 'session-token',
    pollInterval: 5000
});
```

### Statistics Component

```javascript
const stats = MCP.Stats('#stats-container', statsData, {
    sessionToken: 'session-token',
    stats: {
        metrics: [
            { key: 'total', label: 'Total Items', icon: '📊', color: 'blue' },
            { key: 'completed', label: 'Completed', icon: '✅', color: 'green' },
            { key: 'revenue', label: 'Revenue', icon: '💰', color: 'yellow', 
              type: 'currency', currency: 'USD' }
        ],
        showTrends: true,
        animate: true
    }
});
```

### Modal Form System

Built-in modal interface for data input with validation:

```javascript
// TableComponent automatically handles modal forms when actions are defined
const tableWithForms = MCP.Table('#data-table', data, {
    sessionToken: 'session-token',
    table: {
        // Form fields for modal creation
        formFields: [
            { key: 'name', label: 'Task Name', type: 'text', required: true },
            { key: 'description', label: 'Description', type: 'textarea' },
            { key: 'schedule_type', label: 'Schedule Type', type: 'select', 
              options: ['once', 'daily', 'weekly', 'monthly'] },
            { key: 'schedule_date', label: 'Date', type: 'date', required: true }
        ],
        // Modal configuration
        modal: {
            title: 'Create New Task',
            submitText: 'Create Task',
            cancelText: 'Cancel',
            validation: true,
            backdrop: true
        }
    }
});
```

Features:
- **Field Validation**: Real-time validation with error messages
- **Multiple Field Types**: text, textarea, select, date, number
- **Keyboard Navigation**: ESC to close, Tab navigation
- **Backdrop Click**: Close modal by clicking outside
- **Loading States**: Visual feedback during submission
- **Error Handling**: Graceful error display and recovery

---

## 🛠️ **Server Integration**

### Using UIServer

```typescript
import { UIServer } from './server/UIServer.js';

// The server now uses vanilla JS instead of Alpine.js
const uiServer = new UIServer(
    session,
    schema,
    dataSource,
    onUpdate,
    pollInterval,
    bindAddress
);
```

### Port Configuration

The framework supports flexible port configuration to avoid conflicts:

```typescript
import { MCPWebUI } from 'mcp-web-ui';

const webUI = new MCPWebUI({
    dataSource: myDataSource,
    schema: mySchema,
    onUpdate: myUpdateHandler,
    portRange: [11000, 12000], // Custom port range
    blockedPorts: [11434, 3000], // Block specific ports (e.g., Ollama, default apps)
    baseUrl: 'https://dev.sizzek.dungeonmind.net'
});
```

**Environment Variables**:
```bash
# Set port range
MCP_WEB_UI_PORT_MIN=11000
MCP_WEB_UI_PORT_MAX=12000

# Block specific ports (comma-separated)
MCP_WEB_UI_BLOCKED_PORTS=11434,3000,8080
```

### API Endpoints

The server provides these secure endpoints:

- `GET /` - Main UI page with vanilla JS framework
- `GET /api/data` - Fetch current data (with polling)
- `POST /api/update` - Handle user actions
- `POST /api/extend-session` - Extend session duration
- `GET /api/health` - Health check  
- `GET /static/mcp-framework.js` - Combined framework bundle

---

## 🎯 **Perfect for AI Agents**

### Schema-Driven UI Generation

AI agents can easily generate dynamic UIs:

```javascript
// AI generates schema based on data structure
const schema = {
    title: "Dynamic Dashboard",
    components: [
        {
            type: "stats",
            id: "metrics",
            config: { /* AI-generated config */ }
        },
        {
            type: "table",
            id: "data-grid", 
            config: { /* AI-generated table config */ }
        }
    ]
};

// Framework handles the rest
MCP.initFromSchema(schema, data, config);
```

### Component Composition

```javascript
// Create multiple components that work together
const statsComponent = MCP.Stats('#dashboard-stats', statsData, config);
const tableComponent = MCP.Table('#user-table', userData, config);
const todoComponent = MCP.TodoList('#task-list', taskData, config);

// They automatically sync via the polling system
```

### Event-Driven Interactions

```javascript
// Components communicate through global event bus
MCP.events.emit('user-selected', { userId: 123 });

MCP.events.on('user-selected', (data) => {
    // Other components can react to events
    console.log('User selected:', data.userId);
});
```

---

## 🔧 **Customization**

### Creating Custom Components

Extend BaseComponent for custom functionality:

```javascript
class CustomComponent extends BaseComponent {
    constructor(element, data, config) {
        super(element, data, config);
    }
    
    render() {
        this.element.innerHTML = this.html`
            <div class="my-component">
                <h2>${this.config.title}</h2>
                ${this.data.map(item => this.html`
                    <div class="item">${item.name}</div>
                `)}
            </div>
        `;
    }
    
    bindEvents() {
        this.on('click', '.item', (e) => {
            this.handleItemClick(e.target.textContent);
        });
    }
}

// Register with framework
MCP.CustomComponent = function(selector, data, config) {
    const element = document.querySelector(selector);
    return new CustomComponent(element, data, config);
};
```

---

## 🚀 **Performance Features**

### Smart Polling

Components only poll when the page is visible:

```javascript
// Built into BaseComponent
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        this.fetchData(); // Immediate refresh when page becomes visible
    }
});
```

### Efficient DOM Updates

Only updates when data actually changes:

```javascript
// Smart diffing in BaseComponent.update()
const newDataHash = this.hashData(newData);
if (newDataHash !== this.lastDataHash) {
    this.data = newData;
    this.render(); // Only render if data changed
}
```

### Ultra-Small Bundle

The server combines all framework files into a single 2-3KB request with automatic minification and compression.

---

## 📖 **API Reference**

### MCP Global Object

```javascript
MCP.TodoList(selector, data, config)     // Create todo list
MCP.Table(selector, data, config)        // Create data table with modal support
MCP.Stats(selector, data, config)        // Create stats display
MCP.initFromHTML(data, config)           // Auto-init from HTML
MCP.initFromSchema(schema, data, config) // Init from schema (recommended)
MCP.getComponent(id)                     // Get component by ID
MCP.destroyComponent(id)                 // Destroy component
MCP.destroyAll()                         // Destroy all components
MCP.events.emit(event, data)             // Global event system
MCP.events.on(event, handler)            // Listen to global events
```

### BaseComponent Methods

```javascript
// Core methods (implement in subclasses)
render()                    // Render component HTML
bindEvents()               // Bind event listeners

// Built-in methods (available in all components)
html`template${var}`       // Secure template rendering
sanitize(string)           // XSS protection
update(newData)            // Smart data updates
on(event, selector, handler) // Secure event binding
handleAction(action, data) // API actions
fetchData()               // Refresh from server
destroy()                 // Cleanup component

// Modal & Form methods (TableComponent)
showModal()               // Display modal form
hideModal()               // Close modal form
validateForm(formData)    // Validate form input
submitForm(formData)      // Submit form to server
resetForm()               // Clear form fields
```

---

## 🔄 **Migration from Alpine.js**

If migrating from the previous Alpine.js version:

1. **Update server**: Use `UIServer` instead of `UIServer`
2. **Update templates**: Remove Alpine.js directives  
3. **Update initialization**: Use `MCP.initFromSchema()` instead of Alpine
4. **Update CSS**: Add vanilla JS framework styles

The vanilla JS version is fully compatible with existing UI schemas - just change the initialization method.

---

## 🎨 **Styling & Theming**

### CSS Architecture

```css
/* Component-specific styles */
.component-stats { /* Stats component styles */ }
.component-table { /* Table component styles */ }
.component-list { /* Todo list styles */ }

/* State classes */
.loading { /* Loading states */ }
.error { /* Error states */ }
.empty { /* Empty states */ }

/* Responsive design */
@media (max-width: 768px) { /* Mobile styles */ }
```

### Dark Mode Support

Built-in dark mode support:

```css
@media (prefers-color-scheme: dark) {
    .component { background: #1e293b; }
    .stat-card { background: #334155; }
}
```

---

## 🔮 **Future Enhancements**

The framework is designed for extensibility:

### Planned Components
- **FormComponent**: Advanced form handling
- **ChartComponent**: Data visualization  
- **TimelineComponent**: Timeline displays
- **CalendarComponent**: Calendar interfaces

### Performance Improvements  
- **WebSocket Support**: Real-time updates without polling
- **Virtual Scrolling**: Handle large datasets efficiently
- **Service Worker**: Offline functionality

---

## 🎯 **Use Cases**

### Task & Project Management
- **Scheduled Tasks**: Automated task management with cron-like scheduling
- **Personal Todo Lists**: Individual task tracking with priorities and categories
- **Team Project Tracking**: Collaborative project management with status updates
- **Goal and Habit Tracking**: Long-term goal monitoring with progress indicators
- **Workflow Management**: Complex workflow automation with conditional logic

### Data Administration
- User management dashboards
- Content management systems
- Inventory tracking
- Customer data management

### Monitoring & Analytics
- System monitoring dashboards
- Performance metrics displays
- Business intelligence interfaces
- Real-time status boards

### Content & Documentation
- Note-taking interfaces
- Document management
- Media libraries
- Knowledge bases

---

## 🔍 **Troubleshooting**

### Debug Mode

Enable detailed logging:

```javascript
const config = {
    enableLogging: true, // Logs all component actions
    security: {
        enableRateLimit: false // Disable for testing
    }
};
```

### Common Issues

**"Action rate limited" errors**: This was fixed in v1.0.5 - update to latest version
```javascript
// Old issue: UI events were rate limited (fixed)
// New behavior: Only API calls are rate limited
const config = {
    security: {
        enableRateLimit: true  // Safe to enable - won't block UI
    }
};
```

**Data Not Updating**: Verify your data source returns fresh data
```javascript
const dataSource = async (userId?: string) => {
    // Don't cache if data changes frequently
    return await database.getLatestData(userId);
};
```

**CSP Violations**: Ensure all scripts use proper nonces
```html
<script nonce="{server-generated-nonce}">
// Your JavaScript code
</script>
```

**Modal Not Showing**: Ensure your table has actions defined in schema
```javascript
const schema = {
    actions: [
        { id: "create-task", type: "button", label: "Create New Task" }
    ]
};
```

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 **Acknowledgments**

- Built for the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) ecosystem
- Inspired by the need for ultra-lightweight, secure, disposable web interfaces
- Designed specifically for AI agent integration and rapid prototyping

---

## 📞 **Support**

- **Issues**: [GitHub Issues](https://github.com/Drakosfire/mcp-web-ui-standalone/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Drakosfire/mcp-web-ui-standalone/discussions)
- **Email**: alan.meigs@gmail.com

---

**Made with ❤️ by Alan Meigs**  
*Last updated: June 26th, 2025* 