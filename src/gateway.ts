#!/usr/bin/env node

import { GatewayProxyServer } from './proxy/GatewayProxyServer.js';

// Load environment variables
const config = {
    port: parseInt(process.env.MCP_GATEWAY_PORT || '3081'),
    host: process.env.MCP_GATEWAY_HOST || '0.0.0.0',
    mongoUrl: process.env.MCP_GATEWAY_MONGO_URL || 'mongodb://localhost:27017',
    mongoDbName: process.env.MCP_GATEWAY_MONGO_DB_NAME || 'mcp_webui',
    jwtSecret: process.env.MCP_GATEWAY_JWT_SECRET || 'default-secret-change-me',
    proxyPrefix: process.env.MCP_GATEWAY_PROXY_PREFIX || '/mcp',
    enableLogging: process.env.MCP_GATEWAY_ENABLE_LOGGING !== 'false',
    corsOrigins: process.env.MCP_GATEWAY_CORS_ORIGINS?.split(',') || ['*']
};

console.log('🚀 Starting MCP Gateway Proxy Server...');
console.log('Configuration:', {
    port: config.port,
    host: config.host,
    mongoUrl: config.mongoUrl.replace(/\/\/.*@/, '//***:***@'), // Hide credentials
    mongoDbName: config.mongoDbName,
    proxyPrefix: config.proxyPrefix,
    enableLogging: config.enableLogging
});

const gateway = new GatewayProxyServer(config);

// Graceful shutdown handling
const shutdown = async (signal: string) => {
    console.log(`\n📴 Received ${signal}, shutting down gateway gracefully...`);

    // Set a maximum shutdown time
    const forceShutdownTimer = setTimeout(() => {
        console.error('⏰ Shutdown timeout reached, forcing exit...');
        process.exit(1);
    }, 30000); // 30 second maximum shutdown time

    try {
        await gateway.stop();
        clearTimeout(forceShutdownTimer);
        console.log('✅ Gateway stopped successfully');
        process.exit(0);
    } catch (error) {
        clearTimeout(forceShutdownTimer);
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
});

// Start the gateway
gateway.start()
    .then(() => {
        console.log('✅ MCP Gateway Proxy Server started successfully!');
        console.log(`🌐 Gateway accessible at: http://${config.host}:${config.port}`);
        console.log(`🔗 Proxy endpoint: http://${config.host}:${config.port}${config.proxyPrefix}/:token/...`);
        console.log('📊 Health check: http://localhost:3081/health');
        console.log('📈 Stats: http://localhost:3081/stats');
    })
    .catch((error) => {
        console.error('❌ Failed to start gateway:', error);
        process.exit(1);
    });
