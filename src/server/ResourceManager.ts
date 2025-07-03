/**
 * ResourceManager - Configuration-driven resource loading
 * Replaces hardcoded CSS/JS loading in UIServer with flexible, schema-driven approach
 * Now supports CSS living with MCP servers instead of in framework
 */

import { UIServerConfig, ThemeConfig, ComponentLoadConfig } from './UIServerConfig.js';
import { UISchema } from '../types/index.js';
import path from 'path';
import fs from 'fs';

export interface LoadedResources {
    css: string[];
    javascript: string[];
    inlineCSS: string;
    preloadLinks: string[];
}

export class ResourceManager {
    constructor(
        private config: UIServerConfig,
        private projectRoot: string
    ) { }

    /**
     * Determine which resources to load based on UI schema
     * This replaces hardcoded resource loading
     */
    getRequiredResources(schema: UISchema): LoadedResources {
        const result: LoadedResources = {
            css: [],
            javascript: [],
            inlineCSS: '',
            preloadLinks: []
        };

        // 1. Load theme CSS from MCP server (this includes styles.css)
        const themeCSS = this.getThemeCSS(schema);
        result.css.push(...themeCSS);

        // 3. Load required JavaScript components
        const requiredJS = this.getRequiredJavaScript(schema);
        result.javascript.push(...requiredJS);

        // 4. Generate inline CSS for runtime customization
        result.inlineCSS = this.generateInlineCSS(schema);

        // 5. Generate preload links for performance
        result.preloadLinks = this.generatePreloadLinks(schema);

        return result;
    }

    /**
     * Schema-driven theme CSS loading from MCP server
     * Simple: always load styles.css if MCP CSS directory is configured
     */
    private getThemeCSS(schema: UISchema): string[] {
        const css: string[] = [];

        // If MCP server directory is configured, load app styles
        if (this.config.resources.css.mcpServerDirectory) {
            css.push('/static/styles.css');
        }

        return css;
    }

    /**
     * Dynamic JavaScript loading based on schema requirements
     */
    private getRequiredJavaScript(schema: UISchema): string[] {
        const js: string[] = [];

        // If bundling is enabled, only load the bundled file
        if (this.config.resources.javascript.enableBundling) {
            js.push('/static/mcp-framework.js');
        } else {
            // Load individual files only if bundling is disabled
            for (const componentConfig of this.config.resources.javascript.components) {
                if (componentConfig.loadCondition(schema)) {
                    js.push(...componentConfig.files.map(file => `/static/${file}`));
                }
            }
        }

        return js;
    }

    /**
     * Generate inline CSS for runtime customization
     */
    private generateInlineCSS(schema: UISchema): string {
        const css: string[] = [];

        // Add CSS custom properties based on schema
        css.push(':root {');

        // Theme-specific CSS variables
        if (schema.title.toLowerCase().includes('todoodles')) {
            css.push('  --app-primary: #6366f1;');
            css.push('  --app-secondary: #10b981;');
        } else if (schema.title.toLowerCase().includes('grocery')) {
            css.push('  --app-primary: #059669;');
            css.push('  --app-secondary: #dc2626;');
        }

        css.push('}');

        // Component-specific styling
        for (const component of schema.components) {
            css.push(this.getComponentCSS(component));
        }

        return css.join('\n');
    }

    /**
     * Check if schema matches theme conditions
     */
    private matchesThemeConditions(schema: UISchema, theme: ThemeConfig): boolean {
        if (!theme.conditions) return false;

        // Check schema title conditions
        if (theme.conditions.schemaTitle) {
            const titleMatch = theme.conditions.schemaTitle.some(title =>
                schema.title.toLowerCase().includes(title.toLowerCase())
            );
            if (titleMatch) return true;
        }

        // Check component type conditions
        if (theme.conditions.componentTypes) {
            const componentMatch = theme.conditions.componentTypes.some(type =>
                schema.components.some(comp => comp.type === type)
            );
            if (componentMatch) return true;
        }

        return false;
    }

    /**
     * Generate component-specific CSS
     */
    private getComponentCSS(component: any): string {
        const css: string[] = [];

        // Add component-specific styling based on configuration
        if (component.config?.customCSS) {
            css.push(component.config.customCSS);
        }

        return css.join('\n');
    }

    /**
     * Generate preload links for performance
     */
    private generatePreloadLinks(schema: UISchema): string[] {
        const preloads: string[] = [];

        // Preload theme CSS (this includes styles.css)
        const themeCSS = this.getThemeCSS(schema);
        for (const css of themeCSS) {
            preloads.push(`<link rel="preload" href="${css}" as="style">`);
        }

        return preloads;
    }

    /**
     * Bundle JavaScript files for single request
     */
    async bundleJavaScript(schema: UISchema): Promise<string> {
        if (!this.config.resources.javascript.enableBundling) {
            return '';
        }

        const bundledJS: string[] = [];
        bundledJS.push('// MCP Framework Bundle - Generated by ResourceManager');
        bundledJS.push('// Configuration-driven loading based on UI Schema\n');

        // 1. Load framework files first
        for (const frameworkFile of this.config.resources.javascript.framework) {
            try {
                const filePath = path.join(this.projectRoot, 'src/vanilla', frameworkFile);
                if (fs.existsSync(filePath)) {
                    bundledJS.push(`// === Framework: ${frameworkFile} ===`);
                    bundledJS.push(fs.readFileSync(filePath, 'utf8'));
                    bundledJS.push('');
                } else {
                    console.warn(`Framework file not found: ${filePath}`);
                }
            } catch (error) {
                console.warn(`Failed to bundle framework file ${frameworkFile}:`, error);
            }
        }

        // 2. Load component files based on schema
        for (const componentConfig of this.config.resources.javascript.components) {
            if (componentConfig.loadCondition(schema)) {
                for (const componentFile of componentConfig.files) {
                    try {
                        const filePath = path.join(this.projectRoot, 'src/vanilla', componentFile);
                        if (fs.existsSync(filePath)) {
                            bundledJS.push(`// === Component: ${componentFile} ===`);
                            bundledJS.push(fs.readFileSync(filePath, 'utf8'));
                            bundledJS.push('');
                        } else {
                            console.warn(`Component file not found: ${filePath}`);
                        }
                    } catch (error) {
                        console.warn(`Failed to bundle component file ${componentFile}:`, error);
                    }
                }
            }
        }

        return bundledJS.join('\n');
    }

    /**
     * Get all CSS content for bundling from MCP server directories
     */
    async bundleCSS(schema: UISchema): Promise<string> {
        const cssFiles = this.getThemeCSS(schema);
        const bundledCSS: string[] = [];

        bundledCSS.push('/* MCP Theme Bundle - Generated by ResourceManager */');
        bundledCSS.push('/* CSS loaded from MCP server directories */\n');

        for (const cssFile of cssFiles) {
            try {
                let filePath = '';

                // Look in MCP server directory first
                if (this.config.resources.css.mcpServerDirectory) {
                    const cssDir = this.config.resources.css.mcpServerDirectory;
                    const attempt = path.join(cssDir, cssFile.replace('/static/styles.css', 'styles.css'));
                    if (fs.existsSync(attempt)) {
                        filePath = attempt;
                    }
                }

                // Fallback to framework directories if not found in MCP server
                if (!filePath) {
                    const directories = this.config.resources.static.directories;
                    for (const dir of directories) {
                        const absDir = path.isAbsolute(dir) ? dir : path.join(this.projectRoot, dir);
                        const attempt = path.join(absDir, cssFile.replace('/static/', ''));
                        if (fs.existsSync(attempt)) {
                            filePath = attempt;
                            break;
                        }
                    }
                }

                if (fs.existsSync(filePath)) {
                    bundledCSS.push(`/* === ${cssFile} === */`);
                    bundledCSS.push(fs.readFileSync(filePath, 'utf8'));
                    bundledCSS.push('');
                } else {
                    bundledCSS.push(`/* CSS file not found: ${cssFile} */`);
                }
            } catch (error) {
                console.warn(`Failed to bundle ${cssFile}:`, error);
                bundledCSS.push(`/* Error loading ${cssFile}: ${error} */`);
            }
        }

        return bundledCSS.join('\n');
    }

    /**
     * Validate that all required resources exist
     */
    validateResources(schema: UISchema): { valid: boolean; missing: string[] } {
        const missing: string[] = [];
        const resources = this.getRequiredResources(schema);
        const directories = this.config.resources.static.directories;

        // Check CSS files
        for (const css of resources.css) {
            let found = false;
            for (const dir of directories) {
                const absDir = path.isAbsolute(dir) ? dir : path.join(this.projectRoot, dir);
                const attempt = path.join(absDir, css.replace('/static/', ''));
                if (fs.existsSync(attempt)) { found = true; break; }
            }
            if (!found) missing.push(css);
        }

        // Check JS files
        for (const js of resources.javascript) {
            const filePath = path.join(this.projectRoot, 'src/vanilla', js.replace('/static/', ''));
            if (!fs.existsSync(filePath)) {
                missing.push(js);
            }
        }

        return {
            valid: missing.length === 0,
            missing
        };
    }
} 