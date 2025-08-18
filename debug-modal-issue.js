/**
 * Modal Debugging Script - BROWSER VERSION
 * 
 * ⚠️  IMPORTANT: This script must be run in the BROWSER CONSOLE, not Node.js!
 * 
 * Instructions:
 * 1. Open your Todoodles web UI in the browser
 * 2. Open Developer Tools (F12)
 * 3. Go to Console tab
 * 4. Copy and paste this entire script
 * 5. Press Enter to run
 * 
 * The script will analyze the modal button issue and provide targeted fixes.
 */

// Environment check
if (typeof window === 'undefined') {
    console.error('❌ This script must be run in a BROWSER CONSOLE, not Node.js!');
    console.error('📖 Instructions:');
    console.error('   1. Open your Todoodles web UI in the browser');
    console.error('   2. Open Developer Tools (F12)');
    console.error('   3. Go to Console tab');
    console.error('   4. Copy and paste this entire script');
    console.error('   5. Press Enter to run');

    if (typeof process !== 'undefined') {
        process.exit(1);
    }
}

console.log('🔍 Starting Modal Debug Analysis...');
console.log('🌐 Environment: Browser ✅');

// Test 1: Check if components are loaded
function testComponentAvailability() {
    console.log('\n📦 Testing Component Availability:');

    const results = {
        listComponent: typeof window.ListComponent !== 'undefined',
        todoComponent: typeof window.TodoListComponent !== 'undefined',
        modal: typeof window.MCPModal !== 'undefined',
        modalManager: typeof window.MCPModalManager !== 'undefined'
    };

    console.log('- ListComponent:', typeof window.ListComponent, results.listComponent ? '✅' : '❌');
    console.log('- TodoListComponent:', typeof window.TodoListComponent, results.todoComponent ? '✅' : '❌');
    console.log('- MCPModal:', typeof window.MCPModal, results.modal ? '✅' : '❌');
    console.log('- MCPModalManager:', typeof window.MCPModalManager, results.modalManager ? '✅' : '❌');

    if (!results.modal) {
        console.error('❌ CRITICAL: MCPModal not found! Modal system not loaded.');
        console.error('   Check if ModalComponent.js is included in your HTML');
    }

    if (!results.todoComponent) {
        console.warn('⚠️  TodoListComponent not found - may be using factory function');
    }

    return results;
}

// Test 2: Find active todo list component instance
function findTodoListInstance() {
    console.log('\n🔍 Looking for TodoList Component Instance:');

    // Look for todo component reference
    const todoElements = document.querySelectorAll('[class*="component-list"], [class*="component"], .component');
    console.log('- Found component elements:', todoElements.length);

    let foundComponent = null;

    for (let i = 0; i < todoElements.length; i++) {
        const el = todoElements[i];
        const hasListComponent = !!el.listComponent;
        const hasTodoComponent = !!el.todoComponent;

        console.log(`- Element ${i}:`, {
            hasListComponent,
            hasTodoComponent,
            className: el.className,
            id: el.id
        });

        if (el.todoComponent) {
            foundComponent = el.todoComponent;
            console.log('✅ Found TodoListComponent instance');
            break;
        } else if (el.listComponent) {
            foundComponent = el.listComponent;
            console.log('✅ Found ListComponent instance');
            break;
        }
    }

    if (!foundComponent) {
        console.error('❌ No component instance found!');
        console.error('   Make sure the TodoList component is rendered on the page');
    }

    return foundComponent;
}

// Test 3: Check method overrides
function testMethodOverrides(component) {
    if (!component) {
        console.log('\n❌ No component found to test');
        return false;
    }

    console.log('\n🔧 Testing Method Overrides:');
    console.log('- handleItemAction type:', typeof component.handleItemAction);
    console.log('- handleDeleteWithUndo type:', typeof component.handleDeleteWithUndo);

    // Check if the method is overridden by looking at its source
    if (typeof component.handleItemAction === 'function') {
        const methodSource = component.handleItemAction.toString();
        const isOverridden = methodSource.includes('handleDeleteWithUndo') || methodSource.includes('duplicate');
        console.log('- handleItemAction appears to be overridden:', isOverridden);

        if (isOverridden) {
            console.log('✅ TodoListComponent override is active');
            return true;
        } else {
            console.log('❌ TodoListComponent override NOT active - using base ListComponent');
            console.log('- Method source:', methodSource.substring(0, 200) + '...');
            return false;
        }
    } else {
        console.error('❌ handleItemAction is not a function!');
        return false;
    }
}

// Test 4: Test modal creation directly
function testModalCreation() {
    console.log('\n🎭 Testing Modal Creation:');

    if (typeof window.MCPModal === 'undefined') {
        console.log('❌ MCPModal not available');
        return false;
    }

    try {
        console.log('- Testing modal config processing...');

        const testConfig = {
            title: 'Test Confirm Delete',
            message: 'Delete "Test Item"?',
            confirmText: 'Delete',
            cancelText: 'Cancel'
        };

        console.log('- Test config:', testConfig);

        // Check if Modal class is available for direct testing
        if (typeof window.Modal !== 'undefined') {
            // Test the modal configuration processing
            const testModal = new window.Modal({
                type: 'confirm',
                ...testConfig
            });

            console.log('- Modal config after processing:', {
                type: testModal.config.type,
                title: testModal.config.title,
                message: testModal.config.message,
                confirmText: testModal.config.confirmText,
                cancelText: testModal.config.cancelText,
                buttons: testModal.config.buttons,
                buttonsLength: testModal.config.buttons?.length
            });

            // Test HTML generation
            const modalHTML = testModal.buildHTML();
            console.log('- Generated HTML includes footer:', modalHTML.includes('mcp-modal-footer'));
            console.log('- Generated HTML includes buttons:', modalHTML.includes('mcp-modal-btn'));

            // Check for button text
            const hasDeleteButton = modalHTML.includes('Delete');
            const hasCancelButton = modalHTML.includes('Cancel');
            console.log('- Has Delete button:', hasDeleteButton);
            console.log('- Has Cancel button:', hasCancelButton);

            if (!hasDeleteButton || !hasCancelButton) {
                console.log('❌ Buttons missing from generated HTML');
                console.log('- Footer HTML:', modalHTML.match(/<div class="mcp-modal-footer">[\s\S]*?<\/div>/)?.[0] || 'No footer found');
                return false;
            } else {
                console.log('✅ Buttons found in generated HTML');
                return true;
            }
        } else {
            console.warn('⚠️  Modal class not directly accessible, will test via MCPModal');
            return true; // Continue with other tests
        }

    } catch (error) {
        console.log('❌ Modal creation failed:', error);
        return false;
    }
}

// Test 5: Test actual delete flow simulation
function testDeleteFlow(component) {
    if (!component) {
        console.log('\n❌ No component available for delete flow test');
        return;
    }

    console.log('\n🗑️ Testing Delete Flow:');

    // Find first todo item for testing
    const firstItem = component.data?.[0];
    if (!firstItem) {
        console.log('❌ No todo items found to test');
        return;
    }

    console.log('- Testing with item:', firstItem.id, firstItem.text);

    // Store original method
    const originalHandleItemAction = component.handleItemAction;

    // Add debugging wrapper
    component.handleItemAction = async function (action, id) {
        console.log('🔥 ACTUAL handleItemAction called:', { action, id });
        console.log('🔥 Method source check:', this.handleDeleteWithUndo ? 'HAS handleDeleteWithUndo' : 'NO handleDeleteWithUndo');
        console.log('🔥 This object:', {
            hasDeleteMethod: typeof this.handleDeleteWithUndo,
            listConfig: !!this.listConfig,
            todoConfig: !!this.todoConfig
        });

        return originalHandleItemAction.call(this, action, id);
    };

    console.log('✅ Added debugging to handleItemAction');
    console.log('📝 Now click a delete button to see the flow...');
    console.log('   Look for "🔥 ACTUAL handleItemAction called" messages');
}

// Test 6: Test modal button generation
function testButtonGeneration() {
    console.log('\n🔘 Testing Button Generation Logic:');

    if (typeof window.Modal === 'undefined') {
        console.log('❌ Modal class not accessible for button generation test');
        return;
    }

    const testConfigs = [
        { type: 'alert', confirmText: 'OK' },
        { type: 'confirm', confirmText: 'Delete', cancelText: 'Cancel' },
        { type: 'form', confirmText: 'Submit', cancelText: 'Cancel' }
    ];

    testConfigs.forEach(config => {
        try {
            const modal = new window.Modal(config);
            console.log(`- ${config.type} modal buttons:`, modal.config.buttons);
        } catch (error) {
            console.log(`- ${config.type} modal failed:`, error.message);
        }
    });
}

// Test 7: Live modal test
function testLiveModal() {
    console.log('\n🎪 Testing Live Modal:');

    if (typeof window.MCPModal === 'undefined') {
        console.log('❌ MCPModal not available for live test');
        return;
    }

    console.log('- Creating test modal...');

    // Test modal creation and display
    window.MCPModal.confirm({
        title: 'Debug Test Modal',
        message: 'This is a test modal. Do you see the buttons?',
        confirmText: 'Yes, I see buttons',
        cancelText: 'No buttons visible'
    }).then(result => {
        console.log('✅ Live modal test result:', result);
        if (result.action === 'confirm') {
            console.log('🎉 Modal buttons are working!');
        } else {
            console.log('⚠️  User reported no buttons visible');
        }
    }).catch(error => {
        console.log('❌ Live modal test failed:', error);
    });
}

// Main debug runner
function runFullDebug() {
    console.log('🚀 Running Full Modal Debug Analysis...');

    const availability = testComponentAvailability();
    const component = findTodoListInstance();
    const overrideWorks = testMethodOverrides(component);
    const modalWorks = testModalCreation();

    testButtonGeneration();
    testDeleteFlow(component);

    console.log('\n📋 Debug Summary:');
    console.log('- Components loaded:', availability);
    console.log('- Component found:', !!component);
    console.log('- TodoList override working:', overrideWorks);
    console.log('- Modal creation working:', modalWorks);
    console.log('- Ready for delete test:', !!component && typeof window.MCPModal !== 'undefined');

    // Provide targeted recommendations
    console.log('\n🎯 Recommendations:');

    if (!availability.modal) {
        console.log('❌ PRIORITY 1: Load ModalComponent.js in your HTML');
    } else if (!component) {
        console.log('❌ PRIORITY 1: Ensure TodoList component is rendered on page');
    } else if (!overrideWorks) {
        console.log('❌ PRIORITY 1: Fix TodoListComponent method override');
    } else if (modalWorks) {
        console.log('✅ Everything appears ready. Run testLiveModal() to test actual modal display');
        console.log('   Then click a delete button and watch for 🔥 debug messages');
    }

    // Run live test if everything looks good
    if (availability.modal && component && overrideWorks) {
        setTimeout(() => {
            console.log('\n🎪 Running live modal test...');
            testLiveModal();
        }, 1000);
    }
}

// Helper functions for manual testing
window.debugModal = {
    runFullDebug,
    testComponentAvailability,
    findTodoListInstance,
    testMethodOverrides,
    testModalCreation,
    testButtonGeneration,
    testLiveModal,
    testDeleteFlow
};

// Add styles to make console output more readable
console.log('%c🔍 Modal Debug Script Loaded', 'color: #00ff00; font-weight: bold; font-size: 14px;');
console.log('%c📖 This script must run in BROWSER CONSOLE (not Node.js)', 'color: #ff8800; font-weight: bold;');
console.log('%c🚀 Run runFullDebug() to start analysis', 'color: #0088ff; font-style: italic;');

// Auto-run basic tests only in browser
if (typeof window !== 'undefined') {
    runFullDebug();
} else {
    console.error('❌ Wrong environment detected. Please run in browser console.');
} 