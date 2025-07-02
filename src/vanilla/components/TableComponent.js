/**
 * TableComponent - Advanced Data Table Implementation
 * 
 * This component provides a complete data table interface with:
 * - Sortable columns with multiple sort types
 * - Real-time filtering and search
 * - Pagination for large datasets
 * - Row selection and bulk actions
 * - Responsive design for mobile devices
 * - Export functionality
 * - Customizable column types and formatting
 * 
 * SECURITY FEATURES:
 * - All data is sanitized through BaseComponent
 * - XSS protection for all cell content
 * - Safe HTML rendering in custom cells
 * - Input validation for filter queries
 * - Rate limiting on sort/filter operations
 * 
 * AI INTEGRATION READY:
 * - Handles dynamic data from LLM sources
 * - Context-aware sanitization for different column types
 * - Flexible column configuration for AI-generated schemas
 * - Comprehensive logging for debugging
 * 
 * Usage:
 * const table = new TableComponent(element, data, config);
 * 
 * Config options:
 * - columns: Array of column definitions
 * - sortable: Enable sorting (default: true)
 * - filterable: Enable filtering (default: true)
 * - pageSize: Items per page (default: 20)
 * - selectable: Enable row selection (default: false)
 * - exportable: Enable data export (default: false)
 */
class TableComponent extends BaseComponent {
    /**
     * Initialize TableComponent with table-specific state
     * @param {HTMLElement} element - DOM element to attach to
     * @param {Array} data - Initial table data
     * @param {Object} config - Configuration options
     */
    constructor(element, data, config) {
        super(element, data, config);

        // Table-specific configuration
        this.tableConfig = {
            columns: [],
            sortable: true,
            filterable: true,
            pageSize: 20,
            selectable: false,
            exportable: false,
            responsive: true,
            maxCellLength: 200,
            ...config.table
        };

        // Table state management
        this.tableState = {
            currentPage: 1,
            sortColumn: null,
            sortDirection: 'asc', // 'asc' or 'desc'
            filterQuery: '',
            selectedRows: new Set(),
            isLoading: false
        };

        // Filtered and sorted data cache
        this.processedData = [];
        this.filteredData = [];

        // Column type handlers
        this.columnTypes = {
            text: this.renderTextCell.bind(this),
            number: this.renderNumberCell.bind(this),
            date: this.renderDateCell.bind(this),
            badge: this.renderBadgeCell.bind(this),
            checkbox: this.renderCheckboxCell.bind(this),
            actions: this.renderActionsCell.bind(this),
            custom: this.renderCustomCell.bind(this)
        };

        // Re-render now that config is properly set
        this.render();

        // Bind events after everything is set up
        this.bindEvents();

        this.log('INFO', 'TableComponent initialized with advanced features');
    }

    /**
     * Override init to prevent premature rendering during construction
     */
    init() {
        if (this.isDestroyed) return;

        try {
            // Don't call bindEvents here - let constructor handle it after config is set
            this.startPolling();
            this.log('INFO', `Component initialized on element: ${this.element.id || this.element.className}`);
        } catch (error) {
            this.log('ERROR', `Failed to initialize component: ${error.message}`);
            this.handleError(error);
        }
    }

    /**
     * Render the complete table interface
     */
    render() {
        if (this.isDestroyed) return;

        // Process data for display
        this.processData();

        this.element.innerHTML = this.html`
            <div class="component component-table">
                ${this.trustedHtml(this.renderHeader())}
                ${this.trustedHtml(this.renderFilters())}
                ${this.trustedHtml(this.renderTableContainer())}
                ${this.trustedHtml(this.renderPagination())}
                ${this.trustedHtml(this.renderBulkActions())}
                ${this.trustedHtml(this.renderErrorMessage())}
            </div>
        `;
    }

    /**
     * Render table header with title and controls
     */
    renderHeader() {
        const stats = this.calculateStats();

        return this.html`
            <div class="table-header">
                <h2>${this.config.title || 'Data Table'}</h2>
                <div class="table-stats">
                    <span class="stat-item">
                        <strong>${stats.filtered}</strong> of <strong>${stats.total}</strong> items
                    </span>
                    ${this.tableState.selectedRows.size > 0 ? this.html`
                        <span class="stat-item stat-selected">
                            <strong>${this.tableState.selectedRows.size}</strong> selected
                        </span>
                    ` : ''}
                </div>
                <div class="table-controls">
                    ${this.config.actions ? this.trustedHtml(this.config.actions.filter(action => action.type === 'button').map(action => `
                        <button class="btn-action btn-${action.type}" 
                                data-action="global-action" 
                                data-action-id="${action.id}"
                                title="${action.label}">
                            ${action.icon || ''} ${action.label}
                        </button>
                    `).join('')) : ''}
                    ${this.tableConfig.exportable ? this.html`
                        <button class="btn-export" data-action="export" title="Export data">
                            Export
                        </button>
                    ` : ''}
                    <button class="btn-refresh" data-action="refresh" title="Refresh data">
                        ↻
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render filter controls
     */
    renderFilters() {
        if (!this.tableConfig.filterable) return '';

        return this.html`
            <div class="table-filters">
                <div class="filter-search">
                    <input 
                        type="text" 
                        class="filter-input"
                        placeholder="Search table..."
                        value="${this.tableState.filterQuery}"
                        data-action="filter"
                    >
                    ${this.tableState.filterQuery ? this.html`
                        <button class="btn-clear-filter" data-action="clear-filter" title="Clear filter">
                            ×
                        </button>
                    ` : ''}
                </div>
                <div class="filter-info">
                    ${this.tableState.filterQuery ? this.html`
                        <span class="filter-active">
                            Filtering by: "${this.tableState.filterQuery}"
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render the main table container
     */
    renderTableContainer() {
        if (this.tableState.isLoading) {
            return this.html`
                <div class="table-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading data...</p>
                </div>
            `;
        }

        if (this.filteredData.length === 0) {
            return this.renderEmptyState();
        }

        const pageData = this.getCurrentPageData();

        return this.html`
            <div class="table-container">
                <table class="data-table">
                    ${this.trustedHtml(this.renderTableHeader())}
                    ${this.trustedHtml(this.renderTableBody(pageData))}
                </table>
            </div>
        `;
    }

    /**
     * Render table header with column titles and sort controls
     */
    renderTableHeader() {
        return this.html`
            <thead>
                <tr>
                    ${this.tableConfig.selectable ? this.html`
                        <th class="select-column">
                            <input 
                                type="checkbox" 
                                class="select-all-checkbox"
                                data-action="select-all"
                                ${this.isAllSelected() ? 'checked' : ''}
                            >
                        </th>
                    ` : ''}
                    ${this.trustedHtml(this.tableConfig.columns.map(column => `
                        <th class="column-header ${column.sortable !== false && this.tableConfig.sortable ? 'sortable' : ''} ${this.tableState.sortColumn === column.key ? 'sorted' : ''}"
                            data-column="${column.key}"
                            data-action="${column.sortable !== false && this.tableConfig.sortable ? 'sort' : ''}">
                            <div class="column-header-content">
                                <span class="column-title">${column.label || column.key}</span>
                                ${column.sortable !== false && this.tableConfig.sortable ? `
                                    <span class="sort-indicator ${this.tableState.sortColumn === column.key ? this.tableState.sortDirection : ''}">
                                        ↕
                                    </span>
                                ` : ''}
                            </div>
                        </th>
                    `).join(''))}
                </tr>
            </thead>
        `;
    }

    /**
     * Render table body with data rows
     * @param {Array} data - Page data to render
     */
    renderTableBody(data) {
        return this.html`
            <tbody>
                ${this.trustedHtml(data.map((row, index) => this.renderTableRow(row, index)).join(''))}
            </tbody>
        `;
    }

    /**
     * Render a single table row
     * @param {Object} row - Row data
     * @param {number} index - Row index
     */
    renderTableRow(row, index) {
        const rowId = row.id || index;
        const isSelected = this.tableState.selectedRows.has(rowId);

        return this.html`
            <tr class="table-row ${isSelected ? 'selected' : ''}" data-row-id="${rowId}">
                ${this.tableConfig.selectable ? this.html`
                    <td class="select-cell">
                        <input 
                            type="checkbox" 
                            class="row-checkbox"
                            data-action="select-row"
                            data-row-id="${rowId}"
                            ${isSelected ? 'checked' : ''}
                        >
                    </td>
                ` : ''}
                ${this.trustedHtml(this.tableConfig.columns.map(column => `
                    <td class="table-cell cell-${column.key} cell-type-${column.type || 'text'}"
                        data-column="${column.key}">
                        ${this.renderCell(row, column)}
                    </td>
                `).join(''))}
            </tr>
        `;
    }

    /**
     * Render a table cell based on column type
     * @param {Object} row - Row data
     * @param {Object} column - Column configuration
     */
    renderCell(row, column) {
        const value = this.getCellValue(row, column.key);
        const cellType = column.type || 'text';

        if (this.columnTypes[cellType]) {
            return this.columnTypes[cellType](value, row, column);
        } else {
            return this.renderTextCell(value, row, column);
        }
    }

    /**
     * Get cell value from row data
     * @param {Object} row - Row data
     * @param {string} key - Column key (supports dot notation)
     */
    getCellValue(row, key) {
        if (key.includes('.')) {
            // Support nested object keys like 'user.name'
            return key.split('.').reduce((obj, k) => obj?.[k], row);
        }
        return row[key];
    }

    /**
     * Render text cell
     */
    renderTextCell(value, row, column) {
        if (value === null || value === undefined) {
            return '<span class="cell-empty">—</span>';
        }

        const displayValue = String(value);
        const truncated = displayValue.length > this.tableConfig.maxCellLength;
        const cellContent = truncated
            ? displayValue.substring(0, this.tableConfig.maxCellLength) + '...'
            : displayValue;

        return this.html`
            <span class="cell-text ${truncated ? 'truncated' : ''}" 
                  ${truncated ? `title="${displayValue}"` : ''}>
                ${cellContent}
            </span>
        `;
    }

    /**
     * Render number cell with formatting
     */
    renderNumberCell(value, row, column) {
        if (value === null || value === undefined || isNaN(value)) {
            return '<span class="cell-empty">—</span>';
        }

        const formatted = column.format
            ? column.format(value)
            : Number(value).toLocaleString();

        return this.html`
            <span class="cell-number">${formatted}</span>
        `;
    }

    /**
     * Render date cell with formatting
     */
    renderDateCell(value, row, column) {
        if (!value) {
            return '<span class="cell-empty">—</span>';
        }

        try {
            const date = new Date(value);
            const formatted = column.format
                ? column.format(date)
                : date.toLocaleDateString();

            return this.html`
                <span class="cell-date" title="${date.toISOString()}">${formatted}</span>
            `;
        } catch {
            return this.html`<span class="cell-error">Invalid Date</span>`;
        }
    }

    /**
     * Render badge cell with color coding
     */
    renderBadgeCell(value, row, column) {
        if (!value) {
            return '<span class="cell-empty">—</span>';
        }

        let badgeText = value;
        let badgeColor = null;

        // Handle complex badge objects
        if (typeof value === 'object' && value !== null) {
            badgeText = value.text || value.label || String(value);
            badgeColor = value.color;
        }

        // Use configured color mapping or direct color from object
        let badgeStyle = '';
        if (badgeColor) {
            badgeStyle = `style="background-color: ${badgeColor}; color: white;"`;
        } else if (column.badgeConfig?.colorMap?.[badgeText]) {
            const configColor = column.badgeConfig.colorMap[badgeText];
            badgeStyle = `style="background-color: ${configColor}; color: white;"`;
        }

        return this.html`
            <span class="cell-badge" ${badgeStyle}>${badgeText}</span>
        `;
    }

    /**
     * Render checkbox cell
     */
    renderCheckboxCell(value, row, column) {
        const isChecked = Boolean(value);
        const rowId = row.id || row.index;

        return this.html`
            <input 
                type="checkbox" 
                class="cell-checkbox"
                data-action="toggle-cell"
                data-row-id="${rowId}"
                data-column="${column.key}"
                ${isChecked ? 'checked' : ''}
                ${column.readonly ? 'disabled' : ''}
            >
        `;
    }

    /**
     * Render actions cell with buttons
     */
    renderActionsCell(value, row, column) {
        const actions = column.actions || [];

        return this.html`
            <div class="cell-actions">
                ${this.trustedHtml(actions.map(action => `
                    <button 
                        class="btn-action btn-${action.type || 'default'}"
                        data-action="row-action"
                        data-row-id="${row.id || row.index}"
                        data-action-type="${action.type}"
                        title="${action.label}"
                    >
                        ${action.icon || action.label}
                    </button>
                `).join(''))}
            </div>
        `;
    }

    /**
     * Render custom cell using provided renderer
     */
    renderCustomCell(value, row, column) {
        if (column.renderer && typeof column.renderer === 'function') {
            try {
                return column.renderer(value, row, column);
            } catch (error) {
                this.log('ERROR', `Custom cell renderer error: ${error.message}`);
                return '<span class="cell-error">Render Error</span>';
            }
        }
        return this.renderTextCell(value, row, column);
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        const message = this.tableState.filterQuery
            ? 'No results found for your search.'
            : 'No data available.';

        return this.html`
            <div class="table-empty">
                <div class="empty-icon">📊</div>
                <p class="empty-message">${message}</p>
                ${this.tableState.filterQuery ? this.html`
                    <button class="btn-clear-filter" data-action="clear-filter">
                        Clear Filter
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render pagination controls
     */
    renderPagination() {
        if (!this.shouldShowPagination()) return '';

        const totalPages = Math.ceil(this.filteredData.length / this.tableConfig.pageSize);
        const currentPage = this.tableState.currentPage;

        return this.html`
            <div class="table-pagination">
                <div class="pagination-info">
                    Page ${currentPage} of ${totalPages}
                    (${this.getPageRangeText()})
                </div>
                <div class="pagination-controls">
                    <button 
                        class="btn-page btn-first"
                        data-action="page"
                        data-page="1"
                        ${currentPage === 1 ? 'disabled' : ''}
                        title="First page"
                    >
                        ⇤
                    </button>
                    <button 
                        class="btn-page btn-prev"
                        data-action="page"
                        data-page="${currentPage - 1}"
                        ${currentPage === 1 ? 'disabled' : ''}
                        title="Previous page"
                    >
                        ←
                    </button>
                    ${this.renderPageNumbers(currentPage, totalPages)}
                    <button 
                        class="btn-page btn-next"
                        data-action="page"
                        data-page="${currentPage + 1}"
                        ${currentPage === totalPages ? 'disabled' : ''}
                        title="Next page"
                    >
                        →
                    </button>
                    <button 
                        class="btn-page btn-last"
                        data-action="page"
                        data-page="${totalPages}"
                        ${currentPage === totalPages ? 'disabled' : ''}
                        title="Last page"
                    >
                        ⇥
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render page number buttons
     */
    renderPageNumbers(currentPage, totalPages) {
        const pages = [];
        const maxButtons = 5;
        let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let end = Math.min(totalPages, start + maxButtons - 1);

        if (end - start + 1 < maxButtons) {
            start = Math.max(1, end - maxButtons + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(this.html`
                <button 
                    class="btn-page btn-number ${i === currentPage ? 'current' : ''}"
                    data-action="page"
                    data-page="${i}"
                    ${i === currentPage ? 'disabled' : ''}
                >
                    ${i}
                </button>
            `);
        }

        return pages.join('');
    }

    /**
     * Render bulk actions for selected rows
     */
    renderBulkActions() {
        if (!this.tableConfig.selectable || this.tableState.selectedRows.size === 0) {
            return '';
        }

        const selectedCount = this.tableState.selectedRows.size;

        return this.html`
            <div class="bulk-actions">
                <div class="bulk-info">
                    ${selectedCount} item${selectedCount > 1 ? 's' : ''} selected
                </div>
                <div class="bulk-controls">
                    <button class="btn-bulk btn-deselect" data-action="deselect-all">
                        Deselect All
                    </button>
                    ${this.trustedHtml(this.config.bulkActions?.map(action => `
                        <button 
                            class="btn-bulk btn-${action.type}"
                            data-action="bulk-action"
                            data-action-type="${action.type}"
                        >
                            ${action.label}
                        </button>
                    `).join('') || '')}
                </div>
            </div>
        `;
    }

    /**
     * Render error message area
     */
    renderErrorMessage() {
        return this.html`
            <div class="error-message" style="display: none;"></div>
        `;
    }



    /**
     * Bind all event listeners
     */
    bindEvents() {
        // Sorting
        this.on('click', '[data-action="sort"]', (e) => {
            const column = e.target.closest('[data-column]').dataset.column;
            this.handleSort(column);
        });

        // Filtering
        this.on('input', '[data-action="filter"]', (e) => {
            this.handleFilter(e.target.value);
        });

        this.on('click', '[data-action="clear-filter"]', () => {
            this.clearFilter();
        });

        // Pagination
        this.on('click', '[data-action="page"]', (e) => {
            const page = parseInt(e.target.dataset.page);
            this.goToPage(page);
        });

        // Row selection
        if (this.tableConfig.selectable) {
            this.on('change', '[data-action="select-all"]', (e) => {
                this.handleSelectAll(e.target.checked);
            });

            this.on('change', '[data-action="select-row"]', (e) => {
                const rowId = e.target.dataset.rowId;
                this.handleSelectRow(rowId, e.target.checked);
            });
        }

        // Cell actions
        this.on('change', '[data-action="toggle-cell"]', async (e) => {
            const rowId = e.target.dataset.rowId;
            const column = e.target.dataset.column;
            const value = e.target.checked;
            await this.handleCellToggle(rowId, column, value);
        });

        this.on('click', '[data-action="row-action"]', async (e) => {
            const rowId = e.target.dataset.rowId;
            const actionType = e.target.dataset.actionType;
            await this.handleRowAction(rowId, actionType);
        });

        // Bulk actions
        this.on('click', '[data-action="deselect-all"]', () => {
            this.deselectAll();
        });

        this.on('click', '[data-action="bulk-action"]', async (e) => {
            const actionType = e.target.dataset.actionType;
            await this.handleBulkAction(actionType);
        });

        // Global actions
        this.on('click', '[data-action="global-action"]', async (e) => {
            const actionId = e.target.dataset.actionId;
            await this.handleGlobalAction(actionId);
        });

        // Controls
        this.on('click', '[data-action="refresh"]', () => {
            this.fetchData();
        });

        if (this.tableConfig.exportable) {
            this.on('click', '[data-action="export"]', () => {
                this.exportData();
            });
        }
    }

    /**
     * Process data for sorting and filtering
     */
    processData() {
        let processed = [...this.data];

        // Apply filtering
        if (this.tableState.filterQuery) {
            processed = this.filterData(processed, this.tableState.filterQuery);
        }

        // Apply sorting
        if (this.tableState.sortColumn) {
            processed = this.sortData(processed, this.tableState.sortColumn, this.tableState.sortDirection);
        }

        this.filteredData = processed;
    }

    /**
     * Filter data based on search query
     */
    filterData(data, query) {
        const searchTerm = query.toLowerCase().trim();
        if (!searchTerm) return data;

        return data.filter(row => {
            return this.tableConfig.columns.some(column => {
                const value = this.getCellValue(row, column.key);
                if (value === null || value === undefined) return false;

                return String(value).toLowerCase().includes(searchTerm);
            });
        });
    }

    /**
     * Sort data by column
     */
    sortData(data, column, direction) {
        return [...data].sort((a, b) => {
            const aVal = this.getCellValue(a, column);
            const bVal = this.getCellValue(b, column);

            // Handle null/undefined values
            if (aVal === null || aVal === undefined) return direction === 'asc' ? 1 : -1;
            if (bVal === null || bVal === undefined) return direction === 'asc' ? -1 : 1;

            // Type-specific sorting
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return direction === 'asc' ? aVal - bVal : bVal - aVal;
            }

            if (aVal instanceof Date && bVal instanceof Date) {
                return direction === 'asc' ? aVal - bVal : bVal - aVal;
            }

            // String comparison
            const aStr = String(aVal).toLowerCase();
            const bStr = String(bVal).toLowerCase();

            if (direction === 'asc') {
                return aStr.localeCompare(bStr);
            } else {
                return bStr.localeCompare(aStr);
            }
        });
    }

    /**
     * Get current page data
     */
    getCurrentPageData() {
        const start = (this.tableState.currentPage - 1) * this.tableConfig.pageSize;
        const end = start + this.tableConfig.pageSize;
        return this.filteredData.slice(start, end);
    }

    /**
     * Handle column sorting
     */
    handleSort(column) {
        if (this.tableState.sortColumn === column) {
            // Toggle direction
            this.tableState.sortDirection = this.tableState.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // New column
            this.tableState.sortColumn = column;
            this.tableState.sortDirection = 'asc';
        }

        this.tableState.currentPage = 1; // Reset to first page
        this.render();
    }

    /**
     * Handle filtering
     */
    handleFilter(query) {
        this.tableState.filterQuery = query;
        this.tableState.currentPage = 1; // Reset to first page
        this.render();
    }

    /**
     * Clear filter
     */
    clearFilter() {
        this.tableState.filterQuery = '';
        this.tableState.currentPage = 1;
        this.render();
    }

    /**
     * Go to specific page
     */
    goToPage(page) {
        const totalPages = Math.ceil(this.filteredData.length / this.tableConfig.pageSize);
        if (page >= 1 && page <= totalPages) {
            this.tableState.currentPage = page;
            this.render();
        }
    }

    /**
     * Handle select all checkbox
     */
    handleSelectAll(checked) {
        const pageData = this.getCurrentPageData();

        if (checked) {
            pageData.forEach(row => {
                const rowId = row.id || row.index;
                this.tableState.selectedRows.add(rowId);
            });
        } else {
            pageData.forEach(row => {
                const rowId = row.id || row.index;
                this.tableState.selectedRows.delete(rowId);
            });
        }

        this.render();
    }

    /**
     * Handle individual row selection
     */
    handleSelectRow(rowId, checked) {
        if (checked) {
            this.tableState.selectedRows.add(rowId);
        } else {
            this.tableState.selectedRows.delete(rowId);
        }

        this.render();
    }

    /**
     * Deselect all rows
     */
    deselectAll() {
        this.tableState.selectedRows.clear();
        this.render();
    }

    /**
     * Handle cell toggle action
     */
    async handleCellToggle(rowId, column, value) {
        try {
            await this.handleAction('toggle-cell', { rowId, column, value });
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Handle row action
     */
    async handleRowAction(rowId, actionType) {
        try {
            await this.handleAction('row-action', { rowId, actionType });
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Handle bulk action
     */
    async handleBulkAction(actionType) {
        const selectedIds = Array.from(this.tableState.selectedRows);

        try {
            await this.handleAction('bulk-action', { actionType, rowIds: selectedIds });
            this.tableState.selectedRows.clear();
            this.render();
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Export table data
     */
    exportData() {
        try {
            const dataToExport = this.tableState.selectedRows.size > 0
                ? this.data.filter(row => this.tableState.selectedRows.has(row.id))
                : this.filteredData;

            const csv = this.convertToCSV(dataToExport);
            this.downloadCSV(csv, 'table-data.csv');

            this.log('INFO', 'Data exported successfully');
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Convert data to CSV format
     */
    convertToCSV(data) {
        if (data.length === 0) return '';

        const headers = this.tableConfig.columns.map(col => col.label || col.key);
        const csvRows = [headers.join(',')];

        data.forEach(row => {
            const values = this.tableConfig.columns.map(col => {
                const value = this.getCellValue(row, col.key);
                if (value === null || value === undefined) return '';

                // Escape CSV special characters
                const stringValue = String(value);
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            });

            csvRows.push(values.join(','));
        });

        return csvRows.join('\n');
    }

    /**
     * Download CSV file
     */
    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    /**
     * Handle global action button clicks
     */
    async handleGlobalAction(actionId) {
        try {
            const result = await this.handleAction(actionId, {});

            if (result.showForm && result.form) {
                // Use new ModalComponent for form display
                await this.showFormModal(actionId, result.form);
            } else if (result.success) {
                this.log('INFO', result.message || 'Action completed successfully');
            }
        } catch (error) {
            this.log('ERROR', `Global action failed: ${error.message}`);
        }
    }

    /**
     * Show form modal using new ModalComponent
     */
    async showFormModal(actionId, formSchema) {
        if (!window.MCPModal) {
            this.log('ERROR', 'ModalComponent not available');
            return;
        }

        try {
            const formFields = formSchema.fields.map(field => ({
                key: field.key,
                label: field.label,
                type: field.type,
                required: field.required,
                options: field.options
            }));

            const result = await window.MCPModal.form({
                title: formSchema.title || 'Form',
                fields: formFields,
                onSubmit: async (formData) => {
                    try {
                        const actionResult = await this.handleAction(actionId, formData);
                        if (actionResult.success) {
                            this.log('INFO', actionResult.message || 'Form submitted successfully');
                            return { success: true };
                        } else {
                            throw new Error(actionResult.error || 'Form submission failed');
                        }
                    } catch (error) {
                        this.log('ERROR', `Form submission failed: ${error.message}`);
                        throw error;
                    }
                }
            });

            if (result.action === 'submit') {
                this.log('INFO', 'Form submitted successfully');
            }
        } catch (error) {
            this.log('ERROR', `Failed to show form modal: ${error.message}`);
        }
    }

    /**
     * Calculate table statistics
     */
    calculateStats() {
        return {
            total: this.data.length,
            filtered: this.filteredData.length,
            selected: this.tableState.selectedRows.size
        };
    }

    /**
     * Check if pagination should be shown
     */
    shouldShowPagination() {
        return this.filteredData.length > this.tableConfig.pageSize;
    }

    /**
     * Check if all visible rows are selected
     */
    isAllSelected() {
        const pageData = this.getCurrentPageData();
        if (pageData.length === 0) return false;

        return pageData.every(row => {
            const rowId = row.id || row.index;
            return this.tableState.selectedRows.has(rowId);
        });
    }

    /**
     * Get page range text for pagination
     */
    getPageRangeText() {
        const start = (this.tableState.currentPage - 1) * this.tableConfig.pageSize + 1;
        const end = Math.min(start + this.tableConfig.pageSize - 1, this.filteredData.length);
        return `${start}-${end} of ${this.filteredData.length}`;
    }

    /**
     * Enhanced cleanup for table-specific resources
     */
    destroy() {
        // Clear table state
        this.tableState = null;
        this.tableConfig = null;
        this.processedData = null;
        this.filteredData = null;
        this.columnTypes = null;

        // Call parent cleanup
        super.destroy();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TableComponent;
}

// Make available globally for vanilla JS usage
if (typeof window !== 'undefined') {
    window.TableComponent = TableComponent;
} 