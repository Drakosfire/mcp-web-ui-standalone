/**
 * Unit tests for StatusComponent
 * Tests component rendering, status handling, progress indicators, and configurations
 */

// Load the mock BaseComponent
require('../__mocks__/BaseComponent');

// Load the actual component
const fs = require('fs');
const path = require('path');

// Load StatusComponent source
const componentPath = path.join(__dirname, '../../src/vanilla/components/StatusComponent.js');
const componentSource = fs.readFileSync(componentPath, 'utf8');
eval(componentSource);

describe('StatusComponent', () => {
    let container;
    let component;

    beforeEach(() => {
        container = createTestElement('div', { id: 'test-status' });
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
            component = new StatusComponent(container, {}, {});

            expect(component.componentConfig.showIcon).toBe(true);
            expect(component.componentConfig.showProgress).toBe(false);
            expect(component.componentConfig.mode).toBe('badge');
            expect(component.componentConfig.size).toBe('medium');
            expect(component.componentConfig.animated).toBe(true);
        });

        test('should merge custom configuration', () => {
            const customConfig = {
                status: {
                    showIcon: false,
                    showProgress: true,
                    mode: 'block',
                    size: 'large',
                    clickable: true
                }
            };

            component = new StatusComponent(container, {}, customConfig);

            expect(component.componentConfig.showIcon).toBe(false);
            expect(component.componentConfig.showProgress).toBe(true);
            expect(component.componentConfig.mode).toBe('block');
            expect(component.componentConfig.size).toBe('large');
            expect(component.componentConfig.clickable).toBe(true);
        });
    });

    describe('Data Normalization', () => {
        test('should handle string input', () => {
            component = new StatusComponent(container, 'active', {});

            const normalized = component.normalizeStatusData('active');
            expect(normalized.status).toBe('active');
        });

        test('should handle object input', () => {
            const statusData = {
                status: 'running',
                progress: 75,
                description: 'Task is running',
                timestamp: '2024-01-01T00:00:00Z'
            };

            component = new StatusComponent(container, statusData, {});

            const normalized = component.normalizeStatusData(statusData);
            expect(normalized.status).toBe('running');
            expect(normalized.progress).toBe(75);
            expect(normalized.description).toBe('Task is running');
        });

        test('should handle invalid input', () => {
            component = new StatusComponent(container, null, {});

            const normalized = component.normalizeStatusData(null);
            expect(normalized.status).toBe('unknown');
        });
    });

    describe('Status Configuration', () => {
        test('should return correct default status config', () => {
            component = new StatusComponent(container, {}, {});

            const activeConfig = component.getDefaultStatusConfig('active');
            expect(activeConfig.class).toBe('status-active');
            expect(activeConfig.icon).toBe('✅');
            expect(activeConfig.label).toBe('Active');
            expect(activeConfig.description).toBe('Currently active and running');
        });

        test('should return unknown config for invalid status', () => {
            component = new StatusComponent(container, {}, {});

            const unknownConfig = component.getDefaultStatusConfig('invalid-status');
            expect(unknownConfig.class).toBe('status-unknown');
            expect(unknownConfig.icon).toBe('❓');
            expect(unknownConfig.label).toBe('invalid-status');
        });

        test('should merge custom status mappings', () => {
            const customConfig = {
                status: {
                    statusMap: {
                        'custom': {
                            class: 'status-custom',
                            icon: '⭐',
                            label: 'Custom Status',
                            description: 'Custom description'
                        }
                    }
                }
            };

            component = new StatusComponent(container, {}, customConfig);

            const customStatus = component.getStatusConfig('custom');
            expect(customStatus.class).toBe('status-custom');
            expect(customStatus.icon).toBe('⭐');
            expect(customStatus.label).toBe('Custom Status');
        });
    });

    describe('Rendering', () => {
        test('should render status badge', () => {
            component = new StatusComponent(container, { status: 'active' }, {});

            const statusBadge = container.querySelector('.status-badge');
            expect(statusBadge).toBeTruthy();
            expect(statusBadge.classList.contains('status-active')).toBe(true);

            const icon = statusBadge.querySelector('.status-icon');
            const label = statusBadge.querySelector('.status-label');

            expect(icon.textContent).toBe('✅');
            expect(label.textContent).toBe('Active');
        });

        test('should apply size classes correctly', () => {
            component = new StatusComponent(container, { status: 'active' }, {
                status: { size: 'large' }
            });

            const statusComponent = container.querySelector('.component-status');
            expect(statusComponent.classList.contains('size-large')).toBe(true);
        });

        test('should apply mode classes correctly', () => {
            component = new StatusComponent(container, { status: 'active' }, {
                status: { mode: 'block' }
            });

            const statusComponent = container.querySelector('.component-status');
            expect(statusComponent.classList.contains('mode-block')).toBe(true);
        });

        test('should conditionally show/hide icons', () => {
            // With icons
            component = new StatusComponent(container, { status: 'active' }, {
                status: { showIcon: true }
            });
            expect(container.querySelector('.status-icon')).toBeTruthy();

            component.destroy();
            cleanupDOM();
            container = createTestElement('div');

            // Without icons
            component = new StatusComponent(container, { status: 'active' }, {
                status: { showIcon: false }
            });
            expect(container.querySelector('.status-icon')).toBeFalsy();
        });

        test('should render progress when enabled', () => {
            component = new StatusComponent(container, {
                status: 'running',
                progress: 75
            }, {
                status: { showProgress: true }
            });

            const progress = container.querySelector('.status-progress');
            expect(progress).toBeTruthy();

            const progressFill = container.querySelector('.progress-fill');
            expect(progressFill.dataset.progress).toBe('75');
        });

        test('should render description when provided', () => {
            component = new StatusComponent(container, {
                status: 'active',
                description: 'Test description'
            }, {
                status: { showDescription: true }
            });

            const description = container.querySelector('.status-description');
            expect(description).toBeTruthy();
            expect(description.textContent).toContain('Test description');
        });
    });

    describe('Progress Handling', () => {
        test('should sanitize progress values correctly', () => {
            component = new StatusComponent(container, {}, {});

            expect(component.sanitizeProgress(50)).toBe(50);
            expect(component.sanitizeProgress('75')).toBe(75);
            expect(component.sanitizeProgress('invalid')).toBe(0);
            expect(component.sanitizeProgress(-10)).toBe(0);
            expect(component.sanitizeProgress(150)).toBe(100);
            expect(component.sanitizeProgress(42.7)).toBe(43);
        });

        test('should animate progress when enabled', () => {
            component = new StatusComponent(container, {
                status: 'running',
                progress: 75
            }, {
                status: {
                    showProgress: true,
                    progressConfig: { animated: true }
                }
            });

            expect(requestAnimationFrame).toHaveBeenCalled();
        });

        test('should use correct easing function for progress', () => {
            component = new StatusComponent(container, {}, {});

            expect(component.easeOutQuart(0)).toBe(0);
            expect(component.easeOutQuart(1)).toBe(1);
            expect(component.easeOutQuart(0.5)).toBeGreaterThan(0.5);
        });
    });

    describe('Timestamp Formatting', () => {
        test('should format recent timestamps as relative time', () => {
            component = new StatusComponent(container, {}, {});

            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
            const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
            const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

            expect(component.formatTimestamp(fiveMinutesAgo)).toBe('5m ago');
            expect(component.formatTimestamp(twoHoursAgo)).toBe('2h ago');
            expect(component.formatTimestamp(threeDaysAgo)).toBe('3d ago');
        });

        test('should handle very recent timestamps', () => {
            component = new StatusComponent(container, {}, {});

            const now = new Date();
            const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);

            expect(component.formatTimestamp(thirtySecondsAgo)).toBe('just now');
        });

        test('should handle invalid timestamps', () => {
            component = new StatusComponent(container, {}, {});

            expect(component.formatTimestamp('invalid')).toBe('');
            expect(component.formatTimestamp(null)).toBe('');
        });
    });

    describe('Click Handling', () => {
        test('should handle click events when clickable', () => {
            let clickedStatus = null;

            component = new StatusComponent(container, { status: 'active' }, {
                status: { clickable: true }
            });

            // Listen for custom event
            container.addEventListener('statusClick', (e) => {
                clickedStatus = e.detail.status;
            });

            const statusBadge = container.querySelector('.status-badge');
            expect(statusBadge.classList.contains('status-clickable')).toBe(true);

            // Simulate click
            statusBadge.click();

            expect(clickedStatus).toBe('active');
        });

        test('should handle keyboard events when clickable', () => {
            let clickedStatus = null;

            component = new StatusComponent(container, { status: 'active' }, {
                status: { clickable: true }
            });

            container.addEventListener('statusClick', (e) => {
                clickedStatus = e.detail.status;
            });

            const statusBadge = container.querySelector('.status-badge');

            // Simulate Enter key
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
            statusBadge.dispatchEvent(enterEvent);

            expect(clickedStatus).toBe('active');

            // Reset
            clickedStatus = null;

            // Simulate Space key
            const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
            statusBadge.dispatchEvent(spaceEvent);

            expect(clickedStatus).toBe('active');
        });

        test('should not be clickable when disabled', () => {
            component = new StatusComponent(container, { status: 'active' }, {
                status: { clickable: false }
            });

            const statusBadge = container.querySelector('.status-badge');
            expect(statusBadge.classList.contains('status-clickable')).toBe(false);
        });
    });

    describe('Lifecycle Management', () => {
        test('should clean up animations on destroy', () => {
            component = new StatusComponent(container, {}, {});

            // Set up mock animation frame
            component.progressAnimationFrame = 123;

            const cancelSpy = jest.spyOn(window, 'cancelAnimationFrame');

            component.destroy();

            expect(cancelSpy).toHaveBeenCalledWith(123);
            expect(component.progressAnimationFrame).toBeNull();
        });

        test('should cancel animations on update', () => {
            component = new StatusComponent(container, {}, {});

            // Set up mock animation frame
            component.progressAnimationFrame = 123;

            const cancelSpy = jest.spyOn(window, 'cancelAnimationFrame');

            component.update({ status: 'updated' });

            expect(cancelSpy).toHaveBeenCalledWith(123);
            expect(component.progressAnimationFrame).toBeNull();
        });
    });

    describe('Error Handling', () => {
        test('should handle render errors gracefully', () => {
            component = new StatusComponent(container, {}, {});

            // Force an error by making normalizeStatusData throw
            const originalNormalize = component.normalizeStatusData;
            component.normalizeStatusData = () => {
                throw new Error('Test error');
            };

            // Should not throw
            expect(() => component.render()).not.toThrow();

            // Should show error state
            const errorBadge = container.querySelector('.status-error');
            expect(errorBadge).toBeTruthy();
            expect(errorBadge.textContent).toContain('Error');

            // Restore original method
            component.normalizeStatusData = originalNormalize;
        });
    });

    describe('Status Types Coverage', () => {
        const statusTypes = [
            'active', 'inactive', 'pending', 'running', 'completed',
            'failed', 'cancelled', 'scheduled', 'paused'
        ];

        statusTypes.forEach(status => {
            test(`should handle ${status} status correctly`, () => {
                component = new StatusComponent(container, { status }, {});

                const statusBadge = container.querySelector('.status-badge');
                expect(statusBadge.classList.contains(`status-${status}`)).toBe(true);

                const config = component.getDefaultStatusConfig(status);
                expect(config.class).toBe(`status-${status}`);
                expect(config.icon).toBeTruthy();
                expect(config.label).toBeTruthy();
                expect(config.description).toBeTruthy();
            });
        });
    });

    describe('Accessibility', () => {
        test('should include ARIA labels when enabled', () => {
            component = new StatusComponent(container, { status: 'active' }, {
                status: {
                    accessibility: { includeAriaLabel: true }
                }
            });

            const statusBadge = container.querySelector('.status-badge');
            expect(statusBadge.getAttribute('aria-label')).toBeTruthy();
        });

        test('should include proper role and tabindex for clickable status', () => {
            component = new StatusComponent(container, { status: 'active' }, {
                status: { clickable: true }
            });

            const statusBadge = container.querySelector('.status-badge');
            expect(statusBadge.getAttribute('role')).toBe('button');
            expect(statusBadge.getAttribute('tabindex')).toBe('0');
        });

        test('should include progressbar role for progress indicators', () => {
            component = new StatusComponent(container, {
                status: 'running',
                progress: 75
            }, {
                status: { showProgress: true }
            });

            const progressFill = container.querySelector('.progress-fill');
            expect(progressFill.getAttribute('role')).toBe('progressbar');
            expect(progressFill.getAttribute('aria-valuenow')).toBe('75');
            expect(progressFill.getAttribute('aria-valuemin')).toBe('0');
            expect(progressFill.getAttribute('aria-valuemax')).toBe('100');
        });
    });
}); 