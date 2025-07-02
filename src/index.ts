// Main exports
export { MCPWebUI } from './MCPWebUI.js';

// Legacy UIServer removed - use GenericUIServer instead

// New Modular Architecture (recommended)
export { GenericUIServer } from './server/GenericUIServer.js';
export { UIServerConfig, UIServerConfigBuilder, DEFAULT_UI_SERVER_CONFIG } from './server/UIServerConfig.js';
export { ResourceManager } from './server/ResourceManager.js';
export { TemplateEngine } from './server/TemplateEngine.js';

// Session management
export { SessionManager } from './session/SessionManager.js';

// Type definitions
export * from './types/index.js';

// Utility functions for common UI schemas
export const createTodoSchema = (title = "Todo List"): any => ({
    title,
    description: "Manage your tasks with checkboxes",
    components: [{
        type: "list",
        id: "todo-list",
        title: "Tasks",
        config: {
            fields: [
                { key: "id", label: "ID", type: "text" },
                { key: "text", label: "Task", type: "text" },
                { key: "completed", label: "Done", type: "checkbox", editable: true },
                { key: "priority", label: "Priority", type: "badge" },
                { key: "category", label: "Category", type: "text" },
                { key: "createdAt", label: "Created", type: "date" }
            ],
            sortable: true,
            filterable: true
        }
    }],
    actions: [
        {
            id: "toggle",
            label: "Toggle Complete",
            type: "inline",
            handler: "toggle"
        }
    ],
    polling: {
        enabled: true,
        intervalMs: 2000
    }
});

export const createSimpleListSchema = (
    title: string,
    fields: Array<{ key: string, label: string, type: string }>
): any => ({
    title,
    components: [{
        type: "list",
        id: "simple-list",
        config: { fields }
    }],
    polling: {
        enabled: true,
        intervalMs: 2000
    }
}); 