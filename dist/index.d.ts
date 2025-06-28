export { MCPWebUI } from './MCPWebUI.js';
export { SessionManager } from './session/SessionManager.js';
export { UIServer } from './server/UIServer.js';
export type { WebUISession, UISchema, UIComponent, UIField, UIAction, MCPWebUIConfig, DataSourceFunction, UpdateHandler, APIResponse, TemplateData } from './types/index.js';
export declare const createTodoSchema: (title?: string) => any;
export declare const createSimpleListSchema: (title: string, fields: Array<{
    key: string;
    label: string;
    type: string;
}>) => any;
//# sourceMappingURL=index.d.ts.map