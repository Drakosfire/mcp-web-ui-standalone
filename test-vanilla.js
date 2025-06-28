import { createSimpleTodoList } from './dist/examples/examples/vanilla-example.js';

async function main() {
    console.log('🔥 Testing Vanilla JS MCP Web UI Framework');

    try {
        // Create the web UI instance
        const webUI = await createSimpleTodoList();

        // Start the server
        const session = await webUI.createSession('test-user-123');
        console.log(`✅ Web UI server started: ${session.url}`);
        console.log(`🔑 Access token: ${session.token}`);
        console.log(`⏰ Session expires: ${session.expiresAt}`);

        // Keep the server running
        console.log('🌐 Server is running. Press Ctrl+C to stop.');
        console.log('📱 Open the URL in your browser to test the UI');

    } catch (error) {
        console.error('❌ Failed to start MCP Web UI:', error);
        process.exit(1);
    }
}

main(); 