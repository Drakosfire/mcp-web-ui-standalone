import { v4 as uuidv4 } from 'uuid';
import { WebUISession } from '../types/index.js';
import { TokenRegistry, EphemeralSession } from '../proxy/TokenRegistry.js';
import { MongoClient, Db } from 'mongodb';
import os from 'os';

/**
 * Session Manager that handles both direct and proxy modes
 * 
 * Direct Mode: Uses local memory for session management
 * Proxy Mode: Uses TokenRegistry (MongoDB) for distributed session management
 */
export class SessionManager {
    // Version tracking for debugging
    private readonly VERSION = '1.1.4-gateway-test';

    // Local session management (direct mode)
    private localSessions = new Map<string, WebUISession>();
    private usedPorts = new Set<number>();
    private blockedPorts = new Set<number>();
    private portRange: [number, number];
    private baseUrl: string;
    private protocol: string;
    private userSessionLimits = new Map<string, { count: number; lastCreated: Date }>();

    // Proxy mode components
    private tokenRegistry?: TokenRegistry;
    private mongoClient?: MongoClient;
    private proxyMode: boolean = false;
    private serverName: string;

    constructor(
        sessionTimeout: number = 30 * 60 * 1000,
        portRange: [number, number] = [3000, 65535],
        baseUrl = 'localhost',
        protocol?: string,
        blockedPorts: number[] = [],
        options: {
            proxyMode?: boolean;
            mongoUrl?: string;
            mongoDbName?: string;
            jwtSecret?: string;
            serverName?: string;
            logger?: (level: string, message: string, data?: any) => void;
        } = {}
    ) {
        // Validate blocked ports are within range
        const [minPort, maxPort] = portRange;
        const invalidPorts = blockedPorts.filter(port => port < minPort || port > maxPort);
        if (invalidPorts.length > 0) {
            throw new Error(`Blocked ports ${invalidPorts.join(', ')} are outside the port range [${minPort}, ${maxPort}]`);
        }

        this.blockedPorts = new Set(blockedPorts);
        this.portRange = portRange;
        this.serverName = options.serverName || 'mcp-webui';

        // Check if we're in development mode
        const isDevelopment = process.env.NODE_ENV === 'development' ||
            process.env.MCP_WEB_UI_DEV_MODE === 'true' ||
            baseUrl.includes('localhost') ||
            baseUrl.includes('127.0.0.1') ||
            baseUrl.includes('dev.');

        // Auto-detect protocol from baseUrl if not provided
        if (protocol) {
            this.protocol = protocol;
            // If baseUrl contains a protocol, strip it since we have an explicit protocol
            if (baseUrl.startsWith('https://')) {
                this.baseUrl = baseUrl.replace('https://', '');
            } else if (baseUrl.startsWith('http://')) {
                this.baseUrl = baseUrl.replace('http://', '');
            } else {
                this.baseUrl = baseUrl;
            }
        } else {
            // Extract protocol from baseUrl if it contains one
            if (baseUrl.startsWith('https://')) {
                this.protocol = 'https';
                this.baseUrl = baseUrl.replace('https://', '');
            } else if (baseUrl.startsWith('http://')) {
                this.protocol = 'http';
                this.baseUrl = baseUrl.replace('http://', '');
            } else {
                // In development mode, default to HTTP
                this.protocol = isDevelopment ? 'http' : 'http';
                this.baseUrl = baseUrl;
            }
        }

        // Force HTTP in development mode
        if (isDevelopment) {
            this.protocol = 'http';
            this.log('INFO', `Development mode detected, forcing HTTP protocol`);
        }

        // Debug logging
        this.log('INFO', `SessionManager initialized with baseUrl: "${baseUrl}", final baseUrl: "${this.baseUrl}", protocol: "${this.protocol}", isDevelopment: ${isDevelopment}`);

        // Initialize proxy mode if requested
        this.proxyMode = options.proxyMode || false;
        if (this.proxyMode) {
            this.initializeProxyMode(options).catch(error => {
                this.log('ERROR', 'Failed to initialize proxy mode:', error);
            });
        }
    }

    /**
     * Initialize proxy mode with MongoDB connection
     */
    private async initializeProxyMode(options: {
        mongoUrl?: string;
        mongoDbName?: string;
        jwtSecret?: string;
        logger?: (level: string, message: string, data?: any) => void;
    }): Promise<void> {
        const mongoUrl = options.mongoUrl || process.env.MCP_WEB_UI_MONGO_URL;
        const mongoDbName = options.mongoDbName || process.env.MCP_WEB_UI_MONGO_DB_NAME || 'mcp_webui';
        const jwtSecret = options.jwtSecret || process.env.MCP_WEB_UI_JWT_SECRET;

        if (!mongoUrl) {
            throw new Error('MongoDB URL is required for proxy mode');
        }

        if (!jwtSecret) {
            throw new Error('JWT secret is required for proxy mode');
        }

        try {
            this.mongoClient = new MongoClient(mongoUrl);
            await this.mongoClient.connect();

            const db = this.mongoClient.db(mongoDbName);
            this.tokenRegistry = new TokenRegistry(db, { jwtSecret });

            this.log('INFO', 'Proxy mode initialized successfully');
        } catch (error) {
            this.log('ERROR', 'Failed to initialize proxy mode:', error);
            throw error;
        }
    }

    /**
     * Check if proxy mode is enabled
     */
    isProxyMode(): boolean {
        return this.proxyMode;
    }

    /**
     * Create a new session for a user
     * Automatically terminates any existing session for the same user
     */
    async createSession(userId: string): Promise<WebUISession> {
        this.log('INFO', `[GATEWAY-DEBUG] SessionManager VERSION: ${this.VERSION}`);
        this.log('INFO', `[GATEWAY-DEBUG] SessionManager.createSession() called for user: ${userId}`);

        // Check if we should use gateway mode
        const useGateway = process.env.MCP_WEB_UI_USE_GATEWAY === 'true';
        const gatewayUrl = process.env.MCP_WEB_UI_GATEWAY_URL || 'http://localhost:3082';

        // Debug logging for gateway mode detection
        this.log('INFO', `[GATEWAY-DEBUG] Environment check:`, {
            MCP_WEB_UI_USE_GATEWAY: process.env.MCP_WEB_UI_USE_GATEWAY,
            MCP_WEB_UI_GATEWAY_URL: process.env.MCP_WEB_UI_GATEWAY_URL,
            useGateway: useGateway,
            gatewayUrl: gatewayUrl,
            userId: userId
        });

        if (useGateway) {
            this.log('INFO', `[GATEWAY-DEBUG] Using gateway mode, calling createGatewaySession`);
            return this.createGatewaySession(userId, gatewayUrl);
        }

        this.log('INFO', `[GATEWAY-DEBUG] Using direct mode, calling createDirectSession`);
        return this.createDirectSession(userId);
    }

    /**
     * Create a session through the gateway
     */
    private async createGatewaySession(userId: string, gatewayUrl: string): Promise<WebUISession> {
        let allocatedPort: number = 0;
        try {
            this.log('INFO', `[GATEWAY-DEBUG] Starting gateway session creation for user ${userId}`);
            this.log('INFO', `[GATEWAY-DEBUG] Gateway URL: ${gatewayUrl}`);

            // Cleanup expired sessions for this user
            const expiredSessions = Array.from(this.localSessions.entries())
                .filter(([sessionId, session]) => session.userId === userId && session.expiresAt <= new Date());

            for (const [sessionId, session] of expiredSessions) {
                this.log('INFO', `[GATEWAY-DEBUG] Cleaning up expired session for user ${userId}: ${session.token.substring(0, 20)}...`);
                this.localSessions.delete(sessionId);
            }

            // Check for existing active session for this user
            const existingSession = Array.from(this.localSessions.values())
                .find(session => session.userId === userId && session.isActive && session.expiresAt > new Date());

            if (existingSession) {
                this.log('INFO', `[GATEWAY-DEBUG] Reusing existing session for user ${userId}: ${existingSession.token.substring(0, 20)}...`);
                return existingSession;
            }

            // Try to discover existing registered server first
            const serverName = 'todoodles'; // This should be configurable
            let backend;

            try {
                this.log('INFO', `[GATEWAY-DEBUG] Attempting to discover registered server: ${serverName}`);
                const discoveredServer = await this.discoverRegisteredServer(serverName);

                if (discoveredServer) {
                    // Check if the discovered server's port is available
                    const discoveredPort = discoveredServer.backend.port;
                    if (discoveredPort && this.usedPorts.has(discoveredPort)) {
                        this.log('WARN', `[GATEWAY-DEBUG] Discovered server port ${discoveredPort} is already in use, allocating new port`);
                        // Allocate a new port instead
                        allocatedPort = this.allocatePort();
                        const resolvedBackendHost = this.resolveBackendHost();
                        backend = {
                            type: 'tcp',
                            host: resolvedBackendHost,
                            port: allocatedPort
                        };
                    } else {
                        backend = discoveredServer.backend;
                        // Mark the discovered port as used
                        if (discoveredPort) {
                            this.usedPorts.add(discoveredPort);
                        }
                        this.log('INFO', `[GATEWAY-DEBUG] Using discovered server: ${JSON.stringify(backend)}`);
                    }
                } else {
                    this.log('WARN', `[GATEWAY-DEBUG] No registered server found for ${serverName}, falling back to port allocation`);
                    // Fallback to old behavior
                    allocatedPort = this.allocatePort();
                    const resolvedBackendHost = this.resolveBackendHost();
                    backend = {
                        type: 'tcp',
                        host: resolvedBackendHost,
                        port: allocatedPort
                    };
                }
            } catch (error) {
                this.log('ERROR', `[GATEWAY-DEBUG] Server discovery failed: ${error}, falling back to port allocation`);
                // Fallback to old behavior
                allocatedPort = this.allocatePort();
                const resolvedBackendHost = this.resolveBackendHost();
                backend = {
                    type: 'tcp',
                    host: resolvedBackendHost,
                    port: allocatedPort
                };
            }

            const requestBody = {
                userId,
                serverName,
                backend,
                ttlMinutes: 30
            };

            this.log('INFO', `[GATEWAY-DEBUG] Request body:`, requestBody);
            this.log('INFO', `[GATEWAY-DEBUG] Making POST request to ${gatewayUrl}/create-session`);

            // Call gateway to create session
            const response = await fetch(`${gatewayUrl}/create-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            this.log('INFO', `[GATEWAY-DEBUG] Response received:`, {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries())
            });

            if (!response.ok) {
                this.log('ERROR', `[GATEWAY-DEBUG] Gateway session creation failed: ${response.statusText}`);
                throw new Error(`Gateway session creation failed: ${response.statusText}`);
            }

            const result = await response.json();
            this.log('INFO', `[GATEWAY-DEBUG] Gateway response:`, result);

            const token = result.token;

            // Check if we already have a local session with this token (from previous gateway call)
            const existingLocalSession = Array.from(this.localSessions.values())
                .find(session => session.token === token);

            if (existingLocalSession) {
                this.log('INFO', `[GATEWAY-DEBUG] Found existing local session for token ${token.substring(0, 20)}..., reusing session ${existingLocalSession.id}`);
                return existingLocalSession;
            }

            // Generate URL with gateway token
            const proxyPrefix = process.env.MCP_WEB_UI_PROXY_PREFIX || '/mcp';
            const sessionUrl = `${this.protocol}://${this.baseUrl}${proxyPrefix}/${token}/`;

            const session: WebUISession = {
                id: uuidv4(),
                token,
                userId,
                url: sessionUrl,
                port: backend.port || allocatedPort, // UI server will bind to this port
                startTime: new Date(),
                lastActivity: new Date(),
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                isActive: true
            };

            // Store the session in local memory for future reuse
            this.localSessions.set(session.id, session);

            this.log('INFO', `Created gateway session ${session.id} for user ${userId}`);
            return session;
        } catch (error) {

            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;

            this.log('ERROR', `[GATEWAY-DEBUG] Failed to create gateway session:`, {
                error: errorMessage,
                stack: errorStack,
                userId: userId
            });
            this.log('INFO', `[GATEWAY-DEBUG] Falling back to direct session creation`);
            // Fallback to direct session
            // In gateway mode, no ports were allocated, so no cleanup needed
            try {
                const fallback = await this.createDirectSession(userId);
                return fallback;
            } catch (fallbackError) {
                throw fallbackError;
            }
        }
    }

    /**
     * Determine the backend host that the gateway can use to reach this UI server
     * Priority:
     * 1) MCP_WEB_UI_BACKEND_HOST env var (explicit override)
     * 2) First non-internal IPv4 address (container/host primary interface)
     * 3) Fallback to 127.0.0.1
     */
    private resolveBackendHost(): string {
        const explicit = process.env.MCP_WEB_UI_BACKEND_HOST;
        if (explicit && explicit.trim().length > 0) {
            this.log('INFO', `[GATEWAY-DEBUG] Using explicit backend host from env: ${explicit}`);
            return explicit.trim();
        }

        try {
            const interfaces = os.networkInterfaces();
            for (const name of Object.keys(interfaces)) {
                const addrs = interfaces[name] || [];
                for (const addr of addrs) {
                    if (addr && addr.family === 'IPv4' && !addr.internal) {
                        this.log('INFO', `[GATEWAY-DEBUG] Auto-detected backend host ${addr.address} on iface ${name}`);
                        return addr.address;
                    }
                }
            }
        } catch (e) {
            // Ignore detection errors
        }

        this.log('WARN', `[GATEWAY-DEBUG] Falling back to 127.0.0.1 for backend host`);
        return '127.0.0.1';
    }

    /**
     * Discover a registered server from the gateway
     */
    private async discoverRegisteredServer(serverName: string): Promise<any | null> {
        const gatewayUrl = process.env.MCP_WEB_UI_GATEWAY_URL || 'http://localhost:3081';

        try {
            this.log('INFO', `[GATEWAY-DEBUG] Querying gateway for server: ${serverName}`);

            const response = await fetch(`${gatewayUrl}/discover-server/${serverName}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.status === 404) {
                this.log('INFO', `[GATEWAY-DEBUG] Server ${serverName} not registered with gateway`);
                return null;
            }

            if (!response.ok) {
                throw new Error(`Gateway discovery failed: ${response.statusText}`);
            }

            const result = await response.json();
            this.log('INFO', `[GATEWAY-DEBUG] Gateway discovery result:`, result);

            return result;
        } catch (error: any) {
            this.log('ERROR', `[GATEWAY-DEBUG] Failed to discover server from gateway: ${error.message}`);
            return null;
        }
    }

    /**
     * Create a direct session (original logic)
     */
    private async createDirectSession(userId: string): Promise<WebUISession> {
        // Rate limiting: max 5 sessions per user per hour
        const sessionTime = new Date();
        const userLimits = this.userSessionLimits.get(userId);

        if (userLimits) {
            const hourAgo = new Date(sessionTime.getTime() - 60 * 60 * 1000);
            if (userLimits.lastCreated > hourAgo && userLimits.count >= 5) {
                throw new Error('Session creation rate limit exceeded. Maximum 5 sessions per hour.');
            }

            if (userLimits.lastCreated > hourAgo) {
                userLimits.count++;
            } else {
                userLimits.count = 1;
            }
            userLimits.lastCreated = sessionTime;
        } else {
            this.userSessionLimits.set(userId, { count: 1, lastCreated: sessionTime });
        }

        // Check for and terminate any existing session for this user
        const existingSession = await this.getSessionByUserId(userId);
        if (existingSession) {
            this.log('INFO', `Terminating existing session ${existingSession.id} for user ${userId} before creating new one`);
            await this.terminateSession(existingSession.id);
        }

        const sessionId = uuidv4();
        const port = this.allocatePort();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

        if (this.proxyMode && this.tokenRegistry) {
            // Proxy mode: Create session through TokenRegistry
            const resolvedBackendHost = this.resolveBackendHost();
            const proxySession = await this.tokenRegistry.createSession({
                userId,
                serverName: this.serverName,
                backend: {
                    type: 'tcp',
                    host: resolvedBackendHost,  // ✅ Add the missing host
                    port
                },
                metadata: { sessionId }
            });

            const proxyPrefix = process.env.MCP_WEB_UI_PROXY_PREFIX || '/mcp';
            const proxyBaseUrl = process.env.MCP_WEB_UI_PROXY_BASE_URL || this.baseUrl;
            const sessionUrl = `${this.protocol}://${proxyBaseUrl}${proxyPrefix}/${proxySession.token}/`;

            const session: WebUISession = {
                id: sessionId,
                token: proxySession.token,
                userId,
                url: sessionUrl,
                port,
                startTime: now,
                lastActivity: now,
                expiresAt,
                isActive: true
            };

            // Store locally for port management
            this.localSessions.set(sessionId, session);
            this.log('INFO', `Created proxy session ${sessionId} for user ${userId} on port ${port}`);

            return session;
        } else {
            // Direct mode: Create local session
            const token = uuidv4();

            // Check if we should use gateway proxy route instead of direct port access
            const proxyPrefix = process.env.MCP_WEB_UI_PROXY_PREFIX;
            const useGateway = process.env.MCP_WEB_UI_USE_GATEWAY === 'true';
            let sessionUrl: string;

            if (useGateway && proxyPrefix && proxyPrefix.trim().length > 0) {
                // Use gateway proxy route: /mcp/<token>/ (token-based routing)
                // The token will be provided by the gateway after session creation
                sessionUrl = `${this.protocol}://${this.baseUrl}${proxyPrefix}/<token>/`;
                this.log('INFO', `Using gateway proxy route: ${sessionUrl}`);
            } else if (proxyPrefix && proxyPrefix.trim().length > 0) {
                // Use nginx proxy route: /mcp/ui/<port>/?token=... (legacy)
                sessionUrl = `${this.protocol}://${this.baseUrl}${proxyPrefix}/${port}/?token=${token}`;
                this.log('INFO', `Using nginx proxy route: ${sessionUrl}`);
            } else {
                // Use direct port access: :port/?token=...
                sessionUrl = `${this.protocol}://${this.baseUrl}:${port}?token=${token}`;
                this.log('INFO', `Using direct port access: ${sessionUrl}`);
            }

            // Debug logging for URL generation
            this.log('INFO', `Direct mode URL generation - protocol: "${this.protocol}", baseUrl: "${this.baseUrl}", port: ${port}, proxyPrefix: "${proxyPrefix}", final URL: "${sessionUrl}"`);

            const session: WebUISession = {
                id: sessionId,
                token,
                userId,
                url: sessionUrl,
                port,
                startTime: now,
                lastActivity: now,
                expiresAt,
                isActive: true
            };

            this.localSessions.set(sessionId, session);
            this.log('INFO', `Created direct session ${sessionId} for user ${userId} on port ${port}`);

            return session;
        }
    }

    /**
     * Get session by token (for authentication)
     */
    async getSessionByToken(token: string, updateActivity = false): Promise<WebUISession | null> {
        if (this.proxyMode && this.tokenRegistry) {
            // Proxy mode: Validate through TokenRegistry
            const proxySession = await this.tokenRegistry.validateToken(token);
            if (!proxySession) {
                return null;
            }

            // Convert to WebUISession format
            const proxyPrefix = process.env.MCP_WEB_UI_PROXY_PREFIX || '/mcp';
            const proxyBaseUrl = process.env.MCP_WEB_UI_PROXY_BASE_URL || this.baseUrl;
            const sessionUrl = `${this.protocol}://${proxyBaseUrl}${proxyPrefix}/${token}/`;

            return {
                id: proxySession.metadata?.sessionId || proxySession.token.substring(0, 8),
                token,
                userId: proxySession.userId,
                url: sessionUrl,
                port: proxySession.backend.port || 0,
                startTime: proxySession.createdAt,
                lastActivity: proxySession.lastAccessedAt,
                expiresAt: proxySession.expiresAt,
                isActive: true
            };
        } else {
            // Direct mode: Search local sessions
            for (const session of this.localSessions.values()) {
                if (session.token === token && session.isActive) {
                    if (updateActivity) {
                        session.lastActivity = new Date();
                    }
                    return session;
                }
            }
            return null;
        }
    }

    /**
     * Get session by ID
     */
    async getSession(sessionId: string): Promise<WebUISession | null> {
        if (this.proxyMode && this.tokenRegistry) {
            // Proxy mode: Search through TokenRegistry
            // For session ID lookup, we need to search through all sessions
            // This is not ideal for performance, but TokenRegistry doesn't have a direct ID lookup
            const stats = await this.tokenRegistry.getStats();
            if (stats.totalActiveSessions === 0) {
                return null;
            }

            // For now, return null for proxy mode session ID lookup
            // In a real implementation, you might want to add an index on metadata.sessionId
            this.log('WARN', 'Session ID lookup not supported in proxy mode - use token lookup instead');
            return null;
        } else {
            // Direct mode: Search local sessions
            return this.localSessions.get(sessionId) || null;
        }
    }

    /**
     * Get session by user ID
     */
    async getSessionByUserId(userId: string): Promise<WebUISession | null> {
        if (this.proxyMode && this.tokenRegistry) {
            // Proxy mode: Search through TokenRegistry
            const sessions = await this.tokenRegistry.getUserSessions(userId);
            if (sessions.length === 0) {
                return null;
            }

            // Return the most recent session for the user
            const proxySession = sessions[0]; // getUserSessions returns sorted by createdAt desc

            // Convert to WebUISession format
            const proxyPrefix = process.env.MCP_WEB_UI_PROXY_PREFIX || '/mcp';
            const proxyBaseUrl = process.env.MCP_WEB_UI_PROXY_BASE_URL || this.baseUrl;
            const sessionUrl = `${this.protocol}://${proxyBaseUrl}${proxyPrefix}/${proxySession.token}/`;

            return {
                id: proxySession.metadata?.sessionId || proxySession.token.substring(0, 8),
                token: proxySession.token,
                userId: proxySession.userId,
                url: sessionUrl,
                port: proxySession.backend.port || 0,
                startTime: proxySession.createdAt,
                lastActivity: proxySession.lastAccessedAt,
                expiresAt: proxySession.expiresAt,
                isActive: true
            };
        } else {
            // Direct mode: Search local sessions
            for (const session of this.localSessions.values()) {
                if (session.userId === userId && session.isActive) {
                    return session;
                }
            }
            return null;
        }
    }

    /**
     * Get all active sessions
     */
    async getActiveSessions(): Promise<WebUISession[]> {
        if (this.proxyMode && this.tokenRegistry) {
            // Proxy mode: Get from TokenRegistry
            // Note: TokenRegistry doesn't have a direct getAllActiveSessions method
            // We'll need to implement this differently or use stats
            const stats = await this.tokenRegistry.getStats();
            if (stats.totalActiveSessions === 0) {
                return [];
            }

            // For now, return empty array in proxy mode
            // In a real implementation, you might want to add a method to get all sessions
            this.log('WARN', 'getActiveSessions not fully supported in proxy mode');
            return [];
        } else {
            // Direct mode: Return local sessions
            return Array.from(this.localSessions.values()).filter(session => session.isActive);
        }
    }

    /**
     * Terminate a session
     */
    async terminateSession(sessionId: string): Promise<boolean> {
        if (this.proxyMode && this.tokenRegistry) {
            // Proxy mode: Terminate through TokenRegistry
            const session = await this.getSession(sessionId);
            if (!session) {
                return false;
            }

            const success = await this.tokenRegistry.revokeSession(session.token);
            if (success) {
                // Free the port
                this.freePort(session.port);
                this.log('INFO', `Terminated proxy session ${sessionId}`);
            }
            return success;
        } else {
            // Direct mode: Terminate local session
            const session = this.localSessions.get(sessionId);
            if (!session) {
                return false;
            }

            session.isActive = false;
            this.freePort(session.port);
            this.localSessions.delete(sessionId);
            this.log('INFO', `Terminated direct session ${sessionId}`);
            return true;
        }
    }

    /**
     * Extend session by token
     */
    async extendSessionByToken(token: string, extensionMinutes: number): Promise<boolean> {
        if (this.proxyMode && this.tokenRegistry) {
            // Proxy mode: Extend through TokenRegistry
            return await this.tokenRegistry.extendSession(token, extensionMinutes);
        } else {
            // Direct mode: Extend local session
            const session = await this.getSessionByToken(token);
            if (!session) {
                return false;
            }

            session.expiresAt = new Date(session.expiresAt.getTime() + extensionMinutes * 60 * 1000);
            this.log('INFO', `Extended session ${session.id} by ${extensionMinutes} minutes`);
            return true;
        }
    }

    /**
     * Get session statistics
     */
    async getStats(): Promise<{
        mode: 'direct' | 'proxy';
        totalActiveSessions: number;
        usedPorts: number[];
        sessionsByUser: Record<string, number>;
        sessionsByServer?: Record<string, number>;
    }> {
        if (this.proxyMode && this.tokenRegistry) {
            // Proxy mode: Get stats from TokenRegistry
            const stats = await this.tokenRegistry.getStats();

            return {
                mode: 'proxy',
                totalActiveSessions: stats.totalActiveSessions,
                usedPorts: Array.from(this.usedPorts),
                sessionsByUser: stats.sessionsByUser,
                sessionsByServer: stats.sessionsByServer
            };
        } else {
            // Direct mode: Get stats from local sessions
            const sessionsByUser: Record<string, number> = {};
            this.localSessions.forEach(session => {
                if (session.isActive) {
                    sessionsByUser[session.userId] = (sessionsByUser[session.userId] || 0) + 1;
                }
            });

            return {
                mode: 'direct',
                totalActiveSessions: Array.from(this.localSessions.values()).filter(s => s.isActive).length,
                usedPorts: Array.from(this.usedPorts),
                sessionsByUser
            };
        }
    }

    /**
     * Allocate a random port from the available range
     */
    private allocatePort(): number {
        const [minPort, maxPort] = this.portRange;
        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            const port = Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort;

            if (!this.usedPorts.has(port) && !this.blockedPorts.has(port)) {
                this.usedPorts.add(port);
                return port;
            }

            attempts++;
        }

        throw new Error(`Unable to allocate port after ${maxAttempts} attempts`);
    }

    /**
     * Free a port when session is terminated
     */
    private freePort(port: number): void {
        this.usedPorts.delete(port);
    }

    /**
     * Clean up expired sessions
     */
    async cleanupExpiredSessions(): Promise<void> {
        if (this.proxyMode && this.tokenRegistry) {
            // Proxy mode: MongoDB TTL handles cleanup automatically
            // Just clean up local port tracking
            // Note: We can't easily get all active sessions in proxy mode
            // so we'll skip port cleanup for now
            this.log('INFO', 'Proxy mode cleanup: MongoDB TTL handles session cleanup automatically');
        } else {
            // Direct mode: Clean up expired local sessions
            const now = new Date();
            for (const [sessionId, session] of this.localSessions.entries()) {
                if (session.expiresAt < now) {
                    this.log('INFO', `Cleaning up expired session ${sessionId}`);
                    session.isActive = false;
                    this.freePort(session.port);
                    this.localSessions.delete(sessionId);
                }
            }
        }
    }

    /**
     * Shutdown the session manager
     */
    async shutdown(): Promise<void> {
        if (this.mongoClient) {
            await this.mongoClient.close();
        }

        // Clear all sessions
        this.localSessions.clear();
        this.usedPorts.clear();
        this.userSessionLimits.clear();

        this.log('INFO', 'SessionManager shutdown complete');
    }

    /**
     * Log messages with optional data
     */
    private log(level: string, message: string, data?: any): void {
        const timestamp = new Date().toISOString();
        if (data) {
            console.log(`[${timestamp}][${level}][SessionManager] ${message}`, data);
        } else {
            console.log(`[${timestamp}][${level}][SessionManager] ${message}`);
        }
    }
} 