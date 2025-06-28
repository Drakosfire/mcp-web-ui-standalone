import { WebUISession } from '../types/index.js';
/**
 * Manages UI sessions with automatic cleanup and lifecycle management
 */
export declare class SessionManager {
    private sessions;
    private usedPorts;
    private portRange;
    private baseUrl;
    private userSessionLimits;
    constructor(sessionTimeoutMs?: number, // 30 minutes default
    portRange?: [number, number], baseUrl?: string);
    /**
 * Create a new session for a user
 * Automatically terminates any existing session for the same user
 */
    createSession(userId: string): WebUISession;
    /**
     * Get session by token (for authentication)
     * @param token Session token
     * @param updateActivity Whether to update lastActivity (default: false for polling, true for user actions)
     */
    getSessionByToken(token: string, updateActivity?: boolean): WebUISession | null;
    /**
     * Get session by ID
     */
    getSession(sessionId: string): WebUISession | null;
    /**
     * Get active session by user ID
     */
    getSessionByUserId(userId: string): WebUISession | null;
    /**
     * Extend session timeout
     */
    extendSession(sessionId: string, additionalMinutes?: number): boolean;
    /**
     * Terminate a specific session
     */
    terminateSession(sessionId: string): boolean;
    /**
     * Get all active sessions for debugging
     */
    getActiveSessions(): WebUISession[];
    /**
 * Get session stats
 */
    getStats(): {
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
     * Shutdown session manager and cleanup all sessions
     */
    shutdown(): void;
    /**
     * Allocate a random available port
     */
    private allocatePort;
    /**
     * Simple logging utility
     */
    private log;
}
//# sourceMappingURL=SessionManager.d.ts.map