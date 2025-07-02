# Scheduled Tasks Web UI Implementation Plan

## 📋 Overview

This plan implements a comprehensive web UI for scheduled tasks management, building on the todoodles implementation pattern while adding advanced features for complex scheduling, real-time monitoring, and execution tracking.

## 🏗️ Architecture Split

### Framework Components (Reusable)
- **DashboardComponent**: Stats panels and metrics display
- **StatusComponent**: Generic status badges and indicators  
- **ScheduleDisplayComponent**: Display scheduling patterns (adaptable for any scheduling)
- **Enhanced ListComponent**: Advanced filtering, sorting, custom field types

### Scheduled-Tasks Specific
- **ScheduledTasksWebUIManager**: Integration layer with TaskManager
- **Task-specific UI schema**: Scheduled tasks field definitions and actions
- **Custom formatters**: Task-specific data formatting

---

## 🚀 Implementation Steps

### Step 1: Framework Components Development

#### 1.1 Create DashboardComponent (Framework)
**File**: `mcp-web-ui-standalone/src/vanilla/components/DashboardComponent.js`

```javascript
/**
 * Reusable dashboard component for displaying metrics and stats
 * Used by: scheduled-tasks, future MCP servers needing overview panels
 */
class DashboardComponent extends BaseComponent {
    constructor(element, data, config) {
        const componentConfig = {
            layout: 'grid', // 'grid' | 'horizontal' | 'vertical'
            columns: 4,
            showIcons: true,
            animateCounters: true,
            ...config.dashboard
        };
        
        super(element, data, config);
        this.componentConfig = componentConfig;
    }

    render() {
        if (this.isDestroyed) return;

        this.element.innerHTML = this.html`
            <div class="component component-dashboard layout-${this.componentConfig.layout}">
                <div class="dashboard-grid" style="grid-template-columns: repeat(${this.componentConfig.columns}, 1fr)">
                    ${this.trustedHtml(this.data.map(metric => this.renderMetric(metric)).join(''))}
                </div>
            </div>
        `;
    }

    renderMetric(metric) {
        return `
            <div class="metric-card ${metric.trend || ''}" data-metric="${metric.key}">
                ${this.componentConfig.showIcons ? `<div class="metric-icon">${metric.icon || '📊'}</div>` : ''}
                <div class="metric-content">
                    <div class="metric-value" data-value="${metric.value}">${metric.value}</div>
                    <div class="metric-label">${metric.label}</div>
                    ${metric.subtitle ? `<div class="metric-subtitle">${metric.subtitle}</div>` : ''}
                </div>
            </div>
        `;
    }
}
```

#### 1.2 Create StatusComponent (Framework)
**File**: `mcp-web-ui-standalone/src/vanilla/components/StatusComponent.js`

```javascript
/**
 * Generic status display component
 * Handles status badges, progress indicators, and state visualization
 */
class StatusComponent extends BaseComponent {
    constructor(element, data, config) {
        const componentConfig = {
            showIcon: true,
            showProgress: false,
            statusMap: {}, // Custom status mappings
            ...config.status
        };
        
        super(element, data, config);
        this.componentConfig = componentConfig;
    }

    render() {
        if (this.isDestroyed) return;

        this.element.innerHTML = this.html`
            <div class="component component-status">
                ${this.trustedHtml(this.renderStatus())}
                ${this.componentConfig.showProgress ? this.trustedHtml(this.renderProgress()) : ''}
            </div>
        `;
    }

    renderStatus() {
        const status = this.data.status || this.data;
        const config = this.getStatusConfig(status);
        
        return `
            <span class="status-badge ${config.class}" title="${config.description || config.label}">
                ${this.componentConfig.showIcon ? config.icon : ''} ${config.label}
            </span>
        `;
    }

    getStatusConfig(status) {
        // Allow custom status mappings via config
        if (this.componentConfig.statusMap[status]) {
            return this.componentConfig.statusMap[status];
        }
        
        // Default mappings
        const defaults = {
            'active': { class: 'status-active', icon: '✅', label: 'Active' },
            'inactive': { class: 'status-inactive', icon: '⏸️', label: 'Inactive' },
            'pending': { class: 'status-pending', icon: '⏳', label: 'Pending' },
            'running': { class: 'status-running', icon: '🏃', label: 'Running' },
            'completed': { class: 'status-completed', icon: '✅', label: 'Completed' },
            'failed': { class: 'status-failed', icon: '❌', label: 'Failed' }
        };
        
        return defaults[status] || { class: 'status-unknown', icon: '❓', label: status };
    }
}
```

#### 1.3 Create ScheduleDisplayComponent (Framework) 
**File**: `mcp-web-ui-standalone/src/vanilla/components/ScheduleDisplayComponent.js`

```javascript
/**
 * Generic schedule display component
 * Handles various scheduling patterns with human-readable formatting
 */
class ScheduleDisplayComponent extends BaseComponent {
    constructor(element, data, config) {
        const componentConfig = {
            showIcon: true,
            showFrequency: true,
            dateFormat: 'short', // 'short' | 'long' | 'relative'
            ...config.schedule
        };
        
        super(element, data, config);
        this.componentConfig = componentConfig;
    }

    render() {
        if (this.isDestroyed) return;

        const schedule = this.data.schedule || this.data;
        
        this.element.innerHTML = this.html`
            <div class="component component-schedule">
                ${this.componentConfig.showIcon ? this.trustedHtml(this.renderIcon(schedule)) : ''}
                ${this.trustedHtml(this.renderDescription(schedule))}
                ${this.componentConfig.showFrequency ? this.trustedHtml(this.renderFrequency(schedule)) : ''}
            </div>
        `;
    }

    renderIcon(schedule) {
        const icons = {
            'once': '⏰', 'scheduled': '📅', 'interval': '🔄',
            'daily': '📆', 'weekly': '📊', 'monthly': '📋'
        };
        
        return `<span class="schedule-icon">${icons[schedule.type] || '❓'}</span>`;
    }

    renderDescription(schedule) {
        const text = this.generateHumanReadable(schedule);
        return `<span class="schedule-description">${text}</span>`;
    }

    generateHumanReadable(schedule) {
        // Extensible schedule formatting - can be overridden
        switch (schedule.type) {
            case 'once':
                return `In ${schedule.delayMinutes} minutes`;
            case 'scheduled':
                return `At ${this.formatDate(schedule.datetime)}`;
            case 'daily':
                return `Daily at ${schedule.time}${schedule.weekdaysOnly ? ' (weekdays)' : ''}`;
            // Add more patterns as needed
            default:
                return JSON.stringify(schedule);
        }
    }
}
```

#### 1.4 Update MCPFramework.js (Framework)
**File**: `mcp-web-ui-standalone/src/vanilla/MCPFramework.js`

```javascript
// Add new component factories
MCP.Dashboard = function (selector, data = [], config = {}) {
    const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!element) {
        console.error('MCP.Dashboard: Element not found:', selector);
        return null;
    }
    
    const mergedConfig = MCP.utils.mergeConfig(MCP.defaults, config);
    const component = new DashboardComponent(element, data, mergedConfig);
    MCP.registerComponent(element.id || 'dashboard-' + Date.now(), component);
    return component;
};

MCP.Status = function (selector, data = [], config = {}) {
    // Similar implementation
};

MCP.ScheduleDisplay = function (selector, data = [], config = {}) {
    // Similar implementation
};

// Update initFromSchema to handle new component types
MCP.initFromSchema = function(schema, initialData, globalConfig) {
    // ... existing code ...
    
    switch (componentDef.type) {
        case 'list':
            component = MCP.TodoList(element, componentData, componentConfig);
            break;
        case 'dashboard':
            component = MCP.Dashboard(element, componentData, componentConfig);
            break;
        case 'status':
            component = MCP.Status(element, componentData, componentConfig);
            break;
        case 'schedule':
            component = MCP.ScheduleDisplay(element, componentData, componentConfig);
            break;
        // ... other cases
    }
};
```

### Step 2: Scheduled Tasks Integration

#### 2.1 Create Web UI Integration Manager
**File**: `Sizzek/mcp-servers/scheduled-tasks/src/web-ui-integration.ts`

```typescript
import { MCPWebUI, UISchema } from 'mcp-web-ui';
import { Task, TaskStatus } from './types/index.js';
import { TaskManager } from './core/task-manager.js';

export class ScheduledTasksWebUIManager {
    private webUI: MCPWebUI<Task>;

    constructor(
        private taskManager: TaskManager,
        private enableLogging = true
    ) {
        const schema = this.createScheduledTasksUISchema();
        
        this.webUI = new MCPWebUI<Task>({
            dataSource: this.getDataSource.bind(this),
            schema,
            onUpdate: this.handleUIUpdate.bind(this),
            sessionTimeout: 30 * 60 * 1000,
            pollInterval: 5000,
            enableLogging: this.enableLogging
        });
    }

    getMCPToolDefinition() {
        return this.webUI.getMCPToolDefinition();
    }

    async handleGetWebUI(userId?: string) {
        return this.webUI.handleGetWebUI(userId);
    }

    private createScheduledTasksUISchema(): UISchema {
        return {
            title: "Scheduled Tasks Dashboard",
            description: "Monitor and manage your scheduled tasks",
            components: [
                {
                    type: "dashboard",
                    id: "task-overview",
                    title: "System Overview",
                    config: {
                        columns: 4,
                        showIcons: true
                    }
                },
                {
                    type: "list",
                    id: "tasks-list",
                    title: "Active Tasks",
                    config: {
                        fields: [
                            { key: "name", label: "Task Name", type: "text", width: "25%" },
                            { 
                                key: "schedule", 
                                label: "Schedule", 
                                type: "schedule-display",
                                width: "20%"
                            },
                            { 
                                key: "status", 
                                label: "Status", 
                                type: "status",
                                width: "15%"
                            },
                            { 
                                key: "nextRun", 
                                label: "Next Run", 
                                type: "datetime",
                                width: "15%"
                            },
                            { 
                                key: "successRate", 
                                label: "Success Rate", 
                                type: "progress",
                                width: "15%"
                            }
                        ],
                        sortable: true,
                        filterable: true,
                        filters: [
                            {
                                key: "status",
                                type: "select",
                                options: Object.values(TaskStatus)
                            }
                        ]
                    }
                }
            ],
            actions: [
                { id: "toggle-enabled", label: "Enable/Disable", type: "inline", handler: "toggle" },
                { id: "run-now", label: "Run Now", type: "inline", handler: "run-now", confirm: true },
                { id: "delete", label: "Delete", type: "inline", handler: "delete", confirm: true }
            ]
        };
    }

    private async getDataSource(): Promise<{tasks: Task[], stats: any}> {
        const tasks = this.taskManager.getAllTasks();
        const stats = this.calculateStats(tasks);
        
        return {
            tasks,
            stats: [
                { key: "total", label: "Total Tasks", value: stats.total, icon: "📋" },
                { key: "active", label: "Active", value: stats.active, icon: "▶️" },
                { key: "scheduled", label: "Scheduled", value: stats.scheduled, icon: "⏰" },
                { key: "failed", label: "Failed", value: stats.failed, icon: "❌" }
            ]
        };
    }

    private calculateStats(tasks: Task[]) {
        return {
            total: tasks.length,
            active: tasks.filter(t => t.enabled).length,
            scheduled: tasks.filter(t => t.status === TaskStatus.SCHEDULED).length,
            failed: tasks.filter(t => t.status === TaskStatus.FAILED).length
        };
    }

    private async handleUIUpdate(action: string, data: any): Promise<any> {
        switch (action) {
            case 'toggle':
                if (data.enabled) {
                    await this.taskManager.enableTask(data.id);
                } else {
                    await this.taskManager.disableTask(data.id);
                }
                return { success: true };

            case 'delete':
                await this.taskManager.deleteTask(data.id);
                return { success: true };

            case 'run-now':
                // Implement immediate execution
                return { success: true, message: 'Task executed immediately' };

            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }
}
```

#### 2.2 Update Main Server Integration
**File**: `Sizzek/mcp-servers/scheduled-tasks/src/index.ts`

```typescript
// Add after TaskManager initialization
import { ScheduledTasksWebUIManager } from './web-ui-integration.js';

const webUIManager = new ScheduledTasksWebUIManager(taskManager);

// Add to tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    // ... existing handlers ...
    
    if (request.params.name === "get_web_ui") {
        const userId = extractUserId(request);
        return await webUIManager.handleGetWebUI(userId);
    }
});

// Add to tools list
const tools = [
    // ... existing tools ...
    webUIManager.getMCPToolDefinition()
];
```

### Step 3: Enhanced Styling

#### 3.1 Update CSS Framework
**File**: `mcp-web-ui-standalone/templates/static/styles.css`

```css
/* Dashboard Component Styles */
.component-dashboard .dashboard-grid {
    display: grid;
    gap: 1rem;
    margin-bottom: 1rem;
}

.metric-card {
    background: white;
    border: 1px solid #e1e5e9;
    border-radius: 8px;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    transition: all 0.2s ease;
}

.metric-card:hover {
    border-color: #007bff;
    box-shadow: 0 2px 8px rgba(0,123,255,0.1);
}

.metric-icon {
    font-size: 1.5rem;
    opacity: 0.8;
}

.metric-value {
    font-size: 1.5rem;
    font-weight: 600;
    color: #2c3e50;
}

.metric-label {
    font-size: 0.875rem;
    color: #6c757d;
    margin-top: 0.25rem;
}

/* Status Component Styles */
.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: 1rem;
    font-size: 0.875rem;
    font-weight: 500;
}

.status-pending { background: #fff3cd; color: #856404; }
.status-scheduled { background: #cce5ff; color: #004085; }
.status-running { background: #fff3e0; color: #e65100; }
.status-completed { background: #d4edda; color: #155724; }
.status-failed { background: #f8d7da; color: #721c24; }
.status-paused { background: #e2e3e5; color: #383d41; }

/* Schedule Display Styles */
.component-schedule {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.schedule-icon {
    font-size: 1.1rem;
    opacity: 0.8;
}

.schedule-description {
    font-size: 0.875rem;
    color: #495057;
}
```

---

## 🧪 Testing Plan

### Phase 1: Framework Component Testing

#### 1.1 Unit Tests for New Components
**File**: `mcp-web-ui-standalone/tests/components/DashboardComponent.test.js`

```javascript
describe('DashboardComponent', () => {
    let container, component;
    
    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });
    
    afterEach(() => {
        if (component) component.destroy();
        document.body.removeChild(container);
    });
    
    test('renders dashboard metrics correctly', () => {
        const testData = [
            { key: 'total', label: 'Total', value: 10, icon: '📊' },
            { key: 'active', label: 'Active', value: 8, icon: '✅' }
        ];
        
        component = new DashboardComponent(container, testData, {});
        
        expect(container.querySelectorAll('.metric-card')).toHaveLength(2);
        expect(container.querySelector('[data-metric="total"] .metric-value')).toHaveTextContent('10');
    });
    
    test('handles empty data gracefully', () => {
        component = new DashboardComponent(container, [], {});
        expect(container.querySelector('.dashboard-grid')).toBeEmpty();
    });
});
```

#### 1.2 Integration Tests
**File**: `mcp-web-ui-standalone/tests/integration/scheduled-tasks.test.js`

```javascript
describe('Scheduled Tasks Integration', () => {
    test('full UI schema initialization', async () => {
        const schema = {
            components: [
                { type: 'dashboard', id: 'stats' },
                { type: 'list', id: 'tasks' }
            ]
        };
        
        const result = MCP.initFromSchema(schema, mockData, {});
        
        expect(result.components).toHaveLength(2);
        expect(result.components[0]).toBeInstanceOf(DashboardComponent);
    });
});
```

### Phase 2: Scheduled Tasks Testing

#### 2.1 Web UI Manager Tests
**File**: `Sizzek/mcp-servers/scheduled-tasks/tests/web-ui-integration.test.ts`

```typescript
describe('ScheduledTasksWebUIManager', () => {
    let taskManager: TaskManager;
    let webUIManager: ScheduledTasksWebUIManager;
    
    beforeEach(async () => {
        taskManager = new TaskManager();
        await taskManager.initialize();
        webUIManager = new ScheduledTasksWebUIManager(taskManager);
    });
    
    test('generates correct UI schema', () => {
        const definition = webUIManager.getMCPToolDefinition();
        expect(definition.name).toBe('get_web_ui');
        expect(definition.description).toContain('Scheduled Tasks Dashboard');
    });
    
    test('handles task toggle action', async () => {
        const task = await taskManager.createTask({
            name: 'Test Task',
            schedule: { type: 'once', delayMinutes: 1 },
            message: 'Test'
        });
        
        const result = await webUIManager.handleUIUpdate('toggle', {
            id: task.id,
            enabled: false
        });
        
        expect(result.success).toBe(true);
        expect(taskManager.getTask(task.id)?.enabled).toBe(false);
    });
});
```

### Phase 3: End-to-End Testing

#### 3.1 Browser Testing
**File**: `mcp-web-ui-standalone/tests/e2e/scheduled-tasks-ui.test.js`

```javascript
describe('Scheduled Tasks UI E2E', () => {
    beforeEach(async () => {
        await page.goto('http://localhost:3000/test-scheduled-tasks');
    });
    
    test('displays dashboard metrics', async () => {
        await page.waitForSelector('.component-dashboard');
        
        const totalTasks = await page.textContent('[data-metric="total"] .metric-value');
        expect(totalTasks).toBe('5');
        
        const activeTasks = await page.textContent('[data-metric="active"] .metric-value');
        expect(activeTasks).toBe('3');
    });
    
    test('toggle task enable/disable', async () => {
        await page.click('[data-action="toggle"][data-id="task-1"]');
        
        await page.waitForSelector('.status-paused');
        expect(await page.textContent('.status-badge')).toContain('Paused');
    });
    
    test('real-time updates work', async () => {
        const initialNextRun = await page.textContent('.next-run-time');
        
        // Wait for polling interval
        await page.waitForTimeout(6000);
        
        const updatedNextRun = await page.textContent('.next-run-time');
        expect(updatedNextRun).not.toBe(initialNextRun);
    });
});
```

### Phase 4: Performance Testing

#### 4.1 Load Testing
**File**: `mcp-web-ui-standalone/tests/performance/polling.test.js`

```javascript
describe('Performance Tests', () => {
    test('handles frequent polling updates', async () => {
        const startTime = performance.now();
        
        // Simulate 100 polling updates
        for (let i = 0; i < 100; i++) {
            await component.update(generateMockData(50)); // 50 tasks
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        const endTime = performance.now();
        expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
    });
});
```

---

## 📝 Implementation Checklist

### Framework Components
- [ ] Create `DashboardComponent.js`
- [ ] Create `StatusComponent.js` 
- [ ] Create `ScheduleDisplayComponent.js`
- [ ] Update `MCPFramework.js` with new component factories
- [ ] Update `UIServer.ts` to include new components
- [ ] Add CSS styles for new components
- [ ] Write unit tests for each component

### Scheduled Tasks Integration
- [ ] Create `web-ui-integration.ts`
- [ ] Update main `index.ts` to include web UI tool
- [ ] Add package.json dependency on `mcp-web-ui`
- [ ] Write integration tests
- [ ] Update README with web UI usage

### Testing Infrastructure
- [ ] Set up Jest for framework component testing
- [ ] Set up Playwright for E2E testing
- [ ] Create test data generators
- [ ] Set up CI/CD pipeline for automated testing
- [ ] Performance benchmarking setup

### Documentation
- [ ] Update component creation guide
- [ ] Create scheduled tasks web UI user guide
- [ ] API documentation for new components
- [ ] Integration examples and best practices

This plan provides a clear roadmap for building a robust, reusable, and well-tested web UI system for scheduled tasks while contributing valuable components back to the framework. 