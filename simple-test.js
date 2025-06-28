import { MCPWebUI } from './dist/index.js';

async function simpleTest() {
    console.log('🧪 Simple MCP Vanilla JS Framework Test');

    try {
        // Simple todo data
        const getTodos = async () => [
            { id: 1, text: "Test todo", completed: false, priority: "medium" }
        ];

        // Simple update handler
        const handleUpdate = async (action, data, userId) => {
            console.log(`Action: ${action}`, data);
            return { success: true };
        };

        // Create minimal UI
        const webUI = new MCPWebUI({
            schema: {
                title: "Test Todo App",
                components: [
                    {
                        type: "list",
                        id: "todo-list",
                        title: "My Todos",
                        config: {}
                    }
                ]
            },
            dataSource: getTodos,
            onUpdate: handleUpdate,
            sessionTimeout: 5 * 60 * 1000 // 5 minutes
        });

        // Start server
        const session = await webUI.createSession('test-user');
        console.log(`✅ Server started: ${session.url}`);
        console.log(`🔑 Token: ${session.token}`);
        console.log('\n📋 Test checklist:');
        console.log('1. Open the URL in your browser');
        console.log('2. Check if MCP framework loads without errors');
        console.log('3. Verify todo list component renders');
        console.log('4. Check browser console for any errors');

        // Keep running
        console.log('\n⏳ Server running... Press Ctrl+C to stop');

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

simpleTest(); 