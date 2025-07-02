/**
 * ScheduleDisplayComponent Tests
 * 
 * Comprehensive test suite for the ScheduleDisplayComponent framework component.
 * Tests cover schedule parsing, human-readable formatting, timezone handling,
 * next run calculations, auto-updates, and accessibility features.
 */

// Mock the BaseComponent
const BaseComponent = require('../__mocks__/BaseComponent');

// Load the component
require('../../src/vanilla/components/ScheduleDisplayComponent');

describe('ScheduleDisplayComponent', () => {
    let container, component;
    let mockDate, mockTimers;

    beforeEach(() => {
        // Set up DOM container
        container = document.createElement('div');
        document.body.appendChild(container);

        // Mock current time for consistent testing
        mockDate = new Date('2024-01-15T10:00:00Z');
        jest.useFakeTimers();
        jest.setSystemTime(mockDate);

        // Mock performance.now for timing tests
        mockTimers = {
            now: performance.now.mockReturnValue ? performance.now.mockReturnValue(1000) : null
        };
    });

    afterEach(() => {
        if (component && !component.isDestroyed) {
            component.destroy();
        }
        if (container && container.parentNode) {
            document.body.removeChild(container);
        }
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        if (mockTimers && mockTimers.now && mockTimers.now.mockRestore) {
            mockTimers.now.mockRestore();
        }
    });

    describe('Initialization', () => {
        test('initializes with valid schedule data', () => {
            const scheduleData = {
                type: 'daily',
                time: '09:00',
                nextRun: '2024-01-16T09:00:00Z'
            };

            component = new ScheduleDisplayComponent(container, scheduleData, {});

            expect(component.componentConfig.showIcon).toBe(true);
            expect(component.componentConfig.showNextRun).toBe(true);
            expect(component.componentConfig.dateFormat).toBe('short');
            expect(component.componentConfig.mode).toBe('compact');
        });

        test('applies custom configuration', () => {
            const config = {
                schedule: {
                    showIcon: false,
                    showNextRun: false,
                    dateFormat: 'long',
                    mode: 'expanded',
                    timezone: 'UTC',
                    locale: 'de-DE'
                }
            };

            component = new ScheduleDisplayComponent(container, {}, config);

            expect(component.componentConfig.showIcon).toBe(false);
            expect(component.componentConfig.showNextRun).toBe(false);
            expect(component.componentConfig.dateFormat).toBe('long');
            expect(component.componentConfig.mode).toBe('expanded');
            expect(component.componentConfig.timezone).toBe('UTC');
            expect(component.componentConfig.locale).toBe('de-DE');
        });

        test('handles empty data gracefully', () => {
            component = new ScheduleDisplayComponent(container, null, {});

            expect(container.querySelector('.schedule-display')).toBeTruthy();
            expect(container.querySelector('.schedule-error')).toBeFalsy();
        });

        test('handles invalid data gracefully', () => {
            component = new ScheduleDisplayComponent(container, 'invalid', {});

            expect(container.querySelector('.schedule-display')).toBeTruthy();
        });
    });

    describe('Schedule Type Validation', () => {
        test('validates known schedule types', () => {
            const validTypes = ['once', 'scheduled', 'interval', 'daily', 'weekly', 'monthly', 'yearly', 'cron'];

            validTypes.forEach(type => {
                component = new ScheduleDisplayComponent(container, { type }, {});
                const schedule = component.validateScheduleData({ type });
                expect(schedule.type).toBe(type);
                if (component && !component.isDestroyed) {
                    component.destroy();
                }
            });
        });

        test('sanitizes invalid schedule types', () => {
            component = new ScheduleDisplayComponent(container, { type: 'invalid' }, {});
            const schedule = component.validateScheduleData({ type: 'invalid' });
            expect(schedule.type).toBe('unknown');
        });

        test('handles missing schedule type', () => {
            component = new ScheduleDisplayComponent(container, {}, {});
            const schedule = component.validateScheduleData({});
            expect(schedule.type).toBe('unknown');
        });
    });

    describe('Human-Readable Schedule Descriptions', () => {
        test('formats "once" schedule correctly', () => {
            const scheduleData = {
                type: 'once',
                delayMinutes: 30
            };

            component = new ScheduleDisplayComponent(container, scheduleData, {});
            const readable = component.generateHumanReadable(scheduleData);

            expect(readable).toContain('30 minutes');
        });

        test('formats "scheduled" schedule correctly', () => {
            const scheduleData = {
                type: 'scheduled',
                datetime: '2024-01-16T14:30:00Z'
            };

            component = new ScheduleDisplayComponent(container, scheduleData, {});
            const readable = component.generateHumanReadable(scheduleData);

            expect(readable).toContain('January 16');
        });

        test('formats "daily" schedule correctly', () => {
            const scheduleData = {
                type: 'daily',
                time: '09:00'
            };

            component = new ScheduleDisplayComponent(container, scheduleData, {});
            const readable = component.generateHumanReadable(scheduleData);

            expect(readable).toContain('Daily at 9:00 AM');
        });

        test('formats "daily" weekdays-only schedule correctly', () => {
            const scheduleData = {
                type: 'daily',
                time: '09:00',
                weekdaysOnly: true
            };

            component = new ScheduleDisplayComponent(container, scheduleData, {});
            const readable = component.generateHumanReadable(scheduleData);

            expect(readable).toContain('Daily at 9:00 AM (weekdays)');
        });

        test('formats "weekly" schedule correctly', () => {
            const scheduleData = {
                type: 'weekly',
                weekdays: [1, 3, 5], // Monday, Wednesday, Friday
                time: '14:00'
            };

            component = new ScheduleDisplayComponent(container, scheduleData, {});
            const readable = component.generateHumanReadable(scheduleData);

            expect(readable).toContain('Weekly on');
            expect(readable).toContain('2:00 PM');
        });

        test('formats "monthly" schedule correctly', () => {
            const scheduleData = {
                type: 'monthly',
                dayOfMonth: 15,
                time: '10:00'
            };

            component = new ScheduleDisplayComponent(container, scheduleData, {});
            const readable = component.generateHumanReadable(scheduleData);

            expect(readable).toContain('Monthly on the 15th');
            expect(readable).toContain('10:00 AM');
        });

        test('formats "interval" schedule correctly', () => {
            const scheduleData = {
                type: 'interval',
                interval: { minutes: 30 }
            };

            component = new ScheduleDisplayComponent(container, scheduleData, {});
            const readable = component.generateHumanReadable(scheduleData);

            expect(readable).toContain('Every 30 minutes');
        });

        test('formats "cron" schedule correctly', () => {
            const scheduleData = {
                type: 'cron',
                cronExpression: '0 9 * * 1-5'
            };

            component = new ScheduleDisplayComponent(container, scheduleData, {});
            const readable = component.generateHumanReadable(scheduleData);

            expect(readable).toContain('Cron');
            expect(readable).toContain('0 9 * * 1-5');
        });
    });

    describe('Date and Time Formatting', () => {
        test('formats time in 12-hour format by default', () => {
            component = new ScheduleDisplayComponent(container, {}, {});

            const time12h = component.formatTime('09:00');
            expect(time12h).toBe('9:00 AM');

            const time12hPm = component.formatTime('15:30');
            expect(time12hPm).toBe('3:30 PM');
        });

        test('formats time in 24-hour format when configured', () => {
            const config = { schedule: { timeFormat: '24h' } };
            component = new ScheduleDisplayComponent(container, {}, config);

            const time24h = component.formatTime('09:00');
            expect(time24h).toBe('09:00');

            const time24hPm = component.formatTime('15:30');
            expect(time24hPm).toBe('15:30');
        });

        test('formats dates correctly', () => {
            component = new ScheduleDisplayComponent(container, {}, {});

            const dateStr = component.formatDate('2024-01-16');
            expect(dateStr).toContain('January 16');
        });

        test('formats datetime correctly', () => {
            component = new ScheduleDisplayComponent(container, {}, {});

            const dateTimeStr = component.formatDateTime('2024-01-16T14:30:00Z');
            expect(dateTimeStr).toBeTruthy();
            expect(dateTimeStr.length).toBeGreaterThan(0);
        });

        test('formats relative time correctly', () => {
            component = new ScheduleDisplayComponent(container, {}, {});

            const relativeStr = component.formatRelativeTime(5 * 60 * 1000); // 5 minutes
            expect(relativeStr).toBe('in 5 minutes');

            const relativeStrPast = component.formatRelativeTime(-5 * 60 * 1000); // 5 minutes ago
            expect(relativeStrPast).toBe('5 minutes ago');
        });

        test('formats interval correctly', () => {
            component = new ScheduleDisplayComponent(container, {}, {});

            const intervalStr = component.formatInterval({ minutes: 30 });
            expect(intervalStr).toBe('30 minutes');

            const hourlyStr = component.formatInterval({ hours: 2 });
            expect(hourlyStr).toBe('2 hours');

            const dailyStr = component.formatInterval({ days: 1 });
            expect(dailyStr).toBe('1 day');
        });

        test('formats weekdays correctly', () => {
            component = new ScheduleDisplayComponent(container, {}, {});

            const weekdaysStr = component.formatWeekdays([1, 3, 5]); // Mon, Wed, Fri
            expect(weekdaysStr).toContain('Monday');
            expect(weekdaysStr).toContain('Wednesday');
            expect(weekdaysStr).toContain('Friday');
        });
    });

    describe('Next Run Display', () => {
        test('displays next run time when provided', () => {
            const scheduleData = {
                type: 'daily',
                time: '09:00',
                nextRun: '2024-01-16T09:00:00Z'
            };

            component = new ScheduleDisplayComponent(container, scheduleData, {
                schedule: { showNextRun: true }
            });

            expect(container.querySelector('.next-run')).toBeTruthy();
            expect(container.textContent).toContain('Next run');
        });

        test('hides next run when configured', () => {
            const scheduleData = {
                type: 'daily',
                time: '09:00',
                nextRun: '2024-01-16T09:00:00Z'
            };

            component = new ScheduleDisplayComponent(container, scheduleData, {
                schedule: { showNextRun: false }
            });

            expect(container.querySelector('.next-run')).toBeFalsy();
        });

        test('handles missing next run gracefully', () => {
            const scheduleData = {
                type: 'daily',
                time: '09:00'
            };

            component = new ScheduleDisplayComponent(container, scheduleData, {});

            expect(container.querySelector('.next-run')).toBeFalsy();
        });

        test('formats next run relative time correctly', () => {
            const nextRun = new Date(mockDate.getTime() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours from now

            component = new ScheduleDisplayComponent(container, { nextRun }, {});
            const formattedStr = component.formatNextRun(nextRun);

            expect(formattedStr).toContain('in 2 hours');
        });
    });

    describe('Icons and Visual Elements', () => {
        test('displays correct icons for schedule types', () => {
            const testCases = [
                { type: 'once', expectedIcon: '⏰' },
                { type: 'scheduled', expectedIcon: '📅' },
                { type: 'interval', expectedIcon: '🔄' },
                { type: 'daily', expectedIcon: '📆' },
                { type: 'weekly', expectedIcon: '📊' },
                { type: 'monthly', expectedIcon: '📋' },
                { type: 'yearly', expectedIcon: '🗓️' },
                { type: 'cron', expectedIcon: '⚙️' }
            ];

            testCases.forEach(({ type, expectedIcon }) => {
                const icon = new ScheduleDisplayComponent(container, {}, {}).getScheduleIcon(type);
                expect(icon).toBe(expectedIcon);
            });
        });

        test('shows icon when configured', () => {
            component = new ScheduleDisplayComponent(container, { type: 'daily' }, {
                schedule: { showIcon: true }
            });

            expect(container.querySelector('.schedule-icon')).toBeTruthy();
            expect(container.querySelector('.schedule-icon').textContent).toBe('📆');
        });

        test('hides icon when configured', () => {
            component = new ScheduleDisplayComponent(container, { type: 'daily' }, {
                schedule: { showIcon: false }
            });

            expect(container.querySelector('.schedule-icon')).toBeFalsy();
        });
    });

    describe('Display Modes', () => {
        test('applies compact mode class', () => {
            component = new ScheduleDisplayComponent(container, {}, {
                schedule: { mode: 'compact' }
            });

            expect(container.querySelector('.mode-compact')).toBeTruthy();
        });

        test('applies expanded mode class', () => {
            component = new ScheduleDisplayComponent(container, {}, {
                schedule: { mode: 'expanded' }
            });

            expect(container.querySelector('.mode-expanded')).toBeTruthy();
        });

        test('applies minimal mode class', () => {
            component = new ScheduleDisplayComponent(container, {}, {
                schedule: { mode: 'minimal' }
            });

            expect(container.querySelector('.mode-minimal')).toBeTruthy();
        });
    });

    describe('Status Indicators', () => {
        test('shows enabled status correctly', () => {
            component = new ScheduleDisplayComponent(container, { enabled: true }, {});

            expect(container.querySelector('.schedule-enabled')).toBeTruthy();
            expect(container.querySelector('.schedule-disabled')).toBeFalsy();
        });

        test('shows disabled status correctly', () => {
            component = new ScheduleDisplayComponent(container, { enabled: false }, {});

            expect(container.querySelector('.schedule-disabled')).toBeTruthy();
            expect(container.querySelector('.schedule-enabled')).toBeFalsy();
        });

        test('highlights upcoming schedules when configured', () => {
            const nextRun = new Date(mockDate.getTime() + 30 * 60 * 1000).toISOString(); // 30 minutes from now

            component = new ScheduleDisplayComponent(container, { nextRun }, {
                schedule: { highlightUpcoming: true }
            });

            expect(container.querySelector('.schedule-upcoming')).toBeTruthy();
        });

        test('detects overdue schedules', () => {
            const pastRun = new Date(mockDate.getTime() - 30 * 60 * 1000).toISOString(); // 30 minutes ago

            component = new ScheduleDisplayComponent(container, {}, {});
            const isOverdue = component.isOverdue(pastRun);

            expect(isOverdue).toBe(true);
        });
    });

    describe('Frequency Calculation', () => {
        test('calculates frequency for interval schedules', () => {
            const schedule = {
                type: 'interval',
                interval: { minutes: 15 }
            };

            component = new ScheduleDisplayComponent(container, {}, {});
            const frequency = component.calculateFrequency(schedule);

            expect(frequency).toContain('15 minutes');
        });

        test('calculates frequency for daily schedules', () => {
            const schedule = {
                type: 'daily',
                time: '09:00'
            };

            component = new ScheduleDisplayComponent(container, {}, {});
            const frequency = component.calculateFrequency(schedule);

            expect(frequency).toBe('Daily');
        });

        test('calculates frequency for weekly schedules', () => {
            const schedule = {
                type: 'weekly',
                weekdays: [1, 3, 5]
            };

            component = new ScheduleDisplayComponent(container, {}, {});
            const frequency = component.calculateFrequency(schedule);

            expect(frequency).toBe('3 times per week');
        });
    });

    describe('Tooltips', () => {
        test('generates comprehensive tooltip text', () => {
            const scheduleData = {
                type: 'daily',
                time: '09:00',
                nextRun: '2024-01-16T09:00:00Z',
                enabled: true
            };

            component = new ScheduleDisplayComponent(container, scheduleData, {
                schedule: { showTooltip: true }
            });

            const tooltip = component.generateTooltipText(scheduleData);

            expect(tooltip).toContain('Daily');
            expect(tooltip).toContain('Next run');
            expect(tooltip).toContain('Status: Enabled');
        });

        test('adds tooltip to element when configured', () => {
            component = new ScheduleDisplayComponent(container, { type: 'daily' }, {
                schedule: { showTooltip: true }
            });

            expect(container.querySelector('[title]')).toBeTruthy();
        });

        test('omits tooltip when configured', () => {
            component = new ScheduleDisplayComponent(container, { type: 'daily' }, {
                schedule: { showTooltip: false }
            });

            expect(container.querySelector('[title]')).toBeFalsy();
        });
    });

    describe('Auto-Update Functionality', () => {
        test('starts auto-update for relative time displays', () => {
            const nextRun = new Date(mockDate.getTime() + 30 * 60 * 1000).toISOString();

            component = new ScheduleDisplayComponent(container, { nextRun }, {
                schedule: { dateFormat: 'relative' }
            });

            expect(component.updateInterval).toBeTruthy();
        });

        test('does not start auto-update for static displays', () => {
            component = new ScheduleDisplayComponent(container, { type: 'daily' }, {
                schedule: { dateFormat: 'short' }
            });

            expect(component.updateInterval).toBeFalsy();
        });

        test('stops auto-update on component destruction', () => {
            const nextRun = new Date(mockDate.getTime() + 30 * 60 * 1000).toISOString();

            component = new ScheduleDisplayComponent(container, { nextRun }, {
                schedule: { dateFormat: 'relative' }
            });

            const intervalId = component.updateInterval;
            component.destroy();

            expect(component.updateInterval).toBe(null);
        });
    });

    describe('Accessibility', () => {
        test('adds appropriate ARIA attributes for clickable schedules', () => {
            component = new ScheduleDisplayComponent(container, { type: 'daily' }, {
                schedule: { clickable: true }
            });

            const scheduleElement = container.querySelector('.schedule-display');
            expect(scheduleElement.getAttribute('role')).toBe('button');
            expect(scheduleElement.getAttribute('tabindex')).toBe('0');
        });

        test('omits interactive attributes for non-clickable schedules', () => {
            component = new ScheduleDisplayComponent(container, { type: 'daily' }, {
                schedule: { clickable: false }
            });

            const scheduleElement = container.querySelector('.schedule-display');
            expect(scheduleElement.getAttribute('role')).toBeFalsy();
            expect(scheduleElement.getAttribute('tabindex')).toBeFalsy();
        });

        test('includes data attributes for testing and styling', () => {
            component = new ScheduleDisplayComponent(container, { type: 'daily' }, {});

            const scheduleElement = container.querySelector('.schedule-display');
            expect(scheduleElement.getAttribute('data-schedule-type')).toBe('daily');
        });
    });

    describe('Error Handling', () => {
        test('handles render errors gracefully', () => {
            // Mock a render error
            const originalValidateScheduleData = ScheduleDisplayComponent.prototype.validateScheduleData;
            ScheduleDisplayComponent.prototype.validateScheduleData = jest.fn(() => {
                throw new Error('Validation error');
            });

            component = new ScheduleDisplayComponent(container, { type: 'invalid' }, {});

            expect(container.querySelector('.schedule-error')).toBeTruthy();
            expect(container.textContent).toContain('Invalid schedule');

            // Restore original method
            ScheduleDisplayComponent.prototype.validateScheduleData = originalValidateScheduleData;
        });

        test('handles invalid datetime gracefully', () => {
            component = new ScheduleDisplayComponent(container, {}, {});

            const result = component.formatDateTime('invalid-date');
            expect(result).toBeTruthy(); // Should not throw error
        });

        test('handles missing time gracefully', () => {
            component = new ScheduleDisplayComponent(container, {}, {});

            const result = component.formatTime(null);
            expect(result).toBe('--:--');
        });
    });

    describe('Memory Management', () => {
        test('cleans up intervals on destroy', () => {
            const nextRun = new Date(mockDate.getTime() + 30 * 60 * 1000).toISOString();

            component = new ScheduleDisplayComponent(container, { nextRun }, {
                schedule: { dateFormat: 'relative' }
            });

            const originalClearInterval = global.clearInterval;
            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

            component.destroy();

            expect(clearIntervalSpy).toHaveBeenCalled();
            expect(component.updateInterval).toBe(null);

            clearIntervalSpy.mockRestore();
        });

        test('handles multiple destroy calls safely', () => {
            component = new ScheduleDisplayComponent(container, {}, {});

            component.destroy();
            expect(() => component.destroy()).not.toThrow();
        });

        test('prevents operations after destruction', () => {
            component = new ScheduleDisplayComponent(container, {}, {});
            component.destroy();

            // Should not throw or cause issues
            component.render();
            expect(component.isDestroyed).toBe(true);
        });
    });

    describe('Configuration Edge Cases', () => {
        test('handles undefined config gracefully', () => {
            expect(() => {
                component = new ScheduleDisplayComponent(container, {}, undefined);
            }).not.toThrow();
        });

        test('handles partial config gracefully', () => {
            const partialConfig = { schedule: { showIcon: false } };

            component = new ScheduleDisplayComponent(container, {}, partialConfig);

            expect(component.componentConfig.showIcon).toBe(false);
            expect(component.componentConfig.showNextRun).toBe(true); // Default value
        });

        test('validates locale setting', () => {
            const config = { schedule: { locale: 'en-US' } };

            component = new ScheduleDisplayComponent(container, {}, config);

            expect(component.componentConfig.locale).toBe('en-US');
        });
    });
});
