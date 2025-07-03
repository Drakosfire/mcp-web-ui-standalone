/**
 * ModalComponent - Modern, accessible modal system for MCP Web UI
 * 
 * Features:
 * - Renders directly in body to avoid layout constraints
 * - Focus management and keyboard navigation
 * - Body scroll locking without page jumping
 * - Multiple modal types (alert, confirm, form, custom)
 * - Promise-based API for easy async handling
 * - Consistent styling across all MCP servers
 * - Full accessibility support
 * - Modal stacking support
 * 
 * Design Philosophy:
 * - Configuration over hardcoding
 * - Composition over inheritance 
 * - Separation of concerns
 * - Progressive enhancement
 * 
 * Usage Examples:
 * 
 * // Simple alert
 * await MCPModal.alert({
 *   title: "Success",
 *   message: "Item saved successfully!"
 * });
 * 
 * // Confirmation
 * const confirmed = await MCPModal.confirm({
 *   title: "Delete Item",
 *   message: "Are you sure?",
 *   confirmText: "Delete",
 *   cancelText: "Cancel"
 * });
 * 
 * // Form modal
 * const result = await MCPModal.form({
 *   title: "Add Item",
 *   fields: [...],
 *   onSubmit: (data) => saveItem(data)
 * });
 */

/**
 * Individual Modal Class
 * Handles a single modal instance with all its functionality
 */
class Modal {
    constructor(config = {}) {
        this.id = this.generateId();
        this.config = this.validateAndMergeConfig(config);
        this.element = null;
        this.isVisible = false;
        this.isDestroyed = false;

        // Focus management
        this.focusableElements = [];
        this.previousFocus = null;
        this.firstFocusable = null;
        this.lastFocusable = null;

        // Event handlers (bound once)
        this.boundHandleKeydown = this.handleKeydown.bind(this);
        this.boundHandleOverlayClick = this.handleOverlayClick.bind(this);
        this.boundHandleClose = this.hide.bind(this);

        // Promise handling for async operations
        this.resolvePromise = null;
        this.rejectPromise = null;

        this.log('INFO', 'Modal created with ID:', this.id);
    }

    /**
     * Generate unique modal ID
     */
    generateId() {
        return 'mcp-modal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Validate and merge configuration with defaults
     */
    validateAndMergeConfig(config) {
        const defaults = {
            // Modal type and content
            type: 'custom', // 'alert', 'confirm', 'form', 'custom'
            title: '',
            message: '',
            content: '',

            // Size and layout
            size: 'medium', // 'small', 'medium', 'large', 'xlarge', 'fullscreen', 'custom'
            width: null,
            height: null,
            maxWidth: null,
            maxHeight: null,

            // Buttons and actions
            buttons: [],
            confirmText: 'OK',
            cancelText: 'Cancel',

            // Behavior
            closable: true, // Show X button and allow ESC
            backdrop: true, // Show backdrop overlay
            persistent: false, // Prevent closing by clicking backdrop
            autoClose: 0, // Auto-close after milliseconds (0 = disabled)

            // Animation
            animation: {
                enter: 'slideIn', // 'slideIn', 'fadeIn', 'scaleIn'
                exit: 'slideOut', // 'slideOut', 'fadeOut', 'scaleOut'
                duration: 400
            },

            // Form specific
            fields: [],
            formData: {},
            validate: null,

            // Callbacks
            onShow: null,
            onHide: null,
            onConfirm: null,
            onCancel: null,
            onSubmit: null,

            // Accessibility
            ariaLabel: null,
            ariaDescribedBy: null
        };

        const merged = { ...defaults, ...config };

        // Map initialData to formData for form pre-population
        if (config.initialData && merged.type === 'form') {
            merged.formData = { ...merged.formData, ...config.initialData };
        }

        // Set default buttons based on type
        if (merged.buttons.length === 0) {
            switch (merged.type) {
                case 'alert':
                    merged.buttons = [
                        { text: merged.confirmText, type: 'primary', action: 'confirm' }
                    ];
                    break;
                case 'confirm':
                    merged.buttons = [
                        { text: merged.cancelText, type: 'secondary', action: 'cancel' },
                        { text: merged.confirmText, type: 'primary', action: 'confirm' }
                    ];
                    break;
                case 'form':
                    merged.buttons = [
                        { text: merged.cancelText, type: 'secondary', action: 'cancel' },
                        { text: 'Submit', type: 'primary', action: 'submit' }
                    ];
                    break;
            }
        }

        return merged;
    }

    /**
     * Show the modal
     * Returns a promise that resolves when the modal is closed with a result
     */
    show() {
        return new Promise((resolve, reject) => {
            this.resolvePromise = resolve;
            this.rejectPromise = reject;

            this.create();
            this.mount();
            this.setupEventListeners();
            this.lockBodyScroll();
            this.trapFocus();

            this.isVisible = true;

            // Auto-close if configured
            if (this.config.autoClose > 0) {
                setTimeout(() => {
                    this.hide({ action: 'auto-close' });
                }, this.config.autoClose);
            }

            // Call onShow callback
            if (this.config.onShow) {
                try {
                    this.config.onShow(this);
                } catch (error) {
                    this.log('ERROR', 'onShow callback failed:', error);
                }
            }

            this.log('INFO', 'Modal shown:', this.id);
        });
    }

    /**
     * Hide the modal with optional result
     */
    hide(result = { action: 'close' }) {
        if (!this.isVisible || this.isDestroyed) return;

        this.isVisible = false;

        // Call onHide callback
        if (this.config.onHide) {
            try {
                this.config.onHide(this, result);
            } catch (error) {
                this.log('ERROR', 'onHide callback failed:', error);
            }
        }

        // Animate out then cleanup
        this.animateOut(() => {
            this.unmount();
            this.unlockBodyScroll();
            this.restoreFocus();
            this.removeEventListeners();

            // Remove from modal manager
            if (window.MCPModalManager) {
                window.MCPModalManager.removeModal(this.id);
            }

            // Resolve the promise
            if (this.resolvePromise) {
                this.resolvePromise(result);
            }

            this.log('INFO', 'Modal hidden:', this.id);
        });
    }

    /**
     * Create the modal DOM structure
     */
    create() {
        this.element = document.createElement('div');
        this.element.id = this.id;
        this.element.className = 'mcp-modal-overlay';
        this.element.setAttribute('role', 'dialog');
        this.element.setAttribute('aria-modal', 'true');

        if (this.config.ariaLabel) {
            this.element.setAttribute('aria-label', this.config.ariaLabel);
        }

        if (this.config.title) {
            this.element.setAttribute('aria-labelledby', this.id + '-title');
        }

        if (this.config.message || this.config.ariaDescribedBy) {
            this.element.setAttribute('aria-describedby', this.id + '-description');
        }

        this.element.innerHTML = this.buildHTML();
    }

    /**
     * Build the complete HTML structure
     */
    buildHTML() {
        return `
            <div class="mcp-modal-content mcp-modal-content--${this.config.size}" 
                 style="${this.buildCustomSizeStyles()}"
                 data-prevent-close="true">
                ${this.buildHeader()}
                ${this.buildBody()}
                ${this.buildFooter()}
            </div>
        `;
    }

    /**
     * Build custom size styles if specified
     */
    buildCustomSizeStyles() {
        if (this.config.size !== 'custom') return '';

        const styles = [];
        if (this.config.width) styles.push(`width: ${this.config.width}`);
        if (this.config.height) styles.push(`height: ${this.config.height}`);
        if (this.config.maxWidth) styles.push(`max-width: ${this.config.maxWidth}`);
        if (this.config.maxHeight) styles.push(`max-height: ${this.config.maxHeight}`);

        return styles.join('; ');
    }

    /**
     * Build modal header
     */
    buildHeader() {
        if (!this.config.title && !this.config.closable) return '';

        return `
            <div class="mcp-modal-header">
                ${this.config.title ? `
                    <h2 id="${this.id}-title" class="mcp-modal-title">
                        ${this.escapeHtml(this.config.title)}
                    </h2>
                ` : ''}
                ${this.config.closable ? `
                    <button class="mcp-modal-close" 
                            data-action="close" 
                            aria-label="Close modal"
                            type="button">
                        ×
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Build modal body based on type
     */
    buildBody() {
        let content = '';

        switch (this.config.type) {
            case 'alert':
            case 'confirm':
                content = this.buildMessageContent();
                break;
            case 'form':
                content = this.buildFormContent();
                break;
            case 'custom':
                content = this.config.content || '';
                break;
        }

        return `
            <div class="mcp-modal-body">
                ${content}
            </div>
        `;
    }

    /**
     * Build message content for alert/confirm modals
     */
    buildMessageContent() {
        return `
            <div id="${this.id}-description" class="mcp-modal-message">
                ${this.escapeHtml(this.config.message)}
            </div>
        `;
    }

    /**
     * Build form content
     */
    buildFormContent() {
        return `
            <form class="mcp-modal-form" data-form="modal-form">
                ${this.config.fields.map(field => this.buildFormField(field)).join('')}
            </form>
        `;
    }

    /**
     * Build individual form field
     */
    buildFormField(field) {
        const fieldId = `${this.id}-field-${field.name}`;
        const value = this.config.formData[field.name] || field.default || '';

        return `
            <div class="mcp-form-group">
                <label for="${fieldId}" class="mcp-form-label">
                    ${this.escapeHtml(field.label)}
                    ${field.required ? '<span class="required">*</span>' : ''}
                </label>
                ${this.buildFormInput(field, fieldId, value)}
                ${field.description ? `
                    <div class="mcp-form-description">${this.escapeHtml(field.description)}</div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Build form input based on field type
     */
    buildFormInput(field, fieldId, value) {
        const commonAttrs = `
            id="${fieldId}" 
            name="${field.name}"
            ${field.required ? 'required' : ''}
            ${field.placeholder ? `placeholder="${this.escapeHtml(field.placeholder)}"` : ''}
        `;

        switch (field.type) {
            case 'textarea':
                return `<textarea class="mcp-form-input" ${commonAttrs}>${this.escapeHtml(value)}</textarea>`;

            case 'select':
                const options = field.options.map(option => {
                    const optValue = typeof option === 'string' ? option : option.value;
                    const optLabel = typeof option === 'string' ? option : option.label;
                    const selected = optValue === value ? 'selected' : '';
                    return `<option value="${this.escapeHtml(optValue)}" ${selected}>${this.escapeHtml(optLabel)}</option>`;
                }).join('');
                return `<select class="mcp-form-input" ${commonAttrs}>${options}</select>`;

            case 'checkbox':
                const checked = value ? 'checked' : '';
                return `<input type="checkbox" class="mcp-form-checkbox" ${commonAttrs} ${checked}>`;

            default:
                return `<input type="${field.type || 'text'}" class="mcp-form-input" ${commonAttrs} value="${this.escapeHtml(value)}">`;
        }
    }

    /**
     * Build modal footer with buttons
     */
    buildFooter() {
        if (!this.config.buttons || this.config.buttons.length === 0) return '';

        const buttons = this.config.buttons.map(button => {
            return `
                <button type="${button.action === 'submit' ? 'submit' : 'button'}"
                        class="mcp-modal-btn mcp-modal-btn--${button.type || 'secondary'}"
                        data-action="${button.action}"
                        ${button.disabled ? 'disabled' : ''}>
                    ${this.escapeHtml(button.text)}
                </button>
            `;
        }).join('');

        return `
            <div class="mcp-modal-footer">
                ${buttons}
            </div>
        `;
    }

    /**
     * Mount modal to DOM
     */
    mount() {
        const container = this.getModalContainer();
        container.appendChild(this.element);

        // Force reflow then animate in
        this.element.offsetHeight;
        this.animateIn();
    }

    /**
     * Unmount modal from DOM
     */
    unmount() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
    }

    /**
     * Get or create modal container in body
     */
    getModalContainer() {
        let container = document.getElementById('mcp-modal-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'mcp-modal-container';
            container.className = 'mcp-modal-container';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', this.boundHandleKeydown);

        // Click events
        this.element.addEventListener('click', this.boundHandleOverlayClick);

        // Button events
        const buttons = this.element.querySelectorAll('[data-action]');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => this.handleButtonClick(e));
        });

        // Form submission
        const form = this.element.querySelector('[data-form="modal-form"]');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
    }

    /**
     * Remove event listeners
     */
    removeEventListeners() {
        document.removeEventListener('keydown', this.boundHandleKeydown);
        if (this.element) {
            this.element.removeEventListener('click', this.boundHandleOverlayClick);
        }
    }

    /**
     * Handle keyboard events
     */
    handleKeydown(event) {
        if (event.key === 'Escape' && this.config.closable && !this.config.persistent) {
            event.preventDefault();
            this.hide({ action: 'escape' });
            return;
        }

        if (event.key === 'Tab') {
            this.handleTabNavigation(event);
        }
    }

    /**
     * Handle tab navigation for focus trapping
     */
    handleTabNavigation(event) {
        if (this.focusableElements.length === 0) return;

        const activeElement = document.activeElement;
        const currentIndex = this.focusableElements.indexOf(activeElement);

        if (event.shiftKey) {
            // Shift+Tab - go backwards
            if (currentIndex <= 0) {
                event.preventDefault();
                this.lastFocusable.focus();
            }
        } else {
            // Tab - go forwards
            if (currentIndex >= this.focusableElements.length - 1) {
                event.preventDefault();
                this.firstFocusable.focus();
            }
        }
    }

    /**
     * Handle overlay clicks
     */
    handleOverlayClick(event) {
        // Only close if clicking the overlay itself, not child elements
        if (event.target === this.element && !this.config.persistent) {
            this.hide({ action: 'backdrop' });
        }
    }

    /**
     * Handle button clicks
     */
    handleButtonClick(event) {
        const action = event.target.dataset.action;

        switch (action) {
            case 'close':
                this.hide({ action: 'close' });
                break;
            case 'confirm':
                this.handleConfirm();
                break;
            case 'cancel':
                this.hide({ action: 'cancel', confirmed: false });
                break;
            case 'submit':
                // Trigger form submission when submit button is clicked
                const form = this.element.querySelector('[data-form="modal-form"]');
                if (form) {
                    // Create and dispatch a submit event
                    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                    form.dispatchEvent(submitEvent);
                } else {
                    this.log('WARN', 'Submit button clicked but no form found');
                }
                break;
        }
    }

    /**
     * Handle confirm action
     */
    handleConfirm() {
        if (this.config.onConfirm) {
            try {
                const result = this.config.onConfirm(this);
                if (result === false) return; // Don't close if callback returns false
            } catch (error) {
                this.log('ERROR', 'onConfirm callback failed:', error);
                return;
            }
        }

        this.hide({ action: 'confirm', confirmed: true });
    }

    /**
     * Handle form submission
     */
    async handleFormSubmit(event) {
        console.log('DEBUG: Form submitted with data:', event);
        event.preventDefault();

        try {
            const formData = new FormData(event.target);
            const data = Object.fromEntries(formData.entries());

            // Validate form data
            if (this.config.validate) {
                const errors = this.config.validate(data);
                if (errors && Object.keys(errors).length > 0) {
                    this.showValidationErrors(errors);
                    return;
                }
            }

            // Submit form
            if (this.config.onSubmit) {
                const result = await this.config.onSubmit(data);
                console.log('DEBUG: Form submitted with data:', data);
                this.hide({ action: 'submit', data, result });
            } else {
                this.hide({ action: 'submit', data });
            }

        } catch (error) {
            this.log('ERROR', 'Form submission failed:', error);
            this.showError(error.message || 'Submission failed');
        }
    }

    /**
     * Show validation errors
     */
    showValidationErrors(errors) {
        Object.keys(errors).forEach(fieldName => {
            const field = this.element.querySelector(`[name="${fieldName}"]`);
            if (field) {
                const group = field.closest('.mcp-form-group');
                if (group) {
                    group.classList.add('has-error');
                    let errorDiv = group.querySelector('.mcp-form-error');
                    if (!errorDiv) {
                        errorDiv = document.createElement('div');
                        errorDiv.className = 'mcp-form-error';
                        group.appendChild(errorDiv);
                    }
                    errorDiv.textContent = errors[fieldName];
                }
            }
        });
    }

    /**
     * Show general error message
     */
    showError(message) {
        const body = this.element.querySelector('.mcp-modal-body');
        if (body) {
            let errorDiv = body.querySelector('.mcp-modal-error');
            if (!errorDiv) {
                errorDiv = document.createElement('div');
                errorDiv.className = 'mcp-modal-error';
                body.insertBefore(errorDiv, body.firstChild);
            }
            errorDiv.textContent = message;
        }
    }

    /**
     * Focus management
     */
    trapFocus() {
        this.previousFocus = document.activeElement;
        this.updateFocusableElements();

        if (this.firstFocusable) {
            this.firstFocusable.focus();
        }
    }

    /**
     * Update list of focusable elements
     */
    updateFocusableElements() {
        const selectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            'a[href]'
        ].join(', ');

        this.focusableElements = Array.from(
            this.element.querySelectorAll(selectors)
        );

        this.firstFocusable = this.focusableElements[0];
        this.lastFocusable = this.focusableElements[this.focusableElements.length - 1];
    }

    /**
     * Restore focus to previous element
     */
    restoreFocus() {
        if (this.previousFocus && document.contains(this.previousFocus)) {
            this.previousFocus.focus();
        }
    }

    /**
     * Lock body scroll
     */
    lockBodyScroll() {
        document.body.classList.add('mcp-modal-open');
    }

    /**
     * Unlock body scroll
     */
    unlockBodyScroll() {
        // Only unlock if no other modals are open
        const container = document.getElementById('mcp-modal-container');
        if (!container || container.children.length <= 1) {
            document.body.classList.remove('mcp-modal-open');
        }
    }

    /**
     * Animate modal in
     */
    animateIn() {
        this.element.classList.add('mcp-modal-entering');
        setTimeout(() => {
            if (this.element) {
                this.element.classList.remove('mcp-modal-entering');
                this.element.classList.add('mcp-modal-entered');
            }
        }, this.config.animation.duration);
    }

    /**
     * Animate modal out
     */
    animateOut(callback) {
        this.element.classList.add('mcp-modal-exiting');
        setTimeout(() => {
            callback();
        }, this.config.animation.duration);
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Simple logging
     */
    log(level, ...args) {
        console[level.toLowerCase()](`[Modal ${this.id}]`, ...args);
    }

    /**
     * Destroy the modal
     */
    destroy() {
        if (this.isDestroyed) return;

        this.isDestroyed = true;
        this.hide();

        // Reject promise if still pending
        if (this.rejectPromise) {
            this.rejectPromise(new Error('Modal destroyed'));
        }
    }
}

/**
 * Modal Manager Class
 * Manages all modals globally, handles stacking, and provides convenience methods
 */
class ModalManager {
    constructor() {
        this.activeModals = new Map();
        this.modalStack = [];
        this.zIndexBase = 1000;
        this.stylesInjected = false;

        this.injectStyles();
        this.log('INFO', 'ModalManager initialized');
    }

    /**
     * Show a modal with the given configuration
     */
    show(config = {}) {
        const modal = new Modal(config);
        this.addModal(modal);
        return modal.show();
    }

    /**
     * Show an alert modal
     */
    alert(config = {}) {
        return this.show({
            type: 'alert',
            ...config
        });
    }

    /**
     * Show a confirmation modal
     */
    confirm(config = {}) {
        return this.show({
            type: 'confirm',
            ...config
        });
    }

    /**
     * Show a form modal
     */
    form(config = {}) {
        return this.show({
            type: 'form',
            ...config
        });
    }

    /**
     * Show a loading modal
     */
    loading(config = {}) {
        return this.show({
            type: 'custom',
            closable: false,
            persistent: true,
            content: `
                <div class="mcp-modal-loading">
                    <div class="mcp-modal-spinner"></div>
                    <div class="mcp-modal-loading-message">
                        ${config.message || 'Loading...'}
                    </div>
                </div>
            `,
            ...config
        });
    }

    /**
     * Add modal to management
     */
    addModal(modal) {
        this.activeModals.set(modal.id, modal);
        this.modalStack.push(modal.id);
        this.updateZIndex(modal);
    }

    /**
     * Remove modal from management
     */
    removeModal(modalId) {
        this.activeModals.delete(modalId);
        const index = this.modalStack.indexOf(modalId);
        if (index > -1) {
            this.modalStack.splice(index, 1);
        }
    }

    /**
     * Update z-index for modal stacking
     */
    updateZIndex(modal) {
        const stackPosition = this.modalStack.indexOf(modal.id);
        const zIndex = this.zIndexBase + stackPosition;
        if (modal.element) {
            modal.element.style.zIndex = zIndex;
        }
    }

    /**
     * Hide all modals
     */
    hideAll() {
        const modals = Array.from(this.activeModals.values());
        modals.forEach(modal => modal.hide({ action: 'hide-all' }));
    }

    /**
     * Get the top modal
     */
    getTopModal() {
        if (this.modalStack.length === 0) return null;
        const topId = this.modalStack[this.modalStack.length - 1];
        return this.activeModals.get(topId);
    }

    /**
     * Inject CSS styles into the page
     */
    injectStyles() {
        if (this.stylesInjected || document.getElementById('mcp-modal-styles')) return;

        const styleSheet = document.createElement('style');
        styleSheet.id = 'mcp-modal-styles';
        styleSheet.textContent = this.getModalCSS();
        document.head.appendChild(styleSheet);

        this.stylesInjected = true;
        this.log('INFO', 'Modal styles injected');
    }

    /**
     * Get the CSS styles for modals
     */
    getModalCSS() {
        return `
            /* Modal Container */
            .mcp-modal-container {
                position: relative;
                z-index: 1000;
            }

            /* Body scroll lock */
            body.mcp-modal-open {
                overflow: hidden;
                position: fixed;
                width: 100%;
                height: 100%;
            }

            /* Modal Overlay */
            .mcp-modal-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1rem;
                box-sizing: border-box;
                z-index: inherit;
                opacity: 0;
                transition: opacity 0.3s ease, backdrop-filter 0.3s ease;
            }

            .mcp-modal-overlay.mcp-modal-entering {
                opacity: 0;
                backdrop-filter: blur(0px);
            }

            .mcp-modal-overlay.mcp-modal-entered {
                opacity: 1;
                backdrop-filter: blur(8px);
            }

            .mcp-modal-overlay.mcp-modal-exiting {
                opacity: 0;
                backdrop-filter: blur(0px);
            }

            /* Modal Content */
            .mcp-modal-content {
                background: white;
                border-radius: 20px;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
                max-width: 90vw;
                max-height: 90vh;
                overflow: hidden;
                position: relative;
                transform: translateY(30px) scale(0.95);
                transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }

            .mcp-modal-entering .mcp-modal-content {
                transform: translateY(30px) scale(0.95);
            }

            .mcp-modal-entered .mcp-modal-content {
                transform: translateY(0) scale(1);
            }

            .mcp-modal-exiting .mcp-modal-content {
                transform: translateY(-30px) scale(0.95);
            }

            /* Size Variants */
            .mcp-modal-content--small { width: 400px; }
            .mcp-modal-content--medium { width: 600px; }
            .mcp-modal-content--large { width: 800px; }
            .mcp-modal-content--xlarge { width: 1000px; }
            .mcp-modal-content--fullscreen { 
                width: 100vw; 
                height: 100vh; 
                max-width: none; 
                max-height: none; 
                border-radius: 0; 
            }

            /* Modal Header */
            .mcp-modal-header {
                background: linear-gradient(135deg, #f8fafc, #e2e8f0);
                padding: 1.5rem 2rem;
                border-bottom: 2px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .mcp-modal-title {
                color: #1f2937;
                font-weight: 700;
                font-size: 1.5rem;
                margin: 0;
            }

            .mcp-modal-close {
                background: rgba(156, 163, 175, 0.1);
                border: none;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 1.5rem;
                color: #6b7280;
                transition: all 0.3s ease;
                font-weight: bold;
            }

            .mcp-modal-close:hover {
                background: #ef4444;
                color: white;
                transform: scale(1.1);
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
            }

            /* Modal Body */
            .mcp-modal-body {
                padding: 2rem;
                overflow-y: auto;
                max-height: calc(90vh - 200px);
            }

            .mcp-modal-message {
                font-size: 1.1rem;
                line-height: 1.6;
                color: #374151;
            }

            /* Modal Footer */
            .mcp-modal-footer {
                padding: 1.5rem 2rem;
                border-top: 1px solid #e5e7eb;
                background: #f9fafb;
                display: flex;
                justify-content: flex-end;
                gap: 1rem;
            }

            /* Modal Buttons */
            .mcp-modal-btn {
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                font-weight: 600;
                font-size: 0.875rem;
                cursor: pointer;
                transition: all 0.2s ease;
                border: none;
                min-width: 80px;
            }

            .mcp-modal-btn--primary {
                background: #3b82f6;
                color: white;
            }

            .mcp-modal-btn--primary:hover {
                background: #2563eb;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            }

            .mcp-modal-btn--secondary {
                background: #e5e7eb;
                color: #374151;
            }

            .mcp-modal-btn--secondary:hover {
                background: #d1d5db;
                transform: translateY(-1px);
            }

            .mcp-modal-btn--danger {
                background: #ef4444;
                color: white;
            }

            .mcp-modal-btn--danger:hover {
                background: #dc2626;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
            }

            .mcp-modal-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none !important;
            }

            /* Form Styles */
            .mcp-modal-form {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }

            .mcp-form-group {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .mcp-form-label {
                font-weight: 600;
                color: #374151;
                font-size: 0.875rem;
            }

            .mcp-form-label .required {
                color: #ef4444;
                margin-left: 0.25rem;
            }

            .mcp-form-input {
                padding: 0.75rem;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                font-size: 1rem;
                transition: border-color 0.2s ease, box-shadow 0.2s ease;
            }

            .mcp-form-input:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }

            .mcp-form-checkbox {
                width: 1.25rem;
                height: 1.25rem;
                accent-color: #3b82f6;
            }

            .mcp-form-description {
                font-size: 0.875rem;
                color: #6b7280;
            }

            .mcp-form-error {
                color: #ef4444;
                font-size: 0.875rem;
                margin-top: 0.25rem;
            }

            .mcp-form-group.has-error .mcp-form-input {
                border-color: #ef4444;
            }

            /* Modal Error */
            .mcp-modal-error {
                background: #fef2f2;
                border: 1px solid #fecaca;
                color: #dc2626;
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 1rem;
            }

            /* Loading Modal */
            .mcp-modal-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1rem;
                padding: 2rem;
            }

            .mcp-modal-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #e5e7eb;
                border-top: 4px solid #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .mcp-modal-loading-message {
                font-size: 1.1rem;
                color: #374151;
            }

            /* Mobile Responsiveness */
            @media (max-width: 768px) {
                .mcp-modal-overlay {
                    padding: 0.5rem;
                }

                .mcp-modal-content {
                    max-height: 95vh;
                    border-radius: 16px;
                }

                .mcp-modal-content--small,
                .mcp-modal-content--medium,
                .mcp-modal-content--large,
                .mcp-modal-content--xlarge {
                    width: 100%;
                }

                .mcp-modal-header {
                    padding: 1rem 1.5rem;
                    border-radius: 16px 16px 0 0;
                }

                .mcp-modal-title {
                    font-size: 1.25rem;
                }

                .mcp-modal-body {
                    padding: 1.5rem;
                }

                .mcp-modal-footer {
                    padding: 1rem 1.5rem;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .mcp-modal-btn {
                    width: 100%;
                    justify-content: center;
                }
            }

            /* Dark Mode Support */
            @media (prefers-color-scheme: dark) {
                .mcp-modal-content {
                    background: #1f2937;
                    color: #f9fafb;
                }

                .mcp-modal-header {
                    background: linear-gradient(135deg, #374151, #4b5563);
                    border-bottom-color: #4b5563;
                }

                .mcp-modal-title {
                    color: #f9fafb;
                }

                .mcp-modal-body {
                    color: #e5e7eb;
                }

                .mcp-modal-message {
                    color: #d1d5db;
                }

                .mcp-modal-footer {
                    background: #111827;
                    border-top-color: #4b5563;
                }

                .mcp-form-input {
                    background: #374151;
                    border-color: #4b5563;
                    color: #f9fafb;
                }

                .mcp-form-input:focus {
                    border-color: #60a5fa;
                    box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
                }

                .mcp-form-label {
                    color: #d1d5db;
                }

                .mcp-form-description {
                    color: #9ca3af;
                }

                .mcp-modal-loading-message {
                    color: #d1d5db;
                }
            }
        `;
    }

    /**
     * Simple logging
     */
    log(level, ...args) {
        console[level.toLowerCase()]('[ModalManager]', ...args);
    }

    /**
     * Destroy all modals and cleanup
     */
    destroy() {
        this.hideAll();
        this.activeModals.clear();
        this.modalStack = [];

        // Remove styles
        const styleSheet = document.getElementById('mcp-modal-styles');
        if (styleSheet) {
            styleSheet.remove();
        }

        // Remove container
        const container = document.getElementById('mcp-modal-container');
        if (container) {
            container.remove();
        }

        this.stylesInjected = false;
    }
}

/**
 * Initialize global modal manager
 */
if (typeof window !== 'undefined') {
    window.MCPModalManager = new ModalManager();
    window.MCPModal = window.MCPModalManager;
}

/**
 * Export for module systems
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Modal, ModalManager };
} 