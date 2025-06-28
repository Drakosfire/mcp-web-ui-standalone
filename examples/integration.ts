/**
 * Example integration of mcp-web-ui
 * This demonstrates how to use the extracted package in various scenarios
 */

import { MCPWebUI, createTodoSchema, createSimpleListSchema } from '../src/index.js';
import type { UISchema, DataSourceFunction, UpdateHandler } from '../src/types/index.js';

// Example 1: Basic Todo List Integration
export async function createTodoListUI() {
    const getTodos = async (userId?: string) => [
        { id: 1, text: "Learn MCP Web UI", completed: false, priority: "high", category: "Learning", createdAt: new Date() },
        { id: 2, text: "Build awesome interfaces", completed: false, priority: "medium", category: "Development", createdAt: new Date() },
        { id: 3, text: "Deploy to production", completed: false, priority: "high", category: "DevOps", createdAt: new Date() }
    ];

    const handleTodoUpdate = async (action: string, data: any, userId: string) => {
        console.log(`User ${userId} performed action ${action} on:`, data);

        switch (action) {
            case 'toggle':
                // Toggle completion status
                return { success: true, message: `Todo ${data.id} toggled` };
            case 'create':
                // Create new todo
                return { success: true, message: 'Todo created', data: { id: Date.now(), ...data } };
            case 'delete':
                // Delete todo
                return { success: true, message: `Todo ${data.id} deleted` };
            default:
                return { success: false, error: 'Unknown action' };
        }
    };

    const todoUI = new MCPWebUI({
        schema: createTodoSchema("My Awesome Todo List"),
        dataSource: getTodos,
        onUpdate: handleTodoUpdate,
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        pollInterval: 2000 // Update every 2 seconds
    });

    return todoUI;
}

// Example 2: Admin Dashboard
export async function createAdminDashboard() {
    const adminSchema: UISchema = {
        title: "Admin Dashboard",
        description: "Manage users and system metrics",
        components: [
            {
                type: "stats",
                id: "system-stats",
                title: "System Metrics",
                config: {
                    metrics: ["total_users", "active_sessions", "recent_signups", "system_load"]
                }
            },
            {
                type: "table",
                id: "user-management",
                title: "User Management",
                config: {
                    fields: [
                        { key: "id", label: "ID", type: "text", sortable: true },
                        { key: "name", label: "Name", type: "text", sortable: true },
                        { key: "email", label: "Email", type: "text" },
                        {
                            key: "role", label: "Role", type: "badge",
                            badgeConfig: {
                                colorMap: {
                                    admin: "#ff6b6b",
                                    user: "#51cf66",
                                    moderator: "#339af0"
                                }
                            }
                        },
                        {
                            key: "status", label: "Status", type: "badge",
                            badgeConfig: {
                                colorMap: {
                                    active: "#51cf66",
                                    inactive: "#868e96",
                                    suspended: "#ff6b6b"
                                }
                            }
                        },
                        { key: "lastLogin", label: "Last Login", type: "date", sortable: true }
                    ],
                    sortable: true,
                    filterable: true
                }
            }
        ],
        actions: [
            {
                id: "activate_user",
                label: "Activate User",
                type: "inline",
                handler: "activate_user"
            },
            {
                id: "suspend_user",
                label: "Suspend User",
                type: "inline",
                handler: "suspend_user",
                confirm: "Are you sure you want to suspend this user?"
            },
            {
                id: "bulk_delete",
                label: "Delete Selected",
                type: "bulk",
                handler: "delete_users",
                confirm: "Are you sure you want to delete these users? This action cannot be undone."
            }
        ],
        polling: {
            enabled: true,
            intervalMs: 5000
        }
    };

    const getAdminData = async (userId?: string) => {
        // Simulate admin data fetch
        return [
            {
                id: 1,
                name: "John Doe",
                email: "john@example.com",
                role: "admin",
                status: "active",
                lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                total_users: 150,
                active_sessions: 23,
                recent_signups: 5,
                system_load: 0.65
            },
            {
                id: 2,
                name: "Jane Smith",
                email: "jane@example.com",
                role: "user",
                status: "active",
                lastLogin: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
            },
            {
                id: 3,
                name: "Bob Wilson",
                email: "bob@example.com",
                role: "moderator",
                status: "inactive",
                lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            }
        ];
    };

    const handleAdminActions = async (action: string, data: any, userId: string) => {
        console.log(`Admin ${userId} performed ${action}:`, data);

        switch (action) {
            case 'activate_user':
                return { success: true, message: `User ${data.name} activated` };
            case 'suspend_user':
                return { success: true, message: `User ${data.name} suspended` };
            case 'delete_users':
                return { success: true, message: `${data.length} users deleted` };
            default:
                return { success: false, error: 'Unknown admin action' };
        }
    };

    const adminUI = new MCPWebUI({
        schema: adminSchema,
        dataSource: getAdminData,
        onUpdate: handleAdminActions,
        sessionTimeout: 60 * 60 * 1000, // 1 hour for admin sessions
        pollInterval: 5000
    });

    return adminUI;
}

// Example 3: Data Management Interface
export async function createDataManager() {
    const dataSchema: UISchema = {
        title: "Data Manager",
        description: "Manage your data entries",
        components: [
            {
                type: "form",
                id: "data-entry",
                title: "Add New Entry",
                config: {
                    fields: [
                        { key: "name", label: "Name", type: "text" },
                        {
                            key: "category", label: "Category", type: "select",
                            options: [
                                { value: "work", label: "Work" },
                                { value: "personal", label: "Personal" },
                                { value: "project", label: "Project" }
                            ]
                        },
                        {
                            key: "priority", label: "Priority", type: "select",
                            options: [
                                { value: "low", label: "Low" },
                                { value: "medium", label: "Medium" },
                                { value: "high", label: "High" }
                            ]
                        },
                        { key: "description", label: "Description", type: "text" }
                    ],
                    submitAction: "create_entry"
                }
            },
            {
                type: "list",
                id: "data-list",
                title: "Data Entries",
                config: {
                    fields: [
                        { key: "id", label: "ID", type: "text" },
                        { key: "name", label: "Name", type: "text" },
                        { key: "category", label: "Category", type: "badge" },
                        { key: "priority", label: "Priority", type: "badge" },
                        { key: "description", label: "Description", type: "text" },
                        { key: "createdAt", label: "Created", type: "date" }
                    ],
                    sortable: true,
                    filterable: true
                }
            }
        ],
        actions: [
            {
                id: "edit",
                label: "Edit",
                type: "inline",
                handler: "edit_entry"
            },
            {
                id: "delete",
                label: "Delete",
                type: "inline",
                handler: "delete_entry",
                confirm: "Are you sure you want to delete this entry?"
            }
        ],
        polling: {
            enabled: true,
            intervalMs: 3000
        }
    };

    const getDataEntries = async (userId?: string) => [
        {
            id: 1,
            name: "Project Alpha",
            category: "work",
            priority: "high",
            description: "Important client project",
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        },
        {
            id: 2,
            name: "Personal Website",
            category: "personal",
            priority: "medium",
            description: "Update portfolio site",
            createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
        }
    ];

    const handleDataActions = async (action: string, data: any, userId: string) => {
        switch (action) {
            case 'create_entry':
                const newEntry = {
                    id: Date.now(),
                    ...data,
                    createdAt: new Date()
                };
                return { success: true, message: 'Entry created', data: newEntry };
            case 'edit_entry':
                return { success: true, message: `Entry ${data.id} updated` };
            case 'delete_entry':
                return { success: true, message: `Entry ${data.id} deleted` };
            default:
                return { success: false, error: 'Unknown action' };
        }
    };

    const dataUI = new MCPWebUI({
        schema: dataSchema,
        dataSource: getDataEntries,
        onUpdate: handleDataActions
    });

    return dataUI;
}

// Example 4: LibreChat MCP Server Integration
export function createLibreChatIntegration() {
    const webUI = new MCPWebUI({
        schema: createTodoSchema("LibreChat Tasks"),
        dataSource: async (userId: any) => {
            // Fetch user's tasks from LibreChat context
            return await getUserTasks(userId || 'anonymous');
        },
        onUpdate: async (action: any, data: any, userId: any) => {
            // Handle task updates in LibreChat context
            return await updateUserTask(action, data, userId);
        }
    });

    // Return MCP tool definition for LibreChat
    return {
        tool: webUI.getMCPToolDefinition(),
        handler: async (args: any) => {
            return await webUI.handleGetWebUI(args);
        }
    };
}

// Example 5: Production Configuration
export function createProductionUI() {
    const webUI = new MCPWebUI({
        schema: createTodoSchema("Production App"),
        dataSource: async (userId: any) => await fetchProductionData(userId || 'anonymous'),
        onUpdate: async (action: any, data: any, userId: any) => await handleProductionUpdate(action, data, userId),

        // Production settings
        baseUrl: 'myapp.com',
        bindAddress: '0.0.0.0', // Bind to all interfaces
        sessionTimeout: 60 * 60 * 1000, // 1 hour sessions
        portRange: [8000, 8999], // Custom port range
        enableLogging: true,
        pollInterval: 10000 // 10 seconds for production
    });

    return webUI;
}

// Helper functions for examples
async function getUserTasks(userId: string) {
    // Placeholder for LibreChat task fetching
    return [];
}

async function updateUserTask(action: string, data: any, userId: string) {
    // Placeholder for LibreChat task updating
    return { success: true };
}

async function fetchProductionData(userId: string) {
    // Placeholder for production data fetching
    return [];
}

async function handleProductionUpdate(action: string, data: any, userId: string) {
    // Placeholder for production update handling
    return { success: true };
}

// Usage Examples
export async function runExamples() {
    console.log('Creating Todo List UI...');
    const todoUI = await createTodoListUI();
    const todoSession = await todoUI.createSession('todo-user');
    console.log(`Todo UI available at: ${todoSession.url}`);

    console.log('Creating Admin Dashboard...');
    const adminUI = await createAdminDashboard();
    const adminSession = await adminUI.createSession('admin-user');
    console.log(`Admin UI available at: ${adminSession.url}`);

    console.log('Creating Data Manager...');
    const dataUI = await createDataManager();
    const dataSession = await dataUI.createSession('data-user');
    console.log(`Data UI available at: ${dataSession.url}`);

    // Cleanup after demonstration
    setTimeout(async () => {
        console.log('Cleaning up demo sessions...');
        await todoUI.shutdown();
        await adminUI.shutdown();
        await dataUI.shutdown();
        console.log('Demo complete!');
    }, 30000); // Cleanup after 30 seconds
}

// Export everything for easy importing
export {
    MCPWebUI,
    createTodoSchema,
    createSimpleListSchema
} from '../src/index.js'; 