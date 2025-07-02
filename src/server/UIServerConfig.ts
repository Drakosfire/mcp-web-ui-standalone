/**
 * UIServer Configuration System
 * Enables configuration-driven server behavior following Generic Component Architecture
 */

export interface UIServerConfig {
    // Core server configuration
    server: {
        bindAddress: string;
        enableCompression: boolean;
        enableRateLimit: boolean;
        maxRequestSize: string;
    };

    // Security configuration
    security: {
        enableCSP: boolean;
        allowedOrigins: string[];
        sessionTimeout: number;
        enableSanitization: boolean;
    };

    // Resource loading configuration
    resources: {
        // CSS loading strategy
        css: {
            strategy: 'auto' | 'manual' | 'schema-driven';
            baseTheme: string;
            customThemes: ThemeConfig[];
            loadOrder: string[];
            mcpServerDirectory?: string;
        };

        // JavaScript loading configuration
        javascript: {
            framework: string[];
            components: ComponentLoadConfig[];
            enableBundling: boolean;
        };

        // Static file configuration
        static: StaticResourceConfig;
    };

    // Template configuration
    templates: {
        engine: 'vanilla' | 'custom';
        customTemplates: TemplateConfig[];
        enableCaching: boolean;
        defaultLayout: string;
    };

    // Plugin system configuration
    plugins: {
        enabled: string[];
        config: Record<string, any>;
    };
}

export interface ThemeConfig {
    name: string;
    files: string[];
    conditions?: {
        schemaTitle?: string[];
        componentTypes?: string[];
    };
    source?: 'framework' | 'mcp-server';
    priority: number;
}

export interface ComponentLoadConfig {
    name: string;
    files: string[];
    dependencies: string[];
    loadCondition: (schema: { components: Array<{ type: string }> }) => boolean;
}

export interface TemplateConfig {
    name: string;
    path: string;
    conditions?: {
        schemaTitle?: string[];
        componentTypes?: string[];
    };
}

export interface PluginConfig {
    name: string;
    enabled: boolean;
    config: Record<string, any>;
    loadOrder: number;
}

export interface StaticResourceConfig {
    directories: string[];
    cacheControl: string;
    enableCompression: boolean;
    mcpServerDirectories?: string[];
}

/**
 * Default configuration following progressive enhancement principles
 */
export const DEFAULT_UI_SERVER_CONFIG: UIServerConfig = {
    server: {
        bindAddress: 'localhost',
        enableCompression: true,
        enableRateLimit: true,
        maxRequestSize: '1mb'
    },

    security: {
        enableCSP: true,
        allowedOrigins: ['self'],
        sessionTimeout: 30 * 60 * 1000,
        enableSanitization: true
    },

    resources: {
        css: {
            strategy: 'schema-driven',
            baseTheme: 'default',
            customThemes: [
                {
                    name: 'todoodles',
                    files: ['todoodles-styles.css'],
                    conditions: {
                        schemaTitle: ['todoodles', 'todo']
                    },
                    priority: 10
                },
                {
                    name: 'grocery',
                    files: ['grocery-styles.css'],
                    conditions: {
                        schemaTitle: ['grocery']
                    },
                    priority: 10
                }
            ],
            loadOrder: ['base', 'theme', 'custom']
        },

        javascript: {
            framework: [
                'core/BaseComponent.js',
                'components/ModalComponent.js',
                'MCPFramework.js'
            ],
            components: [
                {
                    name: 'ListComponent',
                    files: ['components/ListComponent.js'],
                    dependencies: ['BaseComponent'],
                    loadCondition: (schema) => schema.components.some((c: { type: string }) => c.type === 'list')
                },
                {
                    name: 'TableComponent',
                    files: ['components/TableComponent.js'],
                    dependencies: ['BaseComponent'],
                    loadCondition: (schema) => schema.components.some((c: { type: string }) => c.type === 'table')
                }
            ],
            enableBundling: true
        },

        static: {
            directories: ['templates/static'], // Framework default
            cacheControl: 'public, max-age=3600',
            enableCompression: true
        }
    },

    templates: {
        engine: 'vanilla',
        customTemplates: [],
        enableCaching: false,
        defaultLayout: 'default'
    },

    plugins: {
        enabled: [],
        config: {}
    }
};

/**
 * Configuration builder for easy setup
 */
export class UIServerConfigBuilder {
    private config: Partial<UIServerConfig> = {};

    static create(): UIServerConfigBuilder {
        return new UIServerConfigBuilder();
    }

    withTheme(theme: ThemeConfig): UIServerConfigBuilder {
        if (!this.config.resources) {
            this.config.resources = {
                css: { strategy: 'schema-driven', baseTheme: 'default', customThemes: [], loadOrder: [] },
                javascript: { framework: [], components: [], enableBundling: true },
                static: { directories: [], cacheControl: '', enableCompression: true }
            };
        }
        if (!this.config.resources.css) {
            this.config.resources.css = { strategy: 'schema-driven', baseTheme: 'default', customThemes: [], loadOrder: [] };
        }
        if (!this.config.resources.css.customThemes) {
            this.config.resources.css.customThemes = [];
        }

        this.config.resources.css.customThemes.push(theme);
        return this;
    }

    withPlugin(name: string, config: any): UIServerConfigBuilder {
        if (!this.config.plugins) this.config.plugins = { enabled: [], config: {} };

        this.config.plugins.enabled.push(name);
        this.config.plugins.config[name] = config;
        return this;
    }

    withCustomCSS(name: string, conditions: ThemeConfig['conditions']): UIServerConfigBuilder {
        return this.withTheme({
            name,
            files: [`${name}-styles.css`],
            conditions,
            priority: 10
        });
    }

    withStaticDirectory(dir: string): UIServerConfigBuilder {
        if (!this.config.resources) {
            this.config.resources = {
                css: { strategy: 'schema-driven', baseTheme: 'default', customThemes: [], loadOrder: [] },
                javascript: { framework: [], components: [], enableBundling: true },
                static: { directories: [], cacheControl: 'public, max-age=3600', enableCompression: true }
            };
        }

        if (!this.config.resources.static) {
            this.config.resources.static = {
                directories: [],
                cacheControl: 'public, max-age=3600',
                enableCompression: true
            };
        }

        if (!this.config.resources.static.directories) {
            this.config.resources.static.directories = [];
        }

        this.config.resources.static.directories.push(dir);
        return this;
    }

    build(): UIServerConfig {
        // Ensure nested objects exist before merging
        const baseResources = DEFAULT_UI_SERVER_CONFIG.resources;
        const configResources = this.config.resources;

        const baseStatic = baseResources.static;
        const configStatic = configResources?.static;

        return {
            ...DEFAULT_UI_SERVER_CONFIG,
            ...this.config,
            resources: {
                ...baseResources,
                ...(configResources || {}),
                css: {
                    ...baseResources.css,
                    ...(configResources?.css || {})
                },
                static: {
                    directories: Array.from(new Set([
                        ...baseStatic.directories,
                        ...(configStatic?.directories || [])
                    ])),
                    cacheControl: configStatic?.cacheControl || baseStatic.cacheControl,
                    enableCompression: configStatic?.enableCompression ?? baseStatic.enableCompression,
                    mcpServerDirectories: configStatic?.mcpServerDirectories || []
                }
            }
        };
    }
} 