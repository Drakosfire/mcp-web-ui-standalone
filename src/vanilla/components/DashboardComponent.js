/**
 * DashboardComponent - Reusable dashboard component for displaying metrics and stats
 * 
 * This component provides a flexible dashboard layout for displaying various metrics,
 * statistics, and KPIs. It supports multiple layout options and is designed to be
 * reusable across different MCP servers that need overview panels.
 * 
 * Features:
 * - Grid, horizontal, and vertical layouts
 * - Animated counters for numeric values
 * - Icon support for visual enhancement
 * - Trend indicators (up, down, neutral)
 * - Responsive design with mobile optimization
 * - Built-in XSS protection and CSP compliance
 * 
 * Usage Example:
 * const dashboard = new DashboardComponent(element, [
 *   { key: 'total', label: 'Total Tasks', value: 42, icon: '📋', trend: 'up' },
 *   { key: 'active', label: 'Active', value: 12, icon: '▶️', trend: 'neutral' }
 * ], {
 *   dashboard: {
 *     layout: 'grid',
 *     columns: 4,
 *     showIcons: true,
 *     animateCounters: true
 *   }
 * });
 */
class DashboardComponent extends BaseComponent {
    /**
     * Constructor for DashboardComponent
     * @param {HTMLElement} element - The DOM element to attach this component to
     * @param {Array} data - Array of metric objects
     * @param {Object} config - Configuration object
     */
    constructor(element, data = [], config = {}) {
        // Component-specific configuration with sensible defaults
        const componentConfig = {
            layout: 'grid', // 'grid' | 'horizontal' | 'vertical'
            columns: 4,
            showIcons: true,
            animateCounters: true,
            enableHover: true,
            responsiveBreakpoint: 768,
            animation: {
                duration: 1000,
                easing: 'ease-out'
            },
            ...config.dashboard
        };

        super(element, data, config);
        this.componentConfig = componentConfig;
        this.animatedValues = new Map(); // Track animated values
        this.animationFrames = new Map(); // Track animation frames for cleanup

        // Initialize component after configuration is set up
        this.init();
    }

    /**
     * Render the dashboard component
     * This creates the complete dashboard layout with all metrics
     */
    render() {
        if (this.isDestroyed) return;

        try {
            // Ensure data is an array
            const metrics = Array.isArray(this.data) ? this.data : [];

            this.element.innerHTML = this.html`
                <div class="component component-dashboard layout-${this.componentConfig.layout}">
                    <div class="dashboard-grid" 
                         style="grid-template-columns: repeat(${this.componentConfig.columns}, 1fr)">
                        ${this.trustedHtml(metrics.map(metric => this.renderMetric(metric)).join(''))}
                    </div>
                    ${metrics.length === 0 ? this.trustedHtml(this.renderEmptyState()) : ''}
                </div>
            `;

            // Start counter animations if enabled
            if (this.componentConfig.animateCounters) {
                this.animateCounters();
            }

        } catch (error) {
            this.log('ERROR', `Failed to render dashboard: ${error.message}`);
            this.element.innerHTML = this.html`
                <div class="component component-dashboard">
                    <div class="dashboard-error">
                        <p>Error loading dashboard metrics</p>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Render a single metric card
     * @param {Object} metric - Metric data object
     * @returns {string} HTML string for the metric card
     */
    renderMetric(metric) {
        // Validate and sanitize metric data
        const safeMetric = this.validateMetric(metric);

        return `
            <div class="metric-card ${safeMetric.trend || ''} ${safeMetric.className || ''}" 
                 data-metric="${safeMetric.key}"
                 data-value="${safeMetric.value}"
                 title="${safeMetric.description || safeMetric.label}">
                ${this.componentConfig.showIcons && safeMetric.icon ?
                `<div class="metric-icon">${safeMetric.icon}</div>` : ''}
                <div class="metric-content">
                    <div class="metric-value" data-value="${safeMetric.value}">${safeMetric.displayValue || safeMetric.value}</div>
                    <div class="metric-label">${safeMetric.label}</div>
                    ${safeMetric.subtitle ? `<div class="metric-subtitle">${safeMetric.subtitle}</div>` : ''}
                    ${safeMetric.trend ? `<div class="metric-trend trend-${safeMetric.trend}">
                        ${this.getTrendIcon(safeMetric.trend)}
                    </div>` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Validate and sanitize metric data for security
     * @param {Object} metric - Raw metric data
     * @returns {Object} Sanitized metric data
     */
    validateMetric(metric) {
        if (!metric || typeof metric !== 'object') {
            return {
                key: 'unknown',
                label: 'Unknown Metric',
                value: 0,
                icon: '❓'
            };
        }

        return {
            key: this.sanitize(String(metric.key || 'unknown')),
            label: this.sanitize(String(metric.label || 'Unknown')),
            value: this.sanitizeNumericValue(metric.value),
            displayValue: metric.displayValue ? this.sanitize(String(metric.displayValue)) : null,
            icon: this.sanitizeIcon(metric.icon),
            subtitle: metric.subtitle ? this.sanitize(String(metric.subtitle)) : null,
            trend: this.sanitizeTrend(metric.trend),
            className: this.sanitizeClassName(metric.className),
            description: metric.description ? this.sanitize(String(metric.description)) : null
        };
    }

    /**
     * Sanitize numeric values for display
     * @param {any} value - Raw value
     * @returns {number|string} Sanitized numeric value
     */
    sanitizeNumericValue(value) {
        if (typeof value === 'number' && !isNaN(value)) {
            return value;
        }

        if (typeof value === 'string') {
            const parsed = parseFloat(value);
            return !isNaN(parsed) ? parsed : value;
        }

        return 0;
    }

    /**
     * Sanitize icon content to prevent XSS
     * @param {string} icon - Raw icon content
     * @returns {string} Safe icon content
     */
    sanitizeIcon(icon) {
        if (!icon || typeof icon !== 'string') {
            return '';
        }

        // Allow emoji and simple HTML entities, but nothing else
        return icon.replace(/<[^>]*>/g, '').substring(0, 10);
    }

    /**
     * Sanitize trend values
     * @param {string} trend - Raw trend value
     * @returns {string} Valid trend value or empty string
     */
    sanitizeTrend(trend) {
        const validTrends = ['up', 'down', 'neutral'];
        return validTrends.includes(trend) ? trend : '';
    }

    /**
     * Sanitize CSS class names
     * @param {string} className - Raw class name
     * @returns {string} Safe class name
     */
    sanitizeClassName(className) {
        if (!className || typeof className !== 'string') {
            return '';
        }

        // Only allow alphanumeric, hyphens, and underscores
        return className.replace(/[^a-zA-Z0-9\-_\s]/g, '').substring(0, 50);
    }

    /**
     * Get trend icon for display
     * @param {string} trend - Trend direction
     * @returns {string} Trend icon
     */
    getTrendIcon(trend) {
        const icons = {
            'up': '↗️',
            'down': '↘️',
            'neutral': '→'
        };
        return icons[trend] || '';
    }

    /**
     * Animate counter values from 0 to target value
     */
    animateCounters() {
        const metricCards = this.element.querySelectorAll('.metric-card');

        metricCards.forEach(card => {
            const valueElement = card.querySelector('.metric-value');
            const targetValue = parseFloat(card.dataset.value || 0);
            const metricKey = card.dataset.metric;

            if (!valueElement || isNaN(targetValue)) return;

            // Cancel any existing animation for this metric
            if (this.animationFrames.has(metricKey)) {
                cancelAnimationFrame(this.animationFrames.get(metricKey));
            }

            this.animateCounter(valueElement, targetValue, metricKey);
        });
    }

    /**
     * Animate a single counter from 0 to target value
     * @param {HTMLElement} element - Element to animate
     * @param {number} targetValue - Target value to animate to
     * @param {string} metricKey - Unique key for this metric
     */
    animateCounter(element, targetValue, metricKey) {
        const startTime = performance.now();
        const duration = this.componentConfig.animation.duration;
        const startValue = 0;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Use easing function for smooth animation
            const easedProgress = this.easeOutCubic(progress);
            const currentValue = startValue + (targetValue - startValue) * easedProgress;

            // Format the value appropriately
            const displayValue = this.formatAnimatedValue(currentValue, targetValue);
            element.textContent = displayValue;

            if (progress < 1) {
                const frameId = requestAnimationFrame(animate);
                this.animationFrames.set(metricKey, frameId);
            } else {
                // Animation complete
                element.textContent = this.formatAnimatedValue(targetValue, targetValue);
                this.animationFrames.delete(metricKey);
            }
        };

        const frameId = requestAnimationFrame(animate);
        this.animationFrames.set(metricKey, frameId);
    }

    /**
     * Easing function for smooth animations
     * @param {number} t - Progress (0 to 1)
     * @returns {number} Eased progress
     */
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    /**
     * Format animated value for display
     * @param {number} currentValue - Current animated value
     * @param {number} targetValue - Final target value
     * @returns {string} Formatted display value
     */
    formatAnimatedValue(currentValue, targetValue) {
        // If target is an integer, show integers during animation
        if (Number.isInteger(targetValue)) {
            return Math.round(currentValue).toString();
        }

        // Otherwise, match decimal places of target
        const decimalPlaces = (targetValue.toString().split('.')[1] || '').length;
        return currentValue.toFixed(decimalPlaces);
    }

    /**
     * Render empty state when no metrics are available
     * @returns {string} HTML for empty state
     */
    renderEmptyState() {
        return `
            <div class="dashboard-empty">
                <div class="empty-icon">📊</div>
                <p>No metrics available</p>
            </div>
        `;
    }

    /**
     * Bind component-specific events
     */
    bindEvents() {
        super.bindEvents();

        // Add hover effects if enabled
        if (this.componentConfig.enableHover) {
            this.on('mouseenter', '.metric-card', (e) => {
                e.currentTarget.classList.add('metric-hover');
            });

            this.on('mouseleave', '.metric-card', (e) => {
                e.currentTarget.classList.remove('metric-hover');
            });
        }
    }

    /**
     * Update component with new data
     * @param {Array} newData - New metrics data
     */
    update(newData) {
        // Cancel any running animations
        this.animationFrames.forEach(frameId => {
            cancelAnimationFrame(frameId);
        });
        this.animationFrames.clear();

        super.update(newData);
    }

    /**
     * Clean up resources when component is destroyed
     */
    destroy() {
        // Cancel any running animations
        this.animationFrames.forEach(frameId => {
            cancelAnimationFrame(frameId);
        });
        this.animationFrames.clear();

        super.destroy();
    }
}

// Make the component available globally for tests and framework
if (typeof global !== 'undefined') {
    global.DashboardComponent = DashboardComponent;
} else if (typeof window !== 'undefined') {
    window.DashboardComponent = DashboardComponent;
}