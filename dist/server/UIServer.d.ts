import { WebUISession, UISchema, DataSourceFunction, UpdateHandler } from '../types/index.js';
/**
 * Individual UI server instance for a session
 */
export declare class UIServer {
    private session;
    private schema;
    private dataSource;
    private onUpdate;
    private pollInterval;
    private bindAddress;
    private app;
    private server;
    private dataPollingInterval;
    constructor(session: WebUISession, schema: UISchema, dataSource: DataSourceFunction, onUpdate: UpdateHandler, pollInterval?: number, bindAddress?: string);
    /**
     * Start the server on the session's assigned port
     */
    start(): Promise<void>;
    /**
     * Stop the server and cleanup
     */
    stop(): Promise<void>;
    /**
     * Setup Express middleware
     */
    private setupMiddleware;
    /**
     * Setup API routes
     */
    private setupRoutes;
    /**
     * Start polling for data changes
     */
    private startDataPolling;
    /**
     * Render HTML template with data
     */
    private renderTemplate;
    /**
     * Render UI components based on schema
     */
    private renderComponents;
    /**
     * Render a list component (like todo list)
     */
    private renderListComponent;
    /**
     * Simple logging utility
     */
    private log;
    /**
     * Fallback CSS when templates directory is not found
     */
    private getFallbackCSS;
    /**
     * Generate a cryptographically secure nonce for CSP
     */
    private generateNonce;
}
//# sourceMappingURL=UIServer.d.ts.map