import express, { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { Server as HttpServer } from 'http';
import { Server as HttpsServer } from 'https';
import { WebSocketServer } from 'ws';
import { MongoClient, Db } from 'mongodb';
import { TokenRegistry, EphemeralSession } from './TokenRegistry.js';
import path from 'path';
import fs from 'fs';

export interface GatewayProxyConfig {
    // Server configuration
    port: number;
    host?: string;

    // MongoDB configuration for token registry
    mongoUrl: string;
    mongoDbName?: string;

    // Security configuration
    jwtSecret?: string;
    corsOrigins?: string[];

    // Proxy configuration
    proxyPrefix?: string; // Default: '/mcp'

    // SSL configuration (optional)
    ssl?: {
        cert: string;
        key: string;
    };

    // Logging
    logger?: (level: string, message: string, data?: any) => void;
    enableLogging?: boolean;
}

/**
 * Gateway Proxy Server for ephemeral MCP Web UIs
 * 
 * Provides a single stable endpoint that proxies requests to ephemeral backends
 * based on secure tokens. Supports HTTP, WebSocket, and SSE connections.
 * 
 * URL Pattern: /mcp/:token/*
 * - Validates token against MongoDB registry
 * - Routes to appropriate ephemeral backend
 * - Supports real-time bidirectional communication
 */
export class GatewayProxyServer {
    private app: express.Application;
    private server?: HttpServer | HttpsServer;
    private wss?: WebSocketServer;
    private mongoClient?: MongoClient;
    private tokenRegistry?: TokenRegistry;
    private config: GatewayProxyConfig & {
        host: string;
        mongoDbName: string;
        corsOrigins: string[];
        proxyPrefix: string;
        enableLogging: boolean;
    };

    constructor(config: GatewayProxyConfig) {
        this.config = {
            host: '0.0.0.0',
            mongoDbName: 'mcp_webui',
            corsOrigins: ['*'],
            proxyPrefix: '/mcp',
            enableLogging: true,
            ...config
        };

        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }

    /**
     * Setup Express middleware
     */
    private setupMiddleware(): void {
        // Enable trust proxy for proper IP forwarding
        this.app.set('trust proxy', true);

        // CORS middleware
        this.app.use((req, res, next) => {
            const origin = req.headers.origin;
            if (this.config.corsOrigins.includes('*') ||
                (origin && this.config.corsOrigins.includes(origin))) {
                res.header('Access-Control-Allow-Origin', origin || '*');
            }
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
            res.header('Access-Control-Allow-Credentials', 'true');

            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
            } else {
                next();
            }
        });

        // Request logging (filter out polling noise)
        if (this.config.enableLogging) {
            this.app.use((req, res, next) => {
                // Skip logging polling requests to /api/data
                const isPollingRequest = req.method === 'GET' && req.path?.includes('/api/data');
                if (!isPollingRequest) {
                    this.log('debug', `${req.method} ${req.path}`, {
                        ip: req.ip,
                        userAgent: req.get('User-Agent')
                    });
                }
                next();
            });
        }

        // JSON parsing - but skip for proxy routes to avoid consuming request body
        this.app.use((req, res, next) => {
            // Skip body parsing for proxy routes that need to forward the raw body
            const isProxyRoute = req.path.startsWith(this.config.proxyPrefix);
            if (isProxyRoute) {
                return next();
            }
            // Apply body parsing for gateway management routes only
            express.json()(req, res, next);
        });

        this.app.use((req, res, next) => {
            const isProxyRoute = req.path.startsWith(this.config.proxyPrefix);
            if (isProxyRoute) {
                return next();
            }
            express.urlencoded({ extended: true })(req, res, next);
        });
    }

    /**
     * Setup Express routes
     */
    private setupRoutes(): void {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });

        // Session creation endpoint for MCP servers
        this.app.post('/create-session', async (req, res) => {
            if (!this.tokenRegistry) {
                return res.status(503).json({ error: 'Token registry not available' });
            }

            try {

                const { userId, serverName, serverType, backend, ttlMinutes = 30 } = req.body;

                if (!userId || !serverName || !backend) {
                    return res.status(400).json({
                        error: 'Missing required fields',
                        required: ['userId', 'serverName', 'backend']
                    });
                }

                // Check for existing active session first using composite key
                const existingSession = await this.tokenRegistry.findActiveSession(userId, serverName, serverType);

                let session;
                if (existingSession) {
                    const sessionKey = `${userId}:${serverName}:${serverType || 'mcp-webui'}`;
                    this.log('info', `Reusing existing session for composite key ${sessionKey}`);
                    session = existingSession;
                } else {
                    // Create a new session with JWT token
                    session = await this.tokenRegistry.createSession({
                        userId,
                        serverName,
                        serverType,
                        backend,
                        ttlMinutes
                    });
                }

                this.log('info', `Created session for user ${userId}, server ${serverName}`);
                res.json({
                    success: true,
                    token: session.token,
                    expiresAt: session.expiresAt
                });
            } catch (error) {
                this.log('error', 'Failed to create session:', error);
                res.status(500).json({ error: 'Failed to create session' });
            }
        });

        // Server registration endpoint for MCP servers
        this.app.post('/register-server', async (req, res) => {
            if (!this.tokenRegistry) {
                return res.status(503).json({ error: 'Token registry not available' });
            }

            try {
                const { serverName, backend, metadata = {} } = req.body;

                if (!serverName || !backend) {
                    return res.status(400).json({
                        error: 'Missing required fields',
                        required: ['serverName', 'backend']
                    });
                }

                // Validate backend configuration
                if (backend.type === 'tcp' && (!backend.host || !backend.port)) {
                    return res.status(400).json({
                        error: 'TCP backend requires host and port'
                    });
                }

                // Register the server
                await this.tokenRegistry.registerServer(serverName, backend, metadata);

                this.log('info', `Registered MCP server: ${serverName}`, {
                    backend: backend.type === 'tcp' ? `${backend.host}:${backend.port}` : backend.socketPath,
                    metadata
                });

                res.json({
                    success: true,
                    serverName,
                    registeredAt: new Date().toISOString()
                });
            } catch (error) {
                this.log('error', 'Failed to register server:', error);
                res.status(500).json({ error: 'Failed to register server' });
            }
        });

        // Server discovery endpoint - get registered server info
        this.app.get('/discover-server/:serverName', async (req, res) => {
            if (!this.tokenRegistry) {
                return res.status(503).json({ error: 'Token registry not available' });
            }

            try {
                const { serverName } = req.params;
                const serverInfo = await this.tokenRegistry.getRegisteredServer(serverName);

                if (!serverInfo) {
                    return res.status(404).json({
                        error: 'Server not found',
                        serverName
                    });
                }

                res.json({
                    success: true,
                    serverName,
                    backend: serverInfo.backend,
                    metadata: serverInfo.metadata,
                    registeredAt: serverInfo.registeredAt
                });
            } catch (error) {
                this.log('error', 'Failed to discover server:', error);
                res.status(500).json({ error: 'Failed to discover server' });
            }
        });

        // Proxy stats endpoint (optional admin endpoint)
        this.app.get('/stats', async (req, res) => {
            if (!this.tokenRegistry) {
                return res.status(503).json({ error: 'Token registry not available' });
            }

            try {
                const stats = await this.tokenRegistry.getStats();
                res.json({
                    ...stats,
                    server: {
                        uptime: process.uptime(),
                        timestamp: new Date().toISOString()
                    }
                });
            } catch (error) {
                this.log('error', 'Failed to get stats:', error);
                res.status(500).json({ error: 'Failed to get stats' });
            }
        });

        // Handle API routes specifically (highest priority)
        this.app.use(
            `${this.config.proxyPrefix}/:token/api/*`,
            this.createTokenValidationMiddleware(),
            this.createApiProxyMiddleware()
        );

        // Handle static resources for MCP Web UI framework
        this.app.use(
            `${this.config.proxyPrefix}/:token/static/:filename`,
            this.createTokenValidationMiddleware(),
            this.createStaticProxyMiddleware()
        );

        // Main proxy route for HTML content: /mcp/:token/*
        this.app.use(
            `${this.config.proxyPrefix}/:token`,
            this.createTokenValidationMiddleware(),
            this.createProxyMiddleware()
        );

        // Catch-all for invalid routes
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Not Found',
                message: `Route ${req.originalUrl} not found`,
                hint: `Use ${this.config.proxyPrefix}/:token/... for proxied requests`
            });
        });
    }

    /**
     * Token validation middleware
     */
    private createTokenValidationMiddleware() {
        return async (req: Request, res: Response, next: NextFunction) => {
            const token = req.params.token;

            if (!token) {
                return res.status(400).json({ error: 'Token required' });
            }

            if (!this.tokenRegistry) {
                return res.status(503).json({ error: 'Token registry not available' });
            }

            try {
                const session = await this.tokenRegistry.validateToken(token);

                if (!session) {
                    return res.status(401).json({
                        error: 'Invalid or expired token',
                        hint: 'Request a new web UI session'
                    });
                }

                // Attach session info to request for proxy middleware
                (req as any).mcpSession = session;

                this.log('debug', `Valid token for user ${session.userId}, server ${session.serverName}`);
                next();
            } catch (error) {
                this.log('error', 'Token validation error:', error);
                res.status(500).json({ error: 'Token validation failed' });
            }
        };
    }

    /**
     * Create static resource proxy middleware
     */
    private createStaticProxyMiddleware() {
        return createProxyMiddleware({
            target: 'http://placeholder', // Will be overridden by router
            changeOrigin: true,
            ws: false, // No WebSocket for static files

            // Dynamic target resolution
            router: (req) => {
                const session = (req as any).mcpSession as EphemeralSession;

                if (session.backend.type === 'tcp') {
                    // Always use HTTP for internal backend communication
                    // The gateway handles HTTPS termination, backends run HTTP
                    const protocol = 'http';
                    return `http://${session.backend.host}:${session.backend.port}`;
                } else if (session.backend.type === 'unix') {
                    return `http://unix:${session.backend.socketPath}:`;
                }

                throw new Error(`Unsupported backend type: ${session.backend.type}`);
            },

            // Path rewriting - remove /mcp/:token prefix but keep /static/:filename
            pathRewrite: (path, req) => {
                const token = (req as any).params?.token || '';
                const prefix = `${this.config.proxyPrefix}/${token}`;
                return path.replace(prefix, '') || '/';
            },

            // Logging
            logLevel: this.config.enableLogging ? 'info' : 'silent',
            logProvider: () => ({
                log: (message: string) => this.log('debug', `[StaticProxy] ${message}`),
                debug: (message: string) => this.log('debug', `[StaticProxy] ${message}`),
                info: (message: string) => this.log('info', `[StaticProxy] ${message}`),
                warn: (message: string) => this.log('warn', `[StaticProxy] ${message}`),
                error: (message: string) => this.log('error', `[StaticProxy] ${message}`)
            }),

            // Error handling
            onError: (err, req, res) => {
                this.log('error', 'Static proxy error:', err);

                if (!res.headersSent) {
                    res.status(502).json({
                        error: 'Bad Gateway',
                        message: 'Failed to connect to backend service for static resource',
                        hint: 'The ephemeral service may have stopped or be unreachable'
                    });
                }
            },

            // Proxy events for debugging
            onProxyReq: (proxyReq, req, res) => {
                const session = (req as any).mcpSession as EphemeralSession;
                this.log('debug', `Proxying static ${req.method} ${req.path} to ${session.backend.type}`, {
                    userId: session.userId,
                    serverName: session.serverName,
                    target: session.backend.type === 'tcp'
                        ? `${session.backend.host}:${session.backend.port}`
                        : session.backend.socketPath
                });

                // Forward the JWT token to the backend server
                const token = (req as any).params?.token;
                if (token) {
                    // Add token as query parameter (preferred by GenericUIServer)
                    const separator = proxyReq.path.includes('?') ? '&' : '?';
                    proxyReq.path = `${proxyReq.path}${separator}token=${token}`;

                    // Also add as Authorization header for compatibility
                    proxyReq.setHeader('Authorization', `Bearer ${token}`);

                    this.log('debug', `Added token to static proxy request: ${token.substring(0, 20)}...`);
                }
            }
        } as Options);
    }

    /**
     * Create API-specific proxy middleware
     */
    private createApiProxyMiddleware() {
        return createProxyMiddleware({
            target: 'http://placeholder', // Will be overridden by router
            changeOrigin: true,
            ws: false, // No WebSocket for API calls
            timeout: 30000, // 30 second timeout
            proxyTimeout: 30000, // 30 second proxy timeout

            // Dynamic target resolution
            router: (req) => {
                const session = (req as any).mcpSession as EphemeralSession;

                if (session.backend.type === 'gateway') {
                    throw new Error('Gateway session - no backend server available');
                } else if (session.backend.type === 'tcp') {
                    if (!session.backend.host || !session.backend.port) {
                        throw new Error('TCP backend missing host or port');
                    }
                    // Always use HTTP for internal backend communication
                    // The gateway handles HTTPS termination, backends run HTTP
                    const protocol = 'http';
                    return `http://${session.backend.host}:${session.backend.port}`;
                } else if (session.backend.type === 'unix') {
                    if (!session.backend.socketPath) {
                        throw new Error('Unix backend missing socket path');
                    }
                    return `http://unix:${session.backend.socketPath}:`;
                }

                throw new Error(`Unsupported backend type: ${session.backend.type}`);
            },

            // Path rewriting - remove /mcp/:token prefix
            pathRewrite: (path, req) => {
                const token = (req as any).params?.token || '';
                const prefix = `${this.config.proxyPrefix}/${token}`;
                return path.replace(prefix, '') || '/';
            },

            // Logging
            logLevel: this.config.enableLogging ? 'info' : 'silent',
            logProvider: () => ({
                log: (message: string) => this.log('debug', `[ApiProxy] ${message}`),
                debug: (message: string) => this.log('debug', `[ApiProxy] ${message}`),
                info: (message: string) => this.log('info', `[ApiProxy] ${message}`),
                warn: (message: string) => this.log('warn', `[ApiProxy] ${message}`),
                error: (message: string) => this.log('error', `[ApiProxy] ${message}`)
            }),

            // Error handling
            onError: (err, req, res) => {
                this.log('error', 'API proxy error:', err);

                if (!res.headersSent) {
                    res.status(502).json({
                        error: 'Bad Gateway',
                        message: 'Failed to connect to backend service for API call',
                        hint: 'The ephemeral service may have stopped or be unreachable',
                        path: req.path,
                        method: req.method
                    });
                }
            },

            // NO HTML rewriting for API responses - this is the key fix
            onProxyRes: (proxyRes, req, res) => {
                const session = (req as any).mcpSession as EphemeralSession;
                const token = (req as any).params?.token;

                // Enhanced logging for API responses (skip polling requests)
                const isPollingRequest = req.method === 'GET' && (req.url?.includes('/api/data') || req.path?.includes('/api/data'));
                if (!isPollingRequest) {
                    this.log('info', `API response received`, {
                        statusCode: proxyRes.statusCode,
                        contentType: proxyRes.headers['content-type'],
                        contentLength: proxyRes.headers['content-length'],
                        path: req.path,
                        method: req.method,
                        userId: session.userId,
                        serverName: session.serverName
                    });
                }

                // For API calls, we should NOT intercept HTML responses
                // Instead, let them pass through as-is to help debug backend issues
                const contentType = proxyRes.headers['content-type'] || '';
                if (contentType.includes('text/html')) {
                    this.log('warn', `Backend returned HTML for API call - passing through for debugging`, {
                        path: req.path,
                        method: req.method,
                        contentType,
                        statusCode: proxyRes.statusCode,
                        hint: 'Check if the backend API endpoint exists and is working correctly'
                    });
                }

                // Log response body for debugging (skip polling requests)
                if (this.config.enableLogging && !isPollingRequest) {
                    let responseBody = '';
                    proxyRes.on('data', (chunk) => {
                        responseBody += chunk.toString();
                    });

                    proxyRes.on('end', () => {
                        this.log('debug', `API response body`, {
                            contentType,
                            totalLength: responseBody.length,
                            fullResponse: responseBody.length <= 500 ? responseBody : responseBody.substring(0, 500) + '...',
                            isJSON: this.isValidJSON(responseBody)
                        });
                    });
                }
            },

            // Proxy events for debugging
            onProxyReq: (proxyReq, req, res) => {
                const session = (req as any).mcpSession as EphemeralSession;

                // Skip logging for polling requests to reduce noise
                const isPollingRequest = req.method === 'GET' && (req.url?.includes('/api/data') || req.path?.includes('/api/data'));

                if (!isPollingRequest) {
                    this.log('info', `Proxying API ${req.method} ${req.path || req.url} to ${session.backend.type}`, {
                        userId: session.userId,
                        serverName: session.serverName,
                        target: session.backend.type === 'tcp'
                            ? `${session.backend.host}:${session.backend.port}`
                            : session.backend.socketPath
                    });

                    // Log the exact proxy request details
                    this.log('debug', `API proxy request details`, {
                        originalPath: req.path || req.url,
                        proxyPath: proxyReq.path,
                        targetHost: proxyReq.getHeader('host'),
                        targetProtocol: proxyReq.protocol,
                        method: proxyReq.method,
                        contentType: proxyReq.getHeader('content-type'),
                        contentLength: proxyReq.getHeader('content-length'),
                        hasBody: req.method === 'POST' && (req as any).body ? 'yes' : 'no',
                        bodyPreview: req.method === 'POST' && (req as any).body ? JSON.stringify((req as any).body).substring(0, 200) : 'none'
                    });
                }

                // Forward the JWT token to the backend server
                // Extract token from URL pattern /mcp/:token/api/...
                const token = session.token; // Use token from validated session

                // Debug: Log token extraction details (skip for polling requests)
                if (!isPollingRequest) {
                    this.log('debug', `Token extraction debug`, {
                        hasParams: !!(req as any).params,
                        paramsKeys: (req as any).params ? Object.keys((req as any).params) : [],
                        sessionToken: token ? `${token.substring(0, 20)}...` : 'null',
                        originalUrl: req.url,
                        pathInfo: req.path,
                        sessionUserId: session.userId,
                        sessionServerName: session.serverName
                    });
                }

                if (token) {
                    // Add token as query parameter (preferred by GenericUIServer)
                    const separator = proxyReq.path.includes('?') ? '&' : '?';
                    const oldPath = proxyReq.path;
                    proxyReq.path = `${proxyReq.path}${separator}token=${token}`;

                    // Also add as Authorization header for compatibility
                    proxyReq.setHeader('Authorization', `Bearer ${token}`);

                    // Debug: Log token addition (skip for polling requests)
                    if (!isPollingRequest) {
                        this.log('debug', `Token added to proxy request`, {
                            originalPath: oldPath,
                            newPath: proxyReq.path,
                            tokenPreview: `${token.substring(0, 20)}...`
                        });
                    }
                } else {
                    this.log('error', `No token found in session - backend request will fail!`);
                }
            }
        } as Options);
    }

    /**
     * Create dynamic proxy middleware
     */
    private createProxyMiddleware() {
        return createProxyMiddleware({
            target: 'http://placeholder', // Will be overridden by router
            changeOrigin: true,
            ws: true, // Enable WebSocket proxying
            timeout: 30000, // 30 second timeout
            proxyTimeout: 30000, // 30 second proxy timeout

            // Dynamic target resolution
            router: (req) => {
                const session = (req as any).mcpSession as EphemeralSession;

                if (session.backend.type === 'gateway') {
                    // Gateway-managed sessions don't have backend servers
                    // For now, we'll redirect to a placeholder or serve a message
                    // This could be enhanced to serve static content directly
                    throw new Error('Gateway session - no backend server available');
                } else if (session.backend.type === 'tcp') {
                    if (!session.backend.host || !session.backend.port) {
                        throw new Error('TCP backend missing host or port');
                    }
                    // Always use HTTP for internal backend communication
                    // The gateway handles HTTPS termination, backends run HTTP
                    const protocol = 'http';
                    return `http://${session.backend.host}:${session.backend.port}`;
                } else if (session.backend.type === 'unix') {
                    // For UNIX sockets, we need special handling
                    if (!session.backend.socketPath) {
                        throw new Error('Unix backend missing socket path');
                    }
                    return `http://unix:${session.backend.socketPath}:`;
                }

                throw new Error(`Unsupported backend type: ${session.backend.type}`);
            },

            // Path rewriting - remove /mcp/:token prefix
            pathRewrite: (path, req) => {
                const token = (req as any).params?.token || '';
                const prefix = `${this.config.proxyPrefix}/${token}`;
                return path.replace(prefix, '') || '/';
            },

            // Logging
            logLevel: this.config.enableLogging ? 'info' : 'silent',
            logProvider: () => ({
                log: (message: string) => this.log('debug', `[Proxy] ${message}`),
                debug: (message: string) => this.log('debug', `[Proxy] ${message}`),
                info: (message: string) => this.log('info', `[Proxy] ${message}`),
                warn: (message: string) => this.log('warn', `[Proxy] ${message}`),
                error: (message: string) => this.log('error', `[Proxy] ${message}`)
            }),

            // Error handling
            onError: (err, req, res) => {
                this.log('error', 'Proxy error:', err);

                if (!res.headersSent) {
                    res.status(502).json({
                        error: 'Bad Gateway',
                        message: 'Failed to connect to backend service',
                        hint: 'The ephemeral service may have stopped or be unreachable'
                    });
                }
            },

            // Response modification for HTML content
            onProxyRes: (proxyRes, req, res) => {
                const session = (req as any).mcpSession as EphemeralSession;
                const token = (req as any).params?.token;

                // Debug logging for all responses
                this.log('debug', `Backend response received`, {
                    statusCode: proxyRes.statusCode,
                    contentType: proxyRes.headers['content-type'],
                    contentLength: proxyRes.headers['content-length'],
                    path: req.path,
                    method: req.method
                });

                // Only modify HTML responses
                const contentType = proxyRes.headers['content-type'] || '';
                if (contentType.includes('text/html') && token) {
                    // Check if this is an API call that should return JSON
                    const isApiCall = req.path.includes('/api/');
                    if (isApiCall) {
                        this.log('warn', `Backend returned HTML for API call - this indicates a backend issue`, {
                            path: req.path,
                            method: req.method,
                            contentType,
                            statusCode: proxyRes.statusCode,
                            hint: 'The backend server may have crashed or be serving an error page'
                        });
                    }

                    // Remove content-length to allow modification
                    delete proxyRes.headers['content-length'];

                    // Buffer the response
                    let body = '';
                    proxyRes.on('data', (chunk) => {
                        body += chunk.toString();
                    });

                    proxyRes.on('end', () => {
                        // Rewrite static resource URLs - replace both href and src attributes
                        let rewrittenBody = body
                            .replace(/href=["']\/static\//g, `href="/mcp/${token}/static/`)
                            .replace(/src=["']\/static\//g, `src="/mcp/${token}/static/`);

                        const urlMatches = rewrittenBody.match(/\/mcp\/[^\/]+\/static\//g) || [];
                        this.log('debug', `Rewrote ${body.length} bytes of HTML, ${urlMatches.length} static URLs updated`);

                        // Send the modified response
                        res.end(rewrittenBody);
                    });

                    // Don't let the proxy send the original response
                    proxyRes.removeAllListeners('data');
                    proxyRes.removeAllListeners('end');
                } else {
                    // For non-HTML responses, log the first chunk to help debug
                    if (this.config.enableLogging) {
                        let firstChunk = true;
                        let responseBody = '';
                        proxyRes.on('data', (chunk) => {
                            responseBody += chunk.toString();
                            if (firstChunk) {
                                const chunkStr = chunk.toString();
                                this.log('debug', `Non-HTML response first chunk`, {
                                    contentType,
                                    chunkLength: chunkStr.length,
                                    chunkPreview: chunkStr.substring(0, 200) + (chunkStr.length > 200 ? '...' : ''),
                                    isJSON: this.isValidJSON(chunkStr)
                                });
                                firstChunk = false;
                            }
                        });

                        // Log the complete response body when the response ends
                        proxyRes.on('end', () => {
                            this.log('debug', `Complete non-HTML response received`, {
                                contentType,
                                totalLength: responseBody.length,
                                fullResponse: responseBody.length <= 1000 ? responseBody : responseBody.substring(0, 1000) + '...',
                                isCompleteJSON: this.isValidJSON(responseBody)
                            });
                        });
                    }
                }
            },

            // Proxy events for debugging
            onProxyReq: (proxyReq, req, res) => {
                const session = (req as any).mcpSession as EphemeralSession;
                this.log('debug', `Proxying ${req.method} ${req.path} to ${session.backend.type}`, {
                    userId: session.userId,
                    serverName: session.serverName,
                    target: session.backend.type === 'tcp'
                        ? `${session.backend.host}:${session.backend.port}`
                        : session.backend.socketPath
                });

                // Log the exact proxy request details
                this.log('debug', `Proxy request details`, {
                    originalPath: req.path,
                    proxyPath: proxyReq.path,
                    targetHost: proxyReq.getHeader('host'),
                    targetProtocol: proxyReq.protocol,
                    method: proxyReq.method
                });

                // Forward the JWT token to the backend server
                // The backend expects either query.token or Authorization header
                const token = (req as any).params?.token;
                if (token) {
                    // Add token as query parameter (preferred by GenericUIServer)
                    const separator = proxyReq.path.includes('?') ? '&' : '?';
                    proxyReq.path = `${proxyReq.path}${separator}token=${token}`;

                    // Also add as Authorization header for compatibility
                    proxyReq.setHeader('Authorization', `Bearer ${token}`);

                    this.log('debug', `Added token to proxy request: ${token.substring(0, 20)}...`);
                }
            },

            // WebSocket upgrade handling
            onProxyReqWs: (proxyReq, req, socket, options, head) => {
                const session = (req as any).mcpSession as EphemeralSession;
                this.log('info', `WebSocket upgrade for user ${session.userId}`, {
                    serverName: session.serverName,
                    target: session.backend.type === 'tcp'
                        ? `${session.backend.host}:${session.backend.port}`
                        : session.backend.socketPath
                });
            }
        } as Options);
    }

    /**
     * Initialize MongoDB connection and token registry
     */
    private async initializeDatabase(): Promise<void> {
        try {
            this.mongoClient = new MongoClient(this.config.mongoUrl);
            await this.mongoClient.connect();

            const db = this.mongoClient.db(this.config.mongoDbName);
            this.tokenRegistry = new TokenRegistry(db, {
                jwtSecret: this.config.jwtSecret,
                logger: this.config.logger || this.log.bind(this)
            });

            this.log('info', `Connected to MongoDB: ${this.config.mongoDbName}`);
        } catch (error) {
            this.log('error', 'Failed to initialize database:', error);
            throw error;
        }
    }

    /**
     * Start the gateway proxy server
     */
    async start(): Promise<void> {
        try {
            // Initialize database first
            await this.initializeDatabase();

            // Create HTTP/HTTPS server
            if (this.config.ssl) {
                const https = await import('https');
                const cert = fs.readFileSync(this.config.ssl.cert);
                const key = fs.readFileSync(this.config.ssl.key);

                this.server = https.createServer({ cert, key }, this.app);
                this.log('info', 'Created HTTPS server');
            } else {
                const http = await import('http');
                this.server = http.createServer(this.app);
                this.log('info', 'Created HTTP server');
            }

            // Setup WebSocket server for WebSocket proxying
            this.wss = new WebSocketServer({ server: this.server });

            // Start listening
            await new Promise<void>((resolve, reject) => {
                this.server!.listen(this.config.port, this.config.host, () => {
                    resolve();
                });

                this.server!.on('error', reject);
            });

            const protocol = this.config.ssl ? 'https' : 'http';
            this.log('info', `Gateway Proxy Server started on ${protocol}://${this.config.host}:${this.config.port}`);
            this.log('info', `Proxy endpoint: ${protocol}://${this.config.host}:${this.config.port}${this.config.proxyPrefix}/:token/...`);

        } catch (error) {
            this.log('error', 'Failed to start server:', error);
            throw error;
        }
    }

    /**
     * Stop the gateway proxy server
     */
    async stop(): Promise<void> {
        this.log('info', 'Stopping Gateway Proxy Server...');

        try {
            // Close WebSocket server with timeout
            if (this.wss) {
                this.log('debug', 'Closing WebSocket server...');
                await Promise.race([
                    new Promise<void>((resolve) => {
                        this.wss!.close(() => resolve());
                    }),
                    new Promise<void>((resolve) => setTimeout(resolve, 5000)) // 5 second timeout
                ]);
                this.wss = undefined;
                this.log('debug', 'WebSocket server closed');
            }

            // Close HTTP server with timeout
            if (this.server) {
                this.log('debug', 'Closing HTTP server...');
                await Promise.race([
                    new Promise<void>((resolve) => {
                        this.server!.close(() => resolve());
                    }),
                    new Promise<void>((resolve) => setTimeout(resolve, 10000)) // 10 second timeout
                ]);
                this.server = undefined;
                this.log('debug', 'HTTP server closed');
            }

            // Close MongoDB connection with timeout
            if (this.mongoClient) {
                this.log('debug', 'Closing MongoDB connection...');
                await Promise.race([
                    this.mongoClient.close(),
                    new Promise<void>((resolve) => setTimeout(resolve, 5000)) // 5 second timeout
                ]);
                this.mongoClient = undefined;
                this.tokenRegistry = undefined;
                this.log('debug', 'MongoDB connection closed');
            }

            this.log('info', 'Gateway Proxy Server stopped successfully');
        } catch (error) {
            this.log('error', 'Error during shutdown:', error);
            // Force cleanup even if there were errors
            this.wss = undefined;
            this.server = undefined;
            this.mongoClient = undefined;
            this.tokenRegistry = undefined;
            throw error;
        }
    }

    /**
     * Get the token registry instance
     */
    getTokenRegistry(): TokenRegistry | undefined {
        return this.tokenRegistry;
    }

    /**
     * Get server stats
     */
    async getStats(): Promise<any> {
        if (!this.tokenRegistry) {
            return { error: 'Token registry not initialized' };
        }

        const registryStats = await this.tokenRegistry.getStats();

        return {
            ...registryStats,
            server: {
                uptime: process.uptime(),
                port: this.config.port,
                host: this.config.host,
                ssl: !!this.config.ssl,
                proxyPrefix: this.config.proxyPrefix
            }
        };
    }

    /**
     * Simple logging utility
     */
    private log(level: string, message: string, data?: any): void {
        if (this.config.logger) {
            this.config.logger(level, message, data);
        } else if (this.config.enableLogging) {
            const timestamp = new Date().toISOString();
            console.error(`[${timestamp}][${level.toUpperCase()}][GatewayProxy] ${message}`);
            if (data) {
                console.error(JSON.stringify(data, null, 2));
            }
        }
    }

    /**
     * Helper to check if a string is valid JSON.
     * This is a simplified check and might not be perfect for all JSON structures.
     */
    private isValidJSON(str: string): boolean {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    }
}
