# MCP Server UI CSS Style Guide

## Table of Contents
1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Layout & Spacing](#layout--spacing)
5. [Component Architecture](#component-architecture)
6. [Interactive Elements](#interactive-elements)
7. [Responsive Design](#responsive-design)
8. [Animations & Transitions](#animations--transitions)
9. [Accessibility](#accessibility)
10. [Best Practices](#best-practices)

## Design Philosophy

### Core Principles
- **Clarity First**: Every element should have a clear purpose and visual hierarchy
- **Progressive Enhancement**: Start with functional basics, then enhance visually
- **Consistency**: Reuse patterns and components across all MCP servers
- **Accessibility**: Design for all users from the ground up
- **Performance**: Optimize for fast loading and smooth interactions

### Visual Language
- **Modern & Clean**: Minimal design with purposeful use of space
- **Engaging**: Subtle animations and interactions that delight users
- **Professional**: Balanced color palette with clear information hierarchy
- **Contextual**: Adapt to the specific domain while maintaining consistency

## Color System

### CSS Custom Properties Structure
```css
:root {
    /* Brand Colors - Customize per MCP server */
    --primary: #6366f1;
    --primary-hover: #5856eb;
    --primary-light: #eef2ff;
    --secondary: #10b981;
    --secondary-hover: #059669;
    --accent: #f59e0b;
    --accent-light: #fef3c7;

    /* Semantic Colors - Keep consistent */
    --success: #10b981;
    --warning: #f59e0b;
    --error: #ef4444;
    --info: #3b82f6;

    /* Priority/Status Colors */
    --priority-urgent: linear-gradient(135deg, #ef4444, #dc2626);
    --priority-high: linear-gradient(135deg, #f97316, #ea580c);
    --priority-medium: linear-gradient(135deg, #eab308, #ca8a04);
    --priority-low: linear-gradient(135deg, #10b981, #059669);

    /* Neutral Palette */
    --gray-50: #f9fafb;
    --gray-100: #f3f4f6;
    --gray-200: #e5e7eb;
    --gray-300: #d1d5db;
    --gray-500: #6b7280;
    --gray-700: #374151;
    --gray-900: #1f2937;

    /* Shadows */
    --shadow-soft: 0 1px 3px rgba(0, 0, 0, 0.1);
    --shadow-medium: 0 4px 6px rgba(0, 0, 0, 0.15);
    --shadow-strong: 0 10px 15px rgba(0, 0, 0, 0.2);
    --shadow-glow: 0 0 20px rgba(0, 0, 0, 0.3);
}
```

### Color Usage Guidelines
- **Primary**: Main actions, navigation, key CTAs
- **Secondary**: Supporting actions, success states
- **Accent**: Highlights, notifications, special elements
- **Gray Scale**: Text, borders, backgrounds, subtle elements

## Typography

### Font System
```css
:root {
    /* Font Families */
    --font-primary: system-ui, -apple-system, "Segoe UI", sans-serif;
    --font-mono: "SF Mono", Monaco, "Cascadia Code", monospace;

    /* Font Sizes */
    --text-xs: 0.75rem;    /* 12px */
    --text-sm: 0.875rem;   /* 14px */
    --text-base: 1rem;     /* 16px */
    --text-lg: 1.125rem;   /* 18px */
    --text-xl: 1.25rem;    /* 20px */
    --text-2xl: 1.5rem;    /* 24px */
    --text-3xl: 1.875rem;  /* 30px */
    --text-4xl: 2.25rem;   /* 36px */

    /* Line Heights */
    --leading-tight: 1.25;
    --leading-normal: 1.5;
    --leading-relaxed: 1.75;

    /* Font Weights */
    --font-light: 300;
    --font-normal: 400;
    --font-medium: 500;
    --font-semibold: 600;
    --font-bold: 700;
}
```

### Typography Hierarchy
```css
.heading-1 { font-size: var(--text-4xl); font-weight: var(--font-bold); }
.heading-2 { font-size: var(--text-3xl); font-weight: var(--font-semibold); }
.heading-3 { font-size: var(--text-2xl); font-weight: var(--font-semibold); }
.body-large { font-size: var(--text-lg); font-weight: var(--font-normal); }
.body { font-size: var(--text-base); font-weight: var(--font-normal); }
.body-small { font-size: var(--text-sm); font-weight: var(--font-normal); }
.caption { font-size: var(--text-xs); font-weight: var(--font-medium); }
```

## Layout & Spacing

### Spacing System
```css
:root {
    --space-1: 0.25rem;  /* 4px */
    --space-2: 0.5rem;   /* 8px */
    --space-3: 0.75rem;  /* 12px */
    --space-4: 1rem;     /* 16px */
    --space-5: 1.25rem;  /* 20px */
    --space-6: 1.5rem;   /* 24px */
    --space-8: 2rem;     /* 32px */
    --space-10: 2.5rem;  /* 40px */
    --space-12: 3rem;    /* 48px */
    --space-16: 4rem;    /* 64px */
}
```

### Container System
```css
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 var(--space-4);
}

.container-narrow {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 var(--space-4);
}

.container-wide {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 var(--space-4);
}
```

### Grid System
```css
.grid {
    display: grid;
    gap: var(--space-6);
}

.grid-2 { grid-template-columns: repeat(2, 1fr); }
.grid-3 { grid-template-columns: repeat(3, 1fr); }
.grid-auto { grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
```

## Component Architecture

### Base Component Structure
```css
.component {
    background: white;
    border-radius: 16px;
    box-shadow: var(--shadow-medium);
    border: 1px solid var(--gray-200);
    overflow: hidden;
}

.component-header {
    background: linear-gradient(135deg, var(--primary-light), var(--gray-50));
    padding: var(--space-6) var(--space-8);
    border-bottom: 2px solid var(--gray-100);
}

.component-content {
    padding: var(--space-8);
}

.component-footer {
    padding: var(--space-6) var(--space-8);
    border-top: 1px solid var(--gray-100);
    background: var(--gray-50);
}
```

### Header Pattern
```css
.header {
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    color: white;
    padding: var(--space-8);
    text-align: center;
    box-shadow: var(--shadow-medium);
}

.header h1 {
    margin: 0 0 var(--space-2) 0;
    font-size: var(--text-4xl);
    font-weight: var(--font-bold);
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header .description {
    margin: 0 0 var(--space-4) 0;
    font-size: var(--text-lg);
    opacity: 0.9;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
}
```

## Interactive Elements

### Button System
```css
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-6);
    border: none;
    border-radius: 12px;
    font-weight: var(--font-semibold);
    font-size: var(--text-base);
    cursor: pointer;
    transition: all 0.3s ease;
    text-decoration: none;
    position: relative;
    overflow: hidden;
}

.btn-primary {
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    color: white;
    box-shadow: var(--shadow-medium);
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-strong);
}

.btn-secondary {
    background: var(--gray-100);
    color: var(--gray-700);
    border: 1px solid var(--gray-200);
}

.btn-secondary:hover {
    background: var(--gray-200);
    transform: translateY(-1px);
}
```

### Form Elements
```css
.form-group {
    margin-bottom: var(--space-6);
}

.form-label {
    display: block;
    color: var(--gray-700);
    font-weight: var(--font-semibold);
    margin-bottom: var(--space-2);
    font-size: var(--text-base);
}

.form-control {
    width: 100%;
    padding: var(--space-4) var(--space-5);
    border: 2px solid var(--gray-200);
    border-radius: 12px;
    font-size: var(--text-base);
    transition: all 0.3s ease;
    background: var(--gray-50);
    box-sizing: border-box;
}

.form-control:focus {
    outline: none;
    border-color: var(--primary);
    background: white;
    box-shadow: 0 0 0 3px rgba(var(--primary), 0.1);
    transform: translateY(-1px);
}
```

### Badge System
```css
.badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-3);
    border-radius: 20px;
    font-size: var(--text-xs);
    font-weight: var(--font-semibold);
    text-transform: uppercase;
    letter-spacing: 0.025em;
}

.badge-priority-urgent {
    background: var(--priority-urgent);
    color: white;
    animation: urgentPulse 2s infinite;
}

.badge-priority-high { background: var(--priority-high); color: white; }
.badge-priority-medium { background: var(--priority-medium); color: white; }
.badge-priority-low { background: var(--priority-low); color: white; }
```

## Responsive Design

### Breakpoint System
```css
:root {
    --bp-sm: 640px;
    --bp-md: 768px;
    --bp-lg: 1024px;
    --bp-xl: 1280px;
}

/* Mobile-first approach */
@media (max-width: 767px) { /* Mobile */ }
@media (min-width: 768px) { /* Tablet */ }
@media (min-width: 1024px) { /* Desktop */ }
@media (min-width: 1280px) { /* Large desktop */ }
```

### Mobile Patterns
```css
@media (max-width: 767px) {
    .header {
        padding: var(--space-6) var(--space-4);
    }
    
    .component {
        margin: var(--space-4);
        border-radius: 12px;
    }
    
    .btn {
        width: 100%;
        justify-content: center;
    }
    
    .grid-2,
    .grid-3 {
        grid-template-columns: 1fr;
    }
}
```

## Animations & Transitions

### Animation System
```css
:root {
    --duration-fast: 0.15s;
    --duration-normal: 0.3s;
    --duration-slow: 0.5s;
    --easing-standard: cubic-bezier(0.4, 0.0, 0.2, 1);
    --easing-bounce: cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* Standard transitions */
.transition {
    transition: all var(--duration-normal) var(--easing-standard);
}

/* Hover effects */
.hover-lift:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-strong);
}

.hover-scale:hover {
    transform: scale(1.05);
}
```

### Keyframe Animations
```css
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from { 
        transform: translateY(20px);
        opacity: 0;
    }
    to { 
        transform: translateY(0);
        opacity: 1;
    }
}

@keyframes urgentPulse {
    0%, 100% { box-shadow: 0 0 5px rgba(239, 68, 68, 0.4); }
    50% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.8); }
}
```

## Accessibility

### Focus Management
```css
.focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
}

.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}
```

### Color Contrast
- Ensure minimum 4.5:1 contrast ratio for normal text
- Ensure minimum 3:1 contrast ratio for large text
- Use tools like WebAIM Color Contrast Checker

### Interactive Elements
- Minimum 44px touch target size
- Clear focus indicators
- Semantic HTML structure
- ARIA labels where needed

## Best Practices

### CSS Organization
1. **Use CSS Custom Properties** for consistency and themability
2. **Mobile-first** responsive design approach
3. **Component-based** architecture with clear naming
4. **Logical property order**: positioning, box model, typography, visual, misc

### Performance
1. **Minimize CSS bundle size** through efficient selectors
2. **Use `transform` and `opacity`** for animations
3. **Avoid layout thrashing** with `contain` property
4. **Optimize critical CSS** for above-the-fold content

### Naming Conventions
```css
/* Block Element Modifier (BEM) style */
.component-name { }
.component-name__element { }
.component-name--modifier { }

/* Utility classes */
.u-text-center { text-align: center; }
.u-margin-bottom-4 { margin-bottom: var(--space-4); }
```

### Code Quality
1. **Consistent formatting** with tools like Prettier
2. **Logical grouping** of related properties
3. **Meaningful comments** for complex calculations
4. **Vendor prefixes** only when necessary

## Dark Mode Support

```css
@media (prefers-color-scheme: dark) {
    :root {
        --gray-50: #1f2937;
        --gray-100: #374151;
        --gray-200: #4b5563;
        /* Adjust other colors as needed */
    }
}
```

## Testing Checklist

- [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsiveness on various screen sizes
- [ ] Keyboard navigation functionality
- [ ] Screen reader compatibility
- [ ] Color contrast compliance
- [ ] Performance impact assessment
- [ ] Print styles (if applicable)

---

*This style guide should be treated as a living document and updated as new patterns emerge and requirements change.* 