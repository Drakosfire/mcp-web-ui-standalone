/**
 * Mock BaseComponent for testing
 * Provides minimal implementation of BaseComponent functionality
 */

class MockBaseComponent {
    constructor(element, data = [], config = {}) {
        this.element = element;
        this.data = data;
        this.config = {
            sessionToken: '',
            pollInterval: 2000,
            apiBase: '/api',
            security: {
                sanitizeInput: true,
                validateEvents: true,
                enableRateLimit: true,
                maxInputLength: 1000
            },
            ...config
        };

        this.listeners = new Map();
        this.isDestroyed = false;
        this.escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;',
            '`': '&#x60;',
            '=': '&#x3D;'
        };

        // Note: init() should be called manually after component setup
        // this.init();
    }

    // Core template function with XSS protection
    html(strings, ...values) {
        const sanitizedValues = values.map(value => {
            if (value === null || value === undefined) {
                return '';
            }

            if (typeof value === 'boolean' || typeof value === 'number') {
                return String(value);
            }

            if (Array.isArray(value)) {
                return value.join('');
            }

            if (typeof value === 'string' && value.startsWith('__HTML__:')) {
                return value.substring(9);
            }

            return this.sanitize(String(value));
        });

        return strings.reduce((result, string, i) => {
            return result + string + (sanitizedValues[i] || '');
        }, '');
    }

    // Mark content as trusted HTML
    trustedHtml(htmlContent) {
        return '__HTML__:' + htmlContent;
    }

    // XSS Protection: Sanitize user input
    sanitize(value) {
        if (typeof value !== 'string') {
            return value;
        }

        return value.replace(/[&<>"'`=\/]/g, (char) => {
            return this.escapeMap[char] || char;
        });
    }

    // Event handling
    on(event, selector, handler) {
        const eventKey = `${event}:${selector}`;
        if (!this.listeners.has(eventKey)) {
            this.listeners.set(eventKey, []);
        }
        this.listeners.get(eventKey).push(handler);

        // Add actual event listener to element
        if (this.element) {
            this.element.addEventListener(event, (e) => {
                if (selector === '*' || e.target.matches(selector)) {
                    handler(e);
                }
            });
        }
    }

    // Update component data
    update(newData) {
        this.data = newData;
        this.render();
    }

    // Logging
    log(level, message) {
        console[level.toLowerCase()](message);
    }

    // Component lifecycle
    init() {
        this.render();
        this.bindEvents();
    }

    render() {
        // Override in subclasses
    }

    bindEvents() {
        // Override in subclasses
    }

    destroy() {
        this.isDestroyed = true;
        this.listeners.clear();
        if (this.element) {
            this.element.innerHTML = '';
        }
    }
}

// Export for use in tests
global.BaseComponent = MockBaseComponent;
module.exports = MockBaseComponent; 