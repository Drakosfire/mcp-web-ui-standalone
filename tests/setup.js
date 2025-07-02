/**
 * Jest setup file for MCP Web UI vanilla JavaScript components
 * This file is run before each test suite
 */

// Mock fetch globally
global.fetch = jest.fn();

// Mock window.requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

// Mock window.performance
global.performance = global.performance || {};
global.performance.now = global.performance.now || jest.fn(() => Date.now());
global.performance.mark = global.performance.mark || jest.fn();
global.performance.measure = global.performance.measure || jest.fn();

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
};

// Helper function to create DOM elements for testing
global.createTestElement = (tagName = 'div', attributes = {}) => {
    const element = document.createElement(tagName);
    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });
    document.body.appendChild(element);
    return element;
};

// Helper function to clean up DOM after tests
global.cleanupDOM = () => {
    document.body.innerHTML = '';
};

// Helper function to wait for next tick
global.nextTick = () => new Promise(resolve => setTimeout(resolve, 0));

// Helper function to wait for animation frame
global.waitForAnimationFrame = () => new Promise(resolve => {
    requestAnimationFrame(resolve);
});

// Mock data generators for testing
global.generateMockMetrics = (count = 3) => {
    const metrics = [];
    for (let i = 0; i < count; i++) {
        metrics.push({
            key: `metric${i}`,
            label: `Metric ${i + 1}`,
            value: Math.floor(Math.random() * 100),
            icon: '📊',
            trend: ['up', 'down', 'neutral'][Math.floor(Math.random() * 3)]
        });
    }
    return metrics;
};

global.generateMockSchedule = (type = 'daily') => {
    const schedules = {
        daily: {
            type: 'daily',
            time: '09:00',
            weekdaysOnly: true,
            nextRun: new Date(Date.now() + 86400000).toISOString(),
            enabled: true
        },
        once: {
            type: 'once',
            delayMinutes: 30,
            nextRun: new Date(Date.now() + 1800000).toISOString(),
            enabled: true
        },
        weekly: {
            type: 'weekly',
            time: '14:00',
            weekdays: [1, 3, 5],
            nextRun: new Date(Date.now() + 172800000).toISOString(),
            enabled: true
        }
    };
    return schedules[type] || schedules.daily;
};

global.generateMockStatus = (status = 'active') => {
    return {
        status,
        progress: Math.floor(Math.random() * 100),
        description: `This is a ${status} status`,
        timestamp: new Date().toISOString()
    };
};

// Setup and teardown helpers
beforeEach(() => {
    // Clear DOM before each test
    cleanupDOM();

    // Clear all mocks
    jest.clearAllMocks();

    // Reset fetch mock
    fetch.mockClear();

    // Reset performance mock
    if (performance.now.mockReturnValue) {
        performance.now.mockReturnValue(Date.now());
    }
});

afterEach(() => {
    // Clean up DOM after each test
    cleanupDOM();

    // Clear any running timers
    jest.clearAllTimers();
}); 