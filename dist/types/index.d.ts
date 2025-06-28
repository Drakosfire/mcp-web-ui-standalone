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
}
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
    fields?: UIField[];
    submitAction?: string;
    metrics?: string[];
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
    options?: {
        value: string;
        label: string;
    }[];
    format?: (value: any) => string;
    badgeConfig?: {
        colorMap?: Record<string, string>;
    };
}
export interface UIAction {
    id: string;
    label: string;
    type: 'button' | 'bulk' | 'inline';
    handler: string;
    confirm?: string;
    icon?: string;
}
export interface DataSourceFunction<T = any> {
    (userId?: string): Promise<T[]>;
}
export interface UpdateHandler {
    (action: string, data: any, userId: string): Promise<any>;
}
export interface MCPWebUIConfig<T = any> {
    dataSource: DataSourceFunction<T>;
    schema: UISchema;
    onUpdate: UpdateHandler;
    sessionTimeout?: number;
    pollInterval?: number;
    portRange?: [number, number];
    enableLogging?: boolean;
    baseUrl?: string;
    bindAddress?: string;
}
export interface UIServer {
    session: WebUISession;
    expressApp: any;
    server: any;
    cleanup: () => Promise<void>;
}
export interface APIResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: string;
}
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
//# sourceMappingURL=index.d.ts.map