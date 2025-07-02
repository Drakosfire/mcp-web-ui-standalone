/**
 * Unit tests for DashboardComponent
 * Tests component rendering, data handling, animations, and configurations
 */

// Load the mock BaseComponent
require('../__mocks__/BaseComponent');

// Load the actual component (we'll need to load the file content)
const fs = require('fs');
const path = require('path');

// Load DashboardComponent source
const componentPath = path.join(__dirname, '../../src/vanilla/components/DashboardComponent.js');
const componentSource = fs.readFileSync(componentPath, 'utf8');
eval(componentSource);

describe('DashboardComponent', () => {
    let container;
    let component;

    beforeEach(() => {
        container = createTestElement('div', { id: 'test-dashboard' });
    });

    afterEach(() => {
        if (component) {
            component.destroy();
            component = null;
        }
        cleanupDOM();
    });

    describe('Initialization', () => {
        test('should initialize with default configuration', () => {
            component = new DashboardComponent(container, [], {});

            expect(component.componentConfig.layout).toBe('grid');
            expect(component.componentConfig.columns).toBe(4);
            expect(component.componentConfig.showIcons).toBe(true);
            expect(component.componentConfig.animateCounters).toBe(true);
        });

        test('should merge custom configuration', () => {
            const customConfig = {
                dashboard: {
                    layout: 'horizontal',
                    columns: 6,
                    showIcons: false,
                    animateCounters: false
                }
            };

            component = new DashboardComponent(container, [], customConfig);

            expect(component.componentConfig.layout).toBe('horizontal');
            expect(component.componentConfig.columns).toBe(6);
            expect(component.componentConfig.showIcons).toBe(false);
            expect(component.componentConfig.animateCounters).toBe(false);
        });

        test('should initialize animation tracking maps', () => {
            component = new DashboardComponent(container, [], {});

            expect(component.animatedValues).toBeInstanceOf(Map);
            expect(component.animationFrames).toBeInstanceOf(Map);
        });
    });

    describe('Data Validation', () => {
        test('should handle valid metric data', () => {
            const testData = [
                { key: 'total', label: 'Total', value: 10, icon: '📊' },
                { key: 'active', label: 'Active', value: 8, icon: '✅' }
            ];

            component = new DashboardComponent(container, testData, {});

            expect(component.data).toEqual(testData);
        });

        test('should validate and sanitize metric data', () => {
            const maliciousData = [
                {
                    key: '<script>alert("xss")</script>',
                    label: 'Total<script>alert("xss")</script>',
                    value: 'invalid',
                    icon: '<img src=x onerror=alert("xss")>',
                    trend: 'invalid-trend',
                    className: 'malicious<script>alert("xss")</script>'
                }
            ];

            component = new DashboardComponent(container, maliciousData, {});

            // Get the first metric from the rendered content
            const metricCard = container.querySelector('.metric-card');
            expect(metricCard).toBeTruthy();

            // Check that malicious content was sanitized
            expect(metricCard.innerHTML).not.toContain('<script>');
            expect(metricCard.innerHTML).not.toContain('onerror');
        });

        test('should handle empty data gracefully', () => {
            component = new DashboardComponent(container, [], {});

            const emptyState = container.querySelector('.dashboard-empty');
            expect(emptyState).toBeTruthy();
            expect(emptyState.textContent).toContain('No metrics available');
        });

        test('should handle invalid data types', () => {
            component = new DashboardComponent(container, 'invalid', {});

            const emptyState = container.querySelector('.dashboard-empty');
            expect(emptyState).toBeTruthy();
        });
    });

    describe('Rendering', () => {
        test('should render dashboard with metrics', () => {
            const testData = generateMockMetrics(3);
            component = new DashboardComponent(container, testData, {});

            const dashboard = container.querySelector('.component-dashboard');
            expect(dashboard).toBeTruthy();

            const grid = container.querySelector('.dashboard-grid');
            expect(grid).toBeTruthy();

            const metricCards = container.querySelectorAll('.metric-card');
            expect(metricCards).toHaveLength(3);
        });

        test('should apply correct layout class', () => {
            component = new DashboardComponent(container, [], {
                dashboard: { layout: 'horizontal' }
            });

            const dashboard = container.querySelector('.component-dashboard');
            expect(dashboard.classList.contains('layout-horizontal')).toBe(true);
        });

        test('should set grid columns correctly', () => {
            component = new DashboardComponent(container, [], {
                dashboard: { columns: 6 }
            });

            const grid = container.querySelector('.dashboard-grid');
            expect(grid.style.gridTemplateColumns).toContain('6');
        });

        test('should render metric cards with all elements', () => {
            const testData = [{
                key: 'test',
                label: 'Test Metric',
                value: 42,
                icon: '📊',
                subtitle: 'Test subtitle',
                trend: 'up',
                description: 'Test description'
            }];

            component = new DashboardComponent(container, testData, {});

            const metricCard = container.querySelector('.metric-card');

            // Check all elements are present
            expect(metricCard.querySelector('.metric-icon')).toBeTruthy();
            expect(metricCard.querySelector('.metric-value')).toBeTruthy();
            expect(metricCard.querySelector('.metric-label')).toBeTruthy();
            expect(metricCard.querySelector('.metric-subtitle')).toBeTruthy();
            expect(metricCard.querySelector('.metric-trend')).toBeTruthy();

            // Check content
            expect(metricCard.querySelector('.metric-value').textContent).toBe('42');
            expect(metricCard.querySelector('.metric-label').textContent).toBe('Test Metric');
            expect(metricCard.querySelector('.metric-subtitle').textContent).toBe('Test subtitle');
        });

        test('should conditionally show/hide icons', () => {
            const testData = [{ key: 'test', label: 'Test', value: 10, icon: '📊' }];

            // With icons
            component = new DashboardComponent(container, testData, {
                dashboard: { showIcons: true }
            });
            expect(container.querySelector('.metric-icon')).toBeTruthy();

            component.destroy();
            cleanupDOM();
            container = createTestElement('div');

            // Without icons
            component = new DashboardComponent(container, testData, {
                dashboard: { showIcons: false }
            });
            expect(container.querySelector('.metric-icon')).toBeFalsy();
        });

        test('should handle error state gracefully', () => {
            component = new DashboardComponent(container, [], {});

            // Simulate render error by making element null
            component.element = null;
            component.render();

            // Should not throw error
            expect(component.isDestroyed).toBe(false);
        });
    });

    describe('Metric Validation', () => {
        test('should validate metric object correctly', () => {
            component = new DashboardComponent(container, [], {});

            const validMetric = {
                key: 'test',
                label: 'Test Metric',
                value: 42,
                icon: '📊',
                trend: 'up'
            };

            const result = component.validateMetric(validMetric);

            expect(result.key).toBe('test');
            expect(result.label).toBe('Test Metric');
            expect(result.value).toBe(42);
            expect(result.icon).toBe('📊');
            expect(result.trend).toBe('up');
        });

        test('should handle null/undefined metric', () => {
            component = new DashboardComponent(container, [], {});

            const result = component.validateMetric(null);

            expect(result.key).toBe('unknown');
            expect(result.label).toBe('Unknown Metric');
            expect(result.value).toBe(0);
            expect(result.icon).toBe('❓');
        });

        test('should sanitize numeric values correctly', () => {
            component = new DashboardComponent(container, [], {});

            expect(component.sanitizeNumericValue(42)).toBe(42);
            expect(component.sanitizeNumericValue('42')).toBe(42);
            expect(component.sanitizeNumericValue('invalid')).toBe('invalid');
            expect(component.sanitizeNumericValue(null)).toBe(0);
        });

        test('should sanitize trend values', () => {
            component = new DashboardComponent(container, [], {});

            expect(component.sanitizeTrend('up')).toBe('up');
            expect(component.sanitizeTrend('down')).toBe('down');
            expect(component.sanitizeTrend('neutral')).toBe('neutral');
            expect(component.sanitizeTrend('invalid')).toBe('');
        });

        test('should sanitize class names', () => {
            component = new DashboardComponent(container, [], {});

            expect(component.sanitizeClassName('valid-class')).toBe('valid-class');
            expect(component.sanitizeClassName('valid_class')).toBe('valid_class');
            expect(component.sanitizeClassName('<script>alert("xss")</script>')).toBe('scriptalertxssscript');
        });

        test('should sanitize icons', () => {
            component = new DashboardComponent(container, [], {});

            expect(component.sanitizeIcon('📊')).toBe('📊');
            expect(component.sanitizeIcon('<script>alert("xss")</script>')).toBe('scriptalertxssscript');
            expect(component.sanitizeIcon('verylongiconstringthatshouldbetruncat')).toHaveLength(10);
        });
    });

    describe('Animations', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should animate counters when enabled', () => {
            const testData = [{ key: 'test', label: 'Test', value: 100 }];

            component = new DashboardComponent(container, testData, {
                dashboard: { animateCounters: true }
            });

            expect(requestAnimationFrame).toHaveBeenCalled();
        });

        test('should not animate counters when disabled', () => {
            const testData = [{ key: 'test', label: 'Test', value: 100 }];

            requestAnimationFrame.mockClear();

            component = new DashboardComponent(container, testData, {
                dashboard: { animateCounters: false }
            });

            expect(requestAnimationFrame).not.toHaveBeenCalled();
        });

        test('should format animated values correctly', () => {
            component = new DashboardComponent(container, [], {});

            // Integer target should show integers during animation
            expect(component.formatAnimatedValue(42.7, 100)).toBe('43');

            // Decimal target should match decimal places
            expect(component.formatAnimatedValue(42.567, 100.50)).toBe('42.57');
        });

        test('should use correct easing function', () => {
            component = new DashboardComponent(container, [], {});

            expect(component.easeOutCubic(0)).toBe(0);
            expect(component.easeOutCubic(1)).toBe(1);
            expect(component.easeOutCubic(0.5)).toBeGreaterThan(0.5); // Should ease out
        });

        test('should cancel animations on update', () => {
            const testData = [{ key: 'test', label: 'Test', value: 100 }];
            component = new DashboardComponent(container, testData, {});

            // Set up mock animation frame
            component.animationFrames.set('test', 123);

            const cancelSpy = jest.spyOn(window, 'cancelAnimationFrame');

            component.update([]);

            expect(cancelSpy).toHaveBeenCalledWith(123);
            expect(component.animationFrames.size).toBe(0);
        });
    });

    describe('Event Handling', () => {
        test('should handle hover events when enabled', () => {
            const testData = [{ key: 'test', label: 'Test', value: 10 }];
            component = new DashboardComponent(container, testData, {
                dashboard: { enableHover: true }
            });

            const metricCard = container.querySelector('.metric-card');

            // Simulate mouseenter
            const mouseEnterEvent = new MouseEvent('mouseenter', { bubbles: true });
            metricCard.dispatchEvent(mouseEnterEvent);

            expect(metricCard.classList.contains('metric-hover')).toBe(true);

            // Simulate mouseleave
            const mouseLeaveEvent = new MouseEvent('mouseleave', { bubbles: true });
            metricCard.dispatchEvent(mouseLeaveEvent);

            expect(metricCard.classList.contains('metric-hover')).toBe(false);
        });

        test('should not handle hover events when disabled', () => {
            const testData = [{ key: 'test', label: 'Test', value: 10 }];
            component = new DashboardComponent(container, testData, {
                dashboard: { enableHover: false }
            });

            const metricCard = container.querySelector('.metric-card');

            // Simulate mouseenter
            const mouseEnterEvent = new MouseEvent('mouseenter', { bubbles: true });
            metricCard.dispatchEvent(mouseEnterEvent);

            expect(metricCard.classList.contains('metric-hover')).toBe(false);
        });
    });

    describe('Lifecycle Management', () => {
        test('should clean up animations on destroy', () => {
            component = new DashboardComponent(container, [], {});

            // Set up mock animation frames
            component.animationFrames.set('test1', 123);
            component.animationFrames.set('test2', 456);

            const cancelSpy = jest.spyOn(window, 'cancelAnimationFrame');

            component.destroy();

            expect(cancelSpy).toHaveBeenCalledWith(123);
            expect(cancelSpy).toHaveBeenCalledWith(456);
            expect(component.animationFrames.size).toBe(0);
        });

        test('should update data correctly', () => {
            const initialData = [{ key: 'test1', label: 'Test 1', value: 10 }];
            const newData = [
                { key: 'test1', label: 'Test 1', value: 20 },
                { key: 'test2', label: 'Test 2', value: 30 }
            ];

            component = new DashboardComponent(container, initialData, {});

            expect(container.querySelectorAll('.metric-card')).toHaveLength(1);

            component.update(newData);

            expect(container.querySelectorAll('.metric-card')).toHaveLength(2);
            expect(component.data).toEqual(newData);
        });
    });

    describe('Trend Icons', () => {
        test('should return correct trend icons', () => {
            component = new DashboardComponent(container, [], {});

            expect(component.getTrendIcon('up')).toBe('↗️');
            expect(component.getTrendIcon('down')).toBe('↘️');
            expect(component.getTrendIcon('neutral')).toBe('→');
            expect(component.getTrendIcon('invalid')).toBe('');
        });
    });

    describe('Empty State', () => {
        test('should render empty state correctly', () => {
            component = new DashboardComponent(container, [], {});

            const emptyState = container.querySelector('.dashboard-empty');
            expect(emptyState).toBeTruthy();

            const icon = emptyState.querySelector('.empty-icon');
            const text = emptyState.querySelector('p');

            expect(icon.textContent).toBe('📊');
            expect(text.textContent).toBe('No metrics available');
        });
    });

    describe('Error Handling', () => {
        test('should handle render errors gracefully', () => {
            component = new DashboardComponent(container, [], {});

            // Force an error by making validateScheduleData throw
            const originalValidate = component.validateMetric;
            component.validateMetric = () => {
                throw new Error('Test error');
            };

            // Should not throw
            expect(() => component.render()).not.toThrow();

            // Should show error state
            const errorState = container.querySelector('.dashboard-error');
            expect(errorState).toBeTruthy();
            expect(errorState.textContent).toContain('Error loading dashboard metrics');

            // Restore original method
            component.validateMetric = originalValidate;
        });
    });
}); 