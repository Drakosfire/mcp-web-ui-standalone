/**
 * StatsComponent - Simple Statistics Display Implementation
 * 
 * This component provides a clean statistics interface with:
 * - Automatic metric calculation and formatting
 * - Real-time updates with smooth animations
 * - Responsive card-based layout
 * - Trend indicators and comparisons
 * - Customizable metric displays
 * - Mobile-friendly responsive design
 * 
 * SECURITY FEATURES:
 * - All data is sanitized through BaseComponent
 * - XSS protection for all displayed values
 * - Safe numeric formatting and display
 * - Input validation for custom metrics
 * 
 * AI INTEGRATION READY:
 * - Handles dynamic metrics from LLM sources
 * - Flexible configuration for any type of statistics
 * - Clear error handling for invalid data
 * - Extensive logging for debugging
 * 
 * Usage:
 * const stats = new StatsComponent(element, data, config);
 * 
 * Data format:
 * {
 *   total: 150,
 *   completed: 75,
 *   pending: 75,
 *   high_priority: 10
 * }
 * 
 * Config options:
 * - metrics: Array of metric definitions
 * - showTrends: Show trend indicators (default: false)
 * - animate: Enable animations (default: true)
 * - layout: 'grid' or 'horizontal' (default: 'grid')
 */
class StatsComponent extends BaseComponent {
    /**
     * Initialize StatsComponent with stats-specific state
     * @param {HTMLElement} element - DOM element to attach to
     * @param {Object} data - Initial statistics data
     * @param {Object} config - Configuration options
     */
    constructor(element, data, config) {
        super(element, data, config);

        // Stats-specific configuration
        this.statsConfig = {
            metrics: [],
            showTrends: false,
            animate: true,
            layout: 'grid', // 'grid' or 'horizontal'
            defaultMetrics: [
                { key: 'total', label: 'Total', icon: '📊', color: 'blue' },
                { key: 'completed', label: 'Completed', icon: '✅', color: 'green' },
                { key: 'pending', label: 'Pending', icon: '⏳', color: 'yellow' },
                { key: 'high_priority', label: 'High Priority', icon: '🔴', color: 'red' }
            ],
            ...config.stats
        };

        // Previous data for trend calculation
        this.previousData = {};

        // Animation state
        this.animationEnabled = this.statsConfig.animate;

        this.log('INFO', 'StatsComponent initialized');
    }

    /**
     * Render the complete statistics interface
     */
    render() {
        if (this.isDestroyed) return;

        const metrics = this.getMetricsToDisplay();

        this.element.innerHTML = this.html`
            <div class="component component-stats">
                ${this.renderHeader()}
                ${this.renderStatsGrid(metrics)}
                ${this.renderErrorMessage()}
            </div>
        `;

        // Apply animations if enabled
        if (this.animationEnabled) {
            this.animateStatCards();
        }
    }

    /**
     * Render component header
     */
    renderHeader() {
        return this.html`
            <div class="stats-header">
                <h2>${this.config.title || 'Statistics'}</h2>
                <div class="stats-refresh">
                    <button class="btn-refresh-stats" data-action="refresh" title="Refresh statistics">
                        ↻
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render the statistics grid
     * @param {Array} metrics - Metrics to display
     */
    renderStatsGrid(metrics) {
        const gridClass = this.statsConfig.layout === 'horizontal' ? 'stats-horizontal' : 'stats-grid';

        return this.html`
            <div class="${gridClass}">
                ${metrics.map(metric => this.renderStatCard(metric))}
            </div>
        `;
    }

    /**
     * Render a single statistic card
     * @param {Object} metric - Metric definition
     */
    renderStatCard(metric) {
        const value = this.getMetricValue(metric);
        const formattedValue = this.formatValue(value, metric);
        const trend = this.statsConfig.showTrends ? this.calculateTrend(metric.key, value) : null;

        return this.html`
            <div class="stat-card stat-${metric.color || 'default'}" data-metric="${metric.key}">
                <div class="stat-card-content">
                    <div class="stat-icon">
                        ${metric.icon || '📈'}
                    </div>
                    <div class="stat-details">
                        <div class="stat-value" data-value="${value}">
                            ${formattedValue}
                        </div>
                        <div class="stat-label">
                            ${metric.label || this.formatLabel(metric.key)}
                        </div>
                        ${trend ? this.renderTrend(trend) : ''}
                    </div>
                </div>
                ${metric.description ? this.html`
                    <div class="stat-description">
                        ${metric.description}
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render trend indicator
     * @param {Object} trend - Trend data
     */
    renderTrend(trend) {
        if (!trend || trend.change === 0) return '';

        const isPositive = trend.change > 0;
        const isNegative = trend.change < 0;
        const trendClass = isPositive ? 'trend-up' : isNegative ? 'trend-down' : 'trend-neutral';
        const trendIcon = isPositive ? '↗' : isNegative ? '↘' : '→';

        return this.html`
            <div class="stat-trend ${trendClass}">
                <span class="trend-icon">${trendIcon}</span>
                <span class="trend-value">${Math.abs(trend.change)}</span>
                <span class="trend-label">${trend.label}</span>
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
     * Bind event listeners
     */
    bindEvents() {
        // Refresh button
        this.on('click', '[data-action="refresh"]', () => {
            this.fetchData();
        });

        // Card click for details (if configured)
        this.on('click', '.stat-card', (e) => {
            const metricKey = e.target.closest('.stat-card').dataset.metric;
            this.handleStatCardClick(metricKey);
        });
    }

    /**
     * Handle stat card click
     * @param {string} metricKey - Metric key that was clicked
     */
    handleStatCardClick(metricKey) {
        // Emit event for external handling
        if (this.config.onStatClick) {
            try {
                this.config.onStatClick(metricKey, this.getMetricValue({ key: metricKey }));
            } catch (error) {
                this.log('ERROR', `Stat click handler error: ${error.message}`);
            }
        }

        this.log('INFO', `Stat card clicked: ${metricKey}`);
    }

    /**
     * Get metrics to display (use configured or default)
     */
    getMetricsToDisplay() {
        if (this.statsConfig.metrics && this.statsConfig.metrics.length > 0) {
            return this.statsConfig.metrics;
        }

        // Filter default metrics based on available data
        return this.statsConfig.defaultMetrics.filter(metric => {
            const value = this.getMetricValue(metric);
            return value !== undefined && value !== null;
        });
    }

    /**
     * Get value for a metric
     * @param {Object} metric - Metric definition
     * @returns {any} Metric value
     */
    getMetricValue(metric) {
        if (!metric || !metric.key) return 0;

        // Support nested keys (e.g., 'stats.completed')
        if (metric.key.includes('.')) {
            return metric.key.split('.').reduce((obj, key) => obj?.[key], this.data);
        }

        return this.data?.[metric.key] ?? 0;
    }

    /**
     * Format value for display
     * @param {any} value - Value to format
     * @param {Object} metric - Metric definition
     * @returns {string} Formatted value
     */
    formatValue(value, metric) {
        if (value === null || value === undefined) {
            return '—';
        }

        // Use custom formatter if provided
        if (metric.formatter && typeof metric.formatter === 'function') {
            try {
                return metric.formatter(value);
            } catch (error) {
                this.log('ERROR', `Custom formatter error for ${metric.key}: ${error.message}`);
                return String(value);
            }
        }

        // Auto-detect formatting based on value type
        if (typeof value === 'number') {
            // Large numbers get comma formatting
            if (value >= 1000) {
                return value.toLocaleString();
            }

            // Percentages
            if (metric.type === 'percentage') {
                return `${value}%`;
            }

            // Currency
            if (metric.type === 'currency') {
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: metric.currency || 'USD'
                }).format(value);
            }

            return String(value);
        }

        // String values
        return this.sanitize(String(value));
    }

    /**
     * Format metric label for display
     * @param {string} key - Metric key
     * @returns {string} Formatted label
     */
    formatLabel(key) {
        return key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
    }

    /**
     * Calculate trend compared to previous data
     * @param {string} key - Metric key
     * @param {number} currentValue - Current value
     * @returns {Object|null} Trend data
     */
    calculateTrend(key, currentValue) {
        if (!this.previousData || typeof currentValue !== 'number') {
            return null;
        }

        const previousValue = this.previousData[key];
        if (typeof previousValue !== 'number') {
            return null;
        }

        const change = currentValue - previousValue;

        if (change === 0) {
            return { change: 0, label: 'no change' };
        }

        const percentChange = previousValue !== 0
            ? Math.round((change / previousValue) * 100)
            : 100;

        return {
            change: change,
            percent: percentChange,
            label: change > 0 ? 'increase' : 'decrease'
        };
    }

    /**
     * Animate stat cards on render
     */
    animateStatCards() {
        const cards = this.element.querySelectorAll('.stat-card');

        cards.forEach((card, index) => {
            // Stagger animations
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';

            setTimeout(() => {
                card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });

        // Animate values counting up
        this.animateValues();
    }

    /**
     * Animate numeric values counting up
     */
    animateValues() {
        const valueElements = this.element.querySelectorAll('.stat-value[data-value]');

        valueElements.forEach(element => {
            const targetValue = parseInt(element.dataset.value) || 0;
            if (targetValue === 0) return;

            let currentValue = 0;
            const increment = Math.ceil(targetValue / 20); // 20 steps
            const duration = 1000; // 1 second
            const stepTime = duration / 20;

            const animate = () => {
                currentValue += increment;
                if (currentValue >= targetValue) {
                    currentValue = targetValue;
                    element.textContent = this.formatValue(currentValue, {});
                    return;
                }

                element.textContent = this.formatValue(currentValue, {});
                setTimeout(animate, stepTime);
            };

            setTimeout(animate, 200); // Delay start
        });
    }

    /**
     * Update with new data and store previous for trends
     * @param {Object} newData - New statistics data
     */
    update(newData) {
        // Store previous data for trend calculation
        this.previousData = { ...this.data };

        // Call parent update
        super.update(newData);
    }

    /**
     * Get component statistics (meta-statistics)
     */
    getComponentStats() {
        const metrics = this.getMetricsToDisplay();
        return {
            totalMetrics: metrics.length,
            hasData: Object.keys(this.data || {}).length > 0,
            animationsEnabled: this.animationEnabled,
            layout: this.statsConfig.layout
        };
    }

    /**
     * Enhanced cleanup for stats-specific resources
     */
    destroy() {
        // Clear animation timers
        const cards = this.element?.querySelectorAll('.stat-card');
        cards?.forEach(card => {
            card.style.transition = 'none';
        });

        // Clear previous data
        this.previousData = null;
        this.statsConfig = null;

        // Call parent cleanup
        super.destroy();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatsComponent;
}

// Make available globally for vanilla JS usage
if (typeof window !== 'undefined') {
    window.StatsComponent = StatsComponent;
} 