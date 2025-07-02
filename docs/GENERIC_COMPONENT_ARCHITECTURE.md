# Generic Component Architecture for MCP Vanilla JS Framework

## Overview

This document defines the architectural patterns and principles for creating flexible, generic components in the MCP Vanilla JS Framework. It serves as the reference for all future component development, ensuring consistency, security, and maintainability.

## Table of Contents

1. [Core Principles](#core-principles)
2. [Component Inheritance Pattern](#component-inheritance-pattern)
3. [Configuration Architecture](#configuration-architecture)
4. [Rendering Patterns](#rendering-patterns)
5. [State Management](#state-management)
6. [Data Flow Patterns](#data-flow-patterns)
7. [Event Handling](#event-handling)
8. [Generic Component Template](#generic-component-template)
9. [Configuration-Driven Customization](#configuration-driven-customization)
10. [Integration Patterns](#integration-patterns)

## Core Principles

### 1. **Configuration Over Hardcoding**
Components should be driven by configuration objects rather than hardcoded behavior:

```javascript
// ❌ Bad: Hardcoded behavior
class TodoComponent {
    constructor(element, data, config) {
        this.allowCategories = true; // Hardcoded
        this.maxTodoLength = 500;    // Hardcoded
    }
}

// ✅ Good: Configuration-driven
class GenericListComponent {
    constructor(element, data, config) {
        this.componentConfig = {
            enableCategories: true,
            enablePriorities: true,
            enableDueDates: false,
            maxItemLength: 500,
            itemActions: ['edit', 'delete', 'toggle'],
            ...config.list // Override with user config
        };
    }
}
```

### 2. **Composition Over Inheritance**
Components should be composed of configurable features rather than inheriting rigid behavior:

```javascript
// ✅ Configurable feature composition
this.features = {
    search: this.componentConfig.enableSearch ? new SearchFeature(this) : null,
    filter: this.componentConfig.enableFilters ? new FilterFeature(this) : null,
    sort: this.componentConfig.enableSorting ? new SortFeature(this) : null,
    pagination: this.componentConfig.enablePagination ? new PaginationFeature(this) : null
};
```

### 3. **Separation of Concerns**
Clear separation between:
- **Data Management**: How data is stored and manipulated
- **Presentation**: How data is displayed
- **Interaction**: How users interact with the component
- **Configuration**: How behavior is customized

### 4. **Progressive Enhancement**
Components should work with minimal configuration and allow progressive enhancement:

```javascript
// Minimal config - component works with defaults
const list = new GenericListComponent(element, data, {});

// Enhanced config - adds more features
const enhancedList = new GenericListComponent(element, data, {
    list: {
        enableSearch: true,
        enableFilters: true,
        enableBulkActions: true,
        customActions: [...]
    }
});
```

## Component Inheritance Pattern

### **🚨 CRITICAL: JavaScript Inheritance Timing**

**This is the #1 cause of component initialization failures. Follow this pattern exactly:**

```javascript
class YourComponent extends BaseComponent {
    constructor(element, data, config) {
        // 1. ALWAYS call super() FIRST (JavaScript requirement)
        super(element, data, config);

        // 2. Set component properties AFTER super()
        this.componentConfig = {
            // Component defaults
            enableFeatureX: true,
            enableFeatureY: false,
            maxItems: 100,
            // Merge user configuration
            ...config.yourComponentType
        };

        this.componentState = {
            // Initialize component state
            currentFilter: 'all',
            selectedItems: new Set(),
            isEditing: null
        };

        // 3. Re-render manually AFTER properties are set
        this.render();

        this.log('INFO', 'YourComponent initialized');
    }

    /**
     * 4. ALWAYS override init() to prevent premature rendering
     */
    init() {
        if (this.isDestroyed) return;
        
        // DON'T call render() here - constructor handles it
        this.bindEvents();
        this.startPolling();
        this.log('INFO', 'Component events bound');
    }

    render() {
        if (this.isDestroyed) return;
        
        // Now all properties are available
        this.element.innerHTML = this.html`
            <div class="component component-your-type">
                ${this.trustedHtml(this.renderContent())}
            </div>
        `;
    }
}
```

### **Why This Pattern is Required**

1. **JavaScript Rule**: You MUST call `super()` before using `this`
2. **BaseComponent Behavior**: Constructor calls `this.init()` → `render()` immediately
3. **Timing Issue**: Your properties aren't set when render() is called
4. **Solution**: Override `init()` to skip premature rendering, then render manually

## Configuration Architecture

### **Layered Configuration System**

```javascript
class GenericComponent extends BaseComponent {
    constructor(element, data, config) {
        super(element, data, config);

        // Layer 1: Component defaults
        const defaults = {
            enableSearch: false,
            enableFilters: false,
            enableSorting: true,
            pageSize: 20,
            layout: 'list' // 'list', 'grid', 'table'
        };

        // Layer 2: Component type defaults (from schema)
        const typeDefaults = config.componentType || {};

        // Layer 3: User overrides
        const userConfig = config.yourComponent || {};

        // Merge all layers
        this.componentConfig = {
            ...defaults,
            ...typeDefaults,
            ...userConfig
        };
    }
}
```

### **Feature Configuration Pattern**

```javascript
// Enable/disable entire feature sets
this.componentConfig = {
    // Core features
    enableCRUD: true,
    enableSearch: true,
    enableFilters: false,
    enableSorting: true,
    enablePagination: false,
    enableBulkActions: false,

    // Feature-specific config
    search: {
        placeholder: 'Search items...',
        debounceMs: 300,
        searchFields: ['name', 'description']
    },

    filters: {
        defaultFilter: 'all',
        customFilters: [
            { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'high'] }
        ]
    },

    actions: {
        item: ['edit', 'delete', 'toggle'],
        bulk: ['delete', 'archive'],
        global: ['add', 'import', 'export']
    }
};
```

## Rendering Patterns

### **Template Rendering Hierarchy**

```javascript
class GenericComponent extends BaseComponent {
    render() {
        if (this.isDestroyed) return;

        this.element.innerHTML = this.html`
            <div class="component component-${this.componentConfig.layout}">
                ${this.trustedHtml(this.renderHeader())}
                ${this.trustedHtml(this.renderToolbar())}
                ${this.trustedHtml(this.renderContent())}
                ${this.trustedHtml(this.renderFooter())}
            </div>
        `;

        this.postRenderSetup();
    }

    renderHeader() {
        return this.html`
            <div class="component-header">
                ${this.trustedHtml(this.renderTitle())}
                ${this.trustedHtml(this.renderStats())}
                ${this.trustedHtml(this.renderGlobalActions())}
            </div>
        `;
    }

    renderToolbar() {
        if (!this.hasToolbarFeatures()) return '';

        return this.html`
            <div class="component-toolbar">
                ${this.componentConfig.enableSearch ? this.trustedHtml(this.renderSearch()) : ''}
                ${this.componentConfig.enableFilters ? this.trustedHtml(this.renderFilters()) : ''}
                ${this.componentConfig.enableSorting ? this.trustedHtml(this.renderSortControls()) : ''}
            </div>
        `;
    }

    renderContent() {
        const items = this.getProcessedItems();

        if (items.length === 0) {
            return this.renderEmptyState();
        }

        return this.html`
            <div class="component-content">
                ${this.trustedHtml(this.renderItems(items))}
            </div>
        `;
    }

    renderItems(items) {
        switch (this.componentConfig.layout) {
            case 'grid':
                return this.renderGrid(items);
            case 'table':
                return this.renderTable(items);
            default:
                return this.renderList(items);
        }
    }
}
```

### **trustedHtml() Usage Rules**

**GOLDEN RULE**: Use `trustedHtml()` when passing HTML between different rendering methods, but NOT within the same template literal.

```javascript
// ✅ Correct: Between different methods
render() {
    return this.html`
        <div>
            ${this.trustedHtml(this.renderHeader())}
            ${this.trustedHtml(this.renderContent())}
        </div>
    `;
}

// ✅ Correct: For array results
renderItems(items) {
    return this.html`
        <div class="items">
            ${this.trustedHtml(items.map(item => this.renderItem(item)).join(''))}
        </div>
    `;
}

// ✅ Correct: For conditionals within templates
renderHeader() {
    return this.html`
        <div class="header">
            <h2>Title</h2>
            ${this.hasStats() ? this.trustedHtml(`
                <div class="stats">${this.renderStats()}</div>
            `) : ''}
        </div>
    `;
}

// ❌ Wrong: Nested trustedHtml in same template
renderSection() {
    return this.html`
        <div>
            ${this.trustedHtml(`<span>${this.trustedHtml(content)}</span>`)}
        </div>
    `;
}
```

## State Management

### **Component State Architecture**

```javascript
class GenericComponent extends BaseComponent {
    constructor(element, data, config) {
        super(element, data, config);

        // Separate concerns into different state objects
        this.componentState = {
            // UI state
            currentView: 'list',
            selectedItems: new Set(),
            expandedItems: new Set(),
            
            // Interaction state
            isEditing: null,
            editingData: {},
            isDragging: false,
            
            // Display state
            currentPage: 1,
            sortColumn: null,
            sortDirection: 'asc',
            filterQuery: '',
            activeFilters: new Map()
        };

        this.formState = {
            showForm: false,
            formType: null, // 'add', 'edit', 'bulk'
            formData: {},
            isSubmitting: false,
            validationErrors: {}
        };

        this.cacheState = {
            processedData: [],
            filteredData: [],
            lastProcessTime: 0,
            searchResults: new Map()
        };
    }

    // State update methods
    updateComponentState(updates) {
        this.componentState = { ...this.componentState, ...updates };
        this.render();
    }

    updateFormState(updates) {
        this.formState = { ...this.formState, ...updates };
        this.render();
    }

    resetState() {
        this.componentState = this.getInitialComponentState();
        this.formState = this.getInitialFormState();
        this.render();
    }
}
```

## Data Flow Patterns

### **Data Processing Pipeline**

```javascript
class GenericComponent extends BaseComponent {
    /**
     * Main data processing pipeline
     * Raw data → Filtered → Sorted → Paginated → Rendered
     */
    getProcessedItems() {
        // Use cache if data hasn't changed
        if (this.shouldUseCache()) {
            return this.cacheState.processedData;
        }

        let processed = [...this.data];

        // Step 1: Apply filters
        if (this.componentState.filterQuery || this.componentState.activeFilters.size > 0) {
            processed = this.applyFilters(processed);
        }

        // Step 2: Apply sorting
        if (this.componentState.sortColumn) {
            processed = this.applySorting(processed);
        }

        // Step 3: Apply pagination (if enabled)
        if (this.componentConfig.enablePagination) {
            processed = this.applyPagination(processed);
        }

        // Cache results
        this.cacheState.processedData = processed;
        this.cacheState.lastProcessTime = Date.now();

        return processed;
    }

    applyFilters(items) {
        return items.filter(item => {
            // Text search filter
            if (this.componentState.filterQuery) {
                if (!this.matchesSearch(item, this.componentState.filterQuery)) {
                    return false;
                }
            }

            // Custom filters
            for (const [filterKey, filterValue] of this.componentState.activeFilters) {
                if (!this.matchesFilter(item, filterKey, filterValue)) {
                    return false;
                }
            }

            return true;
        });
    }

    applySorting(items) {
        const { sortColumn, sortDirection } = this.componentState;
        
        return [...items].sort((a, b) => {
            const aVal = this.getItemValue(a, sortColumn);
            const bVal = this.getItemValue(b, sortColumn);
            
            const comparison = this.compareValues(aVal, bVal);
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }
}
```

## Event Handling

### **Consistent Event Patterns**

```javascript
class GenericComponent extends BaseComponent {
    bindEvents() {
        // CRUD actions
        this.on('click', '[data-action="add"]', (e) => this.handleAdd(e));
        this.on('click', '[data-action="edit"]', (e) => this.handleEdit(e));
        this.on('click', '[data-action="delete"]', (e) => this.handleDelete(e));
        this.on('click', '[data-action="toggle"]', (e) => this.handleToggle(e));

        // Selection actions
        this.on('change', '[data-action="select-item"]', (e) => this.handleSelectItem(e));
        this.on('change', '[data-action="select-all"]', (e) => this.handleSelectAll(e));

        // Filter/search actions
        this.on('input', '[data-action="search"]', (e) => this.handleSearch(e));
        this.on('change', '[data-action="filter"]', (e) => this.handleFilter(e));
        this.on('click', '[data-action="sort"]', (e) => this.handleSort(e));

        // Form actions
        this.on('submit', '[data-form="component-form"]', (e) => this.handleFormSubmit(e));
        this.on('click', '[data-action="cancel-form"]', (e) => this.handleCancelForm(e));

        // Bulk actions
        this.on('click', '[data-action="bulk"]', (e) => this.handleBulkAction(e));
    }

    // Standardized action handlers
    async handleAdd(e) {
        try {
            this.showForm('add');
        } catch (error) {
            this.handleError(error);
        }
    }

    async handleEdit(e) {
        try {
            const id = e.target.dataset.id;
            const item = this.findItemById(id);
            this.showForm('edit', item);
        } catch (error) {
            this.handleError(error);
        }
    }

    async handleDelete(e) {
        try {
            const id = e.target.dataset.id;
            if (await this.confirmDelete(id)) {
                await this.handleAction('delete', { id });
            }
        } catch (error) {
            this.handleError(error);
        }
    }
}
```

## Generic Component Template

Here's a complete template for creating new generic components:

```javascript
/**
 * GenericComponent - Base template for creating flexible, configurable components
 * 
 * Features:
 * - Configuration-driven behavior
 * - Pluggable feature system
 * - Consistent state management
 * - Standard event handling
 * - Security best practices
 * 
 * Usage:
 * const component = new GenericComponent(element, data, {
 *   componentType: {
 *     enableFeatureX: true,
 *     layout: 'grid',
 *     actions: ['add', 'edit', 'delete']
 *   }
 * });
 */
class GenericComponent extends BaseComponent {
    constructor(element, data, config) {
        // 1. ALWAYS call super() first
        super(element, data, config);

        // 2. Set component configuration
        this.componentConfig = {
            // Core features
            enableCRUD: true,
            enableSearch: false,
            enableFilters: false,
            enableSorting: false,
            enablePagination: false,
            enableBulkActions: false,

            // Layout options
            layout: 'list', // 'list', 'grid', 'table'
            itemsPerPage: 20,

            // Actions configuration
            actions: {
                item: ['view', 'edit', 'delete'],
                bulk: ['delete'],
                global: ['add']
            },

            // Customization
            emptyStateMessage: 'No items found',
            confirmDeletes: true,

            // Merge user configuration
            ...config.componentType
        };

        // 3. Initialize component state
        this.componentState = {
            currentPage: 1,
            selectedItems: new Set(),
            sortColumn: null,
            sortDirection: 'asc',
            filterQuery: '',
            activeFilters: new Map()
        };

        this.formState = {
            showForm: false,
            formType: null,
            formData: {},
            isSubmitting: false
        };

        // 4. Re-render after properties are set
        this.render();

        this.log('INFO', 'GenericComponent initialized');
    }

    /**
     * Override init to prevent premature rendering
     */
    init() {
        if (this.isDestroyed) return;
        
        this.bindEvents();
        this.startPolling();
        this.log('INFO', 'Component events bound');
    }

    /**
     * Main render method
     */
    render() {
        if (this.isDestroyed) return;

        this.element.innerHTML = this.html`
            <div class="component component-generic component-${this.componentConfig.layout}">
                ${this.trustedHtml(this.renderHeader())}
                ${this.trustedHtml(this.renderToolbar())}
                ${this.trustedHtml(this.renderContent())}
                ${this.trustedHtml(this.renderFooter())}
                ${this.trustedHtml(this.renderModal())}
            </div>
        `;

        this.postRenderSetup();
    }

    /**
     * Feature detection methods
     */
    hasToolbarFeatures() {
        return this.componentConfig.enableSearch ||
               this.componentConfig.enableFilters ||
               this.componentConfig.enableSorting;
    }

    hasFooterFeatures() {
        return this.componentConfig.enablePagination ||
               this.componentConfig.enableBulkActions;
    }

    /**
     * Rendering methods (implement these based on your needs)
     */
    renderHeader() {
        return this.html`
            <div class="component-header">
                <h2>${this.config.title || 'Items'}</h2>
                ${this.trustedHtml(this.renderGlobalActions())}
            </div>
        `;
    }

    renderToolbar() {
        if (!this.hasToolbarFeatures()) return '';

        return this.html`
            <div class="component-toolbar">
                ${this.componentConfig.enableSearch ? this.trustedHtml(this.renderSearch()) : ''}
                ${this.componentConfig.enableFilters ? this.trustedHtml(this.renderFilters()) : ''}
            </div>
        `;
    }

    renderContent() {
        const items = this.getProcessedItems();

        if (items.length === 0) {
            return this.renderEmptyState();
        }

        return this.html`
            <div class="component-content">
                ${this.trustedHtml(this.renderItems(items))}
            </div>
        `;
    }

    renderEmptyState() {
        return this.html`
            <div class="empty-state">
                <p>${this.componentConfig.emptyStateMessage}</p>
                ${this.componentConfig.actions.global.includes('add') ? this.html`
                    <button data-action="add" class="btn btn-primary">
                        Add First Item
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Data processing pipeline
     */
    getProcessedItems() {
        let items = [...this.data];

        // Apply filters
        if (this.componentState.filterQuery) {
            items = this.applySearch(items, this.componentState.filterQuery);
        }

        // Apply sorting
        if (this.componentState.sortColumn) {
            items = this.applySorting(items);
        }

        return items;
    }

    /**
     * Event handling
     */
    bindEvents() {
        // Implement standard event bindings
        this.on('click', '[data-action="add"]', (e) => this.handleAdd(e));
        this.on('click', '[data-action="edit"]', (e) => this.handleEdit(e));
        this.on('click', '[data-action="delete"]', (e) => this.handleDelete(e));
        
        if (this.componentConfig.enableSearch) {
            this.on('input', '[data-action="search"]', (e) => this.handleSearch(e));
        }
    }

    /**
     * Action handlers (implement based on your needs)
     */
    async handleAdd(e) {
        // Show add form
    }

    async handleEdit(e) {
        // Show edit form
    }

    async handleDelete(e) {
        // Handle delete with confirmation
    }

    handleSearch(e) {
        this.componentState.filterQuery = e.target.value;
        this.render();
    }

    /**
     * Cleanup
     */
    destroy() {
        this.componentConfig = null;
        this.componentState = null;
        this.formState = null;
        super.destroy();
    }
}
```

## Configuration-Driven Customization

### **Server-Side Customization**

The MCP server can customize components through configuration:

```typescript
// Server-side component configuration
const componentConfigs = {
    todoList: {
        enableCategories: true,
        enablePriorities: true,
        enableDueDates: true,
        actions: {
            item: ['edit', 'delete', 'toggle', 'duplicate'],
            bulk: ['delete', 'complete', 'archive'],
            global: ['add', 'import']
        },
        layout: 'list'
    },
    
    groceryList: {
        enableCategories: true,
        enablePriorities: false,
        enableDueDates: false,
        actions: {
            item: ['edit', 'delete', 'purchase'],
            bulk: ['delete', 'purchase'],
            global: ['add']
        },
        layout: 'grid'
    }
};
```

### **Runtime Feature Toggling**

```javascript
// Components can be reconfigured at runtime
component.updateConfig({
    enableSearch: true,
    enableFilters: true,
    layout: 'table'
});
```

## Integration Patterns

### **Framework Integration**

```javascript
// In MCPFramework.js
MCP.GenericList = function(selector, data, config) {
    const element = typeof selector === 'string' 
        ? document.querySelector(selector) 
        : selector;

    if (!element) {
        console.error('MCP.GenericList: Element not found:', selector);
        return null;
    }

    const mergedConfig = MCP.utils.mergeConfig(MCP.defaults, config);
    const component = new GenericListComponent(element, data, mergedConfig);

    MCP.registerComponent(element.id || 'generic-list-' + Date.now(), component);

    return component;
};
```

### **Schema-Based Initialization**

```javascript
// Auto-initialization from UI schema
MCP.initFromSchema = function(schema, initialData, globalConfig) {
    schema.components.forEach(componentDef => {
        const element = document.getElementById(componentDef.id);
        if (!element) return;

        const componentData = initialData[componentDef.dataKey] || [];
        const componentConfig = {
            ...globalConfig,
            [componentDef.type]: componentDef.config
        };

        let component;
        switch (componentDef.type) {
            case 'generic-list':
                component = MCP.GenericList(element, componentData, componentConfig);
                break;
            case 'todo-list':
                componentConfig.list = { 
                    enableCategories: true, 
                    enablePriorities: true,
                    ...componentDef.config 
                };
                component = MCP.GenericList(element, componentData, componentConfig);
                break;
            // Add more specific configurations
        }
    });
};
```

## Best Practices Summary

### **🚨 Critical Rules**
1. **ALWAYS follow the inheritance timing pattern** - Prevents initialization failures
2. **Use configuration over hardcoding** - Enables flexibility and reuse
3. **Separate concerns** - Keep data, presentation, and interaction logic separate
4. **Follow trustedHtml() rules** - Prevents XSS while enabling dynamic content

### **Design Principles**
5. **Progressive enhancement** - Start simple, add features through configuration
6. **Composition over inheritance** - Build features as composable modules
7. **Consistent patterns** - Use standard event handling and state management
8. **Security by default** - All input sanitized, all events validated

### **Implementation Guidelines**
9. **Document configuration options** - Clear examples and defaults
10. **Implement graceful degradation** - Handle missing features elegantly
11. **Provide extension points** - Allow customization without modification
12. **Test incrementally** - Start with minimal config, add complexity gradually

## Rendering Patterns

### **Template Rendering Hierarchy**

```javascript
class GenericComponent extends BaseComponent {
    render() {
        if (this.isDestroyed) return;

        this.element.innerHTML = this.html`
            <div class="component component-${this.componentConfig.layout}">
                ${this.trustedHtml(this.renderHeader())}
                ${this.trustedHtml(this.renderToolbar())}
                ${this.trustedHtml(this.renderContent())}
                ${this.trustedHtml(this.renderFooter())}
            </div>
        `;

        this.postRenderSetup();
    }

    renderHeader() {
        return this.html`
            <div class="component-header">
                ${this.trustedHtml(this.renderTitle())}
                ${this.trustedHtml(this.renderStats())}
                ${this.trustedHtml(this.renderGlobalActions())}
            </div>
        `;
    }

    renderContent() {
        const items = this.getProcessedItems();

        if (items.length === 0) {
            return this.renderEmptyState();
        }

        return this.html`
            <div class="component-content">
                ${this.trustedHtml(this.renderItems(items))}
            </div>
        `;
    }

    renderItems(items) {
        switch (this.componentConfig.layout) {
            case 'grid':
                return this.renderGrid(items);
            case 'table':
                return this.renderTable(items);
            default:
                return this.renderList(items);
        }
    }
}
```

### **trustedHtml() Usage Rules**

**GOLDEN RULE**: Use `trustedHtml()` when passing HTML between different rendering methods, but NOT within the same template literal.

```javascript
// ✅ Correct: Between different methods
render() {
    return this.html`
        <div>
            ${this.trustedHtml(this.renderHeader())}
            ${this.trustedHtml(this.renderContent())}
        </div>
    `;
}

// ✅ Correct: For array results
renderItems(items) {
    return this.html`
        <div class="items">
            ${this.trustedHtml(items.map(item => this.renderItem(item)).join(''))}
        </div>
    `;
}

// ❌ Wrong: Nested trustedHtml in same template
renderSection() {
    return this.html`
        <div>
            ${this.trustedHtml(`<span>${this.trustedHtml(content)}</span>`)}
        </div>
    `;
}
```

## State Management

### **Component State Architecture**

```javascript
class GenericComponent extends BaseComponent {
    constructor(element, data, config) {
        super(element, data, config);

        // Separate concerns into different state objects
        this.componentState = {
            // UI state
            currentView: 'list',
            selectedItems: new Set(),
            expandedItems: new Set(),
            
            // Interaction state
            isEditing: null,
            editingData: {},
            isDragging: false,
            
            // Display state
            currentPage: 1,
            sortColumn: null,
            sortDirection: 'asc',
            filterQuery: '',
            activeFilters: new Map()
        };

        this.formState = {
            showForm: false,
            formType: null, // 'add', 'edit', 'bulk'
            formData: {},
            isSubmitting: false,
            validationErrors: {}
        };
    }

    // State update methods
    updateComponentState(updates) {
        this.componentState = { ...this.componentState, ...updates };
        this.render();
    }

    updateFormState(updates) {
        this.formState = { ...this.formState, ...updates };
        this.render();
    }
}
```

## Event Handling

### **Consistent Event Patterns**

```javascript
class GenericComponent extends BaseComponent {
    bindEvents() {
        // CRUD actions
        this.on('click', '[data-action="add"]', (e) => this.handleAdd(e));
        this.on('click', '[data-action="edit"]', (e) => this.handleEdit(e));
        this.on('click', '[data-action="delete"]', (e) => this.handleDelete(e));
        this.on('click', '[data-action="toggle"]', (e) => this.handleToggle(e));

        // Selection actions
        this.on('change', '[data-action="select-item"]', (e) => this.handleSelectItem(e));
        this.on('change', '[data-action="select-all"]', (e) => this.handleSelectAll(e));

        // Filter/search actions
        this.on('input', '[data-action="search"]', (e) => this.handleSearch(e));
        this.on('change', '[data-action="filter"]', (e) => this.handleFilter(e));
        this.on('click', '[data-action="sort"]', (e) => this.handleSort(e));

        // Form actions
        this.on('submit', '[data-form="component-form"]', (e) => this.handleFormSubmit(e));
        this.on('click', '[data-action="cancel-form"]', (e) => this.handleCancelForm(e));
    }

    // Standardized action handlers
    async handleAdd(e) {
        try {
            this.showForm('add');
        } catch (error) {
            this.handleError(error);
        }
    }

    async handleEdit(e) {
        try {
            const id = e.target.dataset.id;
            const item = this.findItemById(id);
            this.showForm('edit', item);
        } catch (error) {
            this.handleError(error);
        }
    }

    async handleDelete(e) {
        try {
            const id = e.target.dataset.id;
            if (await this.confirmDelete(id)) {
                await this.handleAction('delete', { id });
            }
        } catch (error) {
            this.handleError(error);
        }
    }
}
```

## Generic Component Template

Here's a complete template for creating new generic components:

```javascript
/**
 * GenericComponent - Base template for creating flexible, configurable components
 * 
 * Features:
 * - Configuration-driven behavior
 * - Pluggable feature system
 * - Consistent state management
 * - Standard event handling
 * - Security best practices
 */
class GenericComponent extends BaseComponent {
    constructor(element, data, config) {
        // 1. ALWAYS call super() first
        super(element, data, config);

        // 2. Set component configuration
        this.componentConfig = {
            // Core features
            enableCRUD: true,
            enableSearch: false,
            enableFilters: false,
            enableSorting: false,

            // Layout options
            layout: 'list', // 'list', 'grid', 'table'
            itemsPerPage: 20,

            // Actions configuration
            actions: {
                item: ['view', 'edit', 'delete'],
                bulk: ['delete'],
                global: ['add']
            },

            // Customization
            emptyStateMessage: 'No items found',
            confirmDeletes: true,

            // Merge user configuration
            ...config.componentType
        };

        // 3. Initialize component state
        this.componentState = {
            currentPage: 1,
            selectedItems: new Set(),
            sortColumn: null,
            sortDirection: 'asc',
            filterQuery: '',
            activeFilters: new Map()
        };

        this.formState = {
            showForm: false,
            formType: null,
            formData: {},
            isSubmitting: false
        };

        // 4. Re-render after properties are set
        this.render();

        this.log('INFO', 'GenericComponent initialized');
    }

    /**
     * Override init to prevent premature rendering
     */
    init() {
        if (this.isDestroyed) return;
        
        this.bindEvents();
        this.startPolling();
        this.log('INFO', 'Component events bound');
    }

    /**
     * Main render method
     */
    render() {
        if (this.isDestroyed) return;

        this.element.innerHTML = this.html`
            <div class="component component-generic component-${this.componentConfig.layout}">
                ${this.trustedHtml(this.renderHeader())}
                ${this.trustedHtml(this.renderToolbar())}
                ${this.trustedHtml(this.renderContent())}
                ${this.trustedHtml(this.renderFooter())}
            </div>
        `;

        this.postRenderSetup();
    }

    renderContent() {
        const items = this.getProcessedItems();

        if (items.length === 0) {
            return this.renderEmptyState();
        }

        return this.html`
            <div class="component-content">
                ${this.trustedHtml(this.renderItems(items))}
            </div>
        `;
    }

    renderEmptyState() {
        return this.html`
            <div class="empty-state">
                <p>${this.componentConfig.emptyStateMessage}</p>
                ${this.componentConfig.actions.global.includes('add') ? this.html`
                    <button data-action="add" class="btn btn-primary">
                        Add First Item
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Data processing pipeline
     */
    getProcessedItems() {
        let items = [...this.data];

        // Apply filters
        if (this.componentState.filterQuery) {
            items = this.applySearch(items, this.componentState.filterQuery);
        }

        // Apply sorting
        if (this.componentState.sortColumn) {
            items = this.applySorting(items);
        }

        return items;
    }

    /**
     * Event handling
     */
    bindEvents() {
        this.on('click', '[data-action="add"]', (e) => this.handleAdd(e));
        this.on('click', '[data-action="edit"]', (e) => this.handleEdit(e));
        this.on('click', '[data-action="delete"]', (e) => this.handleDelete(e));
        
        if (this.componentConfig.enableSearch) {
            this.on('input', '[data-action="search"]', (e) => this.handleSearch(e));
        }
    }

    /**
     * Action handlers (implement based on your needs)
     */
    async handleAdd(e) {
        // Show add form
    }

    async handleEdit(e) {
        // Show edit form
    }

    async handleDelete(e) {
        // Handle delete with confirmation
    }

    handleSearch(e) {
        this.componentState.filterQuery = e.target.value;
        this.render();
    }

    /**
     * Cleanup
     */
    destroy() {
        this.componentConfig = null;
        this.componentState = null;
        this.formState = null;
        super.destroy();
    }
}
```

This architecture provides a solid foundation for creating flexible, reusable components that can be customized through configuration rather than code modification. 