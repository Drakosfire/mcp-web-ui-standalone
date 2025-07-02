/**
 * TemplateEngine - Modular, configuration-driven template rendering
 * Replaces hardcoded template rendering in UIServer with flexible, extensible approach
 */

import { UIServerConfig } from './UIServerConfig.js';
import { ResourceManager, LoadedResources } from './ResourceManager.js';
import { UISchema, TemplateData } from '../types/index.js';

export interface TemplateContext {
    schema: UISchema;
    session: any;
    resources: LoadedResources;
    config: any;
    nonce: string;
    initialData?: any[];
}

export interface TemplateRenderer {
    name: string;
    canRender(context: TemplateContext): boolean;
    render(context: TemplateContext): string;
}

/**
 * Base template for vanilla JS framework
 */
export class VanillaTemplateRenderer implements TemplateRenderer {
    name = 'vanilla';

    canRender(context: TemplateContext): boolean {
        return true; // Fallback renderer
    }

    render(context: TemplateContext): string {
        const { schema, session, resources, nonce } = context;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(schema.title)}</title>
    
    ${this.renderPreloads(resources)}
    ${this.renderCSS(resources)}
    ${this.renderInlineStyles(resources, nonce)}
</head>
<body>
    ${this.renderBody(context)}
    ${this.renderJavaScript(resources, nonce)}
    ${this.renderInitScript(context, nonce)}
</body>
</html>`;
    }

    private renderPreloads(resources: LoadedResources): string {
        return resources.preloadLinks.join('\n    ');
    }

    private renderCSS(resources: LoadedResources): string {
        return resources.css
            .map(css => `<link href="${css}" rel="stylesheet">`)
            .join('\n    ');
    }

    private renderInlineStyles(resources: LoadedResources, nonce: string): string {
        if (!resources.inlineCSS) return '';

        return `
    <style nonce="${nonce}">
        ${resources.inlineCSS}
        
        /* Enhanced styles for vanilla JS framework */
        .mcp-loading { 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            padding: 2rem; 
            color: #64748b; 
        }
        .mcp-error { 
            background: #fef2f2; 
            border: 1px solid #fecaca; 
            color: #dc2626; 
            padding: 1rem; 
            border-radius: 0.5rem; 
            margin: 1rem 0; 
        }
        .mcp-notification-container {
            position: fixed;
            top: 1rem;
            right: 1rem;
            z-index: 1000;
            max-width: 400px;
        }
        .mcp-notification {
            background: white;
            border-radius: 0.5rem;
            padding: 1rem;
            margin-bottom: 0.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            animation: slideIn 0.3s ease;
        }
        .mcp-notification-success { border-left: 4px solid #10b981; }
        .mcp-notification-error { border-left: 4px solid #dc2626; }
        .mcp-notification-info { border-left: 4px solid #3b82f6; }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    </style>`;
    }

    private renderBody(context: TemplateContext): string {
        const { schema } = context;
        const safeDescription = schema.description ? this.escapeHtml(schema.description) : '';

        return `
    <!-- Vanilla JS MCP UI Container -->
    <div id="mcp-app">
        <header class="header">
            <h1>${this.escapeHtml(schema.title)}</h1>
            ${safeDescription ? `<p class="description">${safeDescription}</p>` : ''}
            <div class="session-info">
                <span>Session expires: <span id="expire-time">Loading...</span></span>
                <button id="extend-btn" class="btn-extend">Extend</button>
            </div>
        </header>

        <main class="main">
            <!-- Loading state -->
            <div id="mcp-loading" class="mcp-loading" style="display: none;">
                <div class="loading-spinner"></div>
                <span>Loading...</span>
            </div>

            <!-- Error state -->
            <div id="mcp-error" class="mcp-error" style="display: none;"></div>

            <!-- Component containers -->
            ${this.renderComponentContainers(schema.components)}
        </main>
    </div>`;
    }

    private renderComponentContainers(components: any[]): string {
        return components.map(component => {
            const containerClass = `component-container component-${component.type}`;
            return `<div id="${component.id}" class="${containerClass}"></div>`;
        }).join('\n            ');
    }

    private renderJavaScript(resources: LoadedResources, nonce: string): string {
        return `
    <!-- Vanilla JS MCP Framework -->
    ${resources.javascript.map(js => `<script nonce="${nonce}" src="${js}"></script>`).join('\n    ')}`;
    }

    private renderInitScript(context: TemplateContext, nonce: string): string {
        const { session, config, schema, resources } = context;

        return `
    
    <!-- Component Initialization -->
    <script nonce="${nonce}">
        // Global configuration
        const mcpConfig = ${this.safeJsonStringify({
            sessionToken: session.token,
            pollInterval: config.pollInterval,
            apiBase: config.apiBase,
            userId: session.userId,
            security: {
                sanitizeInput: true,
                validateEvents: true,
                enableRateLimit: true,
                maxInputLength: 1000
            }
        })};

        // Initial data (safely embedded) - get from template data, not session
        const mcpInitialData = ${this.safeJsonStringify(context.initialData || [])};

        // UI Schema (for component initialization)
        const mcpSchema = ${this.safeJsonStringify(schema)};

        // Initialize the MCP UI when DOM is ready
        document.addEventListener('DOMContentLoaded', function() {
            try {
                console.log('🚀 Initializing MCP Vanilla JS UI Framework');
                console.log('📊 Initial data:', mcpInitialData);

                // Initialize components from schema
                const components = MCP.initFromSchema(mcpSchema, { default: mcpInitialData }, mcpConfig);
                
                console.log('✅ MCP Components initialized:', components.length);

                // Setup session management
                MCP.updateExpirationTime('${session.expiresAt.toISOString()}');

                // Setup extend session button
                const extendBtn = document.getElementById('extend-btn');
                if (extendBtn) {
                    extendBtn.addEventListener('click', async function() {
                        try {
                            extendBtn.disabled = true;
                            extendBtn.textContent = 'Extending...';
                            
                            await MCP.extendSession(30, mcpConfig.sessionToken);
                            
                            extendBtn.textContent = 'Extended!';
                            setTimeout(() => {
                                extendBtn.disabled = false;
                                extendBtn.textContent = 'Extend';
                            }, 2000);
                        } catch (error) {
                            console.error('Failed to extend session:', error);
                            extendBtn.disabled = false;
                            extendBtn.textContent = 'Extend';
                            MCP.utils.showNotification('Failed to extend session', 'error');
                        }
                    });
                }

                // Show success notification
                MCP.utils.showNotification('UI loaded successfully!', 'success', 2000);

            } catch (error) {
                console.error('❌ Failed to initialize MCP UI:', error);
                
                // Show error state
                const errorDiv = document.getElementById('mcp-error');
                if (errorDiv) {
                    errorDiv.textContent = 'Failed to load UI: ' + error.message;
                    errorDiv.style.display = 'block';
                }
            }
        });

        // Global error handling
        window.addEventListener('error', function(event) {
            console.error('MCP UI Error:', event.error);
            MCP.utils.showNotification('An error occurred. Please refresh the page.', 'error');
        });

        // Handle page visibility changes for polling optimization
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                console.log('🔄 Page visible - refreshing components');
                // Components will automatically refresh when page becomes visible
            }
        });
    </script>`;
    }

    private escapeHtml(unsafe: string): string {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    private safeJsonStringify(data: any): string {
        return JSON.stringify(data)
            .replace(/</g, '\\u003c')
            .replace(/>/g, '\\u003e')
            .replace(/&/g, '\\u0026');
    }
}

/**
 * Main TemplateEngine with pluggable renderers
 */
export class TemplateEngine {
    private renderers: TemplateRenderer[] = [];

    constructor(
        private config: UIServerConfig,
        private resourceManager: ResourceManager
    ) {
        // Register default renderers
        this.registerRenderer(new VanillaTemplateRenderer());

        // Register custom renderers from config
        this.loadCustomRenderers();
    }

    /**
     * Register a template renderer
     */
    registerRenderer(renderer: TemplateRenderer): void {
        this.renderers.push(renderer);
    }

    /**
     * Render template using appropriate renderer
     */
    async render(templateData: TemplateData): Promise<string> {
        try {
            // Get required resources based on schema
            const resources = this.resourceManager.getRequiredResources(templateData.schema);

            const context: TemplateContext = {
                schema: templateData.schema,
                session: templateData.session,
                resources,
                config: templateData.config,
                nonce: templateData.nonce || this.generateNonce(),
                initialData: templateData.initialData
            };

            // Find appropriate renderer
            const renderer = this.findRenderer(context);
            if (!renderer) {
                throw new Error('No suitable template renderer found');
            }

            return renderer.render(context);
        } catch (error) {
            console.error('Template rendering failed:', error);
            return this.renderErrorPage(error);
        }
    }

    /**
     * Find the best renderer for the context
     */
    private findRenderer(context: TemplateContext): TemplateRenderer | null {
        // Find first renderer that can handle this context
        return this.renderers.find(renderer => renderer.canRender(context)) || null;
    }

    /**
     * Load custom renderers from configuration
     */
    private loadCustomRenderers(): void {
        // Implementation would load custom template renderers
        // based on config.templates.customTemplates
    }

    /**
     * Render error page
     */
    private renderErrorPage(error: any): string {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const safeError = this.escapeHtml(errorMessage);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - MCP Web UI</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 2rem; background: #f8fafc; }
        .error-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 0.5rem; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .error-title { color: #dc2626; font-size: 1.5rem; margin-bottom: 1rem; }
        .error-message { color: #374151; margin-bottom: 1.5rem; }
        .error-actions { display: flex; gap: 1rem; }
        .btn { padding: 0.5rem 1rem; border-radius: 0.375rem; text-decoration: none; font-weight: 500; }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-secondary { background: #f3f4f6; color: #374151; }
    </style>
</head>
<body>
    <div class="error-container">
        <h1 class="error-title">⚠️ Server Error</h1>
        <p class="error-message">Failed to load the MCP Web UI: ${safeError}</p>
        <div class="error-actions">
            <a href="javascript:location.reload()" class="btn btn-primary">Retry</a>
            <a href="/api/health" class="btn btn-secondary">Check Status</a>
        </div>
    </div>
</body>
</html>`;
    }

    private escapeHtml(unsafe: string): string {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    private generateNonce(): string {
        return Math.random().toString(36).substring(2, 15);
    }
} 