import { Request, Response } from 'express';

// Core session management types
export interface WebUISession {
    id: string;
    token: string;
    userId: string;
    url: string;
    port: number;
    startTime: Date;
    lastActivity: Date;
    expiresAt: Date;
    isActive: boolean;
    serverName?: string; // MCP server name for session isolation
    serverType?: string; // Server type for additional context
}

// UI Schema definition for configuration-driven interfaces
export interface UISchema {
    title: string;
    description?: string;
    components: UIComponent[];
    actions?: UIAction[];
    polling?: {
        enabled: boolean;
        intervalMs: number;
    };
}

export interface UIComponent {
    type: 'list' | 'form' | 'table' | 'card' | 'stats';
    id: string;
    title?: string;
    config: ComponentConfig;
}

export interface ComponentConfig {
    // For list/table components
    fields?: UIField[];
    showItemCount?: boolean;
    // For form components
    submitAction?: string;
    // For stats components  
    metrics?: string[];
    // Common properties
    className?: string;
    sortable?: boolean;
    filterable?: boolean;
}

export interface UIField {
    key: string;
    label: string;
    type: 'text' | 'checkbox' | 'select' | 'date' | 'number' | 'badge';
    sortable?: boolean;
    editable?: boolean;
    options?: { value: string; label: string }[];
    format?: (value: any) => string;
    badgeConfig?: {
        colorMap?: Record<string, string>;
    };
}

export interface UIAction {
    id: string;
    label: string;
    type: 'button' | 'bulk' | 'inline';
    handler: string; // Name of handler function
    confirm?: string; // Confirmation message
    icon?: string;
}

// Data source and update handling
export interface DataSourceFunction<T = any> {
    (userId?: string): Promise<T[]>;
}

export interface UpdateHandler {
    (action: string, data: any, userId: string): Promise<any>;
}

// Main configuration interface
export interface MCPWebUIConfig<T = any> {
    dataSource: DataSourceFunction<T>;
    schema: UISchema;
    onUpdate: UpdateHandler;
    sessionTimeout?: number; // milliseconds, default 30 minutes
    pollInterval?: number; // milliseconds, default 2 seconds
    portRange?: [number, number]; // default [3000, 65535]
    blockedPorts?: number[]; // ports to skip when finding available port, default []
    enableLogging?: boolean;
    baseUrl?: string; // base URL for sessions, default 'localhost'
    protocol?: string; // protocol for session URLs, default 'http' or auto-detected from baseUrl
    bindAddress?: string; // address to bind server to, default 'localhost' or '0.0.0.0' for all
    cssPath?: string; // Path to MCP server's CSS directory (e.g., './static' or '../todoodles/src/web-ui/static')
    serverName?: string; // Explicit server name override (e.g., 'todoodles', 'grocery') - used for CSS file naming if not auto-detected

    // Proxy mode configuration
    proxyMode?: boolean; // Enable proxy mode with token registry
    mongoUrl?: string; // MongoDB URL for token registry (required in proxy mode)
    mongoDbName?: string; // MongoDB database name, default: 'mcp_webui'
    jwtSecret?: string; // JWT secret for token signing
}

// Server management types
// UIServer interface removed - use GenericUIServer instead

// API response types
export interface APIResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: string;
}

// Template data passed to UI
export interface TemplateData {
    session: WebUISession;
    schema: UISchema;
    initialData: any[];
    config: {
        pollInterval: number;
        apiBase: string;
    };
    nonce?: string;
} 