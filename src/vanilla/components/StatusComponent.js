/**
 * StatusComponent - Generic status display component
 * 
 * This component handles status badges, progress indicators, and state visualization.
 * It's designed to be highly customizable and reusable across different MCP servers
 * that need to display various status information.
 * 
 * Features:
 * - Customizable status mappings and styles
 * - Progress indicators with animation
 * - Icon support for enhanced visual feedback
 * - Built-in accessibility support
 * - Multiple display modes (badge, pill, block)
 * - Color-coded status categories
 * - Tooltip support for detailed descriptions
 * 
 * Usage Example:
 * const status = new StatusComponent(element, {
 *   status: 'active',
 *   progress: 75,
 *   description: 'Task is currently running'
 * }, {
 *   status: {
 *     showIcon: true,
 *     showProgress: true,
 *     mode: 'badge',
 *     statusMap: {
 *       'custom': { class: 'status-custom', icon: '⭐', label: 'Custom Status' }
 *     }
 *   }
 * });
 */
class StatusComponent extends BaseComponent {
    /**
     * Constructor for StatusComponent
     * @param {HTMLElement} element - The DOM element to attach this component to
     * @param {Object|string} data - Status data (can be object with status/progress or simple string)
     * @param {Object} config - Configuration object
     */
    constructor(element, data = {}, config = {}) {
        // Component-specific configuration with sensible defaults
        const componentConfig = {
            showIcon: true,
            showProgress: false,
            showDescription: true,
            mode: 'badge', // 'badge' | 'pill' | 'block' | 'minimal'
            size: 'medium', // 'small' | 'medium' | 'large'
            animated: true,
            clickable: false,
            statusMap: {}, // Custom status mappings override defaults
            progressConfig: {
                showPercentage: true,
                animated: true,
                height: '4px',
                showStripes: false
            },
            accessibility: {
                includeAriaLabel: true,
                includeLiveRegion: false
            },
            ...config.status
        };

        super(element, data, config);
        this.componentConfig = componentConfig;
        this.progressAnimationFrame = null;

        // Initialize component after configuration is set up
        this.init();
    }

    /**
     * Render the status component
     * This creates the complete status display with optional progress
     */
    render() {
        if (this.isDestroyed) return;

        try {
            // Normalize data to object format
            const statusData = this.normalizeStatusData(this.data);

            this.element.innerHTML = this.html`
                <div class="component component-status mode-${this.componentConfig.mode} size-${this.componentConfig.size}">
                    ${this.trustedHtml(this.renderStatus(statusData))}
                    ${this.componentConfig.showProgress && statusData.progress !== undefined ?
                    this.trustedHtml(this.renderProgress(statusData)) : ''}
                    ${this.componentConfig.showDescription && statusData.description ?
                    this.trustedHtml(this.renderDescription(statusData)) : ''}
                </div>
            `;

            // Animate progress if enabled
            if (this.componentConfig.showProgress && this.componentConfig.progressConfig.animated) {
                this.animateProgress();
            }

        } catch (error) {
            this.log('ERROR', `Failed to render status: ${error.message}`);
            this.element.innerHTML = this.html`
                <div class="component component-status">
                    <span class="status-badge status-error">
                        ${this.componentConfig.showIcon ? '❌' : ''} Error
                    </span>
                </div>
            `;
        }
    }

    /**
     * Normalize input data to consistent object format
     * @param {Object|string} data - Raw input data
     * @returns {Object} Normalized status data
     */
    normalizeStatusData(data) {
        // Handle string input
        if (typeof data === 'string') {
            return { status: data };
        }

        // Handle object input
        if (data && typeof data === 'object') {
            return {
                status: data.status || 'unknown',
                progress: data.progress,
                description: data.description,
                timestamp: data.timestamp,
                metadata: data.metadata
            };
        }

        // Fallback for invalid input
        return { status: 'unknown' };
    }

    /**
     * Render the main status badge
     * @param {Object} statusData - Normalized status data
     * @returns {string} HTML string for status badge
     */
    renderStatus(statusData) {
        const config = this.getStatusConfig(statusData.status);
        const isClickable = this.componentConfig.clickable;

        const ariaLabel = this.componentConfig.accessibility.includeAriaLabel ?
            `aria-label="${config.description || config.label}"` : '';

        const role = isClickable ? 'role="button" tabindex="0"' : '';

        return `
            <span class="status-badge ${config.class} ${isClickable ? 'status-clickable' : ''}" 
                  title="${config.description || config.label}"
                  data-status="${statusData.status}"
                  ${ariaLabel}
                  ${role}>
                ${this.componentConfig.showIcon && config.icon ?
                `<span class="status-icon">${config.icon}</span>` : ''}
                <span class="status-label">${config.label}</span>
                ${statusData.timestamp ?
                `<span class="status-timestamp">${this.formatTimestamp(statusData.timestamp)}</span>` : ''}
            </span>
        `;
    }

    /**
     * Get configuration for a specific status
     * @param {string} status - Status value
     * @returns {Object} Status configuration object
     */
    getStatusConfig(status) {
        // Check for custom status mappings first
        if (this.componentConfig.statusMap[status]) {
            return {
                ...this.getDefaultStatusConfig(status),
                ...this.componentConfig.statusMap[status]
            };
        }

        return this.getDefaultStatusConfig(status);
    }

    /**
     * Get default status configuration
     * @param {string} status - Status value
     * @returns {Object} Default status configuration
     */
    getDefaultStatusConfig(status) {
        const defaults = {
            'active': {
                class: 'status-active',
                icon: '✅',
                label: 'Active',
                description: 'Currently active and running'
            },
            'inactive': {
                class: 'status-inactive',
                icon: '⏸️',
                label: 'Inactive',
                description: 'Currently inactive or paused'
            },
            'pending': {
                class: 'status-pending',
                icon: '⏳',
                label: 'Pending',
                description: 'Waiting to be processed'
            },
            'running': {
                class: 'status-running',
                icon: '🏃',
                label: 'Running',
                description: 'Currently executing'
            },
            'completed': {
                class: 'status-completed',
                icon: '✅',
                label: 'Completed',
                description: 'Successfully completed'
            },
            'failed': {
                class: 'status-failed',
                icon: '❌',
                label: 'Failed',
                description: 'Execution failed'
            },
            'cancelled': {
                class: 'status-cancelled',
                icon: '🚫',
                label: 'Cancelled',
                description: 'Operation was cancelled'
            },
            'scheduled': {
                class: 'status-scheduled',
                icon: '📅',
                label: 'Scheduled',
                description: 'Scheduled for future execution'
            },
            'paused': {
                class: 'status-paused',
                icon: '⏸️',
                label: 'Paused',
                description: 'Temporarily paused'
            }
        };

        return defaults[status] || {
            class: 'status-unknown',
            icon: '❓',
            label: this.sanitize(String(status)),
            description: `Status: ${this.sanitize(String(status))}`
        };
    }

    /**
     * Render progress indicator
     * @param {Object} statusData - Status data with progress
     * @returns {string} HTML string for progress indicator
     */
    renderProgress(statusData) {
        const progress = this.sanitizeProgress(statusData.progress);
        const config = this.componentConfig.progressConfig;

        return `
            <div class="status-progress" style="height: ${config.height}">
                <div class="progress-track ${config.showStripes ? 'progress-striped' : ''}">
                    <div class="progress-fill" 
                         data-progress="${progress}"
                         style="width: 0%"
                         role="progressbar"
                         aria-valuenow="${progress}"
                         aria-valuemin="0"
                         aria-valuemax="100">
                    </div>
                </div>
                ${config.showPercentage ?
                `<span class="progress-percentage">${progress}%</span>` : ''}
            </div>
        `;
    }

    /**
     * Sanitize progress value
     * @param {any} progress - Raw progress value
     * @returns {number} Sanitized progress (0-100)
     */
    sanitizeProgress(progress) {
        const num = parseFloat(progress);
        if (isNaN(num)) return 0;
        return Math.max(0, Math.min(100, Math.round(num)));
    }

    /**
     * Render description text
     * @param {Object} statusData - Status data with description
     * @returns {string} HTML string for description
     */
    renderDescription(statusData) {
        return `
            <div class="status-description">
                ${statusData.description}
            </div>
        `;
    }

    /**
     * Format timestamp for display
     * @param {string|number|Date} timestamp - Raw timestamp
     * @returns {string} Formatted timestamp
     */
    formatTimestamp(timestamp) {
        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return '';

            // Show relative time for recent timestamps
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / (1000 * 60));

            if (diffMins < 1) return 'just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;

            // Fallback to formatted date
            return date.toLocaleDateString();
        } catch (error) {
            return '';
        }
    }

    /**
     * Animate progress bar to target value
     */
    animateProgress() {
        const progressFill = this.element.querySelector('.progress-fill');
        if (!progressFill) return;

        const targetProgress = parseFloat(progressFill.dataset.progress || 0);
        const startTime = performance.now();
        const duration = 800; // Animation duration in ms

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Use easing for smooth animation
            const easedProgress = this.easeOutQuart(progress);
            const currentWidth = targetProgress * easedProgress;

            progressFill.style.width = `${currentWidth}%`;

            if (progress < 1) {
                this.progressAnimationFrame = requestAnimationFrame(animate);
            }
        };

        this.progressAnimationFrame = requestAnimationFrame(animate);
    }

    /**
     * Easing function for progress animation
     * @param {number} t - Progress (0 to 1)
     * @returns {number} Eased progress
     */
    easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }

    /**
     * Bind component-specific events
     */
    bindEvents() {
        super.bindEvents();

        // Handle clickable status badges
        if (this.componentConfig.clickable) {
            this.on('click', '.status-clickable', (e) => {
                this.handleStatusClick(e);
            });

            this.on('keydown', '.status-clickable', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleStatusClick(e);
                }
            });
        }
    }

    /**
     * Handle status badge click
     * @param {Event} e - Click event
     */
    handleStatusClick(e) {
        const statusBadge = e.currentTarget;
        const status = statusBadge.dataset.status;

        // Emit custom event for parent components to handle
        const customEvent = new CustomEvent('statusClick', {
            detail: { status, element: statusBadge },
            bubbles: true
        });

        this.element.dispatchEvent(customEvent);
    }

    /**
     * Update component with new data
     * @param {Object|string} newData - New status data
     */
    update(newData) {
        // Cancel any running animations
        if (this.progressAnimationFrame) {
            cancelAnimationFrame(this.progressAnimationFrame);
            this.progressAnimationFrame = null;
        }

        super.update(newData);
    }

    /**
     * Clean up resources when component is destroyed
     */
    destroy() {
        // Cancel any running animations
        if (this.progressAnimationFrame) {
            cancelAnimationFrame(this.progressAnimationFrame);
            this.progressAnimationFrame = null;
        }

        super.destroy();
    }
}

// Make the component available globally for tests and framework
if (typeof global !== 'undefined') {
    global.StatusComponent = StatusComponent;
} else if (typeof window !== 'undefined') {
    window.StatusComponent = StatusComponent;
}