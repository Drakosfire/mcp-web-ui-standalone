/**
 * ListComponent - Generic, Configurable List Implementation
 * 
 * This component provides a flexible list interface that can be configured for different use cases:
 * - Configurable CRUD operations (add, edit, delete)
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
 *     itemFields: ['text', 'priority', 'category']
 *   }
 * });
 * 
 * // Grocery list
 * const groceryList = new ListComponent(element, data, {
 *   list: {
 *     itemType: 'grocery',
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

            // Multi-section configuration
            mode: 'single', // 'single' | 'multi'
            groupBy: null, // Field name to group by (e.g., 'completed')
            sections: {}, // Section configuration for simple groupBy mode
            advancedSections: [], // Advanced section configuration with filter functions
            sectionTransitions: {
                enabled: true,
                duration: 300,
                easing: 'ease-in-out'
            },

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



            // Merge user configuration
            ...config.list
        };

        // 2.5. Intelligent configuration enhancement based on schema fields
        this.enhanceConfigurationFromSchema(config);

        // 2.6. Validate multi-section configuration
        this.validateMultiSectionConfig();

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
            showBulkActions: false,

            // Multi-section state
            sectionStates: new Map(), // section id -> { collapsed: boolean }
            itemTransitions: new Map(), // item id -> { from: section, to: section, startTime: timestamp }
            sectionsData: new Map() // section id -> filtered items array
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
     * Enhance configuration based on schema field analysis
     * This method detects common patterns and auto-configures appropriate features
     * @param {Object} originalConfig - The original user configuration passed to constructor
     */
    enhanceConfigurationFromSchema(originalConfig) {
        const fields = this.listConfig.fields || [];

        // Detect common field patterns
        const hasTextField = fields.some(f => f.key === 'text' || f.key === 'task' || f.key === 'title' || f.key === 'name');
        const hasCompletedField = fields.some(f => f.key === 'completed' || f.key === 'done' || f.key === 'finished');
        const hasPriorityField = fields.some(f => f.key === 'priority');
        const hasCategoryField = fields.some(f => f.key === 'category' || f.key === 'type');
        const hasDateField = fields.some(f => f.key === 'dueDate' || f.key === 'date' || f.type === 'date');

        // Auto-detect data type and configure accordingly
        if (hasTextField && (hasCompletedField || hasPriorityField)) {
            this.log('INFO', 'Detected todo/task list pattern - auto-configuring features');

            // Configure for todo/task management
            this.listConfig.itemType = 'todo';
            this.listConfig.itemTextField = hasTextField ? 'text' : 'task';

            // Build itemFields from detected schema
            this.listConfig.itemFields = ['text'];
            if (hasPriorityField) this.listConfig.itemFields.push('priority');
            if (hasCategoryField) this.listConfig.itemFields.push('category');
            if (hasDateField) this.listConfig.itemFields.push('dueDate');

            // Note: Toggle functionality has been removed
            // The completed field is now handled via checkbox display only

            // Configure forms if not already configured
            if (!this.listConfig.forms.add.fields || this.listConfig.forms.add.fields.length === 0) {
                this.listConfig.forms.add = {
                    title: 'Add New Todo',
                    fields: this.generateFormFieldsFromSchema(fields)
                };
            }

            if (!this.listConfig.forms.edit.fields || this.listConfig.forms.edit.fields.length === 0) {
                this.listConfig.forms.edit = {
                    title: 'Edit Todo',
                    fields: this.generateFormFieldsFromSchema(fields)
                };
            }

            // Configure display
            this.listConfig.emptyStateMessage = this.listConfig.emptyStateMessage || 'No todos yet! Add your first one to get started.';
            this.listConfig.confirmDeletes = true;

        } else if (hasTextField) {
            // Generic list configuration
            this.log('INFO', 'Detected generic list pattern - using basic configuration');
            this.listConfig.itemTextField = this.detectPrimaryTextField(fields);

            // Generate basic form if none provided
            if (!this.listConfig.forms.add.fields || this.listConfig.forms.add.fields.length === 0) {
                this.listConfig.forms.add.fields = this.generateFormFieldsFromSchema(fields);
            }
        }

        // Ensure global actions include 'add' if CRUD is enabled
        if (this.listConfig.enableCRUD && !this.listConfig.actions.global.includes('add')) {
            this.listConfig.actions.global.push('add');
        }
    }

    /**
     * Generate form fields from schema fields for add/edit forms
     */
    generateFormFieldsFromSchema(schemaFields) {
        return schemaFields
            .filter(field => {
                // Exclude system/read-only fields from forms
                return !['id', 'createdAt', 'completed', 'completedAt', 'timeToComplete'].includes(field.key);
            })
            .map(field => {
                const formField = {
                    name: field.key,  // Use 'name' for ModalComponent compatibility
                    label: field.label,
                    type: this.getFormFieldTypeFromSchema(field),
                    required: field.key === 'text' || field.key === 'name' || field.key === 'title',
                    placeholder: this.getFieldPlaceholder(field)
                };

                // Add options for select fields
                if (formField.type === 'select') {
                    formField.options = this.getFormFieldOptionsFromSchema(field);
                }

                return formField;
            });
    }

    /**
     * Convert schema field type to form field type
     */
    getFormFieldTypeFromSchema(field) {
        if (field.key === 'priority') return 'select';
        if (field.key === 'text' || field.key === 'task') return 'textarea';
        if (field.type === 'date') return 'date';
        if (field.type === 'checkbox') return 'checkbox';
        return 'text';
    }

    /**
     * Get appropriate placeholder text for form fields
     */
    getFieldPlaceholder(field) {
        const placeholders = {
            'text': 'Enter your todo...',
            'task': 'What needs to be done?',
            'title': 'Enter title...',
            'name': 'Enter name...',
            'category': 'Optional category',
            'dueDate': '',
            'priority': ''
        };
        return placeholders[field.key] || `Enter ${field.label.toLowerCase()}...`;
    }

    /**
     * Get form field options from schema
     */
    getFormFieldOptionsFromSchema(field) {
        if (field.key === 'priority') {
            return [
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' }
            ];
        }
        return field.options || [];
    }

    /**
     * Detect the primary text field from schema
     */
    detectPrimaryTextField(fields) {
        const candidates = ['text', 'title', 'name', 'task', 'description'];
        for (const candidate of candidates) {
            if (fields.some(f => f.key === candidate)) {
                return candidate;
            }
        }
        return fields.length > 0 ? fields[0].key : 'text';
    }

    /**
     * Validate multi-section configuration
     * Ensures that multi-section mode has proper configuration
     */
    validateMultiSectionConfig() {
        const errors = [];

        if (this.listConfig.mode === 'multi') {
            // Must have either groupBy or advancedSections
            if (!this.listConfig.groupBy && (!this.listConfig.advancedSections || this.listConfig.advancedSections.length === 0)) {
                errors.push('Multi mode requires either groupBy or advancedSections');
            }

            // If using groupBy, must have sections configuration
            if (this.listConfig.groupBy && (!this.listConfig.sections || Object.keys(this.listConfig.sections).length === 0)) {
                errors.push('groupBy mode requires sections configuration');
            }

            // If using advancedSections, validate section structure
            if (this.listConfig.advancedSections && this.listConfig.advancedSections.length > 0) {
                this.listConfig.advancedSections.forEach((section, index) => {
                    if (!section.id) {
                        errors.push(`Advanced section ${index} missing required 'id' property`);
                    }
                    if (!section.name) {
                        errors.push(`Advanced section ${index} missing required 'name' property`);
                    }
                    if (!section.filter || typeof section.filter !== 'function') {
                        errors.push(`Advanced section ${index} missing required 'filter' function`);
                    }
                });
            }
        }

        if (errors.length > 0) {
            this.log('WARN', `Multi-section configuration errors: ${errors.join(', ')}`);
            // Fallback to single mode on configuration errors
            this.listConfig.mode = 'single';
            this.log('INFO', 'Falling back to single mode due to configuration errors');
        }
    }

    /**
     * Main render method
     */
    render() {
        if (this.isDestroyed) return;

        // Update sections data if in multi-section mode
        if (this.listConfig.mode === 'multi') {
            this.updateSectionsData();
        }

        const modeClass = this.listConfig.mode === 'multi' ? 'multi-section' : 'single-section';

        this.element.innerHTML = this.html`
            <div class="component component-list component-${this.listConfig.layout} ${modeClass}">
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

        // Toggle stats removed - use checkbox-based completion tracking instead

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
     * Render filter controls
     */
    renderFilters() {
        if (!this.listConfig.filters || !this.listConfig.filters.length) {
            return '';
        }

        return this.html`
            <div class="filters-container">
                ${this.trustedHtml(this.listConfig.filters.map(filter => `
                    <div class="filter-group">
                        <label class="filter-label">${filter.label}:</label>
                        <select class="filter-select" data-action="filter" data-filter="${filter.key}">
                            <option value="">All ${filter.label}</option>
                            ${filter.options.map(option => `
                                <option value="${option.value}" ${this.listState.filters[filter.key] === option.value ? 'selected' : ''}>
                                    ${option.label}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                `).join(''))}
            </div>
        `;
    }

    /**
     * Render sort controls
     */
    renderSortControls() {
        const sortableColumns = this.getTableColumns().filter(col => col.sortable);

        if (!sortableColumns.length) {
            return '';
        }

        return this.html`
            <div class="sort-controls">
                <label class="sort-label">Sort by:</label>
                <select class="sort-select" data-action="sort-select">
                    <option value="">Default</option>
                    ${this.trustedHtml(sortableColumns.map(col => `
                        <option value="${col.key}" ${this.listState.sortColumn === col.key ? 'selected' : ''}>
                            ${col.label}
                        </option>
                    `).join(''))}
                </select>
                ${this.listState.sortColumn ? this.trustedHtml(`
                    <button class="sort-direction-btn" data-action="toggle-sort-direction" title="Toggle sort direction">
                        ${this.listState.sortDirection === 'asc' ? '↑' : '↓'}
                    </button>
                `) : ''}
            </div>
        `;
    }

    /**
     * Render content based on layout and mode
     */
    renderContent() {
        // Handle multi-section mode
        if (this.listConfig.mode === 'multi') {
            return this.renderMultiSections();
        }

        // Handle single-section mode (existing behavior)
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
     * Update sections data by organizing items into sections
     */
    updateSectionsData() {
        this.listState.sectionsData.clear();

        if (this.listConfig.groupBy) {
            // Simple groupBy mode
            const sections = Object.keys(this.listConfig.sections);

            sections.forEach(sectionKey => {
                const sectionItems = this.data.filter(item => {
                    const itemValue = item[this.listConfig.groupBy];
                    // Handle boolean values specially
                    if (typeof itemValue === 'boolean') {
                        return String(itemValue) === sectionKey;
                    }
                    return itemValue === sectionKey;
                });

                this.listState.sectionsData.set(sectionKey, sectionItems);
            });
        } else if (this.listConfig.advancedSections.length > 0) {
            // Advanced sections mode
            this.listConfig.advancedSections.forEach(section => {
                const sectionItems = this.data.filter(section.filter);
                this.listState.sectionsData.set(section.id, sectionItems);
            });
        }
    }

    /**
     * Render multi-section layout
     */
    renderMultiSections() {
        const sections = this.getSectionConfigs();

        if (sections.length === 0) {
            return this.renderEmptyState();
        }

        return this.html`
            <div class="list-content multi-sections">
                ${this.trustedHtml(sections.map(section => this.renderSection(section)).join(''))}
            </div>
        `;
    }

    /**
     * Get section configurations in display order
     */
    getSectionConfigs() {
        if (this.listConfig.groupBy) {
            // Simple groupBy mode
            return Object.entries(this.listConfig.sections)
                .map(([key, config]) => ({
                    id: key,
                    ...config
                }))
                .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        } else if (this.listConfig.advancedSections.length > 0) {
            // Advanced sections mode
            return [...this.listConfig.advancedSections]
                .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        }
        return [];
    }

    /**
     * Render a single section
     */
    renderSection(section) {
        const sectionItems = this.listState.sectionsData.get(section.id) || [];
        const isCollapsed = this.listState.sectionStates.get(section.id)?.collapsed || false;

        return this.html`
            <div class="list-section" data-section="${section.id}">
                ${this.trustedHtml(this.renderSectionHeader(section, sectionItems))}
                ${!isCollapsed ? this.trustedHtml(this.renderSectionContent(section, sectionItems)) : ''}
            </div>
        `;
    }

    /**
     * Render section header
     */
    renderSectionHeader(section, items) {
        const itemCount = items.length;
        const isCollapsed = this.listState.sectionStates.get(section.id)?.collapsed || false;

        return this.html`
            <div class="section-header" data-section="${section.id}">
                <div class="section-title">
                    ${section.icon ? this.trustedHtml(`<span class="section-icon">${section.icon}</span>`) : ''}
                    <h3 class="section-name">${section.name}</h3>
                    <span class="section-count">(${itemCount})</span>
                </div>
                ${section.collapsible ? this.trustedHtml(`
                    <button class="section-toggle" 
                            data-action="toggle-section" 
                            data-section="${section.id}"
                            aria-expanded="${!isCollapsed}"
                            title="${isCollapsed ? 'Expand section' : 'Collapse section'}">
                        ${isCollapsed ? '▶' : '▼'}
                    </button>
                `) : ''}
            </div>
        `;
    }

    /**
     * Render section content
     */
    renderSectionContent(section, items) {
        if (items.length === 0) {
            return this.html`
                <div class="section-content empty">
                    <div class="section-empty-state">
                        <p>No items in this section</p>
                    </div>
                </div>
            `;
        }

        return this.html`
            <div class="section-content">
                ${this.trustedHtml(this.renderItems(items))}
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
        const isCompleted = this.hasCompletedField(item) && item.completed;
        const hasCompleted = this.hasCompletedField(item);

        return `
            <div class="list-item ${isSelected ? 'selected' : ''} ${isCompleted ? 'completed' : ''}" 
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
                    
                    ${hasCompleted ? `
                        <div class="item-toggle">
                            <input 
                                type="checkbox" 
                                class="item-checkbox"
                                data-action="toggle-item" 
                                data-id="${itemId}"
                                ${item.completed ? 'checked' : ''}
                                title="${item.completed ? 'Mark as incomplete' : 'Mark as complete'}"
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
     * Check if item has a completed field that can be toggled
     */
    hasCompletedField(item) {
        return item.hasOwnProperty('completed') && typeof item.completed === 'boolean';
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

        // Special handling for createdAt field - always format as human-readable date
        if (field.key === 'createdAt' && value) {
            const formattedDate = this.formatCreatedDate(value);
            return `<span class="date-value created-date">${formattedDate}</span>`;
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
        return '';
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

        // Toggle completion checkbox
        this.on('change', '[data-action="toggle-item"]', (e) => {
            const id = e.target.dataset.id;
            const completed = e.target.checked;
            this.handleToggleItem(id, completed);
        });

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

            this.on('change', '[data-action="sort-select"]', (e) => {
                const column = e.target.value;
                this.handleSort(column);
            });

            this.on('click', '[data-action="toggle-sort-direction"]', () => {
                this.handleToggleSortDirection();
            });
        }

        // Filtering
        if (this.listConfig.enableFilters) {
            this.on('change', '[data-action="filter"]', (e) => {
                const filterKey = e.target.dataset.filter;
                const filterValue = e.target.value;
                this.handleFilter(filterKey, filterValue);
            });
        }

        // Section toggles (for multi-section mode)
        if (this.listConfig.mode === 'multi') {
            this.on('click', '[data-action="toggle-section"]', (e) => {
                const sectionId = e.target.dataset.section;
                this.handleToggleSection(sectionId);
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
                try {
                    // Show form modal directly - no need to check with server first
                    await this.showFormModal('add');
                } catch (error) {
                    this.log('ERROR', `Add action failed: ${error.message}`);
                    this.handleError(error);
                }
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
     * Handle toggle item completion
     */
    async handleToggleItem(id, completed) {
        const item = this.findItemById(id);
        if (!item) return;

        try {
            // Update the item locally first for responsive UI
            item.completed = completed;
            if (completed) {
                item.completedAt = new Date().toISOString();
            } else {
                delete item.completedAt;
            }

            // Update the server - use 'toggle-item' action to match backend handler
            await this.handleAction('toggle-item', {
                id,
                completed,
                completedAt: completed ? item.completedAt : null
            });

            this.log('INFO', `Item ${completed ? 'completed' : 'uncompleted'}: ${id}`);

            // Re-render to apply sorting and move completed items to bottom
            this.render();
        } catch (error) {
            // Revert local change if server update failed
            item.completed = !completed;
            if (!completed) {
                item.completedAt = new Date().toISOString();
            } else {
                delete item.completedAt;
            }

            // Re-render to show the reverted state
            this.render();
            this.handleError(error);
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
                const confirmMessage = this.getDeleteConfirmMessage(item);
                if (!confirm(confirmMessage)) return;
            } else {
                const confirmed = await window.MCPModal.confirm({
                    title: 'Confirm Delete',
                    message: this.getDeleteConfirmMessage(item),
                    confirmText: 'Delete',
                    cancelText: 'Cancel'
                    // Removed invalid type: 'danger' - let MCPModal.confirm() set type: 'confirm'
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
     * Get delete confirmation message, using schema action config if available
     */
    getDeleteConfirmMessage(item) {
        // Check if we have schema actions with a confirm message
        const schemaActions = this.config?.actions;
        if (schemaActions) {
            const deleteAction = schemaActions.find(action => action.id === 'delete' || action.handler === 'delete');
            if (deleteAction && deleteAction.confirm) {
                return deleteAction.confirm;
            }
        }

        // Fallback to generic message
        return `Delete "${item[this.listConfig.itemTextField]}"?`;
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
     * Show form modal using server-provided form schema
     */
    async showServerFormModal(type, formSchema) {
        if (!window.MCPModal) {
            this.log('ERROR', 'ModalComponent not available');
            return;
        }

        try {

            const result = await window.MCPModal.form({
                title: formSchema.title || (type === 'add' ? 'Add Item' : 'Edit Item'),
                fields: formSchema.fields || [],
                initialData: {},
                onSubmit: async (formData) => {
                    console.log('DEBUG: Add form submitted with data:', formData);
                    try {
                        // Submit to server with actual form data
                        const actionResult = await this.handleAction(type, formData);

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
            this.log('ERROR', `Failed to show server form modal: ${error.message}`);
        }
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
                    console.log(`DEBUG: ${type.charAt(0).toUpperCase() + type.slice(1)} form submitted with data:`, formData);
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

                        console.log(`DEBUG: Calling handleAction('${action}') with payload:`, payload);
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

        // Toggle statistics removed - using checkbox display only for completion tracking

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

        // Use schema fields if available, fallback to legacy itemFields
        const schemaFields = this.listConfig.fields || [];
        const hasSchemaFields = schemaFields.length > 0;

        if (hasSchemaFields) {
            // Use detailed field configuration for better sorting options
            return schemaFields
                .filter(field => {
                    // Exclude non-sortable system fields
                    return field.key !== 'id' && field.key !== 'completedAt' && field.key !== 'timeToComplete';
                })
                .map(field => ({
                    key: field.key,
                    label: field.label || field.key.charAt(0).toUpperCase() + field.key.slice(1),
                    sortable: field.sortable !== false, // Default to sortable unless explicitly disabled
                    type: field.type
                }));
        } else {
            // Auto-generate from itemFields (legacy fallback)
            return this.listConfig.itemFields.map(field => ({
                key: field,
                label: field.charAt(0).toUpperCase() + field.slice(1),
                sortable: true
            }));
        }
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
                    name: field.key,  // Use 'name' for ModalComponent compatibility
                    label: field.label,
                    type: this.getFormFieldType(field),
                    required: field.key === 'text' || field.required,
                    options: this.getFormFieldOptions(field),
                    placeholder: this.getFieldPlaceholder(field)
                }));
        } else {
            // Legacy field generation
            return this.listConfig.itemFields.map(field => ({
                name: field,  // Use 'name' for ModalComponent compatibility
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
            case 'createdAt':
                return this.formatCreatedDate(value);
            default:
                return String(value);
        }
    }

    /**
     * Format createdAt timestamp to human-readable format
     * @param {string} dateString - ISO timestamp string
     * @returns {string} Human-readable date string
     */
    formatCreatedDate(dateString) {
        if (!dateString) return '';

        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor(diffMs / (1000 * 60));

            // Format relative time for recent dates
            if (diffMinutes < 1) {
                return 'Just now';
            } else if (diffMinutes < 60) {
                return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
            } else if (diffHours < 24) {
                return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
            } else if (diffDays < 7) {
                return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
            } else {
                // For older dates, show the actual date
                return date.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
        } catch (error) {
            console.warn('Error formatting created date:', error);
            return 'Invalid date';
        }
    }

    validateFormData(data) {
        const errors = {};
        const fields = this.getDefaultFormFields();

        fields.forEach(field => {
            const value = data[field.name];

            if (field.required && (!value || value.trim() === '')) {
                errors[field.name] = `${field.label} is required`;
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
     * Handle toggle sort direction
     */
    handleToggleSortDirection() {
        if (this.listState.sortColumn) {
            this.listState.sortDirection = this.listState.sortDirection === 'asc' ? 'desc' : 'asc';
            this.render();
        }
    }

    /**
     * Handle filter change
     */
    handleFilter(filterKey, filterValue) {
        if (!this.listState.filters) {
            this.listState.filters = {};
        }

        if (filterValue) {
            this.listState.filters[filterKey] = filterValue;
        } else {
            delete this.listState.filters[filterKey];
        }

        this.listState.currentPage = 1; // Reset to first page
        this.render();
    }

    /**
     * Handle section toggle (collapse/expand)
     */
    handleToggleSection(sectionId) {
        const currentState = this.listState.sectionStates.get(sectionId) || { collapsed: false };
        const newState = { ...currentState, collapsed: !currentState.collapsed };

        this.listState.sectionStates.set(sectionId, newState);

        this.log('INFO', `Section ${sectionId} ${newState.collapsed ? 'collapsed' : 'expanded'}`);
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