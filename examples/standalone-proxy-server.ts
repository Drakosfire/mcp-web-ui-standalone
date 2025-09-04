#!/usr/bin/env node

/**
 * Standalone Gateway Proxy Server Example
 * 
 * This example shows how to run the gateway proxy as a standalone service
 * that can proxy requests to ephemeral MCP web UIs.
 * 
 * Usage:
 *   npm run build
 *   node dist/examples/standalone-proxy-server.js
 * 
 * Environment Variables:
 *   MONGO_URL - MongoDB connection string (required)
 *   MONGO_DB_NAME - MongoDB database name (default: 'mcp_webui')
 *   JWT_SECRET - JWT secret for token signing (default: auto-generated)
 *   PROXY_PORT - Port to listen on (default: 3081)
 *   PROXY_HOST - Host to bind to (default: '0.0.0.0')
 *   PROXY_PREFIX - URL prefix for proxying (default: '/mcp')
 *   CORS_ORIGINS - Comma-separated list of allowed origins (default: '*')
 *   SSL_CERT - Path to SSL certificate file (optional)
 *   SSL_KEY - Path to SSL private key file (optional)
 *   DEBUG - Enable debug logging (default: false)
 */

import { GatewayProxyServer, GatewayProxyConfig } from '../src/proxy/index.js';
import * as fs from 'fs';
import * as path from 'path';

// Configuration from environment variables
const config: GatewayProxyConfig = {
    port: parseInt(process.env.PROXY_PORT || '3081'),
    host: process.env.PROXY_HOST || '0.0.0.0',
    mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017',
    mongoDbName: process.env.MONGO_DB_NAME || 'mcp_webui',
    jwtSecret: process.env.JWT_SECRET,
    proxyPrefix: process.env.PROXY_PREFIX || '/mcp',
    corsOrigins: process.env.CORS_ORIGINS ?
        process.env.CORS_ORIGINS.split(',').map(o => o.trim()) :
        ['*'],
    enableLogging: process.env.DEBUG === 'true' || process.env.NODE_ENV !== 'production',

    // SSL configuration (optional)
    ssl: (process.env.SSL_CERT && process.env.SSL_KEY) ? {
        cert: process.env.SSL_CERT,
        key: process.env.SSL_KEY
    } : undefined,

    // Custom logger
    logger: (level: string, message: string, data?: any) => {
        const timestamp = new Date().toISOString();
        const logLevel = level.toUpperCase().padEnd(5);
        console.error(`[${timestamp}][${logLevel}] ${message}`);

        if (data && (process.env.DEBUG === 'true' || level === 'error')) {
            console.error(JSON.stringify(data, null, 2));
        }
    }
};

// Validate required configuration
if (!config.mongoUrl) {
    console.error('ERROR: MONGO_URL environment variable is required');
    process.exit(1);
}

// SSL validation
if (config.ssl) {
    try {
        if (!fs.existsSync(config.ssl.cert)) {
            throw new Error(`SSL certificate file not found: ${config.ssl.cert}`);
        }
        if (!fs.existsSync(config.ssl.key)) {
            throw new Error(`SSL private key file not found: ${config.ssl.key}`);
        }
    } catch (error) {
        console.error('ERROR: SSL configuration invalid:', error.message);
        process.exit(1);
    }
}

// Create and start the proxy server
const proxyServer = new GatewayProxyServer(config);

// Graceful shutdown handling
const shutdown = async () => {
    console.log('\nReceived shutdown signal, gracefully stopping server...');
    try {
        await proxyServer.stop();
        console.log('Server stopped successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the server
async function main() {
    try {
        console.log('Starting Gateway Proxy Server...');
        console.log('Configuration:', {
            port: config.port,
            host: config.host,
            mongoUrl: config.mongoUrl.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@'), // Hide password
            mongoDbName: config.mongoDbName,
            proxyPrefix: config.proxyPrefix,
            ssl: !!config.ssl,
            corsOrigins: config.corsOrigins
        });

        await proxyServer.start();

        const protocol = config.ssl ? 'https' : 'http';
        console.log(`\n🚀 Gateway Proxy Server is running!`);
        console.log(`📍 URL: ${protocol}://${config.host}:${config.port}`);
        console.log(`🔗 Proxy endpoint: ${protocol}://${config.host}:${config.port}${config.proxyPrefix}/:token/...`);
        console.log(`📊 Stats endpoint: ${protocol}://${config.host}:${config.port}/stats`);
        console.log(`❤️  Health check: ${protocol}://${config.host}:${config.port}/health`);

        if (config.ssl) {
            console.log(`🔒 SSL enabled with certificate: ${config.ssl.cert}`);
        }

        console.log('\n📝 Usage:');
        console.log('  1. Configure your MCP servers to use proxy mode');
        console.log('  2. Set MCP_WEB_UI_PROXY_MODE=true in your environment');
        console.log(`  3. Set MCP_WEB_UI_MONGO_URL=${config.mongoUrl}`);
        console.log(`  4. Set MCP_WEB_UI_PROXY_BASE_URL=${config.host}:${config.port}`);
        console.log('  5. Access web UIs via: /mcp/:token/');

        console.log('\n🛑 Press Ctrl+C to stop the server');

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Start the server
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
