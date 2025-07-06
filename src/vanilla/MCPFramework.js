/**
 * MCPFramework - Main Vanilla JS Framework for MCP Web UI
 * 
 * This is the core framework that provides:
 * - Component factory and registration system
 * - Automatic component initialization from HTML
 * - Schema-driven UI generation
 * - Session management integration
 * - Helper utilities for common MCP UI patterns
 * 
 * SECURITY FEATURES:
 * - Perfect CSP compliance (no eval, no Function constructor)
 * - Built-in XSS protection for all components
 * - Secure component registration and initialization
 * - Session token validation for all API calls
 * 
 * AI AGENT DOCUMENTATION:
 * This framework is designed to be easily understood and used by AI agents.
 * Each method is extensively documented with examples and usage patterns.
 * 
 * DESIGN PHILOSOPHY:
 * - Zero dependencies: No external libraries required
 * - Lightweight: ~2-3KB total bundle size
 * - Disposable: Easy to copy-paste and modify
 * - Secure: Security-first design with built-in protections
 * - Flexible: Schema-driven configuration for any UI needs
 * 
 * Usage Examples:
 * 
 * 1. Basic Todo List:
 * MCP.TodoList('#todo-container', todoData, {
 *   sessionToken: 'abc123',
 *   pollInterval: 2000
 * });
 * 
 * 2. Data Table:
 * MCP.Table('#table-container', tableData, {
 *   sessionToken: 'abc123',
 *   table: {
 *     columns: [
 *       { key: 'name', label: 'Name', type: 'text', sortable: true },
 *       { key: 'status', label: 'Status', type: 'badge' }
 *     ],
 *     sortable: true,
 *     filterable: true
 *   }
 * });
 * 
 * 3. Auto-initialization from HTML:
 * MCP.initFromHTML(initialData, globalConfig);
 */

/**
 * MCP - The main framework namespace
 * All components and utilities are available under this global object
 */
const MCP = {
    // Component registry
    components: {},

    // Global configuration defaults
    defaults: {
        apiBase: '/api',
        pollInterval: 2000,
        sessionToken: '',
        security: {
            sanitizeInput: true,
            validateEvents: true,
            enableRateLimit: true,
            maxInputLength: 1000
        }
    },

    // Utility functions
    utils: {}
};

/**
 * Component Factory Functions
 * These provide easy ways to create and initialize components
 */

/**
 * Create a List component (generic list functionality)
 * @param {string|HTMLElement} selector - CSS selector or DOM element
 * @param {Array} data - Initial list data
 * @param {Object} config - Component configuration
 * @returns {ListComponent} Initialized component instance
 */
MCP.List = function (selector, data = [], config = {}) {
    const element = typeof selector === 'string'
        ? document.querySelector(selector)
        : selector;

    if (!element) {
        console.error('MCP.List: Element not found:', selector);
        return null;
    }

    const mergedConfig = MCP.utils.mergeConfig(MCP.defaults, config);
    const component = new ListComponent(element, data, mergedConfig);

    // Register component for management
    MCP.registerComponent(element.id || 'list-' + Date.now(), component);

    return component;
};

/**
 * Create a Table component
 * @param {string|HTMLElement} selector - CSS selector or DOM element
 * @param {Array} data - Initial table data
 * @param {Object} config - Component configuration
 * @returns {TableComponent} Initialized component instance
 */
MCP.Table = function (selector, data = [], config = {}) {
    const element = typeof selector === 'string'
        ? document.querySelector(selector)
        : selector;

    if (!element) {
        console.error('MCP.Table: Element not found:', selector);
        return null;
    }

    const mergedConfig = MCP.utils.mergeConfig(MCP.defaults, config);
    const component = new TableComponent(element, data, mergedConfig);

    // Register component for management
    MCP.registerComponent(element.id || 'table-' + Date.now(), component);

    return component;
};

/**
 * Create a Stats component (simple metrics display)
 * @param {string|HTMLElement} selector - CSS selector or DOM element
 * @param {Object} data - Statistics data
 * @param {Object} config - Component configuration
 * @returns {StatsComponent} Initialized component instance
 */
MCP.Stats = function (selector, data = {}, config = {}) {
    const element = typeof selector === 'string'
        ? document.querySelector(selector)
        : selector;

    if (!element) {
        console.error('MCP.Stats: Element not found:', selector);
        return null;
    }

    const mergedConfig = MCP.utils.mergeConfig(MCP.defaults, config);
    const component = new StatsComponent(element, data, mergedConfig);

    // Register component for management
    MCP.registerComponent(element.id || 'stats-' + Date.now(), component);

    return component;
};

/**
 * Create a Dashboard component for displaying metrics and KPIs
 * @param {string|HTMLElement} selector - CSS selector or DOM element
 * @param {Array} data - Array of metric objects
 * @param {Object} config - Component configuration
 * @returns {DashboardComponent} Initialized component instance
 */
MCP.Dashboard = function (selector, data = [], config = {}) {
    const element = typeof selector === 'string'
        ? document.querySelector(selector)
        : selector;

    if (!element) {
        console.error('MCP.Dashboard: Element not found:', selector);
        return null;
    }

    const mergedConfig = MCP.utils.mergeConfig(MCP.defaults, config);
    const component = new DashboardComponent(element, data, mergedConfig);

    // Register component for management
    MCP.registerComponent(element.id || 'dashboard-' + Date.now(), component);

    return component;
};

/**
 * Create a Status component for displaying status badges and indicators
 * @param {string|HTMLElement} selector - CSS selector or DOM element
 * @param {Object|string} data - Status data (object or simple string)
 * @param {Object} config - Component configuration
 * @returns {StatusComponent} Initialized component instance
 */
MCP.Status = function (selector, data = {}, config = {}) {
    const element = typeof selector === 'string'
        ? document.querySelector(selector)
        : selector;

    if (!element) {
        console.error('MCP.Status: Element not found:', selector);
        return null;
    }

    const mergedConfig = MCP.utils.mergeConfig(MCP.defaults, config);
    const component = new StatusComponent(element, data, mergedConfig);

    // Register component for management
    MCP.registerComponent(element.id || 'status-' + Date.now(), component);

    return component;
};

/**
 * Create a ScheduleDisplay component for showing scheduling information
 * @param {string|HTMLElement} selector - CSS selector or DOM element
 * @param {Object} data - Schedule data object
 * @param {Object} config - Component configuration
 * @returns {ScheduleDisplayComponent} Initialized component instance
 */
MCP.ScheduleDisplay = function (selector, data = {}, config = {}) {
    const element = typeof selector === 'string'
        ? document.querySelector(selector)
        : selector;

    if (!element) {
        console.error('MCP.ScheduleDisplay: Element not found:', selector);
        return null;
    }

    const mergedConfig = MCP.utils.mergeConfig(MCP.defaults, config);
    const component = new ScheduleDisplayComponent(element, data, mergedConfig);

    // Register component for management
    MCP.registerComponent(element.id || 'schedule-' + Date.now(), component);

    return component;
};

/**
 * Create a GroceryList component for managing grocery items
 * @param {string|HTMLElement} selector - CSS selector or DOM element
 * @param {Array} data - Initial grocery items data
 * @param {Object} config - Component configuration
 * @returns {GroceryListComponent} Initialized component instance
 */
MCP.GroceryList = function (selector, data = [], config = {}) {
    const element = typeof selector === 'string'
        ? document.querySelector(selector)
        : selector;

    if (!element) {
        console.error('MCP.GroceryList: Element not found:', selector);
        return null;
    }

    const mergedConfig = MCP.utils.mergeConfig(MCP.defaults, config);
    const component = new GroceryListComponent(element, data, mergedConfig);

    // Register component for management
    MCP.registerComponent(element.id || 'grocery-list-' + Date.now(), component);

    return component;
};

/**
 * Create a GroceryStats component for displaying grocery list statistics
 * @param {string|HTMLElement} selector - CSS selector or DOM element
 * @param {Array} data - Grocery items data for statistics
 * @param {Object} config - Component configuration
 * @returns {GroceryStatsComponent} Initialized component instance
 */
MCP.GroceryStats = function (selector, data = [], config = {}) {
    const element = typeof selector === 'string'
        ? document.querySelector(selector)
        : selector;

    if (!element) {
        console.error('MCP.GroceryStats: Element not found:', selector);
        return null;
    }

    const mergedConfig = MCP.utils.mergeConfig(MCP.defaults, config);
    const component = new GroceryStatsComponent(element, data, mergedConfig);

    // Register component for management
    MCP.registerComponent(element.id || 'grocery-stats-' + Date.now(), component);

    return component;
};

/**
 * Modal System Integration
 * The modal system is available globally as window.MCPModal after ModalComponent.js is loaded
 * These are convenience methods to ensure consistent access patterns
 */

/**
 * Show an alert modal
 * @param {Object} config - Modal configuration
 * @returns {Promise} Promise that resolves when modal is closed
 */
MCP.alert = function (config = {}) {
    if (!window.MCPModal) {
        console.error('MCP.alert: Modal system not available. Ensure ModalComponent.js is loaded.');
        return Promise.reject(new Error('Modal system not available'));
    }
    return window.MCPModal.alert(config);
};

/**
 * Show a confirmation modal
 * @param {Object} config - Modal configuration
 * @returns {Promise} Promise that resolves with confirmation result
 */
MCP.confirm = function (config = {}) {
    if (!window.MCPModal) {
        console.error('MCP.confirm: Modal system not available. Ensure ModalComponent.js is loaded.');
        return Promise.reject(new Error('Modal system not available'));
    }
    return window.MCPModal.confirm(config);
};

/**
 * Show a form modal
 * @param {Object} config - Modal configuration with form fields
 * @returns {Promise} Promise that resolves with form data
 */
MCP.form = function (config = {}) {
    if (!window.MCPModal) {
        console.error('MCP.form: Modal system not available. Ensure ModalComponent.js is loaded.');
        return Promise.reject(new Error('Modal system not available'));
    }
    return window.MCPModal.form(config);
};

/**
 * Show a loading modal
 * @param {Object} config - Modal configuration
 * @returns {Promise} Promise that resolves when modal is closed
 */
MCP.loading = function (config = {}) {
    if (!window.MCPModal) {
        console.error('MCP.loading: Modal system not available. Ensure ModalComponent.js is loaded.');
        return Promise.reject(new Error('Modal system not available'));
    }
    return window.MCPModal.loading(config);
};

/**
 * Show a custom modal
 * @param {Object} config - Modal configuration
 * @returns {Promise} Promise that resolves when modal is closed
 */
MCP.modal = function (config = {}) {
    if (!window.MCPModal) {
        console.error('MCP.modal: Modal system not available. Ensure ModalComponent.js is loaded.');
        return Promise.reject(new Error('Modal system not available'));
    }
    return window.MCPModal.show(config);
};

/**
 * Access to the full modal manager
 * @returns {ModalManager|null} Modal manager instance or null if not available
 */
MCP.getModalManager = function () {
    return window.MCPModalManager || null;
};

/**
 * Register a component instance for management
 * @param {string} id - Unique component ID
 * @param {BaseComponent} component - Component instance
 */
MCP.registerComponent = function (id, component) {
    MCP.components[id] = component;

    // Add cleanup on page unload
    if (!MCP._unloadHandlerSet) {
        window.addEventListener('beforeunload', MCP.destroyAll);
        MCP._unloadHandlerSet = true;
    }
};

/**
 * Get a registered component by ID
 * @param {string} id - Component ID
 * @returns {BaseComponent|null} Component instance or null
 */
MCP.getComponent = function (id) {
    return MCP.components[id] || null;
};

/**
 * Destroy a specific component
 * @param {string} id - Component ID
 */
MCP.destroyComponent = function (id) {
    const component = MCP.components[id];
    if (component && typeof component.destroy === 'function') {
        component.destroy();
        delete MCP.components[id];
    }
};

/**
 * Destroy all registered components
 * Called automatically on page unload
 */
MCP.destroyAll = function () {
    Object.keys(MCP.components).forEach(id => {
        MCP.destroyComponent(id);
    });
};

/**
 * Auto-initialize components from HTML data attributes
 * This scans the DOM for elements with data-mcp-* attributes and initializes components
 * 
 * HTML Examples:
 * <div id="todo-list" data-mcp-component="TodoList" data-mcp-config='{"pollInterval": 3000}'></div>
 * <div id="data-table" data-mcp-component="Table" data-mcp-columns='[{"key": "name", "label": "Name"}]'></div>
 * 
 * @param {Object} initialData - Initial data to pass to components
 * @param {Object} globalConfig - Global configuration to merge with component configs
 */
MCP.initFromHTML = function (initialData = {}, globalConfig = {}) {
    const elements = document.querySelectorAll('[data-mcp-component]');
    const initialized = [];

    elements.forEach(element => {
        try {
            const componentType = element.dataset.mcpComponent;
            const elementId = element.id || `mcp-${componentType.toLowerCase()}-${Date.now()}`;

            // Parse component-specific configuration
            let componentConfig = {};
            if (element.dataset.mcpConfig) {
                try {
                    componentConfig = JSON.parse(element.dataset.mcpConfig);
                } catch (error) {
                    console.warn(`MCP.initFromHTML: Invalid JSON in data-mcp-config for ${elementId}:`, error);
                }
            }

            // Parse component-specific data
            let componentData = initialData[elementId] || initialData.default || [];
            if (element.dataset.mcpData) {
                try {
                    componentData = JSON.parse(element.dataset.mcpData);
                } catch (error) {
                    console.warn(`MCP.initFromHTML: Invalid JSON in data-mcp-data for ${elementId}:`, error);
                }
            }

            // Merge configurations
            const finalConfig = MCP.utils.mergeConfig(globalConfig, componentConfig);

            // Initialize component based on type
            let component = null;
            switch (componentType) {
                case 'TodoList':
                    component = MCP.List(element, componentData, finalConfig);
                    break;
                case 'Table':
                    // Parse table-specific configuration
                    if (element.dataset.mcpColumns) {
                        try {
                            finalConfig.table = finalConfig.table || {};
                            finalConfig.table.columns = JSON.parse(element.dataset.mcpColumns);
                        } catch (error) {
                            console.warn(`MCP.initFromHTML: Invalid JSON in data-mcp-columns for ${elementId}:`, error);
                        }
                    }
                    component = MCP.Table(element, componentData, finalConfig);
                    break;
                case 'Stats':
                    component = MCP.Stats(element, componentData, finalConfig);
                    break;
                case 'Dashboard':
                    component = MCP.Dashboard(element, componentData, finalConfig);
                    break;
                case 'Status':
                    component = MCP.Status(element, componentData, finalConfig);
                    break;
                case 'ScheduleDisplay':
                    component = MCP.ScheduleDisplay(element, componentData, finalConfig);
                    break;
                case 'GroceryList':
                    component = MCP.GroceryList(element, componentData, finalConfig);
                    break;
                case 'GroceryStats':
                    component = MCP.GroceryStats(element, componentData, finalConfig);
                    break;
                default:
                    console.warn(`MCP.initFromHTML: Unknown component type: ${componentType}`);
            }

            if (component) {
                initialized.push({
                    id: elementId,
                    type: componentType,
                    component: component
                });
            }

        } catch (error) {
            console.error('MCP.initFromHTML: Error initializing component:', error, element);
        }
    });

    console.log(`MCP.initFromHTML: Initialized ${initialized.length} components:`,
        initialized.map(item => `${item.type}(${item.id})`).join(', '));

    return initialized;
};

/**
 * Schema-driven UI initialization
 * Create components from a UI schema definition (matches the TypeScript interface)
 * 
 * @param {Object} schema - UI schema definition
 * @param {Object} initialData - Initial data for components
 * @param {Object} globalConfig - Global configuration
 * @returns {Array} Array of initialized components
 */
MCP.initFromSchema = function (schema, initialData = {}, globalConfig = {}) {
    if (!schema || !schema.components) {
        console.error('MCP.initFromSchema: Invalid schema - missing components array');
        return [];
    }

    const initialized = [];

    schema.components.forEach(componentDef => {
        try {
            const element = document.getElementById(componentDef.id);
            if (!element) {
                console.warn(`MCP.initFromSchema: Element not found for component: ${componentDef.id}`);
                return;
            }

            // Merge component configuration
            const componentConfig = MCP.utils.mergeConfig(globalConfig, componentDef.config || {});

            // Get component data
            const componentData = initialData[componentDef.id] || initialData.default || [];

            // Initialize based on component type
            let component = null;
            switch (componentDef.type) {
                case 'list':
                    // Wrap config for ListComponent which expects config.list
                    const listConfig = { ...globalConfig, list: componentDef.config || {} };
                    // Pass component title from schema to main config
                    if (componentDef.title) {
                        listConfig.title = componentDef.title;
                    }
                    // Pass schema-level actions to the list component
                    if (schema.actions) {
                        listConfig.actions = schema.actions;
                    }
                    component = MCP.List(element, componentData, listConfig);
                    break;
                case 'table':
                    // Convert UI schema fields to table columns and pass actions
                    if (componentDef.config?.fields) {
                        componentConfig.table = componentConfig.table || {};
                        componentConfig.table.columns = componentDef.config.fields;
                    }
                    // Pass schema-level actions to the table component
                    if (schema.actions) {
                        componentConfig.actions = schema.actions;
                    }
                    component = MCP.Table(element, componentData, componentConfig);
                    break;
                case 'stats':
                    // Wrap config for StatsComponent which expects config.stats
                    const statsConfig = { ...globalConfig, stats: componentDef.config || {} };
                    console.log('=== MCP FRAMEWORK DEBUG ===');
                    console.log('Initializing stats component:', componentDef.id);
                    console.log('Component definition:', JSON.stringify(componentDef, null, 2));
                    console.log('Global config:', JSON.stringify(globalConfig, null, 2));
                    console.log('Component config:', JSON.stringify(componentDef.config, null, 2));
                    console.log('Final statsConfig:', JSON.stringify(statsConfig, null, 2));
                    console.log('Component data:', JSON.stringify(componentData, null, 2));
                    console.log('Element:', element);
                    console.log('=============================');
                    component = MCP.Stats(element, componentData, statsConfig);
                    break;
                case 'dashboard':
                    // Wrap config for DashboardComponent which expects config.dashboard
                    const dashboardConfig = { ...globalConfig, dashboard: componentDef.config || {} };
                    component = MCP.Dashboard(element, componentData, dashboardConfig);
                    break;
                case 'status':
                    // Wrap config for StatusComponent which expects config.status
                    const statusConfig = { ...globalConfig, status: componentDef.config || {} };
                    component = MCP.Status(element, componentData, statusConfig);
                    break;
                case 'schedule':
                case 'schedule-display':
                    // Wrap config for ScheduleDisplayComponent which expects config.schedule
                    const scheduleConfig = { ...globalConfig, schedule: componentDef.config || {} };
                    component = MCP.ScheduleDisplay(element, componentData, scheduleConfig);
                    break;
                case 'grocery-list':
                    // Wrap config for GroceryListComponent which expects config.grocery
                    const groceryConfig = { ...globalConfig, grocery: componentDef.config || {} };
                    component = MCP.GroceryList(element, componentData, groceryConfig);
                    break;
                case 'grocery-stats':
                    // Wrap config for GroceryStatsComponent which expects config.groceryStats
                    const groceryStatsConfig = { ...globalConfig, groceryStats: componentDef.config || {} };
                    component = MCP.GroceryStats(element, componentData, groceryStatsConfig);
                    break;
                default:
                    console.warn(`MCP.initFromSchema: Unknown component type: ${componentDef.type}`);
            }

            if (component) {
                initialized.push({
                    id: componentDef.id,
                    type: componentDef.type,
                    component: component
                });
            }

        } catch (error) {
            console.error('MCP.initFromSchema: Error initializing component:', error, componentDef);
        }
    });

    console.log(`MCP.initFromSchema: Initialized ${initialized.length} components from schema`);
    return initialized;
};

/**
 * Utility Functions
 * Helper functions for common operations
 */

/**
 * Deep merge configuration objects
 * @param {...Object} configs - Configuration objects to merge
 * @returns {Object} Merged configuration
 */
MCP.utils.mergeConfig = function (...configs) {
    const result = {};

    configs.forEach(config => {
        if (config && typeof config === 'object') {
            MCP.utils.deepMerge(result, config);
        }
    });

    return result;
};

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 */
MCP.utils.deepMerge = function (target, source) {
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                target[key] = target[key] || {};
                MCP.utils.deepMerge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }
};

/**
 * Create a safe HTML string with XSS protection
 * This is a utility version of the template function for use outside components
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
MCP.utils.sanitizeHTML = function (html) {
    const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };

    return String(html).replace(/[&<>"'`=\/]/g, (char) => {
        return escapeMap[char] || char;
    });
};

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
MCP.utils.formatDate = function (date, options = {}) {
    if (!date) return '';

    try {
        const dateObj = date instanceof Date ? date : new Date(date);
        const today = new Date();

        // Default to relative dates for recent dates
        if (options.relative !== false) {
            const diffTime = today - dateObj;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays === -1) return 'Tomorrow';
            if (diffDays > 0 && diffDays <= 7) return `${diffDays} days ago`;
            if (diffDays < 0 && diffDays >= -7) return `In ${Math.abs(diffDays)} days`;
        }

        // Use provided format or default
        if (options.format) {
            return options.format(dateObj);
        }

        return dateObj.toLocaleDateString();
    } catch (error) {
        console.warn('MCP.utils.formatDate: Invalid date:', date);
        return String(date);
    }
};

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
MCP.utils.debounce = function (func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
MCP.utils.throttle = function (func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

/**
 * Simple event emitter for component communication
 */
MCP.utils.EventEmitter = class {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }

    emit(event, ...args) {
        if (this.events[event]) {
            this.events[event].forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error('EventEmitter error:', error);
                }
            });
        }
    }
};

/**
 * Global event bus for component communication
 */
MCP.events = new MCP.utils.EventEmitter();

/**
 * Session Management Utilities
 * Helper functions for working with MCP sessions
 */

// Global variable to store the current expiration timer
let expirationTimer = null;

/**
 * Update session expiration time display
 * @param {string} expiresAt - ISO date string
 */
MCP.updateExpirationTime = function (expiresAt) {
    const element = document.getElementById('expire-time');
    if (!element) return;

    // CRITICAL FIX: Clear any existing timer before creating a new one
    if (expirationTimer) {
        clearInterval(expirationTimer);
        expirationTimer = null;
    }

    const updateTime = () => {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diff = expiry - now;

        if (diff <= 0) {
            element.textContent = 'Expired';
            element.className = 'expired';
            // Clear the timer when session expires
            if (expirationTimer) {
                clearInterval(expirationTimer);
                expirationTimer = null;
            }
            return;
        }

        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);

        if (minutes > 0) {
            element.textContent = `${minutes}m ${seconds}s`;
        } else {
            element.textContent = `${seconds}s`;
        }

        // Add warning class if less than 5 minutes
        if (minutes < 5) {
            element.className = 'warning';
        } else {
            element.className = '';
        }
    };

    // Run immediately
    updateTime();

    // Start new timer and store the ID
    expirationTimer = setInterval(updateTime, 1000);
};

/**
 * Extend session duration
 * @param {number} minutes - Minutes to extend
 * @param {string} sessionToken - Session token
 */
MCP.extendSession = async function (minutes = 30, sessionToken = '') {

    try {
        const headers = {
            'Content-Type': 'application/json'
        };

        // Add token to Authorization header if provided
        if (sessionToken) {
            headers['Authorization'] = `Bearer ${sessionToken}`;
        }

        const response = await fetch('/api/extend-session', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                minutes
            })
        });

        const result = await response.json();

        if (result.success) {
            // Update expiration time display
            MCP.updateExpirationTime(result.data.expiresAt);

            // Show success message
            MCP.utils.showNotification('Session extended successfully!', 'success');
        } else {
            throw new Error(result.error || 'Failed to extend session');
        }

    } catch (error) {
        console.error('Failed to extend session:', error);
        MCP.utils.showNotification('Failed to extend session', 'error');
    }
};

/**
 * Show a temporary notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, info)
 * @param {number} duration - Duration in milliseconds
 */
MCP.utils.showNotification = function (message, type = 'info', duration = 3000) {
    // Create or get notification container
    let container = document.getElementById('mcp-notifications');
    if (!container) {
        container = document.createElement('div');
        container.id = 'mcp-notifications';
        container.className = 'mcp-notification-container';
        document.body.appendChild(container);
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `mcp-notification mcp-notification-${type}`;
    notification.textContent = message;

    // Add to container
    container.appendChild(notification);

    // Auto-remove after duration
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, duration);
};

/**
 * Framework initialization
 * This runs when the script loads and sets up the global environment
 */
(function () {
    // Set up global error handling
    window.addEventListener('error', (event) => {
        console.error('MCP Framework Error:', event.error);
    });

    // Set up unhandled promise rejection handling
    window.addEventListener('unhandledrejection', (event) => {
        console.error('MCP Framework Promise Rejection:', event.reason);
    });

    // Log framework initialization
    console.log('MCP Vanilla JS Framework initialized', {
        version: '1.0.0',
        components: Object.keys(MCP).filter(key =>
            typeof MCP[key] === 'function' && key !== 'utils'
        ),
        timestamp: new Date().toISOString()
    });
})();

// Export for module systems (Node.js, bundlers)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MCP;
}

// Make available globally for vanilla JS usage
if (typeof window !== 'undefined') {
    window.MCP = MCP;
} 