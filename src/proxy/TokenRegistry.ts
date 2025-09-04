import { MongoClient, Db, Collection } from 'mongodb';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface EphemeralSession {
    token: string;
    userId: string;
    serverName: string;
    backend: {
        type: 'tcp' | 'unix' | 'gateway';
        host?: string | null;
        port?: number | null;
        socketPath?: string;
    };
    createdAt: Date;
    expiresAt: Date;
    lastAccessedAt: Date;
    scopes: string[];
    metadata?: Record<string, any>;
}

export interface CreateSessionOptions {
    userId: string;
    serverName: string;
    backend: EphemeralSession['backend'];
    ttlMinutes?: number;
    scopes?: string[];
    metadata?: Record<string, any>;
}

export interface RegisteredServer {
    serverName: string;
    backend: EphemeralSession['backend'];
    registeredAt: Date;
    lastHeartbeat?: Date;
    metadata?: Record<string, any>;
}

/**
 * MongoDB-based token registry for ephemeral web UI sessions
 * Handles secure token generation, validation, and automatic cleanup
 */
export class TokenRegistry {
    private db: Db;
    private collection: Collection<EphemeralSession>;
    private serverCollection: Collection<RegisteredServer>;
    private jwtSecret: string;
    private logger?: (level: string, message: string, data?: any) => void;

    constructor(
        db: Db,
        options: {
            jwtSecret?: string;
            logger?: (level: string, message: string, data?: any) => void;
        } = {}
    ) {
        this.db = db;
        this.collection = db.collection<EphemeralSession>('ephemeral_webui_sessions');
        this.serverCollection = db.collection<RegisteredServer>('registered_mcp_servers');
        this.jwtSecret = options.jwtSecret || process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
        this.logger = options.logger;
        this.setupIndexes();
    }

    /**
     * Setup MongoDB indexes for efficient queries and TTL
     */
    private async setupIndexes(): Promise<void> {
        try {
            // TTL index for automatic cleanup
            await this.collection.createIndex(
                { expiresAt: 1 },
                { expireAfterSeconds: 0 }
            );

            // Performance indexes
            await this.collection.createIndex({ token: 1 }, { unique: true });
            await this.collection.createIndex({ userId: 1 });
            await this.collection.createIndex({ serverName: 1 });
            await this.collection.createIndex({ createdAt: 1 });

            this.log('info', '[TokenRegistry] MongoDB indexes created successfully');
        } catch (error) {
            this.log('error', '[TokenRegistry] Failed to create indexes:', error);
        }
    }



    /**
     * Create a new ephemeral session with secure token
     */
    async createSession(options: CreateSessionOptions): Promise<EphemeralSession> {
        const {
            userId,
            serverName,
            backend,
            ttlMinutes = 30,
            scopes = ['view', 'interact'],
            metadata = {}
        } = options;

        const now = new Date();
        const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

        // Generate secure token with embedded metadata
        const tokenPayload = {
            userId,
            serverName,
            sessionId: crypto.randomUUID(),
            iat: Math.floor(now.getTime() / 1000),
            exp: Math.floor(expiresAt.getTime() / 1000)
        };

        const token = jwt.sign(tokenPayload, this.jwtSecret, {
            algorithm: 'HS256'
        });

        const session: EphemeralSession = {
            token,
            userId,
            serverName,
            backend,
            createdAt: now,
            expiresAt,
            lastAccessedAt: now,
            scopes,
            metadata
        };

        await this.collection.insertOne(session);

        this.log('info', `[TokenRegistry] Created session for user ${userId}, server ${serverName}`, {
            token: token.substring(0, 16) + '...',
            backend: backend.type === 'tcp' ? `${backend.host}:${backend.port}` : backend.socketPath,
            expiresAt: expiresAt.toISOString()
        });

        return session;
    }

    /**
     * Validate token and return session info
     */
    async validateToken(token: string): Promise<EphemeralSession | null> {
        try {
            // First, try to find the session in the database (for UUID tokens)
            const session = await this.collection.findOne({ token });

            if (!session) {
                this.log('warn', `[TokenRegistry] Session not found for token: ${token.substring(0, 16)}...`);
                return null;
            }

            // Check if session has expired
            if (session.expiresAt < new Date()) {
                this.log('warn', `[TokenRegistry] Session expired for user ${session.userId}`);
                await this.collection.deleteOne({ token });
                return null;
            }

            // If it's a JWT token, also verify the signature
            if (token.includes('.')) { // JWT tokens have dots
                try {
                    jwt.verify(token, this.jwtSecret);
                } catch (jwtError) {
                    this.log('warn', `[TokenRegistry] Invalid JWT signature for token: ${token.substring(0, 16)}...`);
                    return null;
                }
            }

            // Update last accessed timestamp
            await this.collection.updateOne(
                { token },
                { $set: { lastAccessedAt: new Date() } }
            );

            return session;
        } catch (error) {
            this.log('error', `[TokenRegistry] Token validation error:`, error);
            return null;
        }
    }

    /**
     * Extend session expiration
     */
    async extendSession(token: string, additionalMinutes: number = 30): Promise<boolean> {
        const session = await this.validateToken(token);
        if (!session) {
            return false;
        }

        const newExpiresAt = new Date(Date.now() + additionalMinutes * 60 * 1000);

        const result = await this.collection.updateOne(
            { token },
            {
                $set: {
                    expiresAt: newExpiresAt,
                    lastAccessedAt: new Date()
                }
            }
        );

        if (result.modifiedCount > 0) {
            this.log('info', `[TokenRegistry] Extended session for user ${session.userId} by ${additionalMinutes} minutes`);
            return true;
        }

        return false;
    }

    /**
     * Revoke a specific session
     */
    async revokeSession(token: string): Promise<boolean> {
        const result = await this.collection.deleteOne({ token });

        if (result.deletedCount > 0) {
            this.log('info', `[TokenRegistry] Revoked session: ${token.substring(0, 16)}...`);
            return true;
        }

        return false;
    }

    /**
     * Revoke all sessions for a user
     */
    async revokeUserSessions(userId: string): Promise<number> {
        const result = await this.collection.deleteMany({ userId });

        if (result.deletedCount > 0) {
            this.log('info', `[TokenRegistry] Revoked ${result.deletedCount} sessions for user ${userId}`);
        }

        return result.deletedCount;
    }

    /**
     * Get active sessions for a user
     */
    async getUserSessions(userId: string): Promise<EphemeralSession[]> {
        return await this.collection
            .find({
                userId,
                expiresAt: { $gt: new Date() }
            })
            .sort({ createdAt: -1 })
            .toArray();
    }

    /**
     * Get session statistics
     */
    async getStats(): Promise<{
        totalActiveSessions: number;
        sessionsByServer: Record<string, number>;
        sessionsByUser: Record<string, number>;
        oldestSession: Date | null;
        newestSession: Date | null;
    }> {
        const now = new Date();
        const activeSessions = await this.collection
            .find({ expiresAt: { $gt: now } })
            .toArray();

        const stats = {
            totalActiveSessions: activeSessions.length,
            sessionsByServer: {} as Record<string, number>,
            sessionsByUser: {} as Record<string, number>,
            oldestSession: null as Date | null,
            newestSession: null as Date | null
        };

        if (activeSessions.length > 0) {
            // Group by server
            activeSessions.forEach(session => {
                stats.sessionsByServer[session.serverName] =
                    (stats.sessionsByServer[session.serverName] || 0) + 1;
                stats.sessionsByUser[session.userId] =
                    (stats.sessionsByUser[session.userId] || 0) + 1;
            });

            // Find oldest and newest
            const sortedByCreated = activeSessions.sort((a, b) =>
                a.createdAt.getTime() - b.createdAt.getTime()
            );
            stats.oldestSession = sortedByCreated[0].createdAt;
            stats.newestSession = sortedByCreated[sortedByCreated.length - 1].createdAt;
        }

        return stats;
    }

    /**
     * Cleanup expired sessions (manual cleanup, TTL should handle this automatically)
     */
    async cleanupExpiredSessions(): Promise<number> {
        const result = await this.collection.deleteMany({
            expiresAt: { $lt: new Date() }
        });

        if (result.deletedCount > 0) {
            this.log('info', `[TokenRegistry] Cleaned up ${result.deletedCount} expired sessions`);
        }

        return result.deletedCount;
    }

    /**
     * Register an MCP server with its backend configuration
     */
    async registerServer(
        serverName: string,
        backend: EphemeralSession['backend'],
        metadata: Record<string, any> = {}
    ): Promise<void> {
        const now = new Date();

        const serverRegistration: RegisteredServer = {
            serverName,
            backend,
            registeredAt: now,
            lastHeartbeat: now,
            metadata
        };

        // Upsert (update if exists, insert if doesn't)
        await this.serverCollection.replaceOne(
            { serverName },
            serverRegistration,
            { upsert: true }
        );

        this.log('info', `[TokenRegistry] Registered server: ${serverName}`, {
            backend: backend.type === 'tcp' ? `${backend.host}:${backend.port}` : backend.socketPath,
            metadata
        });
    }

    /**
     * Get registered server information
     */
    async getRegisteredServer(serverName: string): Promise<RegisteredServer | null> {
        return await this.serverCollection.findOne({ serverName });
    }

    /**
     * Update server heartbeat
     */
    async updateServerHeartbeat(serverName: string): Promise<boolean> {
        const result = await this.serverCollection.updateOne(
            { serverName },
            { $set: { lastHeartbeat: new Date() } }
        );

        return result.modifiedCount > 0;
    }

    /**
     * Get all registered servers
     */
    async getRegisteredServers(): Promise<RegisteredServer[]> {
        return await this.serverCollection.find({}).toArray();
    }

    /**
     * Unregister a server
     */
    async unregisterServer(serverName: string): Promise<boolean> {
        const result = await this.serverCollection.deleteOne({ serverName });

        if (result.deletedCount > 0) {
            this.log('info', `[TokenRegistry] Unregistered server: ${serverName}`);
        }

        return result.deletedCount > 0;
    }

    /**
     * Clean up stale server registrations (no heartbeat for X minutes)
     */
    async cleanupStaleServers(staleMinutes: number = 10): Promise<number> {
        const staleThreshold = new Date(Date.now() - staleMinutes * 60 * 1000);

        const result = await this.serverCollection.deleteMany({
            lastHeartbeat: { $lt: staleThreshold }
        });

        if (result.deletedCount > 0) {
            this.log('info', `[TokenRegistry] Cleaned up ${result.deletedCount} stale server registrations`);
        }

        return result.deletedCount;
    }

    /**
     * Simple logging utility
     */
    private log(level: string, message: string, data?: any): void {
        if (this.logger) {
            this.logger(level, message, data);
        } else {
            const timestamp = new Date().toISOString();
            console.error(`[${timestamp}][${level.toUpperCase()}] ${message}`);
            if (data && process.env.DEBUG) {
                console.error(JSON.stringify(data, null, 2));
            }
        }
    }
}
