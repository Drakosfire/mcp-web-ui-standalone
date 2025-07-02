/**
 * GenericUIServer Usage Example
 * 
 * This example shows how to use the new modular, configuration-driven UIServer
 * that replaces the monolithic UIServer with a flexible, extensible architecture.
 */

import {
    GenericUIServer,
    UIServerConfigBuilder,
    SessionManager,
    UISchema,
    UIComponent
} from '../src/index.js';

// Example: Todoodles Server with Beautiful Theme
export async function createTodoodlesServer(userId: string, pollInterval: number = 2000) {
    // 1. Create configuration using the fluent builder
    const config = UIServerConfigBuilder.create()
        .withCustomCSS('todoodles', {
            schemaTitle: ['todoodles', 'todo'] // Auto-detects todoodles themes
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

    // 2. Create session and schema (same as before)
    const sessionManager = new SessionManager();
    const session = sessionManager.createSession(userId);

    const schema: UISchema = {
        title: 'Your Todoodles',
        description: 'Manage your tasks with style',
        components: [
            {
                id: 'todo-list',
                type: 'list' as const,
                title: 'Your Todoodles',
                config: {
                    fields: [
                        { key: 'text', label: 'Task', type: 'text' as const },
                        {
                            key: 'priority', label: 'Priority', type: 'badge' as const,
                            options: [
                                { value: 'low', label: 'Low' },
                                { value: 'medium', label: 'Medium' },
                                { value: 'high', label: 'High' },
                                { value: 'urgent', label: 'Urgent' }
                            ]
                        },
                        { key: 'category', label: 'Category', type: 'badge' as const },
                        { key: 'dueDate', label: 'Due Date', type: 'date' as const },
                        { key: 'completed', label: 'Done', type: 'checkbox' as const }
                    ],
                    showItemCount: true
                }
            }
        ]
    };

    // 3. Create data source and update handler
    const dataSource = async (userId?: string) => {
        // Your data loading logic here
        return [
            {
                id: '1',
                text: 'Try the new GenericUIServer',
                priority: 'high',
                category: 'development',
                completed: false
            }
        ];
    };

    const updateHandler = async (action: string, data: any, userId: string) => {
        console.log(`Handle ${action}:`, data);
        // Your update logic here
        return { success: true };
    };

    // 4. Create GenericUIServer with configuration
    const server = new GenericUIServer(
        session,
        schema,
        dataSource,
        updateHandler,
        config,  // <- This is the key difference!
        pollInterval
    );

    return server;
}

// Example: Multi-Application Server
export async function createMultiAppServer(userId: string) {
    // Support multiple application types through configuration
    const config = UIServerConfigBuilder.create()
        .withCustomCSS('todoodles', { schemaTitle: ['todo', 'task'] })
        .withCustomCSS('grocery', { schemaTitle: ['grocery', 'shopping'] })
        .withCustomCSS('calendar', { schemaTitle: ['calendar', 'event'] })
        .withTheme({
            name: 'dark-mode',
            files: ['dark-theme.css'],
            conditions: { userAgent: ['Dark'] },
            priority: 20
        })
        .build();

    // The server automatically detects which theme to load based on schema.title
    const sessionManager = new SessionManager();
    const session = sessionManager.createSession(userId);

    // This schema will trigger todoodles theme loading
    const todoSchema: UISchema = {
        title: 'My Todo List',  // Contains "todo" -> loads todoodles theme
        components: [{
            id: 'todos',
            type: 'list' as const,
            config: { fields: [] }
        }]
    };

    // This schema will trigger grocery theme loading  
    const grocerySchema: UISchema = {
        title: 'Grocery Shopping',  // Contains "grocery" -> loads grocery theme
        components: [{
            id: 'groceries',
            type: 'list' as const,
            config: { fields: [] }
        }]
    };

    const dataSource = async (userId?: string) => []; // Return empty array
    const updateHandler = async () => ({ success: true });

    // Same server code works for both - theme is auto-detected!
    const todoServer = new GenericUIServer(session, todoSchema, dataSource, updateHandler, config);

    return todoServer;
}

// Example: Development vs Production Configuration
export function createDevConfig() {
    return UIServerConfigBuilder.create()
        .withTheme({
            name: 'debug',
            files: ['debug.css'],
            conditions: {},
            priority: 1
        })
        // .withPlugin('dev-tools', { enableDebugging: true })  // Future plugin system
        .build();
}

export function createProdConfig() {
    return UIServerConfigBuilder.create()
        // .withPlugin('performance', {  // Future plugin system
        //     enableCompression: true,
        //     enableCaching: true,
        //     bundleResources: true
        // })
        .build();
}

// Migration Helper: Convert old UIServer usage to GenericUIServer
export function migrateToGenericUIServer(
    session: any,
    schema: any,
    dataSource: any,
    updateHandler: any,
    pollInterval?: number
) {
    // Before: new UIServer(session, schema, dataSource, updateHandler, pollInterval)
    // After: Auto-detect configuration based on schema

    let config = UIServerConfigBuilder.create();

    // Auto-configure based on schema title
    const title = schema.title.toLowerCase();
    if (title.includes('todo') || title.includes('task')) {
        config = config.withCustomCSS('todoodles', { schemaTitle: ['todo', 'task'] });
    } else if (title.includes('grocery') || title.includes('shopping')) {
        config = config.withCustomCSS('grocery', { schemaTitle: ['grocery', 'shopping'] });
    }

    return new GenericUIServer(
        session,
        schema,
        dataSource,
        updateHandler,
        config.build(),
        pollInterval
    );
}

// Usage Examples:

/*
// Basic Todoodles Server
const server = await createTodoodlesServer('user123');
await server.start();
console.log('🚀 Todoodles server running with beautiful theme!');

// Multi-app server (auto-detects themes)
const multiServer = await createMultiAppServer('user123');
await multiServer.start();
console.log('🎨 Multi-app server with automatic theme detection!');

// Development server
const devConfig = createDevConfig();
const devServer = new GenericUIServer(session, schema, dataSource, updateHandler, devConfig);

// Production server  
const prodConfig = createProdConfig();
const prodServer = new GenericUIServer(session, schema, dataSource, updateHandler, prodConfig);

// Migration from old UIServer
const migratedServer = migrateToGenericUIServer(session, schema, dataSource, updateHandler);
*/ 