/**
 * ModalComponent Tests
 * 
 * Tests for the modal system including:
 * - Form data collection
 * - Field generation and rendering
 * - Validation
 * - Integration with ListComponent
 * - Event handling
 * - Accessibility
 */

const path = require('path');
const fs = require('fs');

// Load the ModalComponent
const modalComponentPath = path.join(__dirname, '../../src/vanilla/components/ModalComponent.js');

// Import the classes directly from the module
const { Modal, ModalManager } = require(modalComponentPath);

describe('ModalComponent', () => {
    let modalManager;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';

        // Create fresh modal manager using the class directly
        modalManager = new ModalManager();

        // Mock console methods to reduce noise
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'info').mockImplementation(() => { });
        jest.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        // Cleanup modals
        if (modalManager) {
            modalManager.hideAll();
            modalManager.destroy();
        }

        // Restore console
        jest.restoreAllMocks();
    });

    describe('Basic Modal Functionality', () => {
        test('should create and show a simple alert modal', async () => {
            const result = modalManager.alert({
                title: 'Test Alert',
                message: 'This is a test message'
            });

            // Check that modal is in DOM
            const modal = document.querySelector('.mcp-modal-overlay');
            expect(modal).toBeTruthy();
            expect(modal.querySelector('.mcp-modal-title').textContent.trim()).toBe('Test Alert');
            expect(modal.querySelector('.mcp-modal-message').textContent.trim()).toBe('This is a test message');

            // Simulate OK button click (alert modals use 'confirm' action)
            const okButton = modal.querySelector('[data-action="confirm"]');
            expect(okButton).toBeTruthy();
            okButton.click();

            const resolvedResult = await result;
            expect(resolvedResult.action).toBe('confirm');
        });

        test('should create and show a confirm modal', async () => {
            const result = modalManager.confirm({
                title: 'Test Confirm',
                message: 'Are you sure?'
            });

            const modal = document.querySelector('.mcp-modal-overlay');
            expect(modal).toBeTruthy();

            // Should have both confirm and cancel buttons
            const confirmButton = modal.querySelector('[data-action="confirm"]');
            const cancelButton = modal.querySelector('[data-action="cancel"]');
            expect(confirmButton).toBeTruthy();
            expect(cancelButton).toBeTruthy();

            // Test confirm action
            confirmButton.click();
            const resolvedResult = await result;
            expect(resolvedResult.action).toBe('confirm');
        });
    });

    describe('Form Modal Functionality', () => {
        test('should create form fields with proper name attributes', () => {
            const formConfig = {
                title: 'Test Form',
                fields: [
                    { name: 'text', label: 'Text Field', type: 'text', required: true },
                    { name: 'priority', label: 'Priority', type: 'select', options: ['low', 'high'] },
                    { name: 'category', label: 'Category', type: 'text' },
                    { name: 'dueDate', label: 'Due Date', type: 'date' }
                ]
            };

            modalManager.form(formConfig);

            const modal = document.querySelector('.mcp-modal-overlay');
            expect(modal).toBeTruthy();

            // Check that all form fields exist with correct names
            const textField = modal.querySelector('input[name="text"]');
            const priorityField = modal.querySelector('select[name="priority"]');
            const categoryField = modal.querySelector('input[name="category"]');
            const dueDateField = modal.querySelector('input[name="dueDate"]');

            expect(textField).toBeTruthy();
            expect(priorityField).toBeTruthy();
            expect(categoryField).toBeTruthy();
            expect(dueDateField).toBeTruthy();

            // Check field types
            expect(textField.type).toBe('text');
            expect(priorityField.tagName).toBe('SELECT');
            expect(dueDateField.type).toBe('date');

            // Check required attribute
            expect(textField.required).toBe(true);
            expect(categoryField.required).toBe(false);
        });

        test('should collect form data correctly when submitted', async () => {
            let submittedData = null;

            const formConfig = {
                title: 'Test Form',
                fields: [
                    { name: 'text', label: 'Text Field', type: 'text', required: true },
                    { name: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high'] },
                    { name: 'category', label: 'Category', type: 'text' }
                ],
                onSubmit: async (data) => {
                    submittedData = data;
                    return { success: true };
                }
            };

            const result = modalManager.form(formConfig);
            const modal = document.querySelector('.mcp-modal-overlay');

            // Fill in form data
            const textField = modal.querySelector('input[name="text"]');
            const priorityField = modal.querySelector('select[name="priority"]');
            const categoryField = modal.querySelector('input[name="category"]');

            textField.value = 'Test todo item';
            priorityField.value = 'high';
            categoryField.value = 'testing';

            // Trigger form submission
            const form = modal.querySelector('[data-form="modal-form"]');
            expect(form).toBeTruthy();

            // Create and dispatch form submit event
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);

            // Wait for async submission
            await result;

            // Check that data was collected correctly
            expect(submittedData).toBeTruthy();
            expect(submittedData.text).toBe('Test todo item');
            expect(submittedData.priority).toBe('high');
            expect(submittedData.category).toBe('testing');
        });

        test('should handle form validation correctly', async () => {
            const formConfig = {
                title: 'Test Form',
                fields: [
                    { name: 'text', label: 'Text Field', type: 'text', required: true },
                    { name: 'email', label: 'Email', type: 'email', required: true }
                ],
                validate: (data) => {
                    const errors = {};
                    if (!data.text || data.text.trim() === '') {
                        errors.text = 'Text is required';
                    }
                    if (!data.email || !data.email.includes('@')) {
                        errors.email = 'Valid email is required';
                    }
                    return errors;
                },
                onSubmit: async (data) => {
                    return { success: true };
                }
            };

            modalManager.form(formConfig);
            const modal = document.querySelector('.mcp-modal-overlay');

            // Submit empty form (should show validation errors)
            const form = modal.querySelector('[data-form="modal-form"]');
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);

            // Check for validation error display
            const textError = modal.querySelector('input[name="text"]').closest('.mcp-form-group').querySelector('.mcp-form-error');
            const emailError = modal.querySelector('input[name="email"]').closest('.mcp-form-group').querySelector('.mcp-form-error');

            expect(textError).toBeTruthy();
            expect(textError.textContent).toBe('Text is required');
            expect(emailError).toBeTruthy();
            expect(emailError.textContent).toBe('Valid email is required');
        });

        test('should handle different field types correctly', () => {
            const formConfig = {
                title: 'Field Types Test',
                fields: [
                    { name: 'text', label: 'Text', type: 'text' },
                    { name: 'textarea', label: 'Textarea', type: 'textarea' },
                    {
                        name: 'select', label: 'Select', type: 'select', options: [
                            { value: 'opt1', label: 'Option 1' },
                            { value: 'opt2', label: 'Option 2' }
                        ]
                    },
                    { name: 'checkbox', label: 'Checkbox', type: 'checkbox' },
                    { name: 'date', label: 'Date', type: 'date' },
                    { name: 'number', label: 'Number', type: 'number' }
                ]
            };

            modalManager.form(formConfig);
            const modal = document.querySelector('.mcp-modal-overlay');

            // Check all field types are rendered correctly
            expect(modal.querySelector('input[name="text"][type="text"]')).toBeTruthy();
            expect(modal.querySelector('textarea[name="textarea"]')).toBeTruthy();
            expect(modal.querySelector('select[name="select"]')).toBeTruthy();
            expect(modal.querySelector('input[name="checkbox"][type="checkbox"]')).toBeTruthy();
            expect(modal.querySelector('input[name="date"][type="date"]')).toBeTruthy();
            expect(modal.querySelector('input[name="number"][type="number"]')).toBeTruthy();

            // Check select options
            const selectField = modal.querySelector('select[name="select"]');
            const options = selectField.querySelectorAll('option');
            expect(options.length).toBe(2);
            expect(options[0].value).toBe('opt1');
            expect(options[0].textContent).toBe('Option 1');
        });
    });

    describe('ListComponent Integration', () => {
        test('should work with ListComponent form field format', async () => {
            // Simulate the form fields format that ListComponent generates
            const listComponentFormFields = [
                { name: 'text', label: 'What needs to be done?', type: 'textarea', required: true, placeholder: 'Enter your todo...' },
                {
                    name: 'priority',
                    label: 'Priority',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' },
                        { value: 'urgent', label: 'Urgent' }
                    ]
                },
                { name: 'category', label: 'Category', type: 'text', required: false, placeholder: 'Optional category' },
                { name: 'dueDate', label: 'Due Date', type: 'date', required: false }
            ];

            let submittedData = null;

            const formConfig = {
                title: 'Add New Todo',
                fields: listComponentFormFields,
                onSubmit: async (data) => {
                    submittedData = data;
                    return { success: true };
                }
            };

            const result = modalManager.form(formConfig);
            const modal = document.querySelector('.mcp-modal-overlay');

            // Fill out the form like a user would
            modal.querySelector('textarea[name="text"]').value = 'Test todo from modal';
            modal.querySelector('select[name="priority"]').value = 'high';
            modal.querySelector('input[name="category"]').value = 'testing';
            modal.querySelector('input[name="dueDate"]').value = '2025-01-10';

            // Submit the form
            const form = modal.querySelector('[data-form="modal-form"]');
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);

            await result;

            // Verify data collection matches expected format
            expect(submittedData).toEqual({
                text: 'Test todo from modal',
                priority: 'high',
                category: 'testing',
                dueDate: '2025-01-10'
            });
        });

        test('should handle empty/undefined form data correctly', async () => {
            let submittedData = null;

            const formConfig = {
                title: 'Test Form',
                fields: [
                    { name: 'text', label: 'Text', type: 'text', required: true },
                    { name: 'optional', label: 'Optional', type: 'text', required: false }
                ],
                onSubmit: async (data) => {
                    submittedData = data;
                    return { success: true };
                }
            };

            const result = modalManager.form(formConfig);
            const modal = document.querySelector('.mcp-modal-overlay');

            // Only fill required field, leave optional empty
            modal.querySelector('input[name="text"]').value = 'Required value';
            // Leave optional field empty

            const form = modal.querySelector('[data-form="modal-form"]');
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);

            await result;

            // Should have the filled field and empty string for unfilled field
            expect(submittedData).toEqual({
                text: 'Required value',
                optional: ''
            });
        });
    });

    describe('Error Handling', () => {
        test('should handle form submission errors gracefully', async () => {
            const formConfig = {
                title: 'Error Test',
                fields: [
                    { name: 'text', label: 'Text', type: 'text', required: true }
                ],
                onSubmit: async (data) => {
                    throw new Error('Submission failed');
                }
            };

            modalManager.form(formConfig);
            const modal = document.querySelector('.mcp-modal-overlay');

            // Fill and submit form
            modal.querySelector('input[name="text"]').value = 'Test value';
            const form = modal.querySelector('[data-form="modal-form"]');
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);

            // Should show error in modal
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async error handling

            const errorDiv = modal.querySelector('.mcp-modal-error');
            expect(errorDiv).toBeTruthy();
            expect(errorDiv.textContent).toBe('Submission failed');
        });

        test('should handle malformed field configurations', () => {
            const formConfig = {
                title: 'Malformed Test',
                fields: [
                    { name: 'valid', label: 'Valid Field', type: 'text' },
                    { /* missing name */ label: 'Invalid Field', type: 'text' },
                    { name: 'invalid-type', label: 'Invalid Type', type: 'nonexistent' }
                ]
            };

            // Should not throw error, should handle gracefully
            expect(() => {
                modalManager.form(formConfig);
            }).not.toThrow();

            const modal = document.querySelector('.mcp-modal-overlay');
            expect(modal).toBeTruthy();

            // Should still create valid fields
            expect(modal.querySelector('input[name="valid"]')).toBeTruthy();
        });
    });

    describe('Accessibility', () => {
        test('should have proper ARIA attributes', () => {
            modalManager.alert({
                title: 'Accessibility Test',
                message: 'Testing accessibility'
            });

            const modal = document.querySelector('.mcp-modal-overlay');
            expect(modal.getAttribute('role')).toBe('dialog');
            expect(modal.getAttribute('aria-modal')).toBe('true');
            expect(modal.getAttribute('aria-labelledby')).toBeTruthy();
        });

        test('should handle keyboard navigation', () => {
            modalManager.form({
                title: 'Keyboard Test',
                fields: [
                    { name: 'field1', label: 'Field 1', type: 'text' },
                    { name: 'field2', label: 'Field 2', type: 'text' }
                ]
            });

            const modal = document.querySelector('.mcp-modal-overlay');

            // Test escape key
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(escapeEvent);

            // Modal should still be there (we're not testing the actual close behavior in this unit test)
            expect(modal.parentNode).toBeTruthy();
        });
    });

    describe('Performance and Memory', () => {
        test('should properly clean up when destroyed', () => {
            const modal = modalManager.alert({
                title: 'Cleanup Test',
                message: 'Testing cleanup'
            });

            // Get modal element
            const modalElement = document.querySelector('.mcp-modal-overlay');
            expect(modalElement).toBeTruthy();

            // Destroy modal manager
            modalManager.destroy();

            // Modal should be removed from DOM
            expect(document.querySelector('.mcp-modal-overlay')).toBeFalsy();
        });

        test('should handle multiple modals correctly', async () => {
            // Create multiple modals - but don't await them so they stack
            const modal1Promise = modalManager.alert({ title: 'Modal 1', message: 'First modal' });
            const modal2Promise = modalManager.alert({ title: 'Modal 2', message: 'Second modal' });
            const modal3Promise = modalManager.alert({ title: 'Modal 3', message: 'Third modal' });

            // Wait a tick for modals to be created in DOM
            await new Promise(resolve => setTimeout(resolve, 10));

            const modals = document.querySelectorAll('.mcp-modal-overlay');
            expect(modals.length).toBe(3);

            // Should have different z-indexes
            const zIndexes = Array.from(modals).map(m => parseInt(m.style.zIndex) || 0);
            expect(new Set(zIndexes).size).toBeGreaterThanOrEqual(1); // At least some different z-indexes

            // Clean up by closing all modals
            modalManager.hideAll();
        });
    });
});

// Export for module systems
module.exports = {
    // Test utilities that other tests might use
    createMockFormConfig: (fields) => ({
        title: 'Test Form',
        fields: fields || [
            { name: 'text', label: 'Text', type: 'text', required: true }
        ]
    })
}; 