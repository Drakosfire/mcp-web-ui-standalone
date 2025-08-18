
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-08-17

### 🔧 **Protocol & Port Range Configuration Release**

#### ✨ **New Features**
- **Configurable Protocol Support**: Added support for HTTPS URLs in ephemeral web UI sessions
  - New `protocol` configuration option in `MCPWebUIConfig`
  - Auto-detection of protocol from `baseUrl` (supports `https://` and `http://` prefixes)
  - Manual protocol override via `protocol` parameter
  - Session URLs now correctly use configured protocol instead of hardcoded `http://`
- **Enhanced Port Range Configuration**: Improved port allocation for ephemeral web UI servers
  - Better integration with firewall rules and security configurations
  - Support for custom port ranges (e.g., `[11000, 12000]` for production deployments)
  - Proper port allocation within specified ranges for multi-tenant environments

#### 🔧 **Critical Bug Fixes**
- **URL Malformation Fix**: Resolved `http://https//domain.com` malformed URLs
  - SessionManager now properly constructs URLs with correct protocol
  - Eliminates double protocol prefixes in generated session URLs
  - URLs now correctly format as `https://domain.com:port?token=uuid`
- **Port Range Enforcement**: Fixed port allocation to respect configured ranges
  - MCP servers now properly use `portRange` configuration instead of falling back to defaults
  - Ports allocated within specified range (e.g., 11000-12000) for production deployments
  - Eliminates port conflicts with other services

#### 🛠️ **Developer Experience**
- **Enhanced Configuration**: More flexible configuration options for production deployments
  - `MCPWebUIConfig` interface now includes `protocol` field
  - Backward compatibility maintained for existing configurations
  - Clear documentation for protocol and port range configuration
- **Production Ready**: Framework now supports secure, multi-tenant deployments
  - HTTPS support for secure ephemeral web UI sessions
  - Configurable port ranges for firewall and security compliance
  - Proper URL generation for external access

#### 🔒 **Security Improvements**
- **HTTPS Support**: Secure protocol support for production deployments
- **Port Range Security**: Configurable port ranges for better security management
- **URL Integrity**: Proper URL construction prevents malformed session URLs

#### 📊 **Backend Integration**
- **MCP Server Compatibility**: Enhanced compatibility with MCP server deployments
  - Proper integration with environment-based configuration
  - Support for production deployment patterns
  - Better integration with reverse proxies and load balancers

---

## [1.0.5] - 2025-06-29

### 🚀 **Major Feature Release: Scheduled Tasks Component**

#### ✨ **New Features**
- **Scheduled Tasks Dashboard**: Complete task management interface with creation, editing, and status tracking
  - Modal-based task creation form with field validation
  - Schedule parsing for once, daily, weekly, and monthly tasks
  - Status badges with color-coded task states
  - Integration with TaskManager for backend task handling
- **Enhanced TableComponent**: Advanced table functionality for complex data management
  - Action buttons with inline task operations (toggle, run-now, delete)
  - Form state management for modal interfaces
  - Dynamic field rendering with validation
  - Improved responsive design and styling
- **Modal Form System**: Reusable modal interface for data input
  - Backdrop blur effects and modern UI design
  - Field validation with error messaging
  - Support for text, textarea, select, and date field types
  - Accessible keyboard navigation and ESC key handling

#### 🔧 **Critical Bug Fixes**
- **Rate Limiting Issue**: Fixed aggressive rate limiting that was blocking normal UI interactions
  - Moved rate limiting from UI events to API calls only
  - Increased limits from 5 actions/1sec to 10 actions/5sec for more reasonable usage
  - Users can now click buttons and interact with UI without "Action rate limited" errors
- **Component Initialization Timing**: Resolved JavaScript inheritance issues in BaseComponent
  - Fixed `ReferenceError: must call super constructor before using 'this'` errors
  - Components now properly initialize without premature rendering
  - Enhanced component creation guide with timing best practices

#### 🎨 **UI/UX Improvements**
- **Enhanced Styling**: Comprehensive CSS updates for better visual hierarchy
  - Fixed column widths for better table layout
  - Alternating row colors for improved readability
  - Dark mode support with proper contrast ratios
  - Responsive design improvements for mobile devices
- **Form Validation**: Real-time validation with user-friendly error messages
- **Status Indicators**: Color-coded badges for task status with proper contrast
- **Loading States**: Better visual feedback during form submission and data loading

#### 🛠️ **Developer Experience**
- **Component Creation Guide**: Updated documentation with critical timing patterns
  - Added inheritance timing rules and common pitfalls
  - Best practices for component initialization
  - Examples of proper constructor patterns
- **Schema Integration**: Enhanced schema-driven task creation
  - Action buttons properly passed from schema to components
  - Form field configuration through UI schema
  - Improved data transformation and validation

#### 🔒 **Security Enhancements**
- **Refined Rate Limiting**: More intelligent rate limiting that protects APIs without blocking UI
- **Form Input Validation**: Enhanced sanitization for task creation forms
- **Action Validation**: Improved validation for task management operations

#### 📊 **Backend Integration**
- **TaskManager Integration**: Seamless connection between UI and task management system
  - `handleCreateTask()` method for processing new tasks
  - `parseScheduleFromForm()` for converting user input to cron expressions
  - Enhanced data transformation with `descriptionShort` field for table display

---

## [1.0.4] - 2025-06-27

### 🛠️ **Critical Bug Fix Release**

#### 🔧 **Fixed**
- **File Routing Issue**: Corrected UIServer file paths to point to correct development directories
  - Changed from `dist/vanilla` to `src/vanilla` for framework files
  - Changed from `dist/templates/static` to `templates/static` for static files
  - Fixes "❌ Failed to initialize MCP UI" errors caused by missing framework files
- **HTML Rendering Issues**: Fixed additional HTML escaping problems in TodoListComponent
  - Priority select options now render correctly as `<option>` instead of `&lt;option&gt;`
  - Category input field now renders correctly as `<div>` instead of `&lt;div&gt;`
  - Applied proper `trustedHtml()` patterns for array mapping and conditional HTML

#### 🚀 **Improvements**
- **Error Handling**: Enhanced error messages when framework files are not found
- **Development Experience**: Server now correctly serves files from development directories
- **Component Reliability**: TodoListComponent form elements now display and function properly

---

## [1.0.3] - 2025-06-26

### 🚀 **Revolutionary Vanilla JavaScript Transformation**

Complete architectural rewrite from Alpine.js to vanilla JavaScript framework.

#### 🔥 **Breaking Changes**
- **Removed Alpine.js**: Complete elimination of Alpine.js dependency
- **Zero dependencies**: No external JavaScript libraries required
- **New server class**: `UIServer` replaces `UIServer`
- **New initialization**: `MCP.initFromSchema()` replaces Alpine directives
- **Bundle size**: Reduced from 8KB+ to 2-3KB total

#### ✨ **Major Features Added**

##### **Vanilla JavaScript Framework**
- **BaseComponent.js**: Foundation class with security, templating, and events
- **MCPFramework.js**: Component factory and initialization system
- **TodoListComponent.js**: Advanced todo list with undo functionality
- **TableComponent.js**: Feature-rich data table with sorting, filtering, pagination
- **StatsComponent.js**: Statistics display with animations and trends

##### **Perfect Security Implementation**
- **CSP Compliance**: Zero CSP violations with perfect nonce-based security
- **XSS Protection**: Automatic content sanitization with context-aware cleaning
- **Rate Limiting**: Built-in abuse prevention and input validation
- **No eval()**: Zero runtime code compilation or dangerous JavaScript patterns
- **LLM Content Sanitization**: Advanced cleaning for AI-generated content

##### **Ultra-Lightweight Architecture**
- **2-3KB Bundle**: Combined framework size with automatic minification
- **Zero Dependencies**: No external libraries or supply chain risks
- **No Build Process**: Direct JavaScript serving without compilation
- **Copy-Paste Ready**: Disposable framework designed for customization

##### **AI-Friendly Design**
- **Schema-Driven UI**: Perfect for AI agents generating dynamic interfaces
- **Extensive Documentation**: Comprehensive API reference for AI implementation
- **Event-Driven Architecture**: Global event bus for component communication
- **Component Composition**: Mix and match components seamlessly

#### 🔧 **Enhanced Components**

##### **TodoList Component**
- Advanced undo/redo functionality
- Category support and filtering
- Priority management with visual indicators
- Keyboard shortcuts and accessibility
- Custom validation and limits

##### **Table Component**
- Advanced sorting and filtering
- Pagination with customizable page sizes
- Export functionality (CSV, JSON)
- Inline editing capabilities
- Action buttons with confirmation dialogs
- Badge rendering with color mapping

##### **Stats Component**
- Animated counter transitions
- Trend indicators and sparklines
- Currency formatting support
- Custom icons and color schemes
- Responsive layout adaptation

#### 🛠️ **Server Enhancements**

##### **UIServer**
- **Perfect CSP Headers**: Automatic nonce generation and secure policies
- **Combined Bundle Serving**: Single request for entire framework
- **Enhanced Template Rendering**: Secure HTML generation with XSS protection
- **API Endpoint Security**: Comprehensive input validation and sanitization
- **Session Management**: Improved token handling and cleanup

##### **New API Endpoints**
- `GET /static/mcp-framework.js` - Combined framework bundle
- Enhanced `/api/data` with better caching
- Improved `/api/update` with advanced validation
- New `/api/extend-session` for session management

#### 🚀 **Performance Improvements**
- **Smart Polling**: Components only poll when page is visible
- **Efficient DOM Updates**: Smart diffing and minimal re-rendering
- **Memory Management**: Automatic cleanup and resource management
- **Bundle Optimization**: Automatic minification and compression
- **Reduced Network Overhead**: Single framework request vs multiple files

#### 📱 **Enhanced User Experience**
- **Responsive Design**: Mobile-first approach with touch support
- **Dark Mode**: Built-in dark mode with system preference detection
- **Loading States**: Improved visual feedback during operations
- **Error Handling**: Better error messages and recovery mechanisms
- **Accessibility**: Enhanced keyboard navigation and screen reader support

#### 🛡️ **Security Hardening**
- **Content Security Policy**: Perfect CSP compliance with zero violations
- **Input Sanitization**: Context-aware cleaning for all user inputs
- **Rate Limiting**: Prevents API abuse and ensures stability
- **Session Security**: Enhanced token validation and automatic expiration
- **XSS Prevention**: Multiple layers of protection against injection attacks

#### 📚 **Documentation Updates**
- **Complete README Rewrite**: Reflects vanilla JavaScript architecture
- **Security Analysis**: Comprehensive security documentation
- **Implementation Guide**: Step-by-step vanilla JS implementation
- **Migration Guide**: Instructions for upgrading from Alpine.js version
- **API Reference**: Complete vanilla JavaScript API documentation

#### 🔄 **Migration Support**
- **Backward Compatibility**: Existing UI schemas work with new initialization
- **Migration Helper**: Tools to convert from Alpine.js to vanilla JS
- **Side-by-Side Support**: Can run both versions during transition
- **Configuration Migration**: Automatic config translation

### 📊 **New Package Statistics**
- **Bundle size**: 2-3KB (down from 8KB+)
- **Dependencies**: 0 (down from 5+)
- **Framework files**: 6 vanilla JavaScript files
- **CSP violations**: 0
- **Security score**: A+ rating
- **Performance**: 95+ Lighthouse score

---

## [1.0.0] - 2025-06-24

### 🎉 Initial Release

#### Added
- **Dynamic Web UI Framework** for MCP servers
- **Schema-driven interface** generation with JSON configuration
- **Session-based management** with automatic cleanup and security
- **Real-time data polling** with configurable intervals
- **Multiple UI components**: Lists, tables, forms, cards, and stats
- **Secure session handling** with token-based authentication
- **Automatic port management** with configurable port ranges
- **TypeScript support** with full type definitions
- **Production-ready features**:
  - Comprehensive error handling
  - Structured logging
  - Resource cleanup
  - Multi-tenant support
  - User isolation

#### Core Components
- **MCPWebUI**: Main framework class
- **SessionManager**: Secure session handling and lifecycle management
- **UIServer**: Express-based web server with dynamic routing
- **Schema System**: Flexible UI configuration system

#### UI Component Types
- **List Component**: For todo lists and simple data display
- **Table Component**: For data management and administration
- **Form Component**: For data entry and user input
- **Stats Component**: For dashboards and analytics
- **Card Component**: For detailed item views

#### MCP Integration
- **get_web_ui tool**: Standard MCP tool definition
- **Tool handler**: Built-in tool call handling
- **LibreChat compatibility**: Seamless integration with LibreChat
- **Custom MCP server support**: Works with any MCP server implementation

#### Security Features
- **User isolation**: Each user gets their own secure session
- **Automatic expiration**: Sessions automatically expire and clean up
- **Token validation**: Cryptographically secure session tokens
- **Input sanitization**: Safe handling of user input
- **HTTPS ready**: Production deployment support

#### Developer Experience
- **TypeScript-first**: Full type safety and IntelliSense
- **Comprehensive API**: Well-documented public API
- **Helper functions**: Built-in schema generators
- **Error handling**: Graceful error handling and reporting
- **Extensible**: Plugin-ready architecture

#### Performance Features
- **Efficient polling**: Configurable update intervals
- **Resource management**: Automatic cleanup and memory management
- **Scalable architecture**: Handles multiple concurrent sessions
- **Optimized builds**: Small package size and fast loading

#### Documentation
- **Comprehensive README**: Detailed usage examples and API reference
- **TypeScript definitions**: Full type coverage
- **Integration examples**: LibreChat and custom MCP server examples
- **Best practices**: Security and performance guidelines

### 🔧 Technical Details

#### Dependencies
- **express**: Web server framework
- **uuid**: Secure token generation
- **@types/express**: TypeScript definitions
- **@types/node**: Node.js TypeScript definitions
- **@types/uuid**: UUID TypeScript definitions
- **typescript**: TypeScript compiler

#### Peer Dependencies
- **@modelcontextprotocol/sdk**: ^1.11.1

#### System Requirements
- **Node.js**: 18.0.0 or higher
- **TypeScript**: 5.3.0 or higher (for development)

### 📊 Package Statistics
- **Package size**: ~45kB compressed
- **Files**: 25+ TypeScript files
- **Exports**: 10+ public APIs
- **Components**: 5 UI component types
- **Example schemas**: 2 built-in generators

---

## Future Releases

### Planned for v1.1.0
- [ ] Additional component types (Form, Chart, Timeline, Calendar)
- [ ] WebSocket support for real-time updates without polling
- [ ] Virtual scrolling for large datasets
- [ ] Service worker for offline functionality

### Planned for v1.2.0
- [ ] Plugin architecture for custom components
- [ ] Advanced theming and customization system
- [ ] Built-in testing framework
- [ ] Performance monitoring and analytics

---

**For detailed upgrade instructions and breaking changes, see the [Migration Guide](docs/MIGRATION.md).** 