/**
 * ListComponent Test Suite
 * Tests both single-section and multi-section modes
 */

// Load the components (DOM is already set up by Jest environment)
const BaseComponent = require('../../src/vanilla/core/BaseComponent.js');
const ListComponent = require('../../src/vanilla/components/ListComponent.js');

// Test data
const sampleTodoData = [
    { id: 1, text: 'Buy groceries', completed: false, priority: 'medium' },
    { id: 2, text: 'Walk the dog', completed: true, priority: 'low' },
    { id: 3, text: 'Finish project', completed: false, priority: 'high' },
    { id: 4, text: 'Call dentist', completed: true, priority: 'medium' },
    { id: 5, text: 'Read book', completed: false, priority: 'low' }
];

const singleSectionConfig = {
    list: {
        mode: 'single',
        itemType: 'todo',
        itemTextField: 'text',
        itemFields: ['text', 'priority']
    }
};

const multiSectionConfig = {
    list: {
        mode: 'multi',
        groupBy: 'completed',
        sections: {
            'false': {
                name: 'Todo',
                icon: '📝',
                collapsible: true,
                sortOrder: 0
            },
            'true': {
                name: 'Completed',
                icon: '✅',
                collapsible: true,
                sortOrder: 1
            }
        }
    }
};

const advancedSectionConfig = {
    list: {
        mode: 'multi',
        advancedSections: [
            {
                id: 'high-priority',
                name: 'High Priority',
                filter: (item) => item.priority === 'high' && !item.completed,
                sortOrder: 0,
                collapsible: false
            },
            {
                id: 'medium-priority',
                name: 'Medium Priority',
                filter: (item) => item.priority === 'medium' && !item.completed,
                sortOrder: 1,
                collapsible: false
            },
            {
                id: 'completed',
                name: 'Completed',
                filter: (item) => item.completed,
                sortOrder: 2,
                collapsible: true
            }
        ]
    }
};

describe('ListComponent', () => {
    let element;

    beforeEach(() => {
        // Create a fresh DOM element for each test
        element = document.createElement('div');
        element.id = 'test-list';
        document.body.appendChild(element);
    });

    afterEach(() => {
        // Clean up
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    });

    describe('Configuration', () => {
        test('should default to single mode', () => {
            const component = new ListComponent(element, sampleTodoData, {});
            expect(component.listConfig.mode).toBe('single');
        });

        test('should accept multi mode configuration', () => {
            const component = new ListComponent(element, sampleTodoData, multiSectionConfig);
            expect(component.listConfig.mode).toBe('multi');
            expect(component.listConfig.groupBy).toBe('completed');
        });

        test('should accept advanced sections configuration', () => {
            const component = new ListComponent(element, sampleTodoData, advancedSectionConfig);
            expect(component.listConfig.mode).toBe('multi');
            expect(component.listConfig.advancedSections).toHaveLength(3);
        });

        test('should validate multi-section configuration', () => {
            const invalidConfig = {
                list: {
                    mode: 'multi'
                    // Missing groupBy and sections
                }
            };

            const component = new ListComponent(element, sampleTodoData, invalidConfig);
            // Should fall back to single mode
            expect(component.listConfig.mode).toBe('single');
        });
    });

    describe('Single Section Mode', () => {
        let component;

        beforeEach(async () => {
            component = new ListComponent(element, sampleTodoData, singleSectionConfig);
            // Wait for the component to initialize and render
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        test('should render all items in single section', () => {
            const items = element.querySelectorAll('.list-item');
            expect(items).toHaveLength(5);
        });

        test('should have single-section class', () => {
            const componentEl = element.querySelector('.component-list');
            expect(componentEl.classList.contains('single-section')).toBe(true);
            expect(componentEl.classList.contains('multi-section')).toBe(false);
        });

        test('should not have section headers', () => {
            const sectionHeaders = element.querySelectorAll('.section-header');
            expect(sectionHeaders).toHaveLength(0);
        });
    });

    describe('Multi Section Mode - Simple GroupBy', () => {
        let component;

        beforeEach(async () => {
            component = new ListComponent(element, sampleTodoData, multiSectionConfig);
            // Wait for the component to initialize and render
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        test('should have multi-section class', () => {
            const componentEl = element.querySelector('.component-list');
            expect(componentEl.classList.contains('multi-section')).toBe(true);
            expect(componentEl.classList.contains('single-section')).toBe(false);
        });

        test('should render two sections', () => {
            const sections = element.querySelectorAll('.list-section');
            expect(sections).toHaveLength(2);
        });

        test('should organize items by completion status', () => {
            component.updateSectionsData();

            const todoItems = component.listState.sectionsData.get('false');
            const completedItems = component.listState.sectionsData.get('true');

            expect(todoItems).toHaveLength(3); // 3 incomplete todos
            expect(completedItems).toHaveLength(2); // 2 completed todos
        });

        test('should render section headers with correct names', () => {
            const sectionHeaders = element.querySelectorAll('.section-header');
            expect(sectionHeaders).toHaveLength(2);

            const todoHeader = element.querySelector('[data-section="false"] .section-name');
            const completedHeader = element.querySelector('[data-section="true"] .section-name');

            expect(todoHeader.textContent).toBe('Todo');
            expect(completedHeader.textContent).toBe('Completed');
        });

        test('should show correct item counts in section headers', () => {
            const todoCount = element.querySelector('[data-section="false"] .section-count');
            const completedCount = element.querySelector('[data-section="true"] .section-count');

            expect(todoCount.textContent).toBe('(3)');
            expect(completedCount.textContent).toBe('(2)');
        });

        test('should render section icons', () => {
            const todoIcon = element.querySelector('.section-header[data-section="false"] .section-icon');
            const completedIcon = element.querySelector('.section-header[data-section="true"] .section-icon');

            expect(todoIcon).toBeTruthy();
            expect(completedIcon).toBeTruthy();
            expect(todoIcon.textContent).toBe('📝');
            expect(completedIcon.textContent).toBe('✅');
        });

        test('should handle section toggling', () => {
            const toggleButton = element.querySelector('.section-header[data-section="true"] .section-toggle');
            expect(toggleButton).toBeTruthy();

            // Mock the event handling
            component.handleToggleSection('true');

            const sectionState = component.listState.sectionStates.get('true');
            expect(sectionState.collapsed).toBe(true);
        });

        test('should hide content when section is collapsed', () => {
            component.handleToggleSection('true');

            const completedSection = element.querySelector('.list-section[data-section="true"] .section-content');
            expect(completedSection).toBeFalsy(); // Should not render content when collapsed
        });
    });

    describe('Multi Section Mode - Advanced Sections', () => {
        let component;

        beforeEach(async () => {
            component = new ListComponent(element, sampleTodoData, advancedSectionConfig);
            // Wait for the component to initialize and render
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        test('should render three sections', () => {
            const sections = element.querySelectorAll('.list-section');
            expect(sections).toHaveLength(3);
        });

        test('should filter items by priority and completion', () => {
            component.updateSectionsData();

            const highPriorityItems = component.listState.sectionsData.get('high-priority');
            const mediumPriorityItems = component.listState.sectionsData.get('medium-priority');
            const completedItems = component.listState.sectionsData.get('completed');

            expect(highPriorityItems).toHaveLength(1); // 1 high priority incomplete
            expect(mediumPriorityItems).toHaveLength(1); // 1 medium priority incomplete
            expect(completedItems).toHaveLength(2); // 2 completed items
        });

        test('should order sections by sortOrder', () => {
            const sections = component.getSectionConfigs();

            expect(sections[0].id).toBe('high-priority');
            expect(sections[1].id).toBe('medium-priority');
            expect(sections[2].id).toBe('completed');
        });
    });

    describe('State Management', () => {
        let component;

        beforeEach(async () => {
            component = new ListComponent(element, sampleTodoData, multiSectionConfig);
            // Wait for the component to initialize and render
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        test('should initialize section states', () => {
            expect(component.listState.sectionStates).toBeInstanceOf(Map);
            expect(component.listState.itemTransitions).toBeInstanceOf(Map);
            expect(component.listState.sectionsData).toBeInstanceOf(Map);
        });

        test('should update sections data when items change', () => {
            const newData = [
                { id: 6, text: 'New todo', completed: false, priority: 'high' }
            ];

            component.update(newData);

            const todoItems = component.listState.sectionsData.get('false');
            expect(todoItems).toHaveLength(1);
            expect(todoItems[0].text).toBe('New todo');
        });

        test('should handle empty sections gracefully', () => {
            const emptyData = [];
            component.update(emptyData);

            const todoItems = component.listState.sectionsData.get('false');
            const completedItems = component.listState.sectionsData.get('true');

            expect(todoItems).toHaveLength(0);
            expect(completedItems).toHaveLength(0);
        });
    });

    describe('Event Handling', () => {
        let component;

        beforeEach(async () => {
            component = new ListComponent(element, sampleTodoData, multiSectionConfig);
            // Wait for the component to initialize and render
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        test('should bind section toggle events', () => {
            const toggleButton = element.querySelector('.section-header[data-section="true"] .section-toggle');
            expect(toggleButton).toBeTruthy();
            expect(toggleButton.getAttribute('data-action')).toBe('toggle-section');
        });

        test('should handle section toggle correctly', () => {
            const initialState = component.listState.sectionStates.get('true') || { collapsed: false };

            component.handleToggleSection('true');

            const newState = component.listState.sectionStates.get('true');
            expect(newState.collapsed).toBe(!initialState.collapsed);
        });
    });

    describe('Error Handling', () => {
        test('should handle missing section configuration', () => {
            const badConfig = {
                list: {
                    mode: 'multi',
                    groupBy: 'completed'
                    // Missing sections
                }
            };

            const component = new ListComponent(element, sampleTodoData, badConfig);
            expect(component.listConfig.mode).toBe('single'); // Should fall back
        });

        test('should handle invalid advanced sections', () => {
            const badConfig = {
                list: {
                    mode: 'multi',
                    advancedSections: [
                        {
                            // Missing required properties
                        }
                    ]
                }
            };

            const component = new ListComponent(element, sampleTodoData, badConfig);
            expect(component.listConfig.mode).toBe('single'); // Should fall back
        });
    });

    describe('Accessibility', () => {
        let component;

        beforeEach(async () => {
            component = new ListComponent(element, sampleTodoData, multiSectionConfig);
            // Wait for the component to initialize and render
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        test('should have proper aria attributes on toggle buttons', () => {
            const toggleButton = element.querySelector('.section-header[data-section="true"] .section-toggle');
            expect(toggleButton.getAttribute('aria-expanded')).toBe('true');
            expect(toggleButton.getAttribute('title')).toBeTruthy();
        });

        test('should update aria-expanded when section is toggled', async () => {
            let toggleButton = element.querySelector('.section-header[data-section="true"] .section-toggle');

            component.handleToggleSection('true');

            // Wait for re-render and get the updated button
            await new Promise(resolve => setTimeout(resolve, 10));
            toggleButton = element.querySelector('.section-header[data-section="true"] .section-toggle');

            expect(toggleButton.getAttribute('aria-expanded')).toBe('false');
        });
    });
});

// Helper function to wait for DOM updates
function waitForNextTick() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

// Export for module systems
module.exports = {
    sampleTodoData,
    singleSectionConfig,
    multiSectionConfig,
    advancedSectionConfig
}; 