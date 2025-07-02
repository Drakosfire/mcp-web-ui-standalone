# MMS Media Integration Architecture for LibreChat External Endpoint

**Version**: 1.0  
**Last Updated**: June 2025  
**Purpose**: Comprehensive technical documentation for integrating MMS media URLs into LibreChat's external message system

---

## Executive Summary

This document outlines the architectural changes needed to support incoming media URLs from MMS messages in LibreChat's external endpoint system. The enhanced DungeonMind SMS router now sends rich MMS payloads with media URLs, but LibreChat's external endpoint currently lacks the infrastructure to process and utilize these media attachments.

### Current State vs. Target State

**Current Enhanced MMS Payload** (from DungeonMind SMS Router):
```json
{
  "from": "+19709788817",
  "to": "+13022716778", 
  "body": "MMS test",
  "message_sid": "MMb551f781fd276feb8aae4aa4c511fc91",
  "message_type": "MMS",
  "num_media": 1,
  "media": [
    {
      "url": "https://api.twilio.com/2010-04-01/Accounts/AC.../Messages/MM.../Media/ME...",
      "content_type": "image/jpeg",
      "index": 0,
      "supported": true
    }
  ],
  "metadata": {
    "conversationId": "uuid",
    "phoneNumber": "+19709788817",
    "messageType": "MMS",
    "mediaCount": 1,
    "supportedMediaCount": 1,
    "unsupportedMediaCount": 0
  }
}
```

**Target State**: LibreChat should process these media URLs, download/convert the content, and make it available to agents for analysis and response generation.

---

## Current LibreChat Media Architecture Analysis

### 1. File Storage System

LibreChat implements a sophisticated file handling system with multiple storage strategies:

**File Model** (`LibreChat/api/models/File.js`):
```javascript
// MongoFile structure
{
  file_id: String,           // UUID identifier
  user: ObjectId,            // User ownership
  filepath: String,          // Storage path/URL
  filename: String,          // Original filename
  type: String,              // MIME type
  bytes: Number,             // File size
  width: Number,             // Image width (if applicable)
  height: Number,            // Image height (if applicable)
  source: FileSources,       // Storage strategy (local, S3, Azure, etc.)
  context: FileContext,      // Usage context (avatar, message_attachment, etc.)
  embedded: Boolean,         // Vector database embedded
  metadata: Object,          // Extensible metadata
  expiresAt: Date,          // TTL for temporary files
  createdAt: Date,
  updatedAt: Date
}
```

**Storage Strategies** (`LibreChat/api/server/services/Files/strategies/`):
- `FileSources.local` - Local filesystem storage
- `FileSources.s3` - AWS S3 storage
- `FileSources.azure_blob` - Azure Blob storage
- `FileSources.firebase` - Firebase storage
- `FileSources.vectordb` - Vector database for embeddings

### 2. Image Processing Pipeline

**Core Function** (`LibreChat/api/server/services/Files/images/encode.js`):
```javascript
/**
 * Encodes and formats the given files for LLM consumption
 * @param {Express.Request} req - The request object
 * @param {Array<MongoFile>} files - The array of files to encode and format
 * @param {EModelEndpoint} [endpoint] - Optional: The endpoint for the image
 * @param {string} [mode] - Optional: The endpoint mode for the image
 * @returns {Promise<{ text: string; files: MongoFile[]; image_urls: MessageContentImageUrl[] }>}
 */
async function encodeAndFormat(req, files, endpoint, mode) {
  // Converts images to base64 or URL format based on LLM provider requirements
  // - OpenAI: Uses image URLs or base64
  // - Anthropic: Requires base64 with specific format
  // - Google: Uses different formats based on mode
  // Returns formatted image_urls array for LLM consumption
}
```

**Image URL Processing in Clients** (`LibreChat/api/app/clients/OpenAIClient.js`):
```javascript
async addImageURLs(message, attachments) {
  const { files, image_urls } = await encodeAndFormat(
    this.options.req,
    attachments,
    this.options.endpoint,
  );
  message.image_urls = image_urls.length ? image_urls : undefined;
  return files;
}
```

### 3. External Message Processing

**Current External Client Flow** (`LibreChat/api/server/services/Endpoints/external/index.js`):
```javascript
class ExternalClient extends BaseClient {
  async sendMessage(message, opts = {}) {
    // 1. Convert string message to object if needed
    const messageObj = typeof message === 'string' ? { content: message } : message;
    
    // 2. Create/find conversation
    const conversation = await this.createConversationIfNeeded(messageObj);
    
    // 3. Process through LLM
    const response = await this.processWithLLM(formattedMessage, opts);
    
    return { conversationId, messageId: response.messageId };
  }
}
```

**Current Gap**: The ExternalClient doesn't process media URLs from external messages. It only handles text content.

---

## Required Architecture Changes

### 1. Media URL Download and Storage Service

**New File**: `LibreChat/api/server/services/Files/External/mediaDownloader.js`

```javascript
const axios = require('axios');
const { v4 } = require('uuid');
const { createFile } = require('~/models/File');
const { getStrategyFunctions } = require('~/server/services/Files/strategies');
const { FileContext, FileSources } = require('librechat-data-provider');
const { logger } = require('~/config');

/**
 * Downloads media from Twilio URL and stores it using LibreChat's file system
 * @param {Object} params - Download parameters
 * @param {string} params.mediaUrl - Twilio media URL
 * @param {string} params.contentType - MIME type
 * @param {string} params.userId - User ID for ownership
 * @param {string} params.conversationId - Conversation context
 * @param {string} params.messageId - Message context
 * @returns {Promise<MongoFile>} Created file record
 */
async function downloadTwilioMedia({ mediaUrl, contentType, userId, conversationId, messageId }) {
  try {
    // 1. Download media from Twilio URL with authentication
    const response = await axios.get(mediaUrl, {
      responseType: 'arraybuffer',
      auth: {
        username: process.env.TWILIO_ACCOUNT_SID,
        password: process.env.TWILIO_AUTH_TOKEN
      },
      timeout: 30000 // 30 second timeout
    });

    // 2. Generate file metadata
    const file_id = v4();
    const extension = getExtensionFromMimeType(contentType);
    const filename = `mms_media_${Date.now()}.${extension}`;
    
    // 3. Store using LibreChat's file strategy
    const fileStrategy = process.env.FILE_STRATEGY || FileSources.local;
    const { saveBuffer } = getStrategyFunctions(fileStrategy);
    
    const filepath = await saveBuffer({
      userId,
      fileName: `${file_id}-${filename}`,
      buffer: Buffer.from(response.data)
    });

    // 4. Get image dimensions if it's an image
    let width, height;
    if (contentType.startsWith('image/')) {
      ({ width, height } = await getImageDimensions(Buffer.from(response.data)));
    }

    // 5. Create file record in database
    const fileRecord = await createFile({
      user: userId,
      file_id,
      bytes: response.data.byteLength,
      filepath,
      filename,
      type: contentType,
      source: fileStrategy,
      context: FileContext.message_attachment,
      width,
      height,
      metadata: {
        source: 'twilio_mms',
        originalUrl: mediaUrl,
        conversationId,
        messageId,
        downloadedAt: new Date()
      }
    }, true); // Disable TTL for MMS attachments

    logger.info('[downloadTwilioMedia] Successfully downloaded and stored media:', {
      file_id,
      filename,
      contentType,
      bytes: response.data.byteLength
    });

    return fileRecord;
  } catch (error) {
    logger.error('[downloadTwilioMedia] Failed to download media:', {
      mediaUrl,
      error: error.message
    });
    throw new Error(`Failed to download MMS media: ${error.message}`);
  }
}

/**
 * Processes multiple media URLs from MMS message
 * @param {Object} params - Processing parameters
 * @param {Array} params.mediaArray - Array of media objects from MMS payload
 * @param {string} params.userId - User ID
 * @param {string} params.conversationId - Conversation ID
 * @param {string} params.messageId - Message ID
 * @returns {Promise<MongoFile[]>} Array of created file records
 */
async function processMMSMedia({ mediaArray, userId, conversationId, messageId }) {
  const downloadPromises = mediaArray
    .filter(media => media.supported) // Only download supported media types
    .map(media => downloadTwilioMedia({
      mediaUrl: media.url,
      contentType: media.content_type,
      userId,
      conversationId,
      messageId
    }));

  const results = await Promise.allSettled(downloadPromises);
  
  const successfulDownloads = [];
  const failedDownloads = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successfulDownloads.push(result.value);
    } else {
      failedDownloads.push({
        media: mediaArray[index],
        error: result.reason.message
      });
    }
  });

  if (failedDownloads.length > 0) {
    logger.warn('[processMMSMedia] Some media downloads failed:', { failedDownloads });
  }

  logger.info('[processMMSMedia] Media processing complete:', {
    total: mediaArray.length,
    successful: successfulDownloads.length,
    failed: failedDownloads.length
  });

  return successfulDownloads;
}

function getExtensionFromMimeType(mimeType) {
  const mimeToExt = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/mpeg': 'mpg',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'application/pdf': 'pdf',
    'text/plain': 'txt'
  };
  return mimeToExt[mimeType] || 'bin';
}

async function getImageDimensions(buffer) {
  try {
    const sharp = require('sharp');
    const metadata = await sharp(buffer).metadata();
    return { width: metadata.width, height: metadata.height };
  } catch (error) {
    logger.warn('[getImageDimensions] Failed to get image dimensions:', error.message);
    return { width: null, height: null };
  }
}

module.exports = {
  downloadTwilioMedia,
  processMMSMedia
};
```

### 2. Enhanced External Message Handler

**Modified File**: `LibreChat/api/server/routes/messages.js`

Add MMS media processing to the external message handler:

```javascript
// In the external message processing section (around line 330)
if (message.role === 'external') {
  // Enhanced MMS media processing
  let attachedFiles = [];
  
  // Check if this is an MMS with media
  if (message.media && Array.isArray(message.media) && message.media.length > 0) {
    const { processMMSMedia } = require('~/server/services/Files/External/mediaDownloader');
    
    try {
      // Generate a temporary message ID for file association
      const tempMessageId = require('uuid').v4();
      
      // Download and store all media files
      attachedFiles = await processMMSMedia({
        mediaArray: message.media,
        userId: req.user.id,
        conversationId: req.params.conversationId,
        messageId: tempMessageId
      });
      
      logger.info('[External MMS] Successfully processed media attachments:', {
        count: attachedFiles.length,
        conversationId: req.params.conversationId
      });
    } catch (error) {
      logger.error('[External MMS] Failed to process media attachments:', error);
      // Continue processing without media if download fails
    }
  }

  // Add files to the message metadata for LLM processing
  if (attachedFiles.length > 0) {
    message.metadata = {
      ...message.metadata,
      attachedFiles: attachedFiles.map(file => ({
        file_id: file.file_id,
        filename: file.filename,
        type: file.type,
        url: file.filepath
      }))
    };
  }

  // Existing external client initialization code...
  const { initializeClient } = require('~/server/services/Endpoints/external/initialize');
  // ... rest of existing code
}
```

### 3. Enhanced External Client for Media Processing

**Modified File**: `LibreChat/api/server/services/Endpoints/external/index.js`

Add media processing capabilities to the ExternalClient:

```javascript
class ExternalClient extends BaseClient {
  async sendMessage(message, opts = {}) {
    logger.debug('[ExternalClient] Processing external message with potential media');
    
    // Convert string message to object if needed
    const messageObj = typeof message === 'string' ? { content: message } : message;

    // Process attached media files if present
    let attachments = null;
    if (messageObj.metadata?.attachedFiles) {
      try {
        attachments = await this.processExternalMedia(messageObj.metadata.attachedFiles);
      } catch (error) {
        logger.error('[ExternalClient] Failed to process external media:', error);
        // Continue without attachments if processing fails
      }
    }

    // Set up conversation and message processing
    const conversation = await this.createConversationIfNeeded(messageObj);
    
    // Prepare the message for LLM processing
    const formattedMessage = {
      text: messageObj.content || messageObj.text || '',
      content: [{ type: 'text', text: messageObj.content || messageObj.text || '' }],
      conversationId: conversation.conversationId,
      parentMessageId: opts.parentMessageId,
      metadata: {
        ...messageObj?.metadata,
        source: messageObj?.metadata?.source || 'external',
        createdBy: 'external-service'
      }
    };

    // Add attachments if processed successfully
    if (attachments && attachments.length > 0) {
      this.options.attachments = Promise.resolve(attachments);
      logger.info('[ExternalClient] Added media attachments to message:', {
        count: attachments.length,
        types: attachments.map(f => f.type)
      });
    }

    // Process through LLM with media support
    const response = await this.processWithLLM(formattedMessage, {
      ...opts,
      conversationId: conversation.conversationId
    });

    return {
      conversationId: conversation.conversationId,
      messageId: response.messageId,
      responseId: response.messageId
    };
  }

  /**
   * Processes external media files and converts them to LibreChat's file format
   * @param {Array} attachedFiles - Array of file metadata from external source
   * @returns {Promise<MongoFile[]>} Array of processed file objects
   */
  async processExternalMedia(attachedFiles) {
    const { getFiles } = require('~/models/File');
    
    // Get file records from database using file_ids
    const fileIds = attachedFiles.map(f => f.file_id);
    const files = await getFiles({ file_id: { $in: fileIds } });
    
    if (files.length !== attachedFiles.length) {
      logger.warn('[ExternalClient] Some attached files not found in database:', {
        expected: attachedFiles.length,
        found: files.length
      });
    }

    // Filter to only include files owned by the current user for security
    const userFiles = files.filter(file => file.user.toString() === this.user.toString());
    
    if (userFiles.length !== files.length) {
      logger.warn('[ExternalClient] Some files filtered due to ownership mismatch:', {
        total: files.length,
        authorized: userFiles.length
      });
    }

    logger.debug('[ExternalClient] Processed external media files:', {
      count: userFiles.length,
      fileIds: userFiles.map(f => f.file_id)
    });

    return userFiles;
  }
}
```

### 4. Agent Integration for Media Analysis

**Enhanced Agent Processing** (`LibreChat/api/server/controllers/agents/client.js`):

The AgentClient already has media processing capabilities through the `addImageURLs` method. The key enhancement needed is ensuring that external media files are properly processed:

```javascript
// In AgentClient.buildMessages method (around line 244)
if (this.options.attachments) {
  const attachments = await this.options.attachments;
  
  // Log media processing for external messages
  if (attachments.length > 0) {
    logger.info('[AgentClient] Processing media attachments for agent analysis:', {
      count: attachments.length,
      types: attachments.map(f => f.type),
      agent_id: this.options.agent?.id
    });
  }

  // Process media files for agent consumption
  const files = await this.addImageURLs(
    orderedMessages[orderedMessages.length - 1],
    attachments,
  );

  this.options.attachments = files;
}
```

The existing `addImageURLs` method in AgentClient will automatically:
1. Call `encodeAndFormat` to process images
2. Convert images to appropriate format for the LLM provider
3. Add image URLs to the message content
4. Calculate token costs for images

### 5. Enhanced Message Content Structure

**Message Content for Media** - The enhanced external messages will now include rich content arrays:

```javascript
// For MMS with both text and media
const messageContent = [
  {
    type: 'text',
    text: 'Check out this image I sent via MMS!'
  },
  {
    type: 'image_url',
    image_url: {
      url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...',
      detail: 'auto'
    }
  }
];

// For media-only MMS (no text body)
const messageContent = [
  {
    type: 'text',
    text: '[Media attachment received via MMS]'
  },
  {
    type: 'image_url',
    image_url: {
      url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...',
      detail: 'auto'
    }
  }
];
```

---

## Implementation Roadmap

### Phase 1: Core Media Infrastructure
1. **Create Media Downloader Service** (`mediaDownloader.js`)
2. **Add Twilio Authentication Support**
3. **Implement File Storage Integration**
4. **Add Error Handling and Logging**

### Phase 2: External Message Enhancement
1. **Modify Messages Route** to detect and process MMS media
2. **Enhanced External Client** for media handling
3. **Security and Validation** for media downloads
4. **Rate Limiting** for media processing

### Phase 3: Agent Integration
1. **Ensure Agent Media Processing** works with external files
2. **Add Media Analysis Instructions** to agent prompts
3. **Enhanced Error Handling** for agent media processing
4. **Performance Optimization** for large media files

### Phase 4: Advanced Features
1. **Media Caching Strategy** for frequently accessed files
2. **Automatic Media Cleanup** for old MMS attachments
3. **Media Compression** for large files
4. **Multi-format Support** for various media types

---

## Security Considerations

### 1. Authentication and Authorization
- **Twilio Authentication**: Use TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN for media downloads
- **User Ownership**: Ensure media files are associated with correct user accounts
- **File Access Control**: Prevent unauthorized access to downloaded media

### 2. Content Validation
- **MIME Type Validation**: Verify content types match expected formats
- **File Size Limits**: Implement reasonable size limits for media downloads
- **Content Scanning**: Consider virus scanning for downloaded files
- **Malicious URL Protection**: Validate Twilio URLs before downloading

### 3. Data Privacy
- **PII Handling**: Ensure media doesn't contain sensitive information
- **Storage Encryption**: Encrypt stored media files
- **Access Logging**: Log media access for audit trails
- **Retention Policies**: Implement automatic cleanup of old media

---

## Configuration and Environment Variables

### Required Environment Variables

```bash
# Twilio Configuration (existing)
TWILIO_ACCOUNT_SID=AC1234567890123456789012345678901234
TWILIO_AUTH_TOKEN=your_auth_token_here

# File Storage Configuration (existing)
FILE_STRATEGY=local  # or s3, azure_blob, firebase
CDN_PROVIDER=local   # or cloudflare, firebase

# New MMS-specific Configuration
MMS_MEDIA_MAX_SIZE=50MB        # Maximum file size for MMS media
MMS_MEDIA_DOWNLOAD_TIMEOUT=30  # Timeout in seconds for media downloads
MMS_MEDIA_CLEANUP_DAYS=30      # Days to retain MMS media files
MMS_MEDIA_ALLOWED_TYPES=image/jpeg,image/png,video/mp4,audio/mpeg

# Security Configuration
ENABLE_MEDIA_VIRUS_SCAN=false  # Enable virus scanning (requires ClamAV)
ENABLE_MEDIA_COMPRESSION=true  # Compress large media files
```

### File Strategy Configuration

Each file storage strategy will automatically handle MMS media:

**Local Storage** (`FileSources.local`):
- Files stored in `uploads/images/` directory
- Direct file access via local filesystem

**S3 Storage** (`FileSources.s3`):
- Files uploaded to configured S3 bucket
- Signed URLs for secure access
- Automatic URL refresh handling

**Azure Blob Storage** (`FileSources.azure_blob`):
- Files stored in Azure Blob containers
- SAS tokens for secure access

---

## Testing Strategy

### 1. Unit Tests

**Test File**: `LibreChat/tests/server/services/Files/External/mediaDownloader.test.js`

```javascript
describe('MMS Media Downloader', () => {
  test('downloads and stores Twilio media successfully', async () => {
    // Mock Twilio API response
    // Test successful download and storage
    // Verify file record creation
  });

  test('handles download failures gracefully', async () => {
    // Mock network failure
    // Verify error handling
    // Ensure no partial files are created
  });

  test('processes multiple media files', async () => {
    // Test batch processing
    // Verify parallel downloads
    // Check success/failure reporting
  });
});
```

### 2. Integration Tests

**Test File**: `LibreChat/tests/server/routes/messages.external.mms.test.js`

```javascript
describe('External MMS Message Processing', () => {
  test('processes MMS message with media attachments', async () => {
    // Send external message with media URLs
    // Verify media download and storage
    // Check agent receives processed media
  });

  test('handles media download failures', async () => {
    // Test with invalid media URLs
    // Verify graceful degradation
    // Ensure text message still processes
  });
});
```

### 3. End-to-End Tests

**Test Scenario**: Complete MMS flow from SMS router to agent response
1. Send real MMS through DungeonMind SMS router
2. Verify media download and processing in LibreChat
3. Confirm agent can analyze and respond to media
4. Check response delivery back through SMS

---

## Monitoring and Logging

### 1. Media Processing Metrics
- **Download Success Rate**: Track successful vs. failed media downloads
- **Processing Time**: Monitor media download and processing duration
- **Storage Usage**: Track media file storage consumption
- **Error Rates**: Monitor different types of media processing errors

### 2. Enhanced Logging

```javascript
// Media download logging
logger.info('[MMS Media] Download started:', {
  mediaUrl: media.url,
  contentType: media.content_type,
  userId,
  conversationId
});

logger.info('[MMS Media] Download completed:', {
  file_id,
  filename,
  bytes,
  processingTimeMs,
  conversationId
});

// Agent media processing logging
logger.info('[Agent Media] Processing attachments:', {
  agent_id,
  mediaCount: attachments.length,
  mediaTypes: attachments.map(f => f.type),
  conversationId
});
```

### 3. Error Tracking

```javascript
// Media processing errors
logger.error('[MMS Media] Download failed:', {
  mediaUrl,
  error: error.message,
  userId,
  conversationId,
  retryCount
});

// Agent processing errors
logger.error('[Agent Media] Processing failed:', {
  agent_id,
  error: error.message,
  fileIds: attachments.map(f => f.file_id),
  conversationId
});
```

---

## Performance Optimization

### 1. Parallel Processing
- **Concurrent Downloads**: Download multiple media files simultaneously
- **Async Processing**: Non-blocking media processing
- **Background Jobs**: Queue large media processing tasks

### 2. Caching Strategy
- **Media Caching**: Cache frequently accessed media files
- **URL Caching**: Cache Twilio media URLs with expiration
- **Metadata Caching**: Cache file metadata for quick access

### 3. Resource Management
- **Connection Pooling**: Reuse HTTP connections for media downloads
- **Memory Management**: Stream large files instead of loading into memory
- **Cleanup Jobs**: Regular cleanup of expired media files

---

## Troubleshooting Guide

### Common Issues

#### 1. Media Download Failures
**Symptoms**: External messages process but media attachments missing

**Diagnosis**:
```javascript
// Check Twilio authentication
const testAuth = await axios.get('https://api.twilio.com/2010-04-01/Accounts.json', {
  auth: { username: TWILIO_ACCOUNT_SID, password: TWILIO_AUTH_TOKEN }
});

// Check media URL accessibility
const testMedia = await axios.head(mediaUrl, { auth: twilioAuth });
```

**Solutions**:
1. Verify TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN
2. Check network connectivity to Twilio APIs
3. Verify media URL hasn't expired
4. Check file storage permissions

#### 2. Agent Media Processing Issues
**Symptoms**: Agent receives message but doesn't analyze media

**Diagnosis**:
```javascript
// Check if files were attached to message
logger.debug('Message attachments:', message.files);
logger.debug('Image URLs:', message.image_urls);

// Verify agent supports vision
logger.debug('Agent vision capability:', agent.supportsVision);
```

**Solutions**:
1. Ensure agent uses vision-capable model (GPT-4V, Claude 3, etc.)
2. Verify media files are images (not audio/video)
3. Check image encoding format matches LLM requirements
4. Verify agent has appropriate instructions for media analysis

#### 3. Storage Issues
**Symptoms**: Media downloads but files not accessible

**Diagnosis**:
```javascript
// Check file storage configuration
logger.debug('File strategy:', process.env.FILE_STRATEGY);
logger.debug('Storage config:', app.locals.fileConfig);

// Test file access
const fileExists = await fs.access(filepath);
```

**Solutions**:
1. Verify file storage strategy configuration
2. Check filesystem/cloud storage permissions
3. Verify file paths are correct
4. Check storage quota limits

---

## Conclusion

This comprehensive architecture enables LibreChat to seamlessly handle MMS media attachments from the enhanced DungeonMind SMS router. The implementation provides:

1. **Robust Media Processing**: Download, store, and process various media types
2. **Seamless Integration**: Works with existing LibreChat file system and agent architecture
3. **Security-First Design**: Proper authentication, validation, and access control
4. **Scalable Architecture**: Supports multiple storage strategies and concurrent processing
5. **Production Ready**: Comprehensive error handling, logging, and monitoring

The key architectural principle is leveraging LibreChat's existing sophisticated file handling system rather than building separate media processing logic. This ensures consistency, security, and maintainability while adding powerful MMS media capabilities to the agent conversation system.

### Next Steps

1. **Implement Core Media Infrastructure** following Phase 1 roadmap
2. **Test with Real MMS Messages** from production SMS router
3. **Optimize for Production** with proper monitoring and error handling
4. **Extend to Additional Media Types** based on usage patterns

This implementation will transform LibreChat from a text-only external message system to a rich multimedia-capable platform that can analyze images, documents, and other media content received via MMS, unlocking powerful new capabilities for AI agent interactions. 