import { SessionManager } from './session/SessionManager.js';
import { GenericUIServer } from './server/GenericUIServer.js';
import { UIServerConfigBuilder } from './server/UIServerConfig.js';
import {
    MCPWebUIConfig,
    WebUISession
} from './types/index.js';

/**
 * Main MCP Web UI framework class
 * Orchestrates session management and dynamic UI servers
 * Now uses GenericUIServer with MCP server CSS architecture
 */
export class MCPWebUI<T = any> {
    private sessionManager: SessionManager;
    private activeServers = new Map<string, GenericUIServer>();
    private config: MCPWebUIConfig<T> & {
        sessionTimeout: number;
        pollInterval: number;
        portRange: [number, number];
        blockedPorts: number[];
        enableLogging: boolean;
        baseUrl: string;
        protocol: string;
        bindAddress: string;
        cssPath: string;
        serverName: string;
        proxyMode: boolean;
        mongoDbName: string;
    };
    private cleanupInterval?: NodeJS.Timeout;

    constructor(config: MCPWebUIConfig<T>) {
        // Set defaults with proper blocked ports handling
        this.config = {
            sessionTimeout: 30 * 60 * 1000, // 30 minutes
            pollInterval: 2000, // 2 seconds
            portRange: [3000, 65535],
            blockedPorts: config.blockedPorts || [], // Use provided value or default
            enableLogging: true,
            baseUrl: 'localhost',
            protocol: 'http', // Default protocol
            // If baseUrl is not localhost, default to binding all interfaces
            bindAddress: config.baseUrl && config.baseUrl !== 'localhost' ? '0.0.0.0' : 'localhost',
            cssPath: './static', // Default MCP server CSS path
            serverName: '', // Default server name
            proxyMode: false, // Default to direct mode
            mongoUrl: undefined, // No MongoDB by default
            mongoDbName: 'mcp_webui', // Default database name
            jwtSecret: undefined, // No JWT by default
            ...config
        };

        // Auto-detect protocol from baseUrl if not explicitly provided
        if (!config.protocol && config.baseUrl) {
            if (config.baseUrl.startsWith('https://')) {
                this.config.protocol = 'https';
            } else if (config.baseUrl.startsWith('http://')) {
                this.config.protocol = 'http';
            }
        }

        // Detect proxy mode (including gateway mode)
        const proxyMode = !!(config.proxyMode ||
            process.env.MCP_WEB_UI_PROXY_MODE === 'true' ||
            process.env.MCP_WEB_UI_MONGO_URL ||
            process.env.MCP_WEB_UI_USE_GATEWAY === 'true');

        // Override bindAddress for proxy mode - always bind to localhost when using proxy
        if (proxyMode ||
            (process.env.MCP_WEB_UI_PROXY_PREFIX && process.env.MCP_WEB_UI_PROXY_PREFIX.trim().length > 0)) {
            this.config.bindAddress = 'localhost';
        } else if (process.env.MCP_WEB_UI_BIND_ADDRESS) {
            // Use explicit bind address from environment
            this.config.bindAddress = process.env.MCP_WEB_UI_BIND_ADDRESS;
        }

        // Create session manager with proxy mode support
        this.sessionManager = new SessionManager(
            this.config.sessionTimeout,
            this.config.portRange,
            this.config.baseUrl,
            this.config.protocol,
            this.config.blockedPorts,
            {
                proxyMode,
                mongoUrl: this.config.mongoUrl,
                mongoDbName: this.config.mongoDbName,
                jwtSecret: this.config.jwtSecret,
                serverName: this.config.serverName,
                logger: (level: string, message: string, data?: any) => this.log(level.toUpperCase() as any, message)
            }
        );

        // Set up automatic cleanup - check for expired sessions every minute
        this.startAutomaticCleanup();

        // Cleanup on process exit
        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());
    }



    /**
     * Start automatic cleanup of expired sessions
     */
    private startAutomaticCleanup(): void {
        this.cleanupInterval = setInterval(async () => {
            await this.cleanupExpiredSessions();
        }, 60 * 1000); // Check every minute
    }

    /**
     * Cleanup expired sessions and their UI servers
     */
    private async cleanupExpiredSessions(): Promise<void> {
        if (this.sessionManager.isProxyMode()) {
            // In proxy mode, MongoDB TTL handles expiration automatically
            // We need to clean up local UI servers that may be orphaned
            const activeSessions = await this.sessionManager.getActiveSessions();
            const activeSessionIds = new Set(activeSessions.map(s => s.id));

            // Find orphaned UI servers (servers running but no corresponding active session)
            const orphanedServers: string[] = [];
            for (const [sessionId, uiServer] of this.activeServers.entries()) {
                if (!activeSessionIds.has(sessionId)) {
                    orphanedServers.push(sessionId);
                }
            }

            if (orphanedServers.length > 0) {
                this.log('INFO', `Found ${orphanedServers.length} orphaned UI servers, cleaning up...`);
                for (const sessionId of orphanedServers) {
                    const uiServer = this.activeServers.get(sessionId);
                    if (uiServer) {
                        try {
                            await uiServer.stop();
                            this.activeServers.delete(sessionId);
                            this.log('INFO', `Cleaned up orphaned UI server for session ${sessionId}`);
                        } catch (error) {
                            this.log('ERROR', `Failed to stop orphaned UI server ${sessionId}: ${error}`);
                        }
                    }
                }
            }

            const stats = await this.sessionManager.getStats();
            this.log('INFO', `Proxy mode active sessions: ${stats.totalActiveSessions || 0}, UI servers: ${this.activeServers.size}`);
        } else {
            // Direct mode: manual cleanup
            const now = new Date();
            const activeSessions = await this.sessionManager.getActiveSessions();
            const expiredSessions = activeSessions.filter(session => now > session.expiresAt);

            if (expiredSessions.length > 0) {
                this.log('INFO', `Found ${expiredSessions.length} expired sessions, cleaning up...`);

                for (const session of expiredSessions) {
                    this.log('INFO', `Session ${session.id} expired (${session.expiresAt.toISOString()}), terminating...`);
                    await this.terminateSession(session.id);
                }
            }
        }
    }

    /**
     * Create a new UI session for a user
     * Returns the session with URL that can be shared
     * Automatically cleans up any existing session for the same user
     * Uses UnifiedSessionManager which handles both direct and proxy modes
     */
    async createSession(userId: string): Promise<WebUISession> {
        try {
            this.log('INFO', `[SESSION-CREATION] Starting session creation for user: ${userId}`);
            this.log('INFO', `[SESSION-CREATION] Environment: GATEWAY=${process.env.MCP_WEB_UI_USE_GATEWAY}, URL=${process.env.MCP_WEB_UI_GATEWAY_URL}, BASE=${process.env.MCP_WEB_UI_BASE_URL}, PREFIX=${process.env.MCP_WEB_UI_PROXY_PREFIX}`);

            // Create session using unified session manager
            this.log('INFO', `[SESSION-CREATION] Calling sessionManager.createSession(${userId})`);
            const session = await this.sessionManager.createSession(userId);

            // Debug: Log what SessionManager actually returned
            this.log('INFO', `[SESSION-CREATION] SessionManager returned session: ID=${session.id}, Token=${session.token}, URL=${session.url}, Port=${session.port}`);

            // Check if we already have an active UI server for this session
            const existingServer = this.activeServers.get(session.id);
            if (existingServer) {
                this.log('INFO', `[SESSION-CREATION] Reusing existing UI server for session ${session.id} on port ${session.port}`);
                return session;
            }

            // Additional check: Look for any UI servers that might be using the same port
            // This can happen if session reuse didn't work properly or there's a mismatch
            this.log('INFO', `[SESSION-CREATION] Checking for port conflicts on ${session.port}. Active servers: ${this.activeServers.size}`);
            const conflictingServers: string[] = [];

            for (const [activeSessionId, activeServer] of this.activeServers.entries()) {
                this.log('INFO', `[SESSION-CREATION] Checking active session ${activeSessionId}`);
                // We'll attempt to create the server and catch the port conflict
            }

            // If we have multiple servers, it suggests there might be orphaned ones
            if (this.activeServers.size > 0) {
                this.log('WARN', `[SESSION-CREATION] Found ${this.activeServers.size} active UI servers before creating new one. This might indicate cleanup issues.`);
                this.log('WARN', `[SESSION-CREATION] Active session IDs: ${Array.from(this.activeServers.keys()).join(', ')}`);
            }

            // Create UI server only if we don't have one already
            this.log('INFO', `[SESSION-CREATION] Creating new UI server on port ${session.port}`);
            const uiConfig = this.createUIServerConfig();

            const uiServer = new GenericUIServer(
                session,
                this.config.schema,
                this.config.dataSource,
                this.config.onUpdate,
                this.sessionManager,
                uiConfig,
                this.config.pollInterval,
                this.config.bindAddress,
                this.config.protocol as 'http' | 'https'
            );

            try {
                await uiServer.start();
                this.activeServers.set(session.id, uiServer);

                this.log('INFO', `[SESSION-CREATION] UI server started successfully for user ${userId}: ${session.url}`);
                this.log('INFO', `[SESSION-CREATION] Session details: ID=${session.id}, Token=${session.token}, Port=${session.port}`);
                return session;
            } catch (error: any) {
                if (error.message && error.message.includes('already in use')) {
                    this.log('WARN', `[SESSION-CREATION] Port ${session.port} conflict detected. Attempting to clean up conflicting servers...`);

                    // Find and stop any servers that might be conflicting
                    let cleanedUp = false;
                    for (const [activeSessionId, activeServer] of this.activeServers.entries()) {
                        try {
                            this.log('INFO', `[SESSION-CREATION] Stopping potentially conflicting server: ${activeSessionId}`);
                            await activeServer.stop();
                            this.activeServers.delete(activeSessionId);
                            cleanedUp = true;
                            this.log('INFO', `[SESSION-CREATION] Successfully stopped conflicting server ${activeSessionId}`);
                        } catch (stopError) {
                            this.log('ERROR', `[SESSION-CREATION] Failed to stop server ${activeSessionId}: ${stopError}`);
                        }
                    }

                    if (cleanedUp) {
                        this.log('INFO', `[SESSION-CREATION] Retrying UI server creation after cleanup...`);
                        // Retry creating the server
                        try {
                            await uiServer.start();
                            this.activeServers.set(session.id, uiServer);
                            this.log('INFO', `[SESSION-CREATION] UI server started successfully after cleanup for user ${userId}: ${session.url}`);
                            return session;
                        } catch (retryError) {
                            this.log('ERROR', `[SESSION-CREATION] Retry failed: ${retryError}`);
                            throw retryError;
                        }
                    }
                }
                throw error;
            }
        } catch (error: any) {
            this.log('ERROR', `Failed to create UI session for user ${userId}: ${error}`);
            throw error;
        }
    }

    /**
 * Create UI server configuration with MCP server CSS support
 * Environment variable driven approach
 */
    private createUIServerConfig() {
        const configBuilder = UIServerConfigBuilder.create();
        const config = configBuilder.build();

        // CSS path priority:
        // 1. Explicit config cssPath
        // 2. Environment variable MCP_WEB_UI_CSS_PATH
        // 3. Default: ./static
        config.resources.css.mcpServerDirectory =
            this.config.cssPath ||
            process.env.MCP_WEB_UI_CSS_PATH ||
            './static';

        return config;
    }



    /**
     * Get active session by token (for validation)
     */
    async getSessionByToken(token: string): Promise<WebUISession | null> {
        return await this.sessionManager.getSessionByToken(token);
    }

    /**
     * Manually terminate a session
     */
    async terminateSession(sessionId: string): Promise<boolean> {
        try {
            const uiServer = this.activeServers.get(sessionId);
            if (uiServer) {
                await uiServer.stop();
                this.activeServers.delete(sessionId);
            }

            const success = await this.sessionManager.terminateSession(sessionId);
            if (success) {
                this.log('INFO', `Terminated session ${sessionId}`);
            }
            return success;
        } catch (error) {
            this.log('ERROR', `Failed to terminate session ${sessionId}: ${error}`);
            return false;
        }
    }

    /**
     * Get stats about active sessions and servers
     */
    async getStats() {
        const sessionStats = await this.sessionManager.getStats();
        return {
            ...sessionStats,
            activeServers: this.activeServers.size,
            serverPorts: Array.from(this.activeServers.values()).map(server =>
                (server as any).session?.port
            ).filter(Boolean)
        };
    }

    /**
     * Cleanup and shutdown all sessions and servers
     */
    async shutdown(): Promise<void> {
        this.log('INFO', 'Shutting down MCPWebUI...');

        // Clear the cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }

        // Stop all active servers
        const stopPromises = Array.from(this.activeServers.values()).map(server =>
            server.stop().catch(error =>
                this.log('ERROR', `Error stopping server: ${error}`)
            )
        );

        await Promise.all(stopPromises);
        this.activeServers.clear();

        // Shutdown unified session manager (handles both modes)
        await this.sessionManager.shutdown();

        this.log('INFO', 'MCPWebUI shutdown complete');
    }

    /**
     * Create MCP tool definition for get_web_ui
     */
    getMCPToolDefinition() {
        return {
            name: "get_web_ui",
            description: `Get a web interface for ${this.config.schema.title}`,
            inputSchema: {
                type: "object" as const,
                properties: {
                    extend_minutes: {
                        type: "number" as const,
                        description: "Minutes to extend session (default: 30)",
                        minimum: 5,
                        maximum: 120
                    }
                },
                additionalProperties: false
            }
        };
    }



    /**
     * Handle the get_web_ui tool call
     * This is what MCP servers will call
     */
    async handleGetWebUI(userId: string, extendMinutes = 30): Promise<{
        content: Array<{ type: string; text: string }>;
    }> {
        try {
            const session = await this.createSession(userId);

            return {
                content: [{
                    type: "text",
                    text: `🌐 Your ${this.config.schema.title} dashboard is ready!\n\n` +
                        `🔗 **URL**: ${session.url}\n\n` +
                        `⏰ **Session expires**: ${session.expiresAt.toLocaleString()}\n` +
                        `👤 **User**: ${userId}\n\n` +
                        `💡 *Tip: Bookmark this link or use the "Extend" button in the UI to keep your session active.*`
                }]
            };
        } catch (error) {
            return {
                content: [{
                    type: "text",
                    text: `❌ Failed to create web UI: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    }

    /**
     * Simple logging utility
     */
    private log(level: 'INFO' | 'WARN' | 'ERROR', message: string): void {
        if (this.config.enableLogging) {
            const timestamp = new Date().toISOString();
            console.error(`[${timestamp}][${level}][MCPWebUI] ${message}`);
        }
    }
} 