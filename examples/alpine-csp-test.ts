import { MCPWebUI, createTodoSchema } from '../src/index.js';

/**
 * Example demonstrating Alpine CSP compliance in MCP Web UI
 * 
 * This example shows how the UIServer now properly implements
 * Content Security Policy that works with Alpine.js
 */

async function testAlpineCSP() {
    console.log('Testing Alpine CSP Implementation...');

    // Sample data source that returns todo items
    const sampleDataSource = async (userId?: string) => {
        return [
            {
                id: '1',
                text: 'Test Alpine.js CSP implementation',
                completed: false,
                priority: 'high',
                category: 'development'
            },
            {
                id: '2',
                text: 'Verify nonce-based inline scripts work',
                completed: false,
                priority: 'medium',
                category: 'testing'
            }
        ];
    };

    // Sample update handler
    const sampleUpdateHandler = async (action: string, data: any, userId?: string) => {
        console.log(`Handling action: ${action}`, data);
        return { success: true };
    };

    // Use the pre-built todo schema helper
    const schema = createTodoSchema("Alpine CSP Test");
    schema.description = "Testing Alpine.js with proper Content Security Policy";

    // Create the MCP Web UI instance with configuration
    const webUI = new MCPWebUI({
        schema,
        dataSource: sampleDataSource,
        onUpdate: sampleUpdateHandler,
        sessionTimeout: 30 * 60 * 1000, // 30 minutes in milliseconds
        pollInterval: 2000,
        enableLogging: true
    });

    try {
        // Create a session with the Alpine CSP-compliant server
        const session = await webUI.createSession('test-user');

        console.log(`✅ Alpine CSP session created successfully!`);
        console.log(`📱 Web UI available at: ${session.url}`);
        console.log(`🔒 CSP Policy includes:`, {
            'script-src': "'self' 'nonce-[unique]' 'unsafe-eval' https://unpkg.com",
            'style-src': "'self' 'unsafe-inline'", // Alpine.js needs this for x-cloak
            'default-src': "'self'",
            'connect-src': "'self'",
            'object-src': "'none'",
            'base-uri': "'self'",
            'form-action': "'self'"
        });

        console.log(`🎯 Key Alpine CSP Features:`);
        console.log(`   • Nonce-based inline scripts (secure)`);
        console.log(`   • x-cloak directive prevents FOUC`);
        console.log(`   • Alpine.js directives work with CSP`);
        console.log(`   • 'unsafe-eval' required for Alpine.js Function() usage`);

        return session;

    } catch (error) {
        console.error('❌ Error creating Alpine CSP session:', error);
        throw error;
    }
}

// Export for use in other examples
export { testAlpineCSP };

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
    testAlpineCSP()
        .then(session => {
            console.log('\n🎉 Alpine CSP test completed successfully!');
            console.log(`Visit ${session.url} to see the CSP-compliant UI in action.`);

            // Keep process alive for testing
            console.log('\nPress Ctrl+C to stop the server...');
        })
        .catch(error => {
            console.error('\n💥 Alpine CSP test failed:', error);
            process.exit(1);
        });
} 