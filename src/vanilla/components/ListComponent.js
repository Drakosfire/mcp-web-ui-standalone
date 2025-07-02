/**
 * ListComponent - Generic, Configurable List Implementation
 * 
 * This component provides a flexible list interface that can be configured for different use cases:
 * - Configurable CRUD operations (add, edit, delete, toggle states)
 * - Multiple layout modes (list, grid, table)
 * - Search and filtering capabilities
 * - Sorting and pagination
 * - Bulk actions and selection
 * - Form handling with validation
 * - Customizable item rendering
 * 
 * SECURITY FEATURES:
 * - All data is sanitized through BaseComponent
 * - XSS protection for all displayed values
 * - Safe event handling with data attributes
 * - Input validation for all forms
 * 
 * CONFIGURATION-DRIVEN:
 * - Server can customize behavior through config
 * - Progressive enhancement (works with minimal config)
 * - Extensible through configuration rather than inheritance
 * 
 * Usage Examples:
 * 
 * // Minimal todo list
 * const todoList = new ListComponent(element, data, {
 *   list: {
 *     itemType: 'todo',
 *     enableToggle: true,
 *     itemFields: ['text', 'priority', 'category']
 *   }
 * });
 * 
 * // Grocery list
 * const groceryList = new ListComponent(element, data, {
 *   list: {
 *     itemType: 'grocery',
 *     enableToggle: { field: 'purchased', label: 'Mark as purchased' },
 *     itemFields: ['name', 'quantity', 'category'],
 *     layout: 'grid'
 *   }
 * });
 * 
 * // Data table
 * const dataTable = new ListComponent(element, data, {
 *   list: {
 *     layout: 'table',
 *     enableSorting: true,
 *     enablePagination: true,
 *     columns: [
 *       { key: 'name', label: 'Name', sortable: true },
 *       { key: 'status', label: 'Status', type: 'badge' },
 *       { key: 'actions', label: 'Actions', type: 'actions' }
 *     ]
 *   }
 * });
 */
class ListComponent extends BaseComponent {
    /**
     * Initialize ListComponent with list-specific configuration
     * CRITICAL: Follow inheritance timing pattern exactly
     * @param {HTMLElement} element - DOM element to attach to
     * @param {Array} data - Initial list data
     * @param {Object} config - Configuration options
     */
    constructor(element, data, config) {
        // 1. ALWAYS call super() FIRST
        super(element, data, config);

        // 2. Set component properties AFTER super()
        this.listConfig = {
            // Item configuration
            itemType: 'item',
            itemIdField: 'id',
            itemTextField: 'text',
            itemFields: ['text'], // Fields to display/edit

            // Layout options
            layout: 'list', // 'list', 'grid', 'table'
            itemsPerPage: 20,

            // Feature flags
            enableCRUD: true,
            enableSearch: false,
            enableFilters: false,
            enableSorting: false,
            enablePagination: false,
            enableBulkActions: false,
            enableToggle: false, // Boolean or { field: 'completed', label: 'Mark complete' }

            // Actions configuration
            actions: {
                item: ['edit', 'delete'], // Available item actions
                bulk: ['delete'], // Available bulk actions
                global: ['add'] // Available global actions
            },

            // Form configuration
            forms: {
                add: {
                    title: 'Add New Item',
                    fields: [] // Auto-generated from itemFields if empty
                },
                edit: {
                    title: 'Edit Item',
                    fields: [] // Auto-generated from itemFields if empty
                }
            },

            // Display configuration
            emptyStateMessage: 'No items found',
            confirmDeletes: true,
            showItemCount: true,
            showStats: false,

            // Search configuration
            search: {
                placeholder: 'Search items...',
                debounceMs: 300,
                searchFields: ['text'] // Fields to search in
            },

            // Table-specific configuration (when layout === 'table')
            columns: [], // Auto-generated from itemFields if empty

            // Grid-specific configuration (when layout === 'grid')
            gridColumns: 'auto-fit',
            gridMinWidth: '200px',

            // Toggle configuration
            toggle: {
                field: 'completed',
                label: 'Mark as complete',
                trueLabel: 'Completed',
                falseLabel: 'Pending'
            },

            // Merge user configuration
            ...config.list
        };

        // 3. Initialize component state
        this.listState = {
            // Display state
            currentPage: 1,
            sortColumn: null,
            sortDirection: 'asc',
            filterQuery: '',
            activeFilters: new Map(),
            selectedItems: new Set(),

            // Interaction state
            isEditing: null,
            editingData: {},
            showBulkActions: false
        };

        // 4. Re-render manually AFTER properties are set
        this.render();

        this.log('INFO', 'ListComponent initialized');
    }

    /**
     * 5. ALWAYS override init() to prevent premature rendering
     */
    init() {
        if (this.isDestroyed) return;

        // DON'T call render() here - constructor handles it
        this.bindEvents();
        this.startPolling();
        this.log('INFO', 'ListComponent events bound');
    }

    /**
     * Main render method
     */
    render() {
        if (this.isDestroyed) return;

        this.element.innerHTML = this.html`
            <div class="component component-list component-${this.listConfig.layout}">
                ${this.trustedHtml(this.renderHeader())}
                ${this.trustedHtml(this.renderToolbar())}
                ${this.trustedHtml(this.renderContent())}
                ${this.trustedHtml(this.renderFooter())}
            </div>
        `;

        this.postRenderSetup();
    }

    /**
     * Render component header
     */
    renderHeader() {
        const stats = this.calculateStats();

        return this.html`
            <div class="list-header">
                <div class="header-title">
                    <h2>${this.config.title || this.getDefaultTitle()}</h2>
                    ${this.listConfig.showItemCount ? this.trustedHtml(`
                        <span class="item-count">(${stats.total} ${this.getItemLabel(stats.total)})</span>
                    `) : ''}
                </div>
                
                ${this.listConfig.showStats ? this.trustedHtml(this.renderStats(stats)) : ''}
                
                <div class="header-actions">
                    ${this.trustedHtml(this.renderGlobalActions())}
                </div>
            </div>
        `;
    }

    /**
     * Render statistics section
     */
    renderStats(stats) {
        const statsToShow = [];

        if (this.listConfig.enableToggle) {
            const toggleField = this.getToggleField();
            const completedCount = stats[`${toggleField}_true`] || 0;
            const pendingCount = stats[`${toggleField}_false`] || 0;

            statsToShow.push(
                { label: this.listConfig.toggle.trueLabel || 'Complete', value: completedCount, type: 'success' },
                { label: this.listConfig.toggle.falseLabel || 'Pending', value: pendingCount, type: 'warning' }
            );
        }

        if (this.listState.selectedItems.size > 0) {
            statsToShow.push({
                label: 'Selected',
                value: this.listState.selectedItems.size,
                type: 'info'
            });
        }

        if (statsToShow.length === 0) return '';

        return this.html`
            <div class="list-stats">
                ${this.trustedHtml(statsToShow.map(stat => `
                    <div class="stat-item stat-${stat.type}">
                        <span class="stat-value">${stat.value}</span>
                        <span class="stat-label">${stat.label}</span>
                    </div>
                `).join(''))}
            </div>
        `;
    }

    /**
     * Render global actions
     */
    renderGlobalActions() {
        const actions = this.listConfig.actions.global;
        if (!actions || actions.length === 0) return '';

        return this.html`
            <div class="global-actions">
                ${this.trustedHtml(actions.map(action => this.renderGlobalAction(action)).join(''))}
            </div>
        `;
    }

    /**
     * Render a single global action
     */
    renderGlobalAction(action) {
        const actionConfig = this.getActionConfig(action);

        return `
            <button 
                class="btn btn-${actionConfig.type || 'primary'}" 
                data-action="global-${action}"
                title="${actionConfig.title || actionConfig.label}"
            >
                ${actionConfig.icon || ''} ${actionConfig.label}
            </button>
        `;
    }

    /**
     * Render toolbar with search, filters, etc.
     */
    renderToolbar() {
        if (!this.hasToolbarFeatures()) return '';

        return this.html`
            <div class="list-toolbar">
                ${this.listConfig.enableSearch ? this.trustedHtml(this.renderSearch()) : ''}
                ${this.listConfig.enableFilters ? this.trustedHtml(this.renderFilters()) : ''}
                ${this.listConfig.enableSorting && this.listConfig.layout !== 'table' ? this.trustedHtml(this.renderSortControls()) : ''}
            </div>
        `;
    }

    /**
     * Render search input
     */
    renderSearch() {
        return this.html`
            <div class="search-container">
                <input 
                    type="text" 
                    class="search-input"
                    placeholder="${this.listConfig.search.placeholder}"
                    value="${this.listState.filterQuery}"
                    data-action="search"
                >
                ${this.listState.filterQuery ? this.html`
                    <button class="btn-clear-search" data-action="clear-search" title="Clear search">
                        ×
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render content based on layout
     */
    renderContent() {
        const processedItems = this.getProcessedItems();

        if (processedItems.length === 0) {
            return this.renderEmptyState();
        }

        return this.html`
            <div class="list-content">
                ${this.trustedHtml(this.renderItems(processedItems))}
            </div>
        `;
    }

    /**
     * Render items based on layout
     */
    renderItems(items) {
        switch (this.listConfig.layout) {
            case 'grid':
                return this.renderGrid(items);
            case 'table':
                return this.renderTable(items);
            default:
                return this.renderList(items);
        }
    }

    /**
     * Render list layout
     */
    renderList(items) {
        return this.html`
            <div class="items-list">
                ${this.listConfig.enableBulkActions ? this.trustedHtml(this.renderBulkSelector()) : ''}
                ${this.trustedHtml(items.map(item => this.renderListItem(item)).join(''))}
            </div>
        `;
    }

    /**
     * Render grid layout
     */
    renderGrid(items) {
        const gridStyle = `grid-template-columns: repeat(auto-fit, minmax(${this.listConfig.gridMinWidth}, 1fr))`;

        return this.html`
            <div class="items-grid" style="${gridStyle}">
                ${this.trustedHtml(items.map(item => this.renderGridItem(item)).join(''))}
            </div>
        `;
    }

    /**
     * Render table layout
     */
    renderTable(items) {
        const columns = this.getTableColumns();

        return this.html`
            <div class="table-container">
                <table class="items-table">
                    ${this.trustedHtml(this.renderTableHeader(columns))}
                    ${this.trustedHtml(this.renderTableBody(items, columns))}
                </table>
            </div>
        `;
    }

    /**
     * Render table header
     */
    renderTableHeader(columns) {
        return this.html`
            <thead>
                <tr>
                    ${this.listConfig.enableBulkActions ? this.html`
                        <th class="select-column">
                            <input 
                                type="checkbox" 
                                data-action="select-all"
                                ${this.isAllSelected() ? 'checked' : ''}
                            >
                        </th>
                    ` : ''}
                    ${this.trustedHtml(columns.map(column => `
                        <th class="column-header ${column.sortable && this.listConfig.enableSorting ? 'sortable' : ''}"
                            ${column.sortable && this.listConfig.enableSorting ? `data-action="sort" data-column="${column.key}"` : ''}>
                            ${column.label}
                            ${column.sortable && this.listConfig.enableSorting && this.listState.sortColumn === column.key ? `
                                <span class="sort-indicator ${this.listState.sortDirection}">
                                    ${this.listState.sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                            ` : ''}
                        </th>
                    `).join(''))}
                    ${this.hasItemActions() ? this.html`<th class="actions-column">Actions</th>` : ''}
                </tr>
            </thead>
        `;
    }

    /**
     * Render table body
     */
    renderTableBody(items, columns) {
        return this.html`
            <tbody>
                ${this.trustedHtml(items.map(item => this.renderTableRow(item, columns)).join(''))}
            </tbody>
        `;
    }

    /**
     * Render a single list item
     */
    renderListItem(item) {
        const itemId = this.getItemId(item);
        const isSelected = this.listState.selectedItems.has(itemId);
        const toggleField = this.getToggleField();
        const isToggled = toggleField && item[toggleField];

        return `
            <div class="list-item ${isToggled ? 'toggled' : ''} ${isSelected ? 'selected' : ''}" 
                 data-id="${itemId}">
                <div class="item-main">
                    ${this.listConfig.enableBulkActions ? `
                        <div class="item-selector">
                            <input 
                                type="checkbox" 
                                data-action="select-item" 
                                data-id="${itemId}"
                                ${isSelected ? 'checked' : ''}
                            >
                        </div>
                    ` : ''}
                    
                    ${this.listConfig.enableToggle ? `
                        <div class="item-toggle">
                            <input 
                                type="checkbox" 
                                data-action="toggle-item" 
                                data-id="${itemId}"
                                ${isToggled ? 'checked' : ''}
                                title="${isToggled ? 'Mark as pending' : this.listConfig.toggle.label}"
                            >
                        </div>
                    ` : ''}
                    
                    <div class="item-content">
                        ${this.renderItemContent(item)}
                    </div>
                </div>
                
                ${this.hasItemActions() ? `
                    <div class="item-actions">
                        ${this.renderItemActions(item)}
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render item content based on configured fields
     */
    renderItemContent(item) {
        // Use schema fields if available, fallback to legacy itemFields
        const schemaFields = this.listConfig.fields || [];
        const hasSchemaFields = schemaFields.length > 0;

        if (hasSchemaFields) {
            // Use schema-based field rendering
            const visibleFields = schemaFields.filter(field => field.key !== 'id' && field.key !== 'completed');

            return `
                <div class="item-content-schema">
                    ${visibleFields.map(field => {
                const value = item[field.key];
                if (value == null || value === '') return '';

                return `
                            <div class="item-field item-field-${field.key}">
                                <span class="field-label">${field.label}:</span>
                                <span class="field-value field-${field.type || 'text'}">
                                    ${this.formatSchemaFieldValue(value, field)}
                                </span>
                            </div>
                        `;
            }).join('')}
                </div>
            `;
        } else {
            // Legacy field rendering
            const primaryField = this.listConfig.itemTextField;
            const primaryValue = item[primaryField] || '';

            const secondaryFields = this.listConfig.itemFields.filter(field => field !== primaryField);

            return `
                <div class="item-primary">
                    <span class="item-text">${primaryValue}</span>
                </div>
                ${secondaryFields.length > 0 ? `
                    <div class="item-secondary">
                        ${secondaryFields.map(field => `
                            <span class="item-field item-${field}">
                                ${this.formatFieldValue(item[field], field)}
                            </span>
                        `).join('')}
                    </div>
                ` : ''}
            `;
        }
    }

    /**
     * Format field value based on schema field configuration
     */
    formatSchemaFieldValue(value, field) {
        if (value == null) return '';

        // Apply custom format function if provided
        if (field.format && typeof field.format === 'function') {
            try {
                value = field.format(value);
            } catch (error) {
                console.warn('Field format function error:', error);
            }
        }

        // Apply type-specific formatting
        switch (field.type) {
            case 'badge':
                const badgeClass = `badge badge-${field.key} badge-${String(value).toLowerCase()}`;
                return `<span class="${badgeClass}">${value}</span>`;

            case 'date':
                // Value might already be formatted by format function
                return `<span class="date-value">${value}</span>`;

            case 'checkbox':
                return value ? '✓' : '✗';

            case 'text':
            default:
                return `<span class="text-value">${value}</span>`;
        }
    }

    /**
     * Render item actions
     */
    renderItemActions(item) {
        const actions = this.listConfig.actions.item;
        const itemId = this.getItemId(item);

        return actions.map(action => {
            const actionConfig = this.getActionConfig(action);

            return `
                <button 
                    class="btn-action btn-${actionConfig.type || 'default'}"
                    data-action="item-${action}"
                    data-id="${itemId}"
                    title="${actionConfig.title || actionConfig.label}"
                >
                    ${actionConfig.icon || actionConfig.label}
                </button>
            `;
        }).join('');
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        return this.html`
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>No ${this.getItemLabel(0)}</h3>
                <p>${this.listConfig.emptyStateMessage}</p>
                ${this.listConfig.actions.global.includes('add') ? this.html`
                    <button class="btn btn-primary" data-action="global-add">
                        Add First ${this.getItemLabel(1)}
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render footer with pagination, bulk actions, etc.
     */
    renderFooter() {
        if (!this.hasFooterFeatures()) return '';

        return this.html`
            <div class="list-footer">
                ${this.listState.selectedItems.size > 0 ? this.trustedHtml(this.renderBulkActions()) : ''}
                ${this.listConfig.enablePagination ? this.trustedHtml(this.renderPagination()) : ''}
            </div>
        `;
    }

    /**
     * Render bulk actions
     */
    renderBulkActions() {
        const actions = this.listConfig.actions.bulk;
        const selectedCount = this.listState.selectedItems.size;

        return this.html`
            <div class="bulk-actions">
                <span class="bulk-info">
                    ${selectedCount} ${this.getItemLabel(selectedCount)} selected
                </span>
                <div class="bulk-controls">
                    <button class="btn btn-secondary" data-action="deselect-all">
                        Deselect All
                    </button>
                    ${this.trustedHtml(actions.map(action => {
            const actionConfig = this.getActionConfig(action);
            return `
                            <button 
                                class="btn btn-${actionConfig.type || 'default'}"
                                data-action="bulk-${action}"
                            >
                                ${actionConfig.icon || ''} ${actionConfig.label}
                            </button>
                        `;
        }).join(''))}
                </div>
            </div>
        `;
    }

    /**
     * Render individual form field
     */


    /**
     * Bind all event listeners
     */
    bindEvents() {
        // Global actions
        this.on('click', '[data-action^="global-"]', (e) => {
            const action = e.target.dataset.action.replace('global-', '');
            this.handleGlobalAction(action);
        });

        // Item actions
        this.on('click', '[data-action^="item-"]', (e) => {
            const action = e.target.dataset.action.replace('item-', '');
            const id = e.target.dataset.id;
            this.handleItemAction(action, id);
        });

        // Bulk actions
        this.on('click', '[data-action^="bulk-"]', (e) => {
            const action = e.target.dataset.action.replace('bulk-', '');
            this.handleBulkAction(action);
        });

        // Selection
        if (this.listConfig.enableBulkActions) {
            this.on('change', '[data-action="select-all"]', (e) => {
                this.handleSelectAll(e.target.checked);
            });

            this.on('change', '[data-action="select-item"]', (e) => {
                const id = e.target.dataset.id;
                this.handleSelectItem(id, e.target.checked);
            });

            this.on('click', '[data-action="deselect-all"]', () => {
                this.handleDeselectAll();
            });
        }

        // Toggle
        if (this.listConfig.enableToggle) {
            this.on('change', '[data-action="toggle-item"]', async (e) => {
                const id = e.target.dataset.id;
                await this.handleToggleItem(id, e.target.checked);
            });
        }

        // Search
        if (this.listConfig.enableSearch) {
            this.on('input', '[data-action="search"]', (e) => {
                this.handleSearch(e.target.value);
            });

            this.on('click', '[data-action="clear-search"]', () => {
                this.handleClearSearch();
            });
        }

        // Sorting
        if (this.listConfig.enableSorting) {
            this.on('click', '[data-action="sort"]', (e) => {
                const column = e.target.dataset.column;
                this.handleSort(column);
            });
        }
    }

    // Action Handlers

    /**
     * Handle global actions
     */
    async handleGlobalAction(action) {
        switch (action) {
            case 'add':
                await this.showFormModal('add');
                break;
            default:
                this.log('WARN', `Unknown global action: ${action}`);
        }
    }

    /**
     * Handle item actions
     */
    async handleItemAction(action, id) {
        const item = this.findItemById(id);
        if (!item) return;

        switch (action) {
            case 'edit':
                await this.showFormModal('edit', item);
                break;
            case 'delete':
                await this.handleDeleteItem(id);
                break;
            default:
                this.log('WARN', `Unknown item action: ${action}`);
        }
    }

    /**
     * Handle bulk actions
     */
    async handleBulkAction(action) {
        const selectedIds = Array.from(this.listState.selectedItems);

        switch (action) {
            case 'delete':
                await this.handleBulkDelete(selectedIds);
                break;
            default:
                this.log('WARN', `Unknown bulk action: ${action}`);
        }
    }

    /**
     * Handle delete item with confirmation modal
     */
    async handleDeleteItem(id) {
        const item = this.findItemById(id);
        if (!item) return;

        if (this.listConfig.confirmDeletes) {
            if (!window.MCPModal) {
                // Fallback to native confirm if modal not available
                const confirmMessage = `Delete "${item[this.listConfig.itemTextField]}"?`;
                if (!confirm(confirmMessage)) return;
            } else {
                const confirmed = await window.MCPModal.confirm({
                    title: 'Confirm Delete',
                    message: `Delete "${item[this.listConfig.itemTextField]}"?`,
                    confirmText: 'Delete',
                    cancelText: 'Cancel',
                    type: 'danger'
                });

                if (!confirmed || confirmed.action !== 'confirm') return;
            }
        }

        try {
            await this.handleAction('delete', { id });
            this.log('INFO', `Item deleted: ${id}`);
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Handle toggle item state
     */
    async handleToggleItem(id, checked) {
        const toggleField = this.getToggleField();

        try {
            await this.handleAction('toggle', {
                id,
                field: toggleField,
                value: checked
            });
            this.log('INFO', `Item ${toggleField} toggled: ${id}`);
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Handle search
     */
    handleSearch(query) {
        this.listState.filterQuery = query.trim();
        this.listState.currentPage = 1; // Reset to first page
        this.render();
    }

    /**
     * Show form modal using new ModalComponent
     */
    async showFormModal(type, item = null) {
        if (!window.MCPModal) {
            this.log('ERROR', 'ModalComponent not available');
            return;
        }

        try {
            const formFields = this.getDefaultFormFields();
            const formConfig = this.listConfig.forms[type] || {};
            const title = formConfig.title || (type === 'add' ? 'Add Item' : 'Edit Item');

            // Pre-populate form data for edit mode
            const initialData = item ? { ...item } : {};

            const result = await window.MCPModal.form({
                title,
                fields: formFields,
                initialData,
                onSubmit: async (formData) => {
                    try {
                        // Validate form data
                        const errors = this.validateFormData(formData);
                        if (Object.keys(errors).length > 0) {
                            // Return validation errors to modal
                            throw new Error('Validation failed: ' + Object.values(errors).join(', '));
                        }

                        // Submit to server
                        const action = type === 'add' ? 'add' : 'update';
                        const payload = type === 'edit'
                            ? { ...formData, id: item.id }
                            : formData;

                        const actionResult = await this.handleAction(action, payload);

                        if (actionResult.success) {
                            this.log('INFO', `${type} completed successfully`);
                            return { success: true };
                        } else {
                            throw new Error(actionResult.error || `${type} failed`);
                        }
                    } catch (error) {
                        this.log('ERROR', `Form submission failed: ${error.message}`);
                        throw error;
                    }
                }
            });

            if (result.action === 'submit') {
                this.log('INFO', `Form ${type} completed successfully`);
            }
        } catch (error) {
            this.log('ERROR', `Failed to show form modal: ${error.message}`);
        }
    }

    // Helper Methods

    /**
     * Get processed items (filtered, sorted, paginated)
     */
    getProcessedItems() {
        let items = [...this.data];

        // Apply search filter
        if (this.listState.filterQuery) {
            items = this.applySearch(items);
        }

        // Apply sorting
        if (this.listState.sortColumn) {
            items = this.applySorting(items);
        }

        // Apply pagination
        if (this.listConfig.enablePagination) {
            items = this.applyPagination(items);
        }

        return items;
    }

    /**
     * Apply search filter
     */
    applySearch(items) {
        const query = this.listState.filterQuery.toLowerCase();
        const searchFields = this.listConfig.search.searchFields;

        return items.filter(item => {
            return searchFields.some(field => {
                const value = item[field];
                if (value == null) return false;
                return String(value).toLowerCase().includes(query);
            });
        });
    }

    /**
     * Apply sorting
     */
    applySorting(items) {
        const { sortColumn, sortDirection } = this.listState;

        return [...items].sort((a, b) => {
            const aVal = a[sortColumn];
            const bVal = b[sortColumn];

            // Handle null/undefined
            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return 1;
            if (bVal == null) return -1;

            // Type-specific comparison
            let comparison = 0;
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                comparison = aVal - bVal;
            } else {
                comparison = String(aVal).localeCompare(String(bVal));
            }

            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }

    /**
     * Calculate statistics
     */
    calculateStats() {
        const items = this.data || [];
        const stats = { total: items.length };

        // Toggle field statistics
        if (this.listConfig.enableToggle) {
            const toggleField = this.getToggleField();
            stats[`${toggleField}_true`] = items.filter(item => item[toggleField]).length;
            stats[`${toggleField}_false`] = items.filter(item => !item[toggleField]).length;
        }

        return stats;
    }

    /**
     * Feature detection helpers
     */
    hasToolbarFeatures() {
        return this.listConfig.enableSearch ||
            this.listConfig.enableFilters ||
            (this.listConfig.enableSorting && this.listConfig.layout !== 'table');
    }

    hasFooterFeatures() {
        return this.listConfig.enablePagination ||
            (this.listConfig.enableBulkActions && this.listState.selectedItems.size > 0);
    }

    hasItemActions() {
        return this.listConfig.actions.item.length > 0;
    }

    /**
     * Utility methods
     */
    getItemId(item) {
        return item[this.listConfig.itemIdField];
    }

    findItemById(id) {
        return this.data.find(item => this.getItemId(item) === id);
    }

    getToggleField() {
        if (typeof this.listConfig.enableToggle === 'object') {
            return this.listConfig.enableToggle.field;
        }
        return this.listConfig.toggle.field;
    }

    getDefaultTitle() {
        return this.listConfig.itemType.charAt(0).toUpperCase() +
            this.listConfig.itemType.slice(1) + ' List';
    }

    getItemLabel(count) {
        const base = this.listConfig.itemType;
        return count === 1 ? base : base + 's';
    }

    getActionConfig(action) {
        const defaults = {
            add: { label: 'Add', icon: '+', type: 'primary' },
            edit: { label: 'Edit', icon: '✏️', type: 'secondary' },
            delete: { label: 'Delete', icon: '🗑️', type: 'danger' },
            view: { label: 'View', icon: '👁️', type: 'secondary' }
        };

        return defaults[action] || { label: action, type: 'default' };
    }

    getTableColumns() {
        if (this.listConfig.columns.length > 0) {
            return this.listConfig.columns;
        }

        // Auto-generate from itemFields
        return this.listConfig.itemFields.map(field => ({
            key: field,
            label: field.charAt(0).toUpperCase() + field.slice(1),
            sortable: true
        }));
    }

    getDefaultFormFields() {
        // Use schema fields if available, fallback to legacy itemFields
        const schemaFields = this.listConfig.fields || [];
        const hasSchemaFields = schemaFields.length > 0;

        if (hasSchemaFields) {
            // Use schema-based form fields, excluding non-editable fields
            return schemaFields
                .filter(field => {
                    // Exclude system fields and non-editable fields
                    return field.key !== 'id' &&
                        field.key !== 'createdAt' &&
                        field.key !== 'completed' &&
                        field.key !== 'completedAt' &&
                        field.key !== 'timeToComplete';
                })
                .map(field => ({
                    key: field.key,
                    label: field.label,
                    type: this.getFormFieldType(field),
                    required: field.key === 'text' || field.required,
                    options: this.getFormFieldOptions(field)
                }));
        } else {
            // Legacy field generation
            return this.listConfig.itemFields.map(field => ({
                key: field,
                label: field.charAt(0).toUpperCase() + field.slice(1),
                type: 'text',
                required: field === this.listConfig.itemTextField
            }));
        }
    }

    /**
     * Get appropriate form field type based on schema field
     */
    getFormFieldType(field) {
        switch (field.key) {
            case 'priority':
                return 'select';
            case 'category':
                return 'text'; // Could be 'select' if you have predefined categories
            case 'dueDate':
                return 'date';
            case 'text':
                return 'textarea';
            default:
                return field.type === 'badge' ? 'text' : (field.type || 'text');
        }
    }

    /**
     * Get form field options for select fields
     */
    getFormFieldOptions(field) {
        switch (field.key) {
            case 'priority':
                return [
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'urgent', label: 'Urgent' }
                ];
            default:
                return field.options || [];
        }
    }

    formatFieldValue(value, field) {
        if (value == null) return '';

        // Add field-specific formatting here
        switch (field) {
            case 'priority':
                return `<span class="priority priority-${value}">${value}</span>`;
            case 'category':
                return `<span class="category">${value}</span>`;
            default:
                return String(value);
        }
    }

    validateFormData(data) {
        const errors = {};
        const fields = this.getDefaultFormFields();

        fields.forEach(field => {
            const value = data[field.key];

            if (field.required && (!value || value.trim() === '')) {
                errors[field.key] = `${field.label} is required`;
            }
        });

        return errors;
    }

    isAllSelected() {
        const currentPageItems = this.getProcessedItems();
        if (currentPageItems.length === 0) return false;

        return currentPageItems.every(item => {
            const id = this.getItemId(item);
            return this.listState.selectedItems.has(id);
        });
    }

    handleSelectAll(checked) {
        const currentPageItems = this.getProcessedItems();

        if (checked) {
            currentPageItems.forEach(item => {
                this.listState.selectedItems.add(this.getItemId(item));
            });
        } else {
            currentPageItems.forEach(item => {
                this.listState.selectedItems.delete(this.getItemId(item));
            });
        }

        this.render();
    }

    handleSelectItem(id, checked) {
        if (checked) {
            this.listState.selectedItems.add(id);
        } else {
            this.listState.selectedItems.delete(id);
        }

        this.render();
    }

    handleDeselectAll() {
        this.listState.selectedItems.clear();
        this.render();
    }

    handleSort(column) {
        if (this.listState.sortColumn === column) {
            this.listState.sortDirection = this.listState.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.listState.sortColumn = column;
            this.listState.sortDirection = 'asc';
        }

        this.render();
    }

    handleClearSearch() {
        this.listState.filterQuery = '';
        this.render();
    }

    /**
     * Post-render setup
     */
    postRenderSetup() {
        // Focus management, animations, etc.
        // Modal focus management is now handled by ModalComponent
    }

    /**
     * Enhanced cleanup
     */
    destroy() {
        this.listConfig = null;
        this.listState = null;
        super.destroy();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ListComponent;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ListComponent = ListComponent;
} 