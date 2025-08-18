// 🔍 MODAL DEBUG SCRIPT - Copy & Paste into Browser Console
console.log('%c🔍 Modal Debug Script Starting...', 'color: #00ff00; font-weight: bold;');

// Quick environment check
if (typeof window === 'undefined') {
    console.error('❌ Run this in BROWSER CONSOLE, not Node.js!');
} else {
    console.log('✅ Browser environment detected');

    // Test 1: Component availability
    const components = {
        ListComponent: typeof window.ListComponent,
        TodoListComponent: typeof window.TodoListComponent,
        MCPModal: typeof window.MCPModal,
        Modal: typeof window.Modal
    };
    console.log('📦 Components:', components);

    // Test 2: Find component instance
    const elements = document.querySelectorAll('.component, [class*="component"]');
    console.log('🔍 Found', elements.length, 'component elements');

    let comp = null;
    for (let el of elements) {
        if (el.todoComponent || el.listComponent) {
            comp = el.todoComponent || el.listComponent;
            console.log('✅ Found component instance');
            break;
        }
    }

    if (!comp) {
        console.error('❌ No component instance found!');
    } else {
        // Test 3: Check method override
        const hasOverride = comp.handleDeleteWithUndo !== undefined;
        console.log('🔧 TodoList override active:', hasOverride);

        // Test 4: Test modal directly
        if (window.MCPModal) {
            console.log('🎭 Testing modal...');
            window.MCPModal.confirm({
                title: 'Debug Test',
                message: 'Do you see buttons?',
                confirmText: 'Yes',
                cancelText: 'No'
            }).then(r => console.log('✅ Modal result:', r))
                .catch(e => console.error('❌ Modal error:', e));
        }

        // Test 5: Add live debugging
        const orig = comp.handleItemAction;
        comp.handleItemAction = async function (action, id) {
            console.log('🔥 CLICKED:', action, id);
            return orig.call(this, action, id);
        };
        console.log('🎯 Debug wrapper added - click delete button now!');
    }
} 