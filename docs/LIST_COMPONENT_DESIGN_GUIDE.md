# MCP List Component Design Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Quick Start](#quick-start)
3. [Basic List Component Creation](#basic-list-component-creation)
4. [Configuration Architecture](#configuration-architecture)
5. [Enhancement Patterns](#enhancement-patterns)
6. [Advanced Multi-Section Implementation](#advanced-multi-section-implementation)
7. [Testing and Validation](#testing-and-validation)
8. [Best Practices and Lessons Learned](#best-practices-and-lessons-learned)
9. [Common Pitfalls and Solutions](#common-pitfalls-and-solutions)
10. [Reference Examples](#reference-examples)

## Introduction

This guide provides comprehensive patterns and best practices for creating new MCP list components. It's based on our experience implementing `GroceryListComponent` and `TodoListComponent`, and follows the established MCP Web UI architecture.

### Core Philosophy

1. **Configuration Over Hardcoding** - Use the generic `ListComponent` as a base and configure it for your specific use case
2. **Composition Over Inheritance** - Enhance functionality through configuration and method overrides rather than complex inheritance
3. **Reusability** - Build components that can be easily customized and extended
4. **Security by Design** - Follow established security patterns and input validation
5. **Progressive Enhancement** - Start simple and add features incrementally

### When to Use This Guide

Use this guide when you need to create:
- New list-based components (inventory, contacts, projects, etc.)
- Components that display collections of items
- Components that need CRUD operations
- Components with filtering, sorting, or search capabilities
- Multi-section or categorized lists

## Quick Start

### 30-Second Component Creation

```javascript
// Create a basic list component in 4 steps:

// 1. Define your configuration
const myListConfig = {
    list: {
        itemType: 'contact',
        itemTextField: 'name',
        actions: {
            item: ['edit', 'delete'],
            global: ['add']
        }
    },
    title: 'My Contacts'
};

// 2. Create the component
function createMyListComponent(element, data, config = {}) {
    const component = new ListComponent(element, data, {
        ...myListConfig,
        ...config
    });
    
    // 3. Add any custom enhancements
    component.myCustomMethod = function() {
        // Custom functionality
    };
    
    return component;
}

// 4. Use it
const myList = createMyListComponent(document.getElementById('my-list'), initialData);
```

## Basic List Component Creation

### Step 1: Set Up the Factory Function

Always use the factory function pattern for consistency and easier testing:

```javascript
/**
 * Factory function for creating a specialized list component
 * @param {HTMLElement} element - DOM element to attach to
 * @param {Array} data - Initial data array
 * @param {Object} config - Configuration overrides
 * @returns {ListComponent} Enhanced ListComponent instance
 */
function createMyListComponent(element, data, config = {}) {
    // Ensure framework is loaded
    if (typeof ListComponent === 'undefined') {
        throw new Error('ListComponent not found. Please ensure the MCP Web UI Framework is loaded.');
    }
    
    // Your component logic here...
    
    return component;
}
```

### Step 2: Define Your Configuration

Create a comprehensive configuration object that defines your component's behavior:

```javascript
const myListConfig = {
    list: {
        // Core item configuration
        itemType: 'my_item',           // Used for logging and error messages
        itemIdField: 'id',             // Field that contains the unique ID
        itemTextField: 'name',         // Primary field to display
        itemFields: ['name', 'status', 'category'], // All fields in your data
        
        // Layout and core features
        layout: 'list',                // 'list', 'grid', 'table'
        enableCRUD: true,              // Enable create, read, update, delete
        enableSearch: true,            // Enable search functionality
        enableFilters: false,          // Enable filtering
        enableSorting: true,           // Enable sorting
        enableBulkActions: false,      // Enable bulk operations
        
        // Actions configuration
        actions: {
            item: ['edit', 'delete'],                    // Per-item actions
            bulk: ['delete'],                            // Bulk actions (if enabled)
            global: ['add']                              // Global actions (add, import, etc.)
        },
        
        // Display configuration
        emptyStateMessage: 'No items found. Add your first item to get started!',
        confirmDeletes: true,          // Show confirmation before deleting
        showItemCount: true,           // Show item count in header
        showStats: false,              // Show statistics
        
        // Merge user configuration
        ...config.list
    },
    
    // Global configuration
    title: 'My Items',
    polling: {
        enabled: true,
        intervalMs: 5000
    },
    ...config
};
```

### Step 3: Create and Configure the Component

```javascript
// Create the base ListComponent with your configuration
const myComponent = new ListComponent(element, data, myListConfig);

// Log successful creation
myComponent.log('INFO', 'MyListComponent created successfully');

return myComponent;
```

## Configuration Architecture

### Form Configuration

Define forms for adding and editing items:

```javascript
forms: {
    add: {
        title: 'Add New Item',
        fields: [
            { 
                key: 'name', 
                label: 'Item Name', 
                type: 'text', 
                required: true, 
                placeholder: 'Enter item name...' 
            },
            { 
                key: 'category', 
                label: 'Category', 
                type: 'select', 
                required: false,
                options: [
                    { value: 'work', label: 'Work' },
                    { value: 'personal', label: 'Personal' },
                    { value: 'other', label: 'Other' }
                ]
            },
            { 
                key: 'priority', 
                label: 'Priority', 
                type: 'select', 
                required: false,
                options: ['low', 'medium', 'high']
            },
            { 
                key: 'dueDate', 
                label: 'Due Date', 
                type: 'date', 
                required: false 
            }
        ]
    },
    edit: {
        title: 'Edit Item',
        fields: [
            // Same fields as add form
        ]
    }
}
```

### Search Configuration

Configure search behavior:

```javascript
search: {
    placeholder: 'Search items...',
    debounceMs: 300,                    // Delay before search executes
    searchFields: ['name', 'category']  // Fields to search in
}
```

### Filter Configuration

Set up filtering options:

```javascript
filters: {
    defaultFilter: 'all',
    customFilters: [
        {
            key: 'category',
            label: 'Category',
            type: 'select',
            options: ['all', 'work', 'personal', 'other']
        },
        {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: [
                { value: 'all', label: 'All Items' },
                { value: 'active', label: 'Active' },
                { value: 'completed', label: 'Completed' }
            ]
        }
    ]
}
```

## Enhancement Patterns

### Pattern 1: Field Formatting

Override field formatting for custom display:

```javascript
// Enhanced field formatting
const originalFormatFieldValue = myComponent.formatFieldValue;
myComponent.formatFieldValue = function(value, field) {
    switch (field) {
        case 'priority':
            return this.formatPriorityBadge(value);
        case 'category':
            return this.formatCategoryBadge(value);
        case 'status':
            return this.formatStatusBadge(value);
        default:
            return originalFormatFieldValue.call(this, value, field);
    }
};

// Add custom formatting methods
myComponent.formatPriorityBadge = function(priority) {
    if (!priority) return '';
    
    const priorityConfig = {
        high: { color: '#dc2626', emoji: '🔴' },
        medium: { color: '#ea580c', emoji: '🟡' },
        low: { color: '#059669', emoji: '🟢' }
    };
    
    const config = priorityConfig[priority] || priorityConfig.medium;
    return `<span class="priority-badge priority-${priority}" style="background-color: ${config.color}">
        ${config.emoji} ${priority.toUpperCase()}
    </span>`;
};
```

### Pattern 2: Custom Actions

Add custom actions by overriding action handlers:

```javascript
// Custom item actions
const originalHandleItemAction = myComponent.handleItemAction;
myComponent.handleItemAction = async function(action, id) {
    if (action === 'duplicate') {
        await this.handleDuplicateItem(id);
    } else if (action === 'archive') {
        await this.handleArchiveItem(id);
    } else {
        return originalHandleItemAction.call(this, action, id);
    }
};

// Add custom action methods
myComponent.handleDuplicateItem = async function(id) {
    const item = this.findItemById(id);
    if (!item) return;
    
    const duplicatedData = {
        ...item,
        name: `${item.name} (copy)`,
        id: undefined // Let server generate new ID
    };
    
    try {
        await this.handleAction('add', duplicatedData);
        this.log('INFO', `Item duplicated: ${id}`);
    } catch (error) {
        this.handleError(error);
    }
};
```

### Pattern 3: Custom Sorting

Override sorting behavior:

```javascript
// Custom sorting logic
const originalApplySorting = myComponent.applySorting;
myComponent.applySorting = function(items) {
    if (!this.listState.sortColumn) {
        // Default smart sorting
        return this.smartSortItems(items);
    }
    return originalApplySorting.call(this, items);
};

myComponent.smartSortItems = function(items) {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    
    return [...items].sort((a, b) => {
        // Active items first
        if (a.status !== b.status) {
            return a.status === 'active' ? -1 : 1;
        }
        
        // Then by priority
        const aPriority = priorityOrder[a.priority] || 2;
        const bPriority = priorityOrder[b.priority] || 2;
        
        return bPriority - aPriority;
    });
};
```

### Pattern 4: Input Validation

Add custom validation:

```javascript
// Enhanced validation
const originalValidateInput = myComponent.validateInput || function(data) { return data; };
myComponent.validateInput = function(data) {
    const validated = originalValidateInput.call(this, data);
    
    // Custom validation rules
    if (validated.name) {
        validated.name = this.sanitize(validated.name.trim()).substring(0, 200);
    }
    
    if (validated.priority) {
        const validPriorities = ['low', 'medium', 'high'];
        validated.priority = validPriorities.includes(validated.priority) ? 
            validated.priority : 'medium';
    }
    
    return validated;
};
```

## Advanced Multi-Section Implementation

### When to Use Multi-Section Lists

Use multi-section lists when:
- Items have natural categories (completed/pending, priority levels, status groups)
- Users need to focus on specific subsets of data
- You want to reduce visual clutter by organizing related items
- Items have different workflows or states

### Basic Multi-Section Configuration

```javascript
const multiSectionConfig = {
    list: {
        // Enable multi-section mode
        mode: 'multi',
        
        // Simple grouping by a boolean field
        groupBy: 'completed',
        
        // Section configuration
        sections: {
            'false': {
                name: 'Active Items',
                icon: '📋',
                collapsible: false,
                sortOrder: 0
            },
            'true': {
                name: 'Completed Items',
                icon: '✅',
                collapsible: true,
                sortOrder: 1
            }
        },
        
        // Section transitions
        sectionTransitions: {
            enabled: true,
            duration: 300,
            easing: 'ease-in-out'
        }
    }
};
```

### Advanced Multi-Section Configuration

For complex grouping scenarios:

```javascript
const advancedMultiSectionConfig = {
    list: {
        mode: 'multi',
        
        // Use advanced sections for custom grouping logic
        advancedSections: [
            {
                id: 'urgent',
                name: 'Urgent',
                icon: '🚨',
                filter: (item) => item.priority === 'urgent' && !item.completed,
                sortOrder: 0,
                collapsible: false,
                actions: ['edit', 'delete', 'complete']
            },
            {
                id: 'high',
                name: 'High Priority',
                icon: '🔴',
                filter: (item) => item.priority === 'high' && !item.completed,
                sortOrder: 1,
                collapsible: false,
                actions: ['edit', 'delete', 'complete']
            },
            {
                id: 'normal',
                name: 'Normal',
                icon: '📋',
                filter: (item) => ['medium', 'low'].includes(item.priority) && !item.completed,
                sortOrder: 2,
                collapsible: true,
                actions: ['edit', 'delete', 'complete']
            },
            {
                id: 'completed',
                name: 'Completed',
                icon: '✅',
                filter: (item) => item.completed,
                sortOrder: 3,
                collapsible: true,
                actions: ['delete', 'restore']
            }
        ]
    }
};
```

### Multi-Section Enhancement Patterns

#### Pattern 1: Category-Based Sections

```javascript
function createCategorizedListComponent(element, data, config = {}) {
    const categorizedConfig = {
        list: {
            mode: 'multi',
            groupBy: 'category',
            sections: {
                'work': { name: 'Work', icon: '💼', sortOrder: 0 },
                'personal': { name: 'Personal', icon: '🏠', sortOrder: 1 },
                'other': { name: 'Other', icon: '📦', sortOrder: 2 }
            }
        }
    };
    
    const component = new ListComponent(element, data, categorizedConfig);
    
    // Add category-specific enhancements
    component.getCategoryOrder = function() {
        return ['work', 'personal', 'other'];
    };
    
    return component;
}
```

#### Pattern 2: Status-Based Workflow Sections

```javascript
function createWorkflowListComponent(element, data, config = {}) {
    const workflowConfig = {
        list: {
            mode: 'multi',
            advancedSections: [
                {
                    id: 'todo',
                    name: 'To Do',
                    icon: '📋',
                    filter: (item) => item.status === 'todo',
                    sortOrder: 0,
                    actions: ['edit', 'delete', 'start']
                },
                {
                    id: 'in_progress',
                    name: 'In Progress',
                    icon: '⚡',
                    filter: (item) => item.status === 'in_progress',
                    sortOrder: 1,
                    actions: ['edit', 'delete', 'complete']
                },
                {
                    id: 'completed',
                    name: 'Completed',
                    icon: '✅',
                    filter: (item) => item.status === 'completed',
                    sortOrder: 2,
                    collapsible: true,
                    actions: ['delete', 'restart']
                }
            ]
        }
    };
    
    const component = new ListComponent(element, data, workflowConfig);
    
    // Add workflow-specific actions
    component.handleStartItem = async function(id) {
        await this.handleAction('update', { id, status: 'in_progress' });
    };
    
    component.handleCompleteItem = async function(id) {
        await this.handleAction('update', { id, status: 'completed' });
    };
    
    return component;
}
```

### Multi-Section CSS Customization

```css
/* Section-specific styling */
.list-section[data-section="urgent"] .section-header {
    background-color: #fee2e2;
    border-left: 4px solid #dc2626;
}

.list-section[data-section="completed"] {
    opacity: 0.8;
}

.list-section[data-section="completed"] .list-item {
    background-color: #f0f9ff;
}

/* Section transitions */
.section-content {
    transition: all 0.3s ease-in-out;
}

.section-content.collapsed {
    max-height: 0;
    overflow: hidden;
    padding: 0;
}

/* Item transitions between sections */
.list-item.transitioning {
    transition: all 0.3s ease-in-out;
    transform: translateX(100%);
    opacity: 0.5;
}
```

## Testing and Validation

### Basic Testing Setup

```javascript
// Test your component configuration
function testMyListComponent() {
    const testElement = document.createElement('div');
    const testData = [
        { id: 1, name: 'Test Item 1', category: 'work', priority: 'high' },
        { id: 2, name: 'Test Item 2', category: 'personal', priority: 'low' }
    ];
    
    const component = createMyListComponent(testElement, testData);
    
    // Test basic functionality
    console.assert(component.data.length === 2, 'Data should be loaded');
    console.assert(component.listConfig.itemType === 'my_item', 'Item type should be set');
    console.assert(typeof component.handleAdd === 'function', 'Should have add handler');
    
    console.log('Basic tests passed!');
}
```

### Multi-Section Testing

```javascript
function testMultiSectionComponent() {
    const testElement = document.createElement('div');
    const testData = [
        { id: 1, name: 'Active Item', completed: false },
        { id: 2, name: 'Completed Item', completed: true }
    ];
    
    const component = createMyListComponent(testElement, testData, {
        list: { mode: 'multi', groupBy: 'completed' }
    });
    
    // Test section creation
    component.render();
    
    const sections = testElement.querySelectorAll('.list-section');
    console.assert(sections.length === 2, 'Should create 2 sections');
    
    const activeSection = testElement.querySelector('[data-section="false"]');
    const completedSection = testElement.querySelector('[data-section="true"]');
    
    console.assert(activeSection, 'Should have active section');
    console.assert(completedSection, 'Should have completed section');
    
    console.log('Multi-section tests passed!');
}
```

## Best Practices and Lessons Learned

### From GroceryListComponent Implementation

1. **Category Ordering**: Use `getCategoryOrder()` method to define logical ordering for categories
2. **Visual Badges**: Use emoji icons in badges for better visual recognition
3. **Quantity Formatting**: Handle quantity and unit display gracefully
4. **Auto-categorization**: Provide auto-detect options for categories

```javascript
// Good: Logical category ordering
component.getCategoryOrder = function() {
    return ['produce', 'dairy', 'meat', 'frozen', 'pantry'];
};

// Good: Visual badge formatting
component.formatCategoryBadge = function(category) {
    const icons = { produce: '🥕', dairy: '🥛', meat: '🥩' };
    const icon = icons[category] || '📦';
    return `<span class="category-badge">${icon} ${category}</span>`;
};
```

### From TodoListComponent Implementation

1. **Undo System**: Implement undo for destructive actions
2. **Smart Sorting**: Prioritize incomplete items and sort by priority
3. **Due Date Handling**: Format dates relationally (Today, Tomorrow, etc.)
4. **Priority Visualization**: Use color coding for priority levels

```javascript
// Good: Undo system for deletes
component.handleDeleteWithUndo = async function(id) {
    const item = this.findItemById(id);
    this.addUndoAction(id, 'delete', item);
    await this.handleAction('delete', { id });
};

// Good: Smart default sorting
component.smartSortItems = function(items) {
    return items.sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        return this.comparePriority(a.priority, b.priority);
    });
};
```

### Security Best Practices

1. **Input Sanitization**: Always sanitize user input
2. **Field Validation**: Validate all form fields
3. **XSS Prevention**: Use proper HTML escaping
4. **Data Validation**: Validate data types and ranges

```javascript
// Good: Input validation
component.validateInput = function(data) {
    return {
        name: this.sanitize(data.name || '').substring(0, 500),
        priority: ['low', 'medium', 'high'].includes(data.priority) ? data.priority : 'medium',
        category: this.sanitize(data.category || '').substring(0, 100)
    };
};
```

### Performance Best Practices

1. **Debounced Search**: Use debouncing for search inputs
2. **Efficient Filtering**: Cache filtered results when possible
3. **Pagination**: Implement pagination for large lists
4. **Lazy Loading**: Load data incrementally

```javascript
// Good: Debounced search
search: {
    debounceMs: 300,
    searchFields: ['name', 'category']
}

// Good: Efficient data processing
component.getProcessedItems = function() {
    if (this.shouldUseCache()) {
        return this.cachedData;
    }
    
    let items = this.applyFilters([...this.data]);
    items = this.applySorting(items);
    
    this.cachedData = items;
    return items;
};
```

## Common Pitfalls and Solutions

### Pitfall 1: Forgetting Framework Dependency

**Problem**: Component crashes because ListComponent is not available.

**Solution**: Always check for framework availability:

```javascript
// ❌ Bad: No dependency check
function createMyComponent(element, data, config) {
    return new ListComponent(element, data, config);
}

// ✅ Good: Check dependencies
function createMyComponent(element, data, config) {
    if (typeof ListComponent === 'undefined') {
        throw new Error('ListComponent not found. Please ensure the MCP Web UI Framework is loaded.');
    }
    return new ListComponent(element, data, config);
}
```

### Pitfall 2: Incorrect HTML Escaping

**Problem**: HTML content is double-escaped or not escaped properly.

**Solution**: Use `trustedHtml()` correctly:

```javascript
// ❌ Bad: Double escaping
renderItem(item) {
    return this.html`<div>${this.trustedHtml(this.html`<span>${item.name}</span>`)}</div>`;
}

// ✅ Good: Proper escaping
renderItem(item) {
    return this.html`<div><span>${item.name}</span></div>`;
}

// ✅ Good: Use trustedHtml for method results
renderItem(item) {
    return this.html`<div>${this.trustedHtml(this.renderItemContent(item))}</div>`;
}
```

### Pitfall 3: Missing Configuration Validation

**Problem**: Component breaks with invalid configuration.

**Solution**: Validate configuration and provide fallbacks:

```javascript
// ✅ Good: Configuration validation
function createMyComponent(element, data, config) {
    const validatedConfig = {
        list: {
            itemType: 'item',
            actions: { item: ['edit', 'delete'], global: ['add'] },
            ...config.list
        }
    };
    
    // Validate required fields
    if (!validatedConfig.list.itemType) {
        throw new Error('itemType is required');
    }
    
    return new ListComponent(element, data, validatedConfig);
}
```

### Pitfall 4: Memory Leaks in Multi-Section Components

**Problem**: Event listeners and timers not cleaned up properly.

**Solution**: Implement proper cleanup:

```javascript
// ✅ Good: Proper cleanup
const originalDestroy = component.destroy;
component.destroy = function() {
    // Clean up custom timers
    if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
    }
    
    // Clean up custom event listeners
    if (this.customEventHandler) {
        document.removeEventListener('customEvent', this.customEventHandler);
    }
    
    // Call original destroy
    originalDestroy.call(this);
};
```

### Pitfall 5: Inconsistent State Management

**Problem**: Component state becomes inconsistent during operations.

**Solution**: Use atomic state updates:

```javascript
// ❌ Bad: Inconsistent state updates
component.handleToggle = function(id) {
    const item = this.findItemById(id);
    item.completed = !item.completed; // Direct mutation
    this.render(); // State might be inconsistent
};

// ✅ Good: Atomic state updates
component.handleToggle = async function(id) {
    try {
        // Update server first
        await this.handleAction('toggle', { id });
        
        // Update local state only after server confirms
        const item = this.findItemById(id);
        if (item) {
            item.completed = !item.completed;
            this.render();
        }
    } catch (error) {
        // State remains consistent on error
        this.handleError(error);
    }
};
```

## Reference Examples

### Simple List Component

```javascript
// ContactListComponent.js
function createContactListComponent(element, data, config = {}) {
    if (typeof ListComponent === 'undefined') {
        throw new Error('ListComponent not found.');
    }
    
    const contactConfig = {
        list: {
            itemType: 'contact',
            itemTextField: 'name',
            itemFields: ['name', 'email', 'phone', 'category'],
            actions: { item: ['edit', 'delete'], global: ['add'] },
            forms: {
                add: {
                    title: 'Add Contact',
                    fields: [
                        { key: 'name', label: 'Name', type: 'text', required: true },
                        { key: 'email', label: 'Email', type: 'email', required: true },
                        { key: 'phone', label: 'Phone', type: 'tel', required: false },
                        { key: 'category', label: 'Category', type: 'select', 
                          options: ['work', 'personal', 'other'] }
                    ]
                }
            }
        },
        title: 'Contacts'
    };
    
    return new ListComponent(element, data, contactConfig);
}
```

### Multi-Section List Component

```javascript
// ProjectListComponent.js
function createProjectListComponent(element, data, config = {}) {
    if (typeof ListComponent === 'undefined') {
        throw new Error('ListComponent not found.');
    }
    
    const projectConfig = {
        list: {
            mode: 'multi',
            itemType: 'project',
            advancedSections: [
                {
                    id: 'active',
                    name: 'Active Projects',
                    icon: '🚀',
                    filter: (item) => item.status === 'active',
                    sortOrder: 0,
                    collapsible: false
                },
                {
                    id: 'completed',
                    name: 'Completed Projects',
                    icon: '✅',
                    filter: (item) => item.status === 'completed',
                    sortOrder: 1,
                    collapsible: true
                }
            ]
        }
    };
    
    const component = new ListComponent(element, data, projectConfig);
    
    // Add project-specific enhancements
    component.getProjectStats = function() {
        return {
            active: this.data.filter(p => p.status === 'active').length,
            completed: this.data.filter(p => p.status === 'completed').length
        };
    };
    
    return component;
}
```

## Conclusion

This guide provides the foundation for creating robust, reusable list components in the MCP Web UI framework. By following these patterns and avoiding common pitfalls, you can create components that are:

- **Maintainable**: Easy to understand and modify
- **Reusable**: Configurable for different use cases
- **Secure**: Following established security practices
- **Performant**: Optimized for smooth user experience
- **Testable**: Easy to test and validate

Remember: Start simple with basic configuration, then add complexity incrementally. The ListComponent provides a solid foundation that can be enhanced rather than replaced.

---

*For additional examples and updates, see the existing implementations in the codebase:*
- `GroceryListComponent.js` - Category-based grocery list
- `TodoListComponent.js` - Priority-based todo list with undo system
- `ListComponent.js` - Generic base component with multi-section support 