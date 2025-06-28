import { MCPWebUIConfig, WebUISession } from './types/index.js';
/**
 * Main MCP Web UI framework class
 * Orchestrates session management and dynamic UI servers
 */
export declare class MCPWebUI<T = any> {
    private sessionManager;
    private activeServers;
    private config;
    constructor(config: MCPWebUIConfig<T>);
    /**
     * Start automatic cleanup of expired sessions
     */
    private startAutomaticCleanup;
    /**
     * Cleanup expired sessions and their UI servers
     */
    private cleanupExpiredSessions;
    /**
     * Create a new UI session for a user
     * Returns the session with URL that can be shared
     * Automatically cleans up any existing session for the same user
     */
    createSession(userId: string): Promise<WebUISession>;
    /**
     * Get active session by token (for validation)
     */
    getSessionByToken(token: string): WebUISession | null;
    /**
     * Manually terminate a session
     */
    terminateSession(sessionId: string): Promise<boolean>;
    /**
     * Get stats about active sessions and servers
     */
    getStats(): {
        activeServers: number;
        serverPorts: any[];
        totalSessions: number;
        usedPorts: number[];
        oldestSession: number | null;
        nextExpiry: number | null;
        sessionsPerUser: {
            [k: string]: number;
        };
        uniqueUsers: number;
    };
    /**
     * Cleanup and shutdown all sessions and servers
     */
    shutdown(): Promise<void>;
    /**
     * Create MCP tool definition for get_web_ui
     */
    getMCPToolDefinition(): {
        name: string;
        description: string;
        inputSchema: {
            type: "object";
            properties: {
                extend_minutes: {
                    type: "number";
                    description: string;
                    minimum: number;
                    maximum: number;
                };
            };
            additionalProperties: boolean;
        };
    };
    /**
     * Handle the get_web_ui tool call
     * This is what MCP servers will call
     */
    handleGetWebUI(userId: string, extendMinutes?: number): Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
    }>;
    /**
     * Simple logging utility
     */
    private log;
}
//# sourceMappingURL=MCPWebUI.d.ts.map