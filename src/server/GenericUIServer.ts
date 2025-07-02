/**
 * GenericUIServer - Slim, Configuration-Driven UI Server
 * 
 * This replaces the monolithic UIServer with a modular, extensible architecture:
 * - Configuration over hardcoding
 * - Composition over inheritance  
 * - Separation of concerns
 * - Progressive enhancement
 * - Plugin-based extensibility
 * 
 * Key improvements:
 * - Schema-driven resource loading (CSS/JS loaded based on content)
 * - Pluggable template system (custom renderers for different apps)
 * - Dynamic route generation (no hardcoded routes per app)
 * - Modular middleware system (security, compression, etc.)
 * - Plugin architecture (extend without modifying core)
 */

import express from 'express';
import { Server } from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

import { UIServerConfig, DEFAULT_UI_SERVER_CONFIG } from './UIServerConfig.js';
import { ResourceManager } from './ResourceManager.js';
import { TemplateEngine } from './TemplateEngine.js';

import {
    WebUISession,
    UISchema,
    TemplateData,
    APIResponse,
    DataSourceFunction,
    UpdateHandler
} from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface UIServerPlugin {
    name: string;
    initialize(server: GenericUIServer): Promise<void>;
    cleanup?(): Promise<void>;
}

/**
 * GenericUIServer - The new modular, configurable UI server
 */
export class GenericUIServer {
    private app: express.Application;
    private server: Server | null = null;
    private dataPollingInterval: NodeJS.Timeout | null = null;

    // Modular components
    private resourceManager: ResourceManager;
    private templateEngine: TemplateEngine;
    private plugins: Map<string, UIServerPlugin> = new Map();

    // Computed properties
    private projectRoot: string;

    constructor(
        private session: WebUISession,
        private schema: UISchema,
        private dataSource: DataSourceFunction,
        private onUpdate: UpdateHandler,
        private config: UIServerConfig = DEFAULT_UI_SERVER_CONFIG,
        private pollInterval = 2000,
        private bindAddress = 'localhost'
    ) {
        this.app = express();
        this.projectRoot = this.findProjectRoot();

        // Initialize modular components
        this.resourceManager = new ResourceManager(this.config, this.projectRoot);
        this.templateEngine = new TemplateEngine(this.config, this.resourceManager);

        // Setup server
        this.initializePlugins();
        this.setupMiddleware();
        this.setupRoutes();

        this.log('INFO', `GenericUIServer initialized with ${this.plugins.size} plugins`);
    }

    /**
     * Start the server
     */
    async start(): Promise<void> {
        // Validate resources before starting
        const validation = this.resourceManager.validateResources(this.schema);
        if (!validation.valid) {
            this.log('WARN', `Missing resources: ${validation.missing.join(', ')}`);
        }

        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.session.port, this.bindAddress, () => {
                    this.log('INFO', `Server started on ${this.bindAddress}:${this.session.port}`);
                    this.log('INFO', `Serving schema: ${this.schema.title}`);
                    this.log('INFO', `Theme detection: ${this.getActiveThemes().join(', ') || 'default'}`);

                    this.startDataPolling();
                    resolve();
                });

                this.server.on('error', (error: any) => {
                    if (error.code === 'EADDRINUSE') {
                        this.log('ERROR', `Port ${this.session.port} already in use`);
                        reject(new Error(`Port ${this.session.port} already in use`));
                    } else {
                        reject(error);
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Stop the server and cleanup
     */
    async stop(): Promise<void> {
        return new Promise(async (resolve) => {
            // Stop data polling
            if (this.dataPollingInterval) {
                clearInterval(this.dataPollingInterval);
                this.dataPollingInterval = null;
            }

            // Cleanup plugins
            for (const plugin of this.plugins.values()) {
                if (plugin.cleanup) {
                    try {
                        await plugin.cleanup();
                    } catch (error) {
                        this.log('ERROR', `Plugin ${plugin.name} cleanup failed: ${error}`);
                    }
                }
            }

            // Close HTTP server
            if (this.server) {
                this.server.close(() => {
                    this.log('INFO', `Server stopped on port ${this.session.port}`);
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * Register a plugin
     */
    async registerPlugin(plugin: UIServerPlugin): Promise<void> {
        try {
            await plugin.initialize(this);
            this.plugins.set(plugin.name, plugin);
            this.log('INFO', `Plugin registered: ${plugin.name}`);
        } catch (error) {
            this.log('ERROR', `Failed to register plugin ${plugin.name}: ${error}`);
            throw error;
        }
    }

    /**
     * Add custom route (for plugins)
     */
    addRoute(path: string, handler: express.RequestHandler): void {
        this.app.get(path, handler);
    }

    /**
     * Add custom middleware (for plugins)
     */
    addMiddleware(middleware: express.RequestHandler): void {
        this.app.use(middleware);
    }

    /**
     * Setup Express middleware with configuration-driven approach
     */
    private setupMiddleware(): void {
        // Security middleware (configurable)
        if (this.config.security.enableCSP) {
            this.app.use((req, res, next) => {
                const nonce = this.generateNonce();
                res.locals.nonce = nonce;

                res.setHeader('X-Content-Type-Options', 'nosniff');
                res.setHeader('X-Frame-Options', 'DENY');
                res.setHeader('X-XSS-Protection', '1; mode=block');
                res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

                // Dynamic CSP based on configuration
                const cspDirectives = [
                    "default-src 'self'",
                    `script-src 'self' 'nonce-${nonce}'`,
                    "style-src 'self' 'unsafe-inline'",
                    "connect-src 'self'",
                    "img-src 'self' data:",
                    "font-src 'self'"
                ];

                res.setHeader('Content-Security-Policy', cspDirectives.join('; ') + ';');
                next();
            });
        }

        // Body parser with configurable limits
        this.app.use(express.json({ limit: this.config.server.maxRequestSize }));
        this.app.use(express.urlencoded({
            extended: true,
            limit: this.config.server.maxRequestSize
        }));

        // Authentication middleware
        this.app.use((req, res, next) => {
            // Allow static files and health check without token
            if (req.path.startsWith('/static/') || req.path === '/api/health') {
                return next();
            }

            const token = req.query.token as string || req.headers.authorization?.replace('Bearer ', '');

            if (!token) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication token required',
                    timestamp: new Date().toISOString(),
                    hint: 'Include token as query parameter or Authorization header'
                });
            }

            // Timing-safe token comparison
            const expectedToken = this.session.token;
            if (!this.timingSafeEquals(token, expectedToken)) {
                return res.status(403).json({
                    success: false,
                    error: 'Invalid token',
                    timestamp: new Date().toISOString()
                });
            }

            // Update session activity for user actions
            const isUserAction = req.method === 'POST' ||
                req.path.includes('/update') ||
                req.path.includes('/extend');

            if (isUserAction) {
                this.session.lastActivity = new Date();
                this.log('INFO', `User action: ${req.method} ${req.path}`);
            }

            next();
        });
    }

    /**
     * Setup API routes with dynamic resource handling
     */
    private setupRoutes(): void {
        // Main UI route - uses TemplateEngine
        this.app.get('/', async (req, res) => {
            try {
                const templateData = await this.buildTemplateData(res.locals.nonce);
                const html = await this.templateEngine.render(templateData);
                res.send(html);
            } catch (error) {
                this.log('ERROR', `Failed to render UI: ${error}`);
                res.status(500).send(await this.templateEngine.render({
                    session: this.session,
                    schema: this.schema,
                    initialData: [],
                    config: { pollInterval: this.pollInterval, apiBase: '/api' },
                    nonce: res.locals.nonce
                }));
            }
        });

        // Dynamic resource routes - uses ResourceManager
        this.setupDynamicResourceRoutes();

        // API routes
        this.setupAPIRoutes();


        // Health check
        this.app.get('/api/health', (req, res) => {
            const themes = this.getActiveThemes();
            res.json({
                success: true,
                data: {
                    status: 'active',
                    framework: 'generic-ui-server',
                    version: '2.0.0',
                    architecture: 'modular',
                    schema: this.schema.title,
                    themes: themes,
                    plugins: Array.from(this.plugins.keys()),
                    expiresAt: this.session.expiresAt,
                    uptime: Date.now() - this.session.startTime.getTime(),
                    components: this.schema.components.length,
                    features: {
                        schemaBasedLoading: true,
                        pluginSystem: true,
                        configurationDriven: true,
                        multiThemeSupport: true
                    }
                },
                timestamp: new Date().toISOString()
            });
        });
    }

    /**
     * Setup dynamic resource routes using ResourceManager
     */
    private setupDynamicResourceRoutes(): void {
        // MCP Server CSS route - serves styles.css from configured directory  
        // IMPORTANT: This must come BEFORE the general /static/:filename.css route
        this.app.get('/static/styles.css', async (req, res) => {
            try {
                const cssPath = this.config.resources.css.mcpServerDirectory;
                if (!cssPath) {
                    return res.status(404).send('/* MCP CSS path not configured */');
                }

                const filePath = path.join(cssPath, 'styles.css');

                if (fs.existsSync(filePath)) {
                    res.type('text/css');
                    if (this.config.resources.static.enableCompression) {
                        res.setHeader('Cache-Control', this.config.resources.static.cacheControl);
                    }
                    return res.sendFile(filePath);
                } else {
                    this.log('WARN', `MCP CSS not found: ${filePath}`);
                    // Fallback to framework CSS if MCP CSS not found
                    return this.serveStaticFile(res, 'styles.css', 'text/css');
                }
            } catch (error) {
                this.log('ERROR', `Failed to serve MCP CSS: ${error}`);
                res.status(500).send('/* Error loading MCP CSS */');
            }
        });

        // Framework CSS route - serves base framework styles for other CSS files
        this.app.get('/static/:filename.css', async (req, res) => {
            try {
                const filename = req.params.filename;

                // All other CSS should come from MCP servers or be served from static directories
                res.status(404).send('/* CSS file not found - app CSS should use /static/styles.css */');
            } catch (error) {
                this.log('ERROR', `Failed to serve framework CSS ${req.params.filename}: ${error}`);
                res.status(500).send('/* Error loading CSS */');
            }
        });

        // Dynamic JS route - uses ResourceManager bundling
        this.app.get('/static/mcp-framework.js', async (req, res) => {
            try {
                res.type('application/javascript');
                const bundledJS = await this.resourceManager.bundleJavaScript(this.schema);
                res.send(bundledJS);
            } catch (error) {
                this.log('ERROR', `Failed to bundle JavaScript: ${error}`);
                res.status(500).send('// Error loading framework');
            }
        });

        // Static files fallback
        for (const dir of this.config.resources.static.directories) {
            const absDir = path.isAbsolute(dir) ? dir : path.join(this.projectRoot, dir);
            if (fs.existsSync(absDir)) {
                this.app.use('/static', express.static(absDir));
            }
        }
    }

    /**
     * Setup API routes
     */
    private setupAPIRoutes(): void {
        // Get current data
        this.app.get('/api/data', async (req, res) => {
            try {
                const data = await this.dataSource(this.session.userId);
                const response: APIResponse = {
                    success: true,
                    data,
                    timestamp: new Date().toISOString()
                };
                res.json(response);
            } catch (error) {
                const response: APIResponse = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString()
                };
                res.status(500).json(response);
            }
        });

        // Handle updates
        this.app.post('/api/update', async (req, res) => {
            try {
                const { action, data } = req.body;

                if (!action || typeof action !== 'string') {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid action parameter',
                        timestamp: new Date().toISOString()
                    });
                }

                const sanitizedData = this.sanitizeUpdateData(data);
                const result = await this.onUpdate(action, sanitizedData, this.session.userId);

                const response: APIResponse = {
                    success: true,
                    data: result,
                    timestamp: new Date().toISOString()
                };
                res.json(response);
            } catch (error) {
                this.log('ERROR', `Update failed: ${error}`);
                const response: APIResponse = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Update operation failed',
                    timestamp: new Date().toISOString()
                };
                res.status(500).json(response);
            }
        });

        // Extend session
        this.app.post('/api/extend-session', (req, res) => {
            const { minutes = 30 } = req.body;

            if (typeof minutes !== 'number' || minutes < 5 || minutes > 120) {
                return res.status(400).json({
                    success: false,
                    error: 'Extension minutes must be between 5 and 120',
                    timestamp: new Date().toISOString()
                });
            }

            if (new Date() > this.session.expiresAt) {
                return res.status(410).json({
                    success: false,
                    error: 'Session has already expired',
                    timestamp: new Date().toISOString()
                });
            }

            this.session.expiresAt = new Date(this.session.expiresAt.getTime() + minutes * 60 * 1000);
            this.session.lastActivity = new Date();

            const response: APIResponse = {
                success: true,
                data: { expiresAt: this.session.expiresAt },
                timestamp: new Date().toISOString()
            };
            res.json(response);
        });
    }

    /**
     * Build template data for rendering
     */
    private async buildTemplateData(nonce: string): Promise<TemplateData> {
        const initialData = await this.dataSource(this.session.userId);

        return {
            session: this.session,
            schema: this.schema,
            initialData,
            config: {
                pollInterval: this.pollInterval,
                apiBase: '/api'
            },
            nonce
        };
    }

    /**
     * Get active themes for this schema
     */
    private getActiveThemes(): string[] {
        const resources = this.resourceManager.getRequiredResources(this.schema);
        return resources.css
            .filter(css => css !== '/static/styles.css')
            .map(css => css.replace('/static/', '').replace('.css', ''));
    }

    /**
     * Initialize plugins from configuration
     */
    private async initializePlugins(): Promise<void> {
        // This would load and initialize plugins based on config.plugins
        // For now, it's a placeholder for future plugin system
        if (this.config.plugins.enabled.length > 0) {
            this.log('INFO', `Loading ${this.config.plugins.enabled.length} plugins...`);
            // TODO: Load plugins dynamically
        }
    }

    /**
     * Serve static file with proper headers
     */
    private serveStaticFile(res: express.Response, filename: string, contentType: string): void {
        for (const dir of this.config.resources.static.directories) {
            const absDir = path.isAbsolute(dir) ? dir : path.join(this.projectRoot, dir);
            const filePath = path.join(absDir, filename);
            if (fs.existsSync(filePath)) {
                res.type(contentType);
                if (this.config.resources.static.enableCompression) {
                    res.setHeader('Cache-Control', this.config.resources.static.cacheControl);
                }
                return res.sendFile(filePath);
            }
        }
        res.status(404).send(`/* ${filename} not found */`);
    }

    /**
     * Start data polling if enabled
     */
    private startDataPolling(): void {
        if (this.schema.polling?.enabled !== false) {
            this.dataPollingInterval = setInterval(async () => {
                // Server-side change detection could go here
                // For now, clients handle their own polling
            }, this.pollInterval);
        }
    }

    /**
     * Find project root directory
     */
    private findProjectRoot(): string {
        let currentDir = __dirname;

        while (currentDir !== path.dirname(currentDir)) {
            const packagePath = path.join(currentDir, 'package.json');
            if (fs.existsSync(packagePath)) {
                return currentDir;
            }
            currentDir = path.dirname(currentDir);
        }

        return __dirname; // Fallback
    }

    /**
     * Sanitize update data
     */
    private sanitizeUpdateData(data: any): any {
        if (!data || typeof data !== 'object') {
            return {};
        }

        const sanitized: any = {};

        for (const [key, value] of Object.entries(data)) {
            const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '');

            if (typeof value === 'string') {
                const maxLength = 1000;
                sanitized[cleanKey] = this.sanitizeLLMContent(value.substring(0, maxLength), cleanKey);
            } else if (typeof value === 'boolean' || typeof value === 'number') {
                sanitized[cleanKey] = value;
            } else if (value === null || value === undefined) {
                sanitized[cleanKey] = value;
            } else if (Array.isArray(value)) {
                sanitized[cleanKey] = value.map(item =>
                    typeof item === 'object' ? this.sanitizeUpdateData(item) : item
                );
            } else {
                this.log('WARN', `Complex object sanitized for key: ${key}`);
                sanitized[cleanKey] = this.sanitizeUpdateData(value);
            }
        }

        return sanitized;
    }

    /**
     * Sanitize LLM-generated content
     */
    private sanitizeLLMContent(content: string, context: string = 'text'): string {
        if (!content || typeof content !== 'string') {
            return '';
        }

        let clean = content
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/data:text\/html/gi, '');

        switch (context) {
            case 'text':
            case 'todo-text':
                return clean.replace(/[<>{}[\]\\]/g, '').substring(0, 500);
            case 'category':
                return clean.replace(/[^a-zA-Z0-9\s\-_]/g, '').substring(0, 50);
            case 'priority':
                const allowedPriorities = ['low', 'medium', 'high', 'urgent'];
                return allowedPriorities.includes(clean.toLowerCase()) ? clean.toLowerCase() : 'medium';
            default:
                return this.escapeHtml(clean);
        }
    }

    /**
     * Timing-safe string comparison
     */
    private timingSafeEquals(a: string, b: string): boolean {
        if (a.length !== b.length) {
            return false;
        }

        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return result === 0;
    }

    /**
     * Generate cryptographic nonce
     */
    private generateNonce(): string {
        return crypto.randomBytes(16).toString('base64');
    }

    /**
     * Escape HTML content
     */
    private escapeHtml(unsafe: string): string {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * Check if schema matches theme conditions
     */
    private matchesSchemaConditions(theme: any): boolean {
        if (!theme.conditions) return false;

        // Check schema title conditions
        if (theme.conditions.schemaTitle) {
            const titleMatch = theme.conditions.schemaTitle.some((title: string) =>
                this.schema.title.toLowerCase().includes(title.toLowerCase())
            );
            if (titleMatch) return true;
        }

        // Check component type conditions
        if (theme.conditions.componentTypes) {
            const componentMatch = theme.conditions.componentTypes.some((type: string) =>
                this.schema.components.some(comp => comp.type === type)
            );
            if (componentMatch) return true;
        }

        return false;
    }

    /**
     * Enhanced logging with component context
     */
    private log(level: 'INFO' | 'WARN' | 'ERROR', message: string): void {
        const timestamp = new Date().toISOString();
        const sessionInfo = `Session:${this.session.id.substring(0, 8)}`;
        const schemaInfo = `Schema:${this.schema.title}`;
        console.log(`[${timestamp}][${level}][GenericUIServer][${sessionInfo}][${schemaInfo}] ${message}`);
    }
} 