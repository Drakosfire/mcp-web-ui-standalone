# Modal Component Design Plan

## Overview

Based on our experience improving the Todoodles modal and CSS styling, we need a standardized modal component that renders outside the main content area and provides consistent behavior across all MCP servers.

## Current Problem

The existing modal implementation has several issues:
- ❌ Renders inside `main` content area instead of `body`
- ❌ Causes page jumping and scroll issues
- ❌ Inconsistent positioning and centering
- ❌ No standardized styling across servers
- ❌ Manual DOM manipulation required
- ❌ Limited accessibility features

## Design Goals

### Core Objectives
1. **Proper DOM Positioning**: Render directly in `body` to avoid layout constraints
2. **Consistent Behavior**: Same modal experience across all MCP servers
3. **Developer Experience**: Simple, intuitive API for modal creation
4. **Accessibility**: Full keyboard navigation and screen reader support
5. **Performance**: Efficient rendering and cleanup
6. **Extensibility**: Support different modal types and customization

### User Experience Goals
- **No Page Jumping**: Modal appears without disrupting current scroll position
- **Smooth Animations**: Professional, polished interactions
- **Responsive Design**: Works perfectly on all screen sizes
- **Intuitive Controls**: Clear close buttons and escape key support

## Component Architecture

### 1. Core Modal Manager

```javascript
class ModalManager {
    constructor() {
        this.activeModals = new Map();
        this.modalStack = [];
        this.zIndexBase = 1000;
        this.setupGlobalListeners();
        this.injectBaseStyles();
    }

    // Core API methods
    show(config) { }
    hide(modalId) { }
    hideAll() { }
    confirm(config) { }
    alert(config) { }
    form(config) { }
}
```

### 2. Modal Component Structure

```javascript
class Modal {
    constructor(config) {
        this.id = generateId();
        this.config = this.validateConfig(config);
        this.element = null;
        this.isVisible = false;
        this.scrollPosition = 0;
        this.focusableElements = [];
        this.previousFocus = null;
    }

    // Lifecycle methods
    create() { }
    mount() { }
    show() { }
    hide() { }
    destroy() { }

    // DOM manipulation
    buildDOM() { }
    injectIntoBody() { }
    removeFromBody() { }

    // Event handling
    setupEventListeners() { }
    handleKeydown(event) { }
    handleOverlayClick(event) { }

    // Focus management
    trapFocus() { }
    restoreFocus() { }
    focusFirstElement() { }

    // Scroll management
    lockBodyScroll() { }
    unlockBodyScroll() { }
    preserveScrollPosition() { }
}
```

## API Design

### 1. Simple Modal API

```javascript
// Basic modal
const modal = MCPModal.show({
    title: "Confirm Action",
    content: "Are you sure you want to delete this item?",
    size: "medium", // small, medium, large, fullscreen
    type: "confirm", // alert, confirm, form, custom
    buttons: [
        { text: "Cancel", type: "secondary", action: "close" },
        { text: "Delete", type: "danger", action: "confirm" }
    ],
    onConfirm: () => deleteItem(),
    onCancel: () => console.log("Cancelled"),
    closable: true, // Show X button and allow ESC
    backdrop: true, // Show backdrop overlay
    persistent: false // Prevent closing by clicking backdrop
});

// Promise-based API
const result = await MCPModal.confirm({
    title: "Delete Item",
    message: "This action cannot be undone.",
    confirmText: "Delete",
    cancelText: "Cancel"
});

if (result.confirmed) {
    deleteItem();
}
```

### 2. Form Modal API

```javascript
const formModal = MCPModal.form({
    title: "Add New Item",
    fields: [
        {
            name: "text",
            label: "Task",
            type: "textarea",
            required: true,
            placeholder: "Enter task description..."
        },
        {
            name: "priority",
            label: "Priority",
            type: "select",
            options: [
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
                { value: "urgent", label: "Urgent" }
            ],
            default: "medium"
        },
        {
            name: "dueDate",
            label: "Due Date",
            type: "date"
        }
    ],
    onSubmit: (data) => {
        console.log("Form data:", data);
        return addNewItem(data);
    },
    validate: (data) => {
        const errors = {};
        if (!data.text?.trim()) {
            errors.text = "Task description is required";
        }
        return errors;
    }
});
```

## Implementation Strategy

### 1. Framework Integration

#### Option A: Standalone Component
```javascript
// Add to MCPWebUI framework
class MCPWebUI {
    constructor(config) {
        // ... existing code
        this.modal = new ModalManager();
    }
    
    // Expose modal globally
    static get Modal() {
        return globalModalManager;
    }
}

// Usage
MCPWebUI.Modal.show({ /* config */ });
```

#### Option B: Component Plugin
```javascript
// Register as a component plugin
MCPWebUI.registerComponent('modal', ModalComponent);

// Usage
this.ui.components.modal.show({ /* config */ });
```

### 2. DOM Injection Strategy

```javascript
class ModalManager {
    injectIntoBody(modalElement) {
        // Create modal container if it doesn't exist
        let container = document.getElementById('mcp-modal-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'mcp-modal-container';
            container.className = 'mcp-modal-container';
            document.body.appendChild(container);
        }
        
        container.appendChild(modalElement);
    }
    
    injectBaseStyles() {
        if (document.getElementById('mcp-modal-styles')) return;
        
        const styleSheet = document.createElement('style');
        styleSheet.id = 'mcp-modal-styles';
        styleSheet.textContent = modalBaseCSS;
        document.head.appendChild(styleSheet);
    }
}
```

## Features & Functionality

### 1. Modal Types

#### Alert Modal
```javascript
MCPModal.alert({
    title: "Success",
    message: "Item has been saved successfully!",
    type: "success", // success, warning, error, info
    autoClose: 3000 // Auto-close after 3 seconds
});
```

#### Confirmation Modal
```javascript
const confirmed = await MCPModal.confirm({
    title: "Delete Item",
    message: "Are you sure you want to delete this item?",
    confirmText: "Delete",
    cancelText: "Cancel",
    type: "danger"
});
```

#### Form Modal
```javascript
const result = await MCPModal.form({
    title: "Edit Item",
    fields: [...],
    data: currentItemData,
    onSubmit: updateItem
});
```

#### Loading Modal
```javascript
const loadingModal = MCPModal.loading({
    title: "Processing...",
    message: "Please wait while we save your changes."
});

// Later
loadingModal.hide();
```

### 2. Advanced Features

#### Modal Stacking
```javascript
// Support multiple modals
const modal1 = MCPModal.show({ /* config */ });
const modal2 = MCPModal.show({ /* config */ }); // Appears above modal1

// ESC key closes top modal first
// Backdrop clicks only affect top modal
```

#### Animation Customization
```javascript
MCPModal.show({
    title: "Custom Animation",
    content: "...",
    animation: {
        enter: "slideInFromTop",    // slideInFromTop, slideInFromBottom, fadeIn, scaleIn
        exit: "slideOutToTop",      // slideOutToTop, slideOutToBottom, fadeOut, scaleOut
        duration: 400               // milliseconds
    }
});
```

#### Size Variants
```javascript
// Predefined sizes
MCPModal.show({ size: "small" });    // 400px max-width
MCPModal.show({ size: "medium" });   // 600px max-width  
MCPModal.show({ size: "large" });    // 800px max-width
MCPModal.show({ size: "xlarge" });   // 1000px max-width
MCPModal.show({ size: "fullscreen" }); // 100% viewport

// Custom sizing
MCPModal.show({
    size: "custom",
    width: "500px",
    height: "400px",
    maxWidth: "90vw",
    maxHeight: "80vh"
});
```

## CSS Architecture

### 1. Base Modal Styles

```css
/* Base modal container - injected into body */
.mcp-modal-container {
    position: relative;
    z-index: 1000;
}

/* Modal overlay */
.mcp-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    box-sizing: border-box;
    z-index: inherit;
    animation: modalOverlayFadeIn 0.3s ease;
}

/* Modal content wrapper */
.mcp-modal-content {
    background: white;
    border-radius: 20px;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
    max-width: 90vw;
    max-height: 90vh;
    overflow: hidden;
    position: relative;
    animation: modalContentSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* Size variants */
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
```

### 2. Modal Header, Body, Footer

```css
.mcp-modal-header {
    background: linear-gradient(135deg, var(--primary-light), #f8fafc);
    padding: var(--space-6) var(--space-8);
    border-bottom: 2px solid var(--gray-100);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.mcp-modal-title {
    color: var(--primary);
    font-weight: var(--font-bold);
    font-size: var(--text-xl);
    margin: 0;
}

.mcp-modal-close {
    background: rgba(var(--primary), 0.1);
    border: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
}

.mcp-modal-body {
    padding: var(--space-8);
    overflow-y: auto;
    max-height: calc(90vh - 200px); /* Account for header/footer */
}

.mcp-modal-footer {
    padding: var(--space-6) var(--space-8);
    border-top: 1px solid var(--gray-100);
    background: var(--gray-50);
    display: flex;
    justify-content: flex-end;
    gap: var(--space-4);
}
```

### 3. Animations

```css
@keyframes modalOverlayFadeIn {
    from {
        opacity: 0;
        backdrop-filter: blur(0px);
    }
    to {
        opacity: 1;
        backdrop-filter: blur(8px);
    }
}

@keyframes modalContentSlideIn {
    from {
        transform: translateY(30px) scale(0.95);
        opacity: 0;
    }
    to {
        transform: translateY(0) scale(1);
        opacity: 1;
    }
}

@keyframes modalContentSlideOut {
    from {
        transform: translateY(0) scale(1);
        opacity: 1;
    }
    to {
        transform: translateY(-30px) scale(0.95);
        opacity: 0;
    }
}
```

## Accessibility Features

### 1. Keyboard Navigation
- **ESC key**: Close modal (unless persistent)
- **Tab/Shift+Tab**: Navigate through focusable elements
- **Enter/Space**: Activate buttons
- **Arrow keys**: Navigate radio buttons and select options

### 2. Focus Management
```javascript
class FocusManager {
    constructor(modal) {
        this.modal = modal;
        this.focusableElements = [];
        this.previousFocus = null;
        this.firstFocusable = null;
        this.lastFocusable = null;
    }
    
    trapFocus() {
        this.previousFocus = document.activeElement;
        this.updateFocusableElements();
        this.focusFirstElement();
        this.modal.element.addEventListener('keydown', this.handleKeydown.bind(this));
    }
    
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
            this.modal.element.querySelectorAll(selectors)
        );
        this.firstFocusable = this.focusableElements[0];
        this.lastFocusable = this.focusableElements[this.focusableElements.length - 1];
    }
    
    handleKeydown(event) {
        if (event.key === 'Tab') {
            if (event.shiftKey) {
                if (document.activeElement === this.firstFocusable) {
                    event.preventDefault();
                    this.lastFocusable?.focus();
                }
            } else {
                if (document.activeElement === this.lastFocusable) {
                    event.preventDefault();
                    this.firstFocusable?.focus();
                }
            }
        }
    }
    
    restoreFocus() {
        this.previousFocus?.focus();
    }
}
```

### 3. ARIA Attributes
```html
<div class="mcp-modal-overlay" 
     role="dialog" 
     aria-modal="true" 
     aria-labelledby="modal-title"
     aria-describedby="modal-description">
  <div class="mcp-modal-content">
    <div class="mcp-modal-header">
      <h2 id="modal-title" class="mcp-modal-title">Modal Title</h2>
      <button class="mcp-modal-close" aria-label="Close modal">×</button>
    </div>
    <div class="mcp-modal-body">
      <p id="modal-description">Modal content...</p>
    </div>
  </div>
</div>
```

## Testing Strategy

### 1. Unit Tests
```javascript
describe('Modal Component', () => {
    test('should create modal and inject into body', () => {
        const modal = MCPModal.show({ title: 'Test' });
        expect(document.body.contains(modal.element)).toBe(true);
    });
    
    test('should lock body scroll when shown', () => {
        MCPModal.show({ title: 'Test' });
        expect(document.body.style.overflow).toBe('hidden');
    });
    
    test('should restore focus when closed', () => {
        const button = document.createElement('button');
        button.focus();
        const modal = MCPModal.show({ title: 'Test' });
        modal.hide();
        expect(document.activeElement).toBe(button);
    });
});
```

### 2. Integration Tests
- Test with different MCP servers
- Verify CSS doesn't conflict with server styles
- Test modal stacking functionality
- Verify responsive behavior

### 3. Accessibility Tests
- Screen reader compatibility (NVDA, JAWS, VoiceOver)
- Keyboard navigation testing
- Color contrast verification
- Focus management validation

## Implementation Timeline

### Phase 1: Core Modal (Week 1)
- [ ] Basic modal structure and DOM injection
- [ ] Overlay and content positioning
- [ ] Basic show/hide functionality
- [ ] Body scroll locking
- [ ] ESC key handling

### Phase 2: Advanced Features (Week 2)
- [ ] Focus management and keyboard navigation
- [ ] Animation system
- [ ] Size variants and customization
- [ ] Form modal functionality
- [ ] Confirmation and alert modals

### Phase 3: Polish & Integration (Week 3)
- [ ] Full accessibility implementation
- [ ] Responsive design refinements
- [ ] Integration with existing MCP servers
- [ ] Comprehensive testing
- [ ] Documentation and examples

### Phase 4: Advanced Features (Week 4)
- [ ] Modal stacking support
- [ ] Custom animations
- [ ] Loading states
- [ ] Performance optimizations
- [ ] Framework plugin architecture

## Migration Strategy

### 1. Backward Compatibility
- Keep existing modal CSS classes working
- Provide migration guide for existing implementations
- Gradual migration path for existing servers

### 2. Framework Integration
```javascript
// Option 1: Global replacement
window.MCPModal = new ModalManager();

// Option 2: Framework integration
class MCPWebUI {
    constructor(config) {
        this.modal = new ModalManager();
        // Expose globally for convenience
        window.MCPModal = this.modal;
    }
}
```

### 3. CSS Migration
- Provide CSS migration utility
- Automatic class name mapping
- Deprecation warnings for old patterns

## Success Metrics

### Technical Metrics
- [ ] Zero layout shift when modal opens
- [ ] Body scroll completely locked
- [ ] Modal renders outside main content area
- [ ] Focus properly trapped and restored
- [ ] Keyboard navigation works perfectly

### User Experience Metrics
- [ ] No page jumping or scrolling issues
- [ ] Smooth, professional animations
- [ ] Consistent behavior across all MCP servers
- [ ] Mobile-friendly responsive design
- [ ] Fast load times and smooth interactions

### Developer Experience Metrics
- [ ] Simple, intuitive API
- [ ] Comprehensive documentation
- [ ] Easy customization options
- [ ] TypeScript support
- [ ] Minimal setup required

---

This modal component will solve all the current issues and provide a robust, accessible, and beautiful modal experience across all MCP servers. The implementation prioritizes proper DOM positioning, scroll management, and user experience while maintaining the design principles established in our CSS style guide. 