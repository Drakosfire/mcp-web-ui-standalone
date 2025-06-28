/**
 * Complete Vanilla JS MCP Web UI Example
 * 
 * This example demonstrates the full capabilities of the vanilla JS framework:
 * - Perfect CSP compliance and security
 * - Zero external dependencies
 * - AI-friendly schema-driven configuration
 * - Multiple component types working together
 * - Comprehensive error handling and logging
 * 
 * This example is designed to be easily understood and copied by AI agents.
 */

import { MCPWebUI, createTodoSchema } from '../src/index.js';
import { UISchema } from '../src/types/index.js';

// Example 1: Simple Todo List (Most Common Use Case)
export async function createSimpleTodoList() {
    console.log('🚀 Creating Simple Todo List with Vanilla JS Framework');

    // Sample todo data (could come from database, API, LLM, etc.)
    const getTodos = async (userId?: string) => [
        {
            id: 1,
            text: "Implement vanilla JS framework",
            completed: true,
            priority: "high",
            category: "Development",
            dueDate: "2024-01-15"
        },
        {
            id: 2,
            text: "Test security features",
            completed: false,
            priority: "high",
            category: "Security"
        },
        {
            id: 3,
            text: "Write documentation",
            completed: false,
            priority: "medium",
            category: "Documentation"
        },
        {
            id: 4,
            text: "Deploy to production",
            completed: false,
            priority: "low",
            category: "DevOps"
        }
    ];

    // Handle user actions with comprehensive validation
    const handleUpdate = async (action: string, data: any, userId: string) => {
        console.log(`🔄 User ${userId} performed action: ${action}`, data);

        // Simulate different actions (in real app, this would update database)
        switch (action) {
            case 'add':
                console.log('✅ Adding new todo:', data.text);
                // In real app: await database.addTodo(data, userId);
                return { success: true, id: Date.now() };

            case 'toggle':
                console.log(`⚡ Toggling todo ${data.id} to ${data.completed ? 'completed' : 'pending'}`);
                // In real app: await database.updateTodo(data.id, { completed: data.completed });
                return { success: true };

            case 'delete':
                console.log(`🗑️ Deleting todo ${data.id}`);
                // In real app: await database.deleteTodo(data.id);
                return { success: true };

            default:
                throw new Error(`Unknown action: ${action}`);
        }
    };

    // Create the web UI with vanilla JS framework
    const webUI = new MCPWebUI({
        schema: createTodoSchema("Vanilla JS Todo List"),
        dataSource: getTodos,
        onUpdate: handleUpdate,
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        pollInterval: 2000, // Poll every 2 seconds
        enableLogging: true
    });

    return webUI;
}

// Example 2: Advanced Multi-Component Dashboard
export async function createAdvancedDashboard() {
    console.log('🚀 Creating Advanced Dashboard with Multiple Components');

    // Sample user data for table
    const getUserData = async (userId?: string) => [
        {
            id: 1,
            name: "Alice Johnson",
            email: "alice@example.com",
            status: "active",
            role: "admin",
            lastLogin: "2024-01-15T10:30:00Z",
            tasksCompleted: 15
        },
        {
            id: 2,
            name: "Bob Smith",
            email: "bob@example.com",
            status: "inactive",
            role: "user",
            lastLogin: "2024-01-10T14:22:00Z",
            tasksCompleted: 8
        },
        {
            id: 3,
            name: "Carol Wilson",
            email: "carol@example.com",
            status: "active",
            role: "user",
            lastLogin: "2024-01-15T09:15:00Z",
            tasksCompleted: 23
        }
    ];

    // Sample statistics data
    const getStatsData = async (userId?: string) => ({
        total_users: 150,
        active_users: 89,
        tasks_completed: 1247,
        high_priority_tasks: 23,
        revenue: 45750,
        growth_rate: 12.5
    });

    // Advanced update handler with multiple action types
    const handleAdvancedUpdate = async (action: string, data: any, userId: string) => {
        console.log(`🔄 Advanced action: ${action}`, data);

        switch (action) {
            case 'activate-user':
                console.log(`✅ Activating user ${data.userId}`);
                return { success: true, message: 'User activated successfully' };

            case 'deactivate-user':
                console.log(`❌ Deactivating user ${data.userId}`);
                return { success: true, message: 'User deactivated successfully' };

            case 'bulk-action':
                console.log(`📦 Bulk action ${data.actionType} on users:`, data.rowIds);
                return { success: true, affected: data.rowIds.length };

            case 'export-data':
                console.log('📊 Exporting data');
                return { success: true, downloadUrl: '/exports/users.csv' };

            default:
                throw new Error(`Unknown action: ${action}`);
        }
    };

    // Advanced UI schema with multiple components
    const advancedSchema: UISchema = {
        title: "User Management Dashboard",
        description: "Comprehensive user and task management interface",
        components: [
            // Statistics component
            {
                type: "stats",
                id: "dashboard-stats",
                title: "Key Metrics",
                config: {
                    metrics: [
                        {
                            key: "total_users",
                            label: "Total Users",
                            icon: "👥",
                            color: "blue"
                        },
                        {
                            key: "active_users",
                            label: "Active Users",
                            icon: "🟢",
                            color: "green"
                        },
                        {
                            key: "tasks_completed",
                            label: "Tasks Completed",
                            icon: "✅",
                            color: "yellow"
                        },
                        {
                            key: "revenue",
                            label: "Revenue",
                            icon: "💰",
                            color: "yellow",
                            type: "currency",
                            currency: "USD"
                        }
                    ],
                    showTrends: true,
                    animate: true,
                    layout: "grid"
                }
            },
            // User management table
            {
                type: "table",
                id: "user-table",
                title: "User Management",
                config: {
                    fields: [
                        {
                            key: "name",
                            label: "Name",
                            type: "text",
                            sortable: true
                        },
                        {
                            key: "email",
                            label: "Email",
                            type: "text",
                            sortable: true
                        },
                        {
                            key: "status",
                            label: "Status",
                            type: "badge",
                            badgeConfig: {
                                colorMap: {
                                    active: "green",
                                    inactive: "red",
                                    pending: "yellow"
                                }
                            }
                        },
                        {
                            key: "role",
                            label: "Role",
                            type: "text"
                        },
                        {
                            key: "lastLogin",
                            label: "Last Login",
                            type: "date",
                            sortable: true
                        },
                        {
                            key: "tasksCompleted",
                            label: "Tasks",
                            type: "number",
                            sortable: true
                        }
                    ],
                    sortable: true,
                    filterable: true,
                    selectable: true,
                    exportable: true,
                    pageSize: 10
                }
            },
            // Todo list for admin tasks
            {
                type: "list",
                id: "admin-tasks",
                title: "Admin Tasks",
                config: {
                    fields: [
                        { key: "text", label: "Task", type: "text" },
                        { key: "completed", label: "Done", type: "checkbox", editable: true },
                        { key: "priority", label: "Priority", type: "badge" }
                    ],
                    sortable: true
                }
            }
        ],
        // Global actions
        actions: [
            {
                id: "refresh-all",
                label: "Refresh All",
                type: "button",
                handler: "refresh"
            }
        ],
        polling: {
            enabled: true,
            intervalMs: 5000
        }
    };

    // Create advanced dashboard
    const webUI = new MCPWebUI({
        schema: advancedSchema,
        dataSource: async (userId?: string) => {
            // Combine data from multiple sources
            const [users, stats] = await Promise.all([
                getUserData(userId),
                getStatsData(userId)
            ]);

            return {
                'dashboard-stats': stats,
                'user-table': users,
                'admin-tasks': [
                    { id: 1, text: "Review security logs", completed: false, priority: "high" },
                    { id: 2, text: "Update user permissions", completed: true, priority: "medium" },
                    { id: 3, text: "Backup database", completed: false, priority: "high" }
                ]
            } as any;
        },
        onUpdate: handleAdvancedUpdate,
        sessionTimeout: 60 * 60 * 1000, // 1 hour for admin interface
        pollInterval: 5000, // Slower polling for dashboard
        enableLogging: true
    });

    return webUI;
}

// Example 3: AI-Generated Schema Example
export async function createAIGeneratedInterface() {
    console.log('🤖 Creating AI-Generated Interface Example');

    // This simulates what an AI agent might generate based on data analysis
    const analyzeDataAndGenerateSchema = (data: any[]): UISchema => {
        console.log('🧠 AI analyzing data structure...');

        // AI logic to determine best UI components based on data
        const hasNumericFields = data.some(item =>
            Object.values(item).some(value => typeof value === 'number')
        );

        const hasStatusField = data.some(item =>
            item.hasOwnProperty('status') || item.hasOwnProperty('state')
        );

        const hasDateFields = data.some(item =>
            Object.values(item).some(value =>
                typeof value === 'string' && !isNaN(Date.parse(value))
            )
        );

        // AI-generated schema based on data analysis
        return {
            title: "AI-Generated Data Interface",
            description: "Automatically generated based on data structure analysis",
            components: [
                // Always include stats for numeric data
                ...(hasNumericFields ? [{
                    type: "stats" as const,
                    id: "auto-stats",
                    title: "Data Overview",
                    config: {
                        metrics: [
                            { key: "total", label: "Total Records", icon: "📊", color: "blue" },
                            { key: "active", label: "Active Items", icon: "🟢", color: "green" }
                        ]
                    }
                }] as any : []),

                // Main data table with AI-determined columns
                {
                    type: "table" as const,
                    id: "data-table",
                    title: "Data Management",
                    config: {
                        fields: [
                            { key: "id", label: "ID", type: "text", sortable: true },
                            { key: "name", label: "Name", type: "text", sortable: true },
                            ...(hasStatusField ? [{
                                key: "status",
                                label: "Status",
                                type: "badge" as const,
                                badgeConfig: { colorMap: { active: "green", inactive: "red" } }
                            }] : []),
                            ...(hasDateFields ? [{
                                key: "created",
                                label: "Created",
                                type: "date" as const,
                                sortable: true
                            }] : [])
                        ],
                        sortable: true,
                        filterable: true,
                        pageSize: 20
                    }
                }
            ]
        };
    };

    // Sample data that AI would analyze
    const sampleData = [
        { id: 1, name: "Project Alpha", status: "active", created: "2024-01-10", progress: 75 },
        { id: 2, name: "Project Beta", status: "inactive", created: "2024-01-08", progress: 30 },
        { id: 3, name: "Project Gamma", status: "active", created: "2024-01-12", progress: 90 }
    ];

    // AI generates the schema
    const aiSchema = analyzeDataAndGenerateSchema(sampleData);
    console.log('🤖 AI generated schema:', JSON.stringify(aiSchema, null, 2));

    // Create web UI with AI-generated schema
    const webUI = new MCPWebUI({
        schema: aiSchema,
        dataSource: async () => ({
            'auto-stats': { total: sampleData.length, active: sampleData.filter(item => item.status === 'active').length },
            'data-table': sampleData
        } as any),
        onUpdate: async (action, data, userId) => {
            console.log(`🤖 AI handling action: ${action}`, data);
            return { success: true };
        },
        enableLogging: true
    });

    return webUI;
}

// Example 4: Security Demonstration
export async function demonstrateSecurity() {
    console.log('🔒 Demonstrating Security Features');

    // Simulate malicious input that should be sanitized
    const maliciousData = [
        {
            id: 1,
            text: "<script>alert('XSS')</script>Malicious todo",
            category: "javascript:alert('XSS')",
            priority: "high' onmouseover='alert(\"XSS\")'",
            completed: false
        },
        {
            id: 2,
            text: "Normal todo",
            category: "Work",
            priority: "medium",
            completed: false
        }
    ];

    // Security-focused update handler
    const secureHandler = async (action: string, data: any, userId: string) => {
        console.log('🛡️ Processing action through security layer...');

        // The framework automatically sanitizes all input
        // Log the sanitized data to show security in action
        console.log('✅ Action processed securely:', { action, sanitizedData: data, userId });

        // Simulate rate limiting check
        const requestCount = parseInt(localStorage.getItem(`requests_${userId}`) || '0');
        if (requestCount > 10) {
            throw new Error('Rate limit exceeded');
        }
        localStorage.setItem(`requests_${userId}`, String(requestCount + 1));

        return { success: true, message: 'Action processed securely' };
    };

    // Create secure web UI
    const webUI = new MCPWebUI({
        schema: createTodoSchema("Security Demonstration"),
        dataSource: async () => maliciousData,
        onUpdate: secureHandler,
        enableLogging: true
    });

    return webUI;
}

// Main example runner
export async function runAllExamples() {
    console.log('🚀 Running All Vanilla JS Framework Examples\n');

    try {
        // Example 1: Simple todo list
        console.log('='.repeat(50));
        const todoUI = await createSimpleTodoList();
        const todoSession = await todoUI.createSession('user-1');
        console.log(`✅ Todo List available at: ${todoSession.url}\n`);

        // Example 2: Advanced dashboard
        console.log('='.repeat(50));
        const dashboardUI = await createAdvancedDashboard();
        const dashboardSession = await dashboardUI.createSession('admin-1');
        console.log(`✅ Dashboard available at: ${dashboardSession.url}\n`);

        // Example 3: AI-generated interface
        console.log('='.repeat(50));
        const aiUI = await createAIGeneratedInterface();
        const aiSession = await aiUI.createSession('ai-user-1');
        console.log(`✅ AI Interface available at: ${aiSession.url}\n`);

        // Example 4: Security demonstration
        console.log('='.repeat(50));
        const securityUI = await demonstrateSecurity();
        const securitySession = await securityUI.createSession('security-test-1');
        console.log(`✅ Security demo available at: ${securitySession.url}\n`);

    } catch (error) {
        console.error('❌ Failed to run examples:', error);
    }
}

/**
 * Generate a UI schema from an array of data objects
 * @param data - Array of data objects
 * @param title - Title for the UI
 * @returns A UI schema object
 */
export function generateUIFromData(data: any[], title: string = "Generated Interface"): UISchema {
    if (!data || data.length === 0) {
        return {
            title,
            components: [{
                type: 'list',
                id: 'empty-list',
                config: { fields: [{ key: 'message', label: 'Info', type: 'text' }] }
            }]
        };
    }

    const firstItem = data[0];
    const fields = Object.keys(firstItem).map(key => {
        const sampleValue = firstItem[key];
        let type: 'text' | 'number' | 'date' | 'checkbox' = 'text';

        if (typeof sampleValue === 'number') {
            type = 'number';
        } else if (typeof sampleValue === 'boolean') {
            type = 'checkbox';
        } else if (typeof sampleValue === 'string' && !isNaN(Date.parse(sampleValue))) {
            type = 'date';
        }

        return {
            key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
            type,
            sortable: true
        };
    });

    const schema: UISchema = {
        title: title,
        description: `Generated from ${data.length} records.`,
        components: [
            {
                type: 'table',
                id: 'generated-table',
                title: 'Data',
                config: {
                    fields: fields as any,
                    sortable: true,
                    filterable: true
                }
            }
        ]
    };
    return schema;
}

// For testing in development
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllExamples().catch(console.error);
} 