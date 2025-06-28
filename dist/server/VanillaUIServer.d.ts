import { WebUISession, UISchema, DataSourceFunction, UpdateHandler } from '../types/index.js';
/**
 * VanillaUIServer - Secure Vanilla JS UI Server Implementation
 *
 * This is the enhanced UIServer that uses the vanilla JS framework instead of Alpine.js.
 * It provides:
 * - Perfect CSP compliance (no eval, no unsafe scripts)
 * - Zero external dependencies (no Alpine.js or other frameworks)
 * - Built-in XSS protection for all content
 * - Schema-driven component initialization
 * - Comprehensive security headers
 * - AI-friendly documentation and error messages
 *
 * SECURITY IMPROVEMENTS:
 * - Eliminates Alpine.js runtime errors under strict CSP
 * - No framework dependencies = no external attack vectors
 * - Built-in content sanitization for LLM-generated content
 * - Session-based authentication with timing-safe comparisons
 * - Rate limiting and input validation
 *
 * PERFORMANCE BENEFITS:
 * - Lightweight: ~2-3KB
 * - No framework overhead or runtime compilation
 * - Efficient DOM updates with smart diffing
 * - Optimized polling that respects page visibility
 *
 * AI INTEGRATION READY:
 * - Handles LLM-generated content safely
 * - Extensive logging for debugging AI interactions
 * - Clear error messages for AI agents to understand
 * - Schema-driven configuration for AI-generated UIs
 */
export declare class VanillaUIServer {
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
     * Setup Express middleware with enhanced security
     */
    private setupMiddleware;
    /**
     * Setup API routes
     */
    private setupRoutes;
    /**
     * Setup static file serving for vanilla JS framework
     */
    private setupStaticFiles;
    /**
     * Render the main HTML template using vanilla JS framework
     */
    private renderVanillaTemplate;
    /**
     * Render component containers based on schema
     */
    private renderComponentContainers;
    /**
     * Render error page for server errors
     */
    private renderErrorPage;
    /**
     * Sanitize update data to prevent injection attacks
     */
    private sanitizeUpdateData;
    /**
     * Enhanced LLM content sanitization
     */
    private sanitizeLLMContent;
    /**
     * Start polling for data changes (server-side tracking)
     */
    private startDataPolling;
    /**
     * Get fallback CSS if templates directory is missing
     */
    private getFallbackCSS;
    /**
     * Generate cryptographic nonce for CSP
     */
    private generateNonce;
    /**
     * Enhanced logging with component context
     */
    private log;
}
//# sourceMappingURL=VanillaUIServer.d.ts.map