# MCP Server CSS Architecture

## Overview

CSS now lives with each MCP server instead of in the framework. **Environment variable driven approach for maximum flexibility.**

## Quick Setup (3 Steps)

1. Put your CSS in: `your-mcp-server/static/styles.css`
2. Add to your MCP server code:
   ```typescript
   cssPath: process.env.MCP_WEB_UI_CSS_PATH || './static'
   ```
3. Set environment variable: `MCP_WEB_UI_CSS_PATH=/path/to/your/static` (directory path, not file path)

**That's it!** The framework automatically serves your `styles.css` via `/static/styles.css`

## Directory Structure

```
mcp-servers/
  └── todoodles/
      ├── static/
      │   └── styles.css    # Your CSS file
      ├── src/index.ts
      └── .env              # Set MCP_WEB_UI_CSS_PATH here
```

## Environment Variable Configuration

The CSS path is controlled by the `MCP_WEB_UI_CSS_PATH` environment variable:

1. **Explicit configuration** - Direct cssPath in config  
2. **Environment variable** - `MCP_WEB_UI_CSS_PATH` (directory path)
3. **Default fallback** - `./static`

## Example Configurations

### Development (.env file)
```bash
MCP_WEB_UI_CSS_PATH=/media/drakosfire/Projects/Sizzek/mcp-servers/todoodles/static
```

### Production (environment variable) 
```bash
export MCP_WEB_UI_CSS_PATH="/app/mcp-server/static"
```

### Docker (relative path)
```bash
export MCP_WEB_UI_CSS_PATH="./static"
```

## Routes Created

- **Framework CSS**: `/static/styles.css` (base framework styles)
- **App CSS**: `/static/styles.css` (your MCP server styles, higher priority)

HTML Generated:
```html
<link href="/static/styles.css" rel="stylesheet">   <!-- Framework + App -->
```

### URL Architecture

- Framework CSS: Served from `templates/static/styles.css`
- App CSS: Served from `$MCP_WEB_UI_CSS_PATH/styles.css`
- Route: `/static/styles.css` (app CSS takes priority)

## Testing Your Setup

1. **Check environment variable**: `echo $MCP_WEB_UI_CSS_PATH`
2. **Verify file exists**: Check `$MCP_WEB_UI_CSS_PATH/styles.css`
3. **Test CSS loading**: Visit your MCP web UI
4. **Test URL**: Visit `http://localhost:PORT/static/styles.css`

If CSS doesn't load:
- Verify environment variable name: `MCP_WEB_UI_CSS_PATH` (not `MCP_WEB_CSS_PATH`)
- Verify path points to directory containing `styles.css` (not the CSS file itself)
- Clear browser cache and restart MCP server

## Migration from Complex Path System

```bash
# Before: Complex path detection logic
# Multiple possible paths, pattern matching, schema detection...

# After: Simple environment variable
export MCP_WEB_UI_CSS_PATH="/path/to/your/static"
```

## Deployment Examples

### Development
```bash
export MCP_WEB_UI_CSS_PATH="./static"
```

### Production/Docker
```bash
export MCP_WEB_UI_CSS_PATH="/app/mcp-server/static"
```

### LibreChat Integration
```bash
# In your MCP server environment
MCP_WEB_UI_CSS_PATH=/absolute/path/to/static
```

## Benefits

✅ **Environment Driven** - Configure via `MCP_WEB_UI_CSS_PATH`
✅ **Flexible Paths** - Absolute or relative paths supported  
✅ **Simple Naming** - Always `styles.css`, no complex naming schemes
✅ **Clear Separation** - Framework CSS vs MCP server CSS
✅ **Easy Deployment** - Just set environment variable

## Real World Example: Todoodles

```typescript
// todoodles/src/web-ui-integration.ts
this.webUI = new MCPWebUI<TodoodleItem>({
    dataSource: this.getDataSource.bind(this),
    schema,
    onUpdate: this.handleUIUpdate.bind(this),
    cssPath: process.env.MCP_WEB_UI_CSS_PATH || './static'
});
```

```bash
# todoodles/.env
MCP_WEB_UI_CSS_PATH=/media/drakosfire/Projects/Sizzek/mcp-servers/todoodles/static
```

## How It Works

### 1. Framework Priority Resolution
```typescript
config.resources.css.mcpServerDirectory = 
    this.config.cssPath ||                    // 1. Explicit config
    process.env.MCP_WEB_UI_CSS_PATH ||        // 2. Environment variable
    './static';                               // 3. Default fallback
```

### 2. CSS Route Serving
```
GET /mcp-static/styles.css
→ Serves from configured CSS directory
→ Always serves file named "styles.css"
```

### 3. HTML Output
```html
<link href="/static/styles.css" rel="stylesheet">        <!-- Framework base -->
<link href="/mcp-static/styles.css" rel="stylesheet">   <!-- MCP server -->
```

This environment variable approach makes CSS configuration simple, flexible, and deployment-friendly while maintaining clear separation between framework and MCP server styling. 