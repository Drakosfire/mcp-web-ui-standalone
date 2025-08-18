// 🔧 MODAL CONFIG DEBUG - Test Modal Rendering Issue
console.log('%c🔧 Testing Modal Configuration Processing...', 'color: #ff6600; font-weight: bold;');

// Test 1: Check modal configuration processing without direct Modal access
function testModalConfig() {
    console.log('\n1️⃣ Testing Modal Config Processing:');

    const testConfig = {
        title: 'Test Delete',
        message: 'Delete this item?',
        confirmText: 'Delete',
        cancelText: 'Cancel'
    };

    console.log('- Input config:', testConfig);

    if (window.MCPModal && window.MCPModal.confirm) {
        console.log('- MCPModal.confirm available ✅');

        // Test by intercepting the modal creation
        console.log('\n2️⃣ Intercepting Modal Creation:');

        // Hook into ModalManager to catch modal creation
        const originalShow = window.MCPModalManager.show;
        let interceptedModal = null;

        window.MCPModalManager.show = function (cfg) {
            console.log('🔍 ModalManager.show called with:', cfg);
            console.log('- Config type:', cfg.type);
            console.log('- Config title:', cfg.title);
            console.log('- Config message:', cfg.message);
            console.log('- Config confirmText:', cfg.confirmText);
            console.log('- Config cancelText:', cfg.cancelText);

            // Call original show method
            const result = originalShow.call(this, cfg);

            // Try to access the created modal
            if (this.activeModals && this.activeModals.size > 0) {
                const modalId = Array.from(this.activeModals.keys())[this.activeModals.size - 1];
                interceptedModal = this.activeModals.get(modalId);
                console.log('✅ Intercepted modal:', !!interceptedModal);

                if (interceptedModal) {
                    console.log('- Modal config after processing:', {
                        type: interceptedModal.config?.type,
                        title: interceptedModal.config?.title,
                        message: interceptedModal.config?.message,
                        buttons: interceptedModal.config?.buttons,
                        buttonsLength: interceptedModal.config?.buttons?.length
                    });

                    // Test HTML generation if possible
                    if (interceptedModal.buildHTML) {
                        console.log('\n3️⃣ Testing HTML Generation:');
                        try {
                            const html = interceptedModal.buildHTML();
                            console.log('- Generated HTML length:', html.length);

                            // Check for key parts
                            const hasHeader = html.includes('mcp-modal-header');
                            const hasBody = html.includes('mcp-modal-body');
                            const hasFooter = html.includes('mcp-modal-footer');
                            const hasButtons = html.includes('mcp-modal-btn');

                            console.log('- Has header:', hasHeader);
                            console.log('- Has body:', hasBody);
                            console.log('- Has footer:', hasFooter);
                            console.log('- Has buttons:', hasButtons);

                            // Extract body content
                            const bodyMatch = html.match(/<div class="mcp-modal-body">([\s\S]*?)<\/div>/);
                            if (bodyMatch) {
                                console.log('- Body content:', bodyMatch[1].trim() || 'EMPTY');
                            }

                            // Extract footer content
                            const footerMatch = html.match(/<div class="mcp-modal-footer">([\s\S]*?)<\/div>/);
                            if (footerMatch) {
                                console.log('- Footer content:', footerMatch[1].trim() || 'EMPTY');
                            } else {
                                console.error('❌ Footer section missing from HTML!');
                            }

                        } catch (error) {
                            console.error('❌ HTML generation failed:', error);
                        }
                    }

                    // Test individual build methods if available
                    console.log('\n4️⃣ Testing Individual Build Methods:');
                    try {
                        if (interceptedModal.buildHeader) {
                            const header = interceptedModal.buildHeader();
                            console.log('- buildHeader() works:', !!header);
                        }
                        if (interceptedModal.buildBody) {
                            const body = interceptedModal.buildBody();
                            console.log('- buildBody() result:', body || 'EMPTY');
                        }
                        if (interceptedModal.buildFooter) {
                            const footer = interceptedModal.buildFooter();
                            console.log('- buildFooter() result:', footer || 'EMPTY');
                        }
                    } catch (error) {
                        console.error('❌ Build method testing failed:', error);
                    }
                }
            }

            return result;
        };

        // Test the modal creation
        console.log('- Creating test modal...');
        window.MCPModal.confirm(testConfig).then(result => {
            console.log('\n✅ Modal completed with result:', result);

            // Restore original method
            window.MCPModalManager.show = originalShow;

        }).catch(error => {
            console.error('❌ Modal failed:', error);
            // Restore original method
            window.MCPModalManager.show = originalShow;
        });

    } else {
        console.error('❌ MCPModal.confirm not available');
    }
}

// Test 2: Direct inspection of current modal in DOM
function inspectCurrentModal() {
    console.log('\n5️⃣ Inspecting Current Modal in DOM:');

    const modal = document.querySelector('.mcp-modal-overlay');
    if (!modal) {
        console.log('❌ No modal currently in DOM');
        return;
    }

    console.log('✅ Found modal in DOM');

    const header = modal.querySelector('.mcp-modal-header');
    const body = modal.querySelector('.mcp-modal-body');
    const footer = modal.querySelector('.mcp-modal-footer');

    console.log('- Header element:', !!header);
    console.log('- Body element:', !!body);
    console.log('- Footer element:', !!footer);

    if (header) {
        console.log('- Header content:', header.innerHTML.trim());
    }

    if (body) {
        console.log('- Body content:', body.innerHTML.trim() || 'EMPTY');
    } else {
        console.error('❌ Modal body element missing!');
    }

    if (footer) {
        console.log('- Footer content:', footer.innerHTML.trim() || 'EMPTY');
    } else {
        console.error('❌ Modal footer element missing!');
    }

    const buttons = modal.querySelectorAll('button');
    console.log('- Total buttons found:', buttons.length);

    buttons.forEach((btn, i) => {
        console.log(`- Button ${i}:`, btn.textContent, btn.getAttribute('data-action'));
    });
}

// Test 3: Live production delete debugging
function enableLiveDeleteDebugging() {
    console.log('\n6️⃣ Enabling Live Production Delete Debugging:');

    // Enhanced component finder
    console.log('🔍 Searching for component instances...');

    // Try multiple selectors
    const selectors = [
        '.component',
        '[class*="component"]',
        '[class*="list"]',
        '[class*="todo"]',
        'div',
        '*'
    ];

    let comp = null;
    let foundElements = [];

    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        console.log(`- Selector '${selector}': found ${elements.length} elements`);

        for (let el of elements) {
            // Check for any component-like properties
            const componentProps = [];
            if (el.todoComponent) componentProps.push('todoComponent');
            if (el.listComponent) componentProps.push('listComponent');
            if (el.component) componentProps.push('component');
            if (el._component) componentProps.push('_component');
            if (el.mcpComponent) componentProps.push('mcpComponent');

            if (componentProps.length > 0) {
                foundElements.push({
                    element: el,
                    props: componentProps,
                    className: el.className,
                    id: el.id
                });

                // Try to get the first available component
                if (!comp) {
                    comp = el.todoComponent || el.listComponent || el.component || el._component || el.mcpComponent;
                }
            }
        }

        if (foundElements.length > 0) break; // Stop searching if we found something
    }

    console.log('📋 Found component elements:', foundElements);

    if (foundElements.length === 0) {
        console.error('❌ No component instances found anywhere in DOM');
        console.log('🔍 Let\'s check what elements exist:');

        // Debug: Show what elements are in the DOM
        const allDivs = document.querySelectorAll('div');
        console.log(`- Total divs: ${allDivs.length}`);

        // Show elements with classes that might be components
        allDivs.forEach((div, i) => {
            if (div.className && (div.className.includes('list') || div.className.includes('todo') || div.className.includes('component'))) {
                console.log(`  [${i}] className: "${div.className}", id: "${div.id}"`);

                // Check all properties on this element
                const props = Object.getOwnPropertyNames(div).filter(prop =>
                    prop.includes('component') || prop.includes('todo') || prop.includes('list')
                );
                if (props.length > 0) {
                    console.log(`      Properties: ${props.join(', ')}`);
                }
            }
        });

        // Check if TodoListComponent exists globally
        console.log('🔍 Global component availability:');
        console.log('- window.TodoListComponent:', typeof window.TodoListComponent);
        console.log('- window.ListComponent:', typeof window.ListComponent);
        console.log('- window.createTodoListComponent:', typeof window.createTodoListComponent);

        return;
    }

    if (!comp) {
        console.error('❌ Found element containers but no component instances');
        foundElements.forEach((item, i) => {
            console.log(`  Element ${i}:`, item.element);
            console.log(`    Properties: ${item.props.join(', ')}`);
            item.props.forEach(prop => {
                console.log(`    ${prop}:`, typeof item.element[prop]);
            });
        });
        return;
    }

    console.log('✅ Found component instance:', comp);
    console.log('- Component type:', comp.constructor?.name || 'Unknown');
    console.log('- Has handleDeleteWithUndo:', typeof comp.handleDeleteWithUndo);
    console.log('- Has handleItemAction:', typeof comp.handleItemAction);
    console.log('- Has findItemById:', typeof comp.findItemById);
    console.log('- Has listConfig:', !!comp.listConfig);

    // Hook into the MCPModal.confirm method specifically
    const originalConfirm = window.MCPModal.confirm;
    let callCount = 0;

    window.MCPModal.confirm = async function (config) {
        callCount++;
        console.log(`\n🔥 PRODUCTION DELETE CALL #${callCount}:`);
        console.log('- Config received:', config);
        console.log('- Config keys:', Object.keys(config || {}));
        console.log('- Config type check:', typeof config);
        console.log('- Config confirmText:', config?.confirmText);
        console.log('- Config cancelText:', config?.cancelText);

        // Compare with working test config
        const testConfig = {
            title: 'Test Delete',
            message: 'Delete this item?',
            confirmText: 'Delete',
            cancelText: 'Cancel'
        };

        console.log('🔍 COMPARISON:');
        console.log('- Production config:', JSON.stringify(config, null, 2));
        console.log('- Working test config:', JSON.stringify(testConfig, null, 2));

        // Call original method
        const result = await originalConfirm.call(this, config);

        console.log('🎯 Production modal result:', result);

        return result;
    };

    console.log('🎯 Live debugging enabled! Now click a DELETE button in your Todoodles UI.');
    console.log('📋 The console will show exactly what config is being passed.');

    // Also hook into handleDeleteWithUndo if available
    if (comp.handleDeleteWithUndo) {
        const originalDelete = comp.handleDeleteWithUndo;
        comp.handleDeleteWithUndo = async function (id) {
            console.log('\n🔥 handleDeleteWithUndo called with ID:', id);

            const item = this.findItemById(id);
            console.log('- Found item:', item);
            console.log('- Item text field config:', this.listConfig?.itemTextField);
            console.log('- Item text value:', item?.[this.listConfig?.itemTextField]);

            return originalDelete.call(this, id);
        };

        console.log('✅ Also hooked handleDeleteWithUndo');
    } else {
        // Try to hook into handleItemAction instead
        if (comp.handleItemAction) {
            const originalAction = comp.handleItemAction;
            comp.handleItemAction = async function (action, id) {
                if (action === 'delete') {
                    console.log('\n🔥 handleItemAction(delete) called with ID:', id);

                    const item = this.findItemById ? this.findItemById(id) : null;
                    console.log('- Found item:', item);
                    console.log('- Action:', action);
                }

                return originalAction.call(this, action, id);
            };

            console.log('✅ Hooked handleItemAction (delete)');
        }
    }

    return function restore() {
        window.MCPModal.confirm = originalConfirm;
        console.log('🔄 Restored original MCPModal.confirm');
    };
}

// Test 4: Find ListComponent instance through MCP Framework
function findAndHookListComponent() {
    console.log('\n7️⃣ Finding ListComponent through MCP Framework:');

    // Check MCP Framework component registry
    if (window.MCPFramework) {
        console.log('✅ MCPFramework available');
        console.log('- Framework components:', Object.keys(window.MCPFramework.components || {}));

        // Check if there's a component registry
        if (window.MCPFramework.components) {
            Object.entries(window.MCPFramework.components).forEach(([id, component]) => {
                console.log(`  Component "${id}":`, component.constructor?.name || typeof component);
                if (component.handleItemAction) {
                    console.log(`    - Has handleItemAction: ✅`);
                    hookIntoComponent(component, id);
                } else {
                    console.log(`    - No handleItemAction: ❌`);
                }
            });
        }
    }

    // Alternative: Find component by checking the specific elements
    const todoListElement = document.getElementById('todoodles-list');
    if (todoListElement) {
        console.log('✅ Found todoodles-list element');

        // Try to find component in various ways
        const possibleProps = ['component', 'listComponent', '_component', 'mcpComponent', '__component'];
        for (const prop of possibleProps) {
            if (todoListElement[prop]) {
                console.log(`✅ Found component via ${prop}`);
                hookIntoComponent(todoListElement[prop], 'todoodles-list-' + prop);
                return;
            }
        }

        // Try to find by checking all properties
        const allProps = Object.getOwnPropertyNames(todoListElement);
        const componentProps = allProps.filter(prop =>
            prop.toLowerCase().includes('component') ||
            prop.toLowerCase().includes('list') ||
            (todoListElement[prop] && typeof todoListElement[prop] === 'object' && todoListElement[prop].handleItemAction)
        );

        console.log('🔍 Potential component properties:', componentProps);

        for (const prop of componentProps) {
            const obj = todoListElement[prop];
            if (obj && typeof obj === 'object' && obj.handleItemAction) {
                console.log(`✅ Found component via property "${prop}"`);
                hookIntoComponent(obj, 'todoodles-' + prop);
                return;
            }
        }
    }

    // Alternative: Hook into ListComponent creation
    if (window.ListComponent) {
        console.log('✅ Hooking into ListComponent constructor');

        const originalListComponent = window.ListComponent;
        window.ListComponent = function (...args) {
            console.log('🎉 NEW ListComponent created!');
            const instance = new originalListComponent(...args);

            // Immediately hook into this instance
            console.log('- Instance created:', instance.constructor?.name);
            console.log('- Has handleItemAction:', typeof instance.handleItemAction);

            hookIntoComponent(instance, 'new-instance');

            return instance;
        };

        // Copy over static properties
        Object.setPrototypeOf(window.ListComponent, originalListComponent);
        Object.defineProperty(window.ListComponent, 'prototype', {
            value: originalListComponent.prototype,
            writable: false
        });

        console.log('🎯 ListComponent constructor hooked. Any new instances will be automatically traced.');
    }
}

function hookIntoComponent(component, componentId) {
    console.log(`\n🔧 Hooking into component "${componentId}":`, component);
    console.log('- Type:', component.constructor?.name || typeof component);
    console.log('- Has handleItemAction:', typeof component.handleItemAction);
    console.log('- Has findItemById:', typeof component.findItemById);
    console.log('- Has listConfig:', !!component.listConfig);

    if (component.handleItemAction) {
        const originalAction = component.handleItemAction;
        component.handleItemAction = async function (action, id) {
            if (action === 'delete') {
                console.log(`\n🔥 [${componentId}] DELETE action triggered:`);
                console.log('- Action:', action);
                console.log('- ID:', id);

                const item = this.findItemById ? this.findItemById(id) : null;
                console.log('- Found item:', item);
                console.log('- Item text field:', this.listConfig?.itemTextField);
                console.log('- Item text value:', item?.[this.listConfig?.itemTextField]);
                console.log('- Confirm deletes config:', this.listConfig?.confirmDeletes);

                // Track the flow
                console.log('🔄 Calling original handleItemAction...');
            }

            return originalAction.call(this, action, id);
        };

        console.log(`✅ Hooked handleItemAction for component "${componentId}"`);
    }

    // Also hook MCPModal.confirm if not already done
    if (!window.MCPModal._debugHooked) {
        const originalConfirm = window.MCPModal.confirm;
        window.MCPModal.confirm = async function (config) {
            console.log(`\n🎭 [${componentId}] MCPModal.confirm called:`);
            console.log('- Config:', config);
            console.log('- Has confirmText:', !!config?.confirmText);
            console.log('- Has cancelText:', !!config?.cancelText);
            console.log('- Config keys:', Object.keys(config || {}));

            const result = await originalConfirm.call(this, config);
            console.log('- Modal result:', result);

            return result;
        };

        window.MCPModal._debugHooked = true;
        console.log(`✅ Hooked MCPModal.confirm`);
    }
}

// Run initial test
testModalConfig();

// Make functions available
window.inspectCurrentModal = inspectCurrentModal;
window.enableLiveDeleteDebugging = enableLiveDeleteDebugging;
window.findAndHookListComponent = findAndHookListComponent;

console.log('\n🔍 Available commands:');
console.log('- inspectCurrentModal() - Analyze current modal in DOM');
console.log('- enableLiveDeleteDebugging() - Hook into production delete flow');
console.log('- findAndHookListComponent() - Find and hook ListComponent instance');
console.log('- testModalConfig() - Re-run modal tests'); 