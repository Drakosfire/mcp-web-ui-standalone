# Component Creation Guide for MCP Vanilla JS Framework

## Overview

This guide explains how to create robust, secure components for the MCP Vanilla JS Framework. It's designed primarily for AI agents developing new components and covers critical patterns learned from real-world debugging and development.

## Table of Contents

1. [Component Architecture](#component-architecture)
2. [HTML Rendering Patterns](#html-rendering-patterns)
3. [Security Considerations](#security-considerations)
4. [Step-by-Step Component Creation](#step-by-step-component-creation)
5. [Common Pitfalls and Solutions](#common-pitfalls-and-solutions)
6. [Testing and Debugging](#testing-and-debugging)
7. [Integration with MCP Framework](#integration-with-mcp-framework)

## Component Architecture

### Base Structure

All components must extend `BaseComponent` and follow this pattern:

```javascript
class YourComponent extends BaseComponent {
    constructor(element, data, config) {
        // Set up component-specific configuration BEFORE calling super()
        const componentConfig = {
            // Your component defaults
            ...config.yourComponent
        };

        // Call parent constructor - this triggers init() and render()
        super(element, data, config);

        // Set up instance properties AFTER super()
        this.componentConfig = componentConfig;
        this.componentState = {
            // Initialize your component state
        };

        this.log('INFO', 'YourComponent initialized');
    }

    render() {
        if (this.isDestroyed) return;

        this.element.innerHTML = this.html`
            <div class="component component-your-type">
                ${this.trustedHtml(this.renderSection1())}
                ${this.trustedHtml(this.renderSection2())}
                ${this.trustedHtml(this.renderSection3())}
            </div>
        `;

        this.postRenderSetup();
    }

    renderSection1() {
        return this.html`
            <div class="section-1">
                <!-- Your HTML here -->
            </div>
        `;
    }

    bindEvents() {
        // Event binding logic
        this.on('click', '[data-action="your-action"]', (e) => {
            this.handleYourAction(e);
        });
    }

    destroy() {
        // Cleanup component-specific resources
        super.destroy();
    }
}
```

## HTML Rendering Patterns

### Critical Rule: trustedHtml() Usage

**GOLDEN RULE**: Use `trustedHtml()` when passing HTML between different rendering methods, but NOT within the same template literal.

#### ✅ Correct Patterns

```javascript
// 1. Between different rendering methods (ALWAYS use trustedHtml)
render() {
    this.element.innerHTML = this.html`
        <div class="component">
            ${this.trustedHtml(this.renderHeader())}
            ${this.trustedHtml(this.renderContent())}
            ${this.trustedHtml(this.renderFooter())}
        </div>
    `;
}

// 2. Within same template - conditional HTML (use trustedHtml for conditionals)
renderHeader() {
    return this.html`
        <div class="header">
            <h2>Title</h2>
            ${stats.urgent > 0 ? this.trustedHtml(`
                <span class="urgent-badge">
                    <strong>${stats.urgent}</strong> urgent
                </span>
            `) : ''}
        </div>
    `;
}

// 3. Array of HTML items (use trustedHtml for the joined result)
renderList() {
    const items = this.data;
    return this.html`
        <div class="list">
            ${this.trustedHtml(items.map(item => this.renderItem(item)).join(''))}
        </div>
    `;
}

// 4. Individual items (return plain template - no trustedHtml needed)
renderItem(item) {
    return `
        <div class="item" data-id="${item.id}">
            <span class="text">${item.text}</span>
            ${item.category ? `
                <span class="badge">${item.category}</span>
            ` : ''}
        </div>
    `;
}
```

#### ❌ Incorrect Patterns (Will Cause Issues)

```javascript
// DON'T: Nested trustedHtml within same template
renderHeader() {
    return this.html`
        <div class="header">
            ${stats.urgent > 0 ? this.trustedHtml(`
                <span>${stats.urgent}</span>  <!-- This causes __HTML__: to appear -->
            `) : ''}
        </div>
    `;
}

// DON'T: Missing trustedHtml between methods
render() {
    this.element.innerHTML = this.html`
        <div>
            ${this.renderHeader()}  <!-- This will be escaped -->
        </div>
    `;
}

// DON'T: Using trustedHtml for simple values
renderItem(item) {
    return this.html`
        <div>
            ${this.trustedHtml(item.text)}  <!-- Just use ${item.text} -->
        </div>
    `;
}
```

### Template Rendering Lifecycle

1. **Main render()** calls sub-rendering methods with `trustedHtml()`
2. **Sub-rendering methods** use `this.html` template literals
3. **Conditional HTML** within templates uses `trustedHtml()` for complex HTML
4. **Simple conditionals** within templates use plain template literals
5. **Array mapping** results are wrapped with `trustedHtml()`

## Security Considerations

### XSS Protection

The framework provides automatic XSS protection, but you must understand how it works:

```javascript
// User input is automatically sanitized
render() {
    return this.html`
        <div>
            ${userInput}  <!-- Automatically escaped for XSS protection -->
        </div>
    `;
}

// System-generated HTML needs trustedHtml
render() {
    return this.html`
        <div>
            ${this.trustedHtml(this.generateSystemHTML())}  <!-- Safe system HTML -->
        </div>
    `;
}
```

### Content Sanitization

For specific contexts, use the sanitization methods:

```javascript
// Context-aware sanitization
const cleanText = this.sanitizeLLMContent(userInput, 'todo-text');
const cleanCategory = this.sanitizeLLMContent(userInput, 'category'); 
const cleanPriority = this.sanitizeLLMContent(userInput, 'priority');
```

## Step-by-Step Component Creation

### 1. Plan Your Component

Define:
- What data it will display
- What user interactions it supports
- What configuration options it needs
- How it integrates with the MCP schema

### 2. Create the Component File

```javascript
// src/vanilla/components/YourComponent.js

/**
 * YourComponent - Description of what it does
 * 
 * Features:
 * - List key features
 * - Security considerations
 * - Integration points
 */
class YourComponent extends BaseComponent {
    constructor(element, data, config) {
        // Component-specific config
        const componentConfig = {
            // defaults
            ...config.yourComponent
        };

        super(element, data, config);
        
        this.componentConfig = componentConfig;
        this.componentState = {
            // Initialize state
        };
    }

    // Implement required methods...
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = YourComponent;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.YourComponent = YourComponent;
}
```

### 3. Implement Core Methods

**render()** - Main rendering method:
```javascript
render() {
    if (this.isDestroyed) return;

    this.element.innerHTML = this.html`
        <div class="component component-your-type">
            ${this.trustedHtml(this.renderHeader())}
            ${this.trustedHtml(this.renderContent())}
        </div>
    `;

    this.postRenderSetup();
}
```

**Sub-rendering methods**:
```javascript
renderHeader() {
    return this.html`
        <div class="header">
            <!-- Header content -->
        </div>
    `;
}

renderContent() {
    if (!this.data || this.data.length === 0) {
        return this.html`
            <div class="empty-state">
                <p>No data available</p>
            </div>
        `;
    }

    return this.html`
        <div class="content">
            ${this.trustedHtml(this.data.map(item => this.renderItem(item)).join(''))}
        </div>
    `;
}

renderItem(item) {
    return `
        <div class="item" data-id="${item.id}">
            <span class="text">${item.text}</span>
            ${item.metadata ? `
                <span class="metadata">${item.metadata}</span>
            ` : ''}
        </div>
    `;
}
```

**bindEvents()** - Event handling:
```javascript
bindEvents() {
    this.on('click', '[data-action="edit"]', (e) => {
        const id = e.target.dataset.id;
        this.handleEdit(id);
    });

    this.on('change', '[data-action="toggle"]', (e) => {
        const id = e.target.dataset.id;
        this.handleToggle(id, e.target.checked);
    });
}
```

### 4. Add to Framework

Add your component to `MCPFramework.js`:

```javascript
// In MCPFramework.js
MCP.YourComponent = function (selector, data = [], config = {}) {
    const element = typeof selector === 'string'
        ? document.querySelector(selector)
        : selector;

    if (!element) {
        console.error('MCP.YourComponent: Element not found:', selector);
        return null;
    }

    const mergedConfig = MCP.utils.mergeConfig(MCP.defaults, config);
    const component = new YourComponent(element, data, mergedConfig);

    MCP.registerComponent(element.id || 'your-component-' + Date.now(), component);

    return component;
};
```

### 5. Update Schema Support

Add schema support in the framework initialization:

```javascript
// In MCP.initFromSchema
switch (componentDef.type) {
    case 'your-type':
        component = MCP.YourComponent(element, componentData, componentConfig);
        break;
    // ... other cases
}
```

## Common Pitfalls and Solutions

### Problem: HTML Appears as Escaped Text

**Symptoms**: You see `&lt;div&gt;` instead of actual HTML elements

**Cause**: Missing `trustedHtml()` when passing HTML between methods

**Solution**:
```javascript
// ❌ Wrong
render() {
    this.element.innerHTML = this.html`
        <div>${this.renderContent()}</div>
    `;
}

// ✅ Correct  
render() {
    this.element.innerHTML = this.html`
        <div>${this.trustedHtml(this.renderContent())}</div>
    `;
}
```

### Problem: `__HTML__:` Appears in Output

**Symptoms**: You see literal `__HTML__:` text in the rendered HTML

**Cause**: Using `trustedHtml()` within the same template literal

**Solution**:
```javascript
// ❌ Wrong - nested trustedHtml
renderSection() {
    return this.html`
        <div>
            ${condition ? this.trustedHtml(`<span>Content</span>`) : ''}
        </div>
    `;
}

// ✅ Correct - remove inner trustedHtml for same template
renderSection() {
    return this.html`
        <div>
            ${condition ? `<span>Content</span>` : ''}
        </div>
    `;
}
```

### Problem: Events Not Working

**Symptoms**: Clicking buttons or interacting with elements does nothing

**Cause**: Events not properly bound or elements not found

**Solution**:
```javascript
// Ensure bindEvents is called and uses proper selectors
bindEvents() {
    // Use data attributes for reliable targeting
    this.on('click', '[data-action="your-action"]', (e) => {
        this.handleAction(e);
    });
}

render() {
    // Make sure elements have proper data attributes
    return this.html`
        <button data-action="your-action" data-id="${item.id}">
            Click Me
        </button>
    `;
}
```

### Problem: Component State Not Updating

**Symptoms**: Data changes but UI doesn't reflect changes

**Cause**: Not calling `render()` after state changes

**Solution**:
```javascript
async handleUpdate(newData) {
    this.data = newData;
    this.render(); // Always re-render after data changes
}
```

## Testing and Debugging

### Debug HTML Rendering Issues

1. **Check Browser Console**: Look for JavaScript errors
2. **Inspect HTML**: Check if elements have correct structure
3. **Verify trustedHtml Usage**: Ensure proper pattern usage
4. **Test Incrementally**: Start with simple HTML, add complexity

### Debug Component Integration

```javascript
// Add logging to track component lifecycle
constructor(element, data, config) {
    console.log('Component constructing with:', { data, config });
    super(element, data, config);
}

render() {
    console.log('Rendering component with data:', this.data);
    // ... render logic
}

bindEvents() {
    console.log('Binding events for component');
    // ... event binding
}
```

### Testing Patterns

```javascript
// Test component in isolation
const testContainer = document.createElement('div');
document.body.appendChild(testContainer);

const component = new YourComponent(testContainer, testData, testConfig);

// Verify rendering
console.assert(testContainer.querySelector('.component'), 'Component should render');

// Test interactions
const button = testContainer.querySelector('[data-action="test"]');
button.click();

// Cleanup
component.destroy();
document.body.removeChild(testContainer);
```

## Integration with MCP Framework

### Schema Configuration

Define how your component works with UI schemas:

```typescript
// In types/index.ts
interface YourComponentConfig {
    yourOption: boolean;
    yourSetting: string;
    // ... other options
}
```

### Registration in MCPFramework.js

```javascript
// Add factory function
MCP.YourComponent = function(selector, data, config) {
    // Implementation
};

// Add to auto-initialization
MCP.initFromSchema = function(schema, initialData, globalConfig) {
    // Add case for your component type
    switch (componentDef.type) {
        case 'your-type':
            component = MCP.YourComponent(element, componentData, componentConfig);
            break;
    }
};
```

### Server Integration

Ensure the VanillaUIServer includes your component:

```javascript
// In VanillaUIServer.ts setupStaticFiles method
const frameworkFiles = [
    path.join(vanillaPath, 'core', 'BaseComponent.js'),
    path.join(vanillaPath, 'components', 'TodoListComponent.js'),
    path.join(vanillaPath, 'components', 'YourComponent.js'), // Add your component
    // ... other components
    path.join(vanillaPath, 'MCPFramework.js')
];
```

## Best Practices Summary

1. **Always extend BaseComponent** - Never create components from scratch
2. **Use trustedHtml() between methods** - But not within the same template
3. **Handle empty data gracefully** - Always check for null/empty data
4. **Implement proper cleanup** - Override destroy() for component-specific cleanup
5. **Use data attributes for events** - More reliable than class-based targeting
6. **Sanitize user input** - But trust system-generated HTML
7. **Test incrementally** - Start simple, add complexity gradually
8. **Log component lifecycle** - Helps with debugging integration issues
9. **Follow naming conventions** - Use consistent patterns for CSS classes and data attributes
10. **Document component APIs** - Include usage examples and configuration options

## Example: Minimal Working Component

```javascript
class MinimalComponent extends BaseComponent {
    constructor(element, data, config) {
        super(element, data, config);
        this.log('INFO', 'MinimalComponent initialized');
    }

    render() {
        if (this.isDestroyed) return;

        this.element.innerHTML = this.html`
            <div class="component component-minimal">
                ${this.trustedHtml(this.renderContent())}
            </div>
        `;
    }

    renderContent() {
        if (!this.data || this.data.length === 0) {
            return this.html`
                <div class="empty-state">
                    <p>No items to display</p>
                </div>
            `;
        }

        return this.html`
            <div class="item-list">
                ${this.trustedHtml(this.data.map(item => this.renderItem(item)).join(''))}
            </div>
        `;
    }

    renderItem(item) {
        return `
            <div class="item" data-id="${item.id}">
                <span class="text">${item.text}</span>
                <button data-action="delete" data-id="${item.id}">Delete</button>
            </div>
        `;
    }

    bindEvents() {
        this.on('click', '[data-action="delete"]', async (e) => {
            const id = e.target.dataset.id;
            await this.handleAction('delete', { id });
        });
    }
}
```

This guide provides the foundation for creating robust, secure components that integrate seamlessly with the MCP Vanilla JS Framework. Follow these patterns and you'll avoid the common pitfalls that cause HTML rendering issues and component integration problems. 