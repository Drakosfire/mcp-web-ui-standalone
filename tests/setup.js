/**
 * Jest Test Setup
 * Configures the testing environment for MCP Web UI components
 */

// Configure Jest timeout
jest.setTimeout(10000);

// Fix TextEncoder/TextDecoder for JSDOM
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Mock window methods that might be called by components
Object.defineProperty(window, 'localStorage', {
    value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
    }
});

Object.defineProperty(window, 'sessionStorage', {
    value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
    }
});

// Mock fetch for API calls
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
            success: true,
            data: []
        })
    })
);

// Mock intersection observer
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
}));

// Mock resize observer
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

// Mock performance API
global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => [])
};

// Add custom matchers for better test assertions
expect.extend({
    toHaveClass(received, className) {
        const pass = received.classList.contains(className);
        if (pass) {
            return {
                message: () => `expected element not to have class "${className}"`,
                pass: true
            };
        } else {
            return {
                message: () => `expected element to have class "${className}"`,
                pass: false
            };
        }
    },

    toBeVisible(received) {
        const pass = received.style.display !== 'none' &&
            received.style.visibility !== 'hidden' &&
            received.offsetParent !== null;
        if (pass) {
            return {
                message: () => `expected element not to be visible`,
                pass: true
            };
        } else {
            return {
                message: () => `expected element to be visible`,
                pass: false
            };
        }
    },

    toHaveTextContent(received, text) {
        const pass = received.textContent.includes(text);
        if (pass) {
            return {
                message: () => `expected element not to have text content "${text}"`,
                pass: true
            };
        } else {
            return {
                message: () => `expected element to have text content "${text}", but got "${received.textContent}"`,
                pass: false
            };
        }
    }
});

// Helper function to wait for DOM updates
global.waitFor = (callback, timeout = 5000) => {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const check = () => {
            try {
                const result = callback();
                if (result) {
                    resolve(result);
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`Timeout waiting for condition`));
                } else {
                    setTimeout(check, 10);
                }
            } catch (error) {
                if (Date.now() - startTime > timeout) {
                    reject(error);
                } else {
                    setTimeout(check, 10);
                }
            }
        };

        check();
    });
};

// Helper function to simulate user events
global.fireEvent = {
    click: (element) => {
        const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(event);
    },

    change: (element, value) => {
        if (element.type === 'checkbox') {
            element.checked = value;
        } else {
            element.value = value;
        }
        const event = new Event('change', {
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(event);
    },

    input: (element, value) => {
        element.value = value;
        const event = new Event('input', {
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(event);
    }
};

// Clean up after each test
afterEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Clear the DOM
    document.body.innerHTML = '';

    // Reset fetch mock
    fetch.mockClear();
});

// Global test data factories
global.createTodoItem = (overrides = {}) => {
    return {
        id: Math.floor(Math.random() * 1000),
        text: 'Test todo item',
        completed: false,
        priority: 'medium',
        ...overrides
    };
};

global.createMultipleItems = (count = 5) => {
    return Array.from({ length: count }, (_, i) => createTodoItem({
        id: i + 1,
        text: `Todo item ${i + 1}`,
        completed: i % 2 === 0
    }));
};

console.log('Test setup complete ✓'); 