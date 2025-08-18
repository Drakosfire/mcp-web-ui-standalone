# SMS Conversation Reuse Debug Guide

## Problem
SMS messages are creating new conversations instead of reusing existing ones, resulting in multiple "SMS Agent Chat with [phone]" conversations.

## Debugging Steps

### 1. Enhanced Logging in ExternalClient
The `index.js` file now has comprehensive debugging in the `findExistingSMSConversation` method.

**What it logs:**
- Search criteria (user ID, phone number, types)
- Primary search results with metadata
- User's total conversations
- Sample conversation metadata
- Secondary search results
- Flexible user ID format testing

### 2. Run the Debug Script
Use the standalone debug script to test the search logic directly:

```bash
# Edit the script with your actual values
nano sms-conversation-debug.js

# Update these variables:
const TEST_PHONE = '+19709788817';     # Your test phone number
const TEST_USER_ID = '673c7c9a885e42080d8f7a9b'; # Your actual user ID

# Run the debug script
node sms-conversation-debug.js
```

### 3. Enable Debug Logging
Make sure debug logging is enabled in your LibreChat instance:

```bash
# Set environment variables
export DEBUG=ExternalClient*
export LOG_LEVEL=debug

# Or add to .env file
DEBUG=ExternalClient*
LOG_LEVEL=debug
```

### 4. Test SMS Message
Send an SMS message and watch the logs to see what happens in the search process.

## Expected Debug Output

### If Working Correctly
```
[ExternalClient] Searching for existing SMS conversation: +19709788817
[ExternalClient] Search criteria: { user: ObjectId('...'), userType: 'object', phoneNumber: '+19709788817', phoneNumberType: 'string' }
[ExternalClient] Primary search found 1 conversations
[ExternalClient] Found conversations metadata: [{ conversationId: '...', user: ObjectId('...'), metadata: { phoneNumber: '+19709788817', source: 'sms' } }]
[ExternalClient] Using existing conversation: abc123
```

### If User ID Format Issue
```
[ExternalClient] Primary search found 0 conversations
[ExternalClient] Secondary search found 0 conversations
[ExternalClient] User has 25 total conversations
[ExternalClient] FOUND CONVERSATIONS with flexible user search! This suggests user ID format mismatch.
```

### If Metadata Structure Issue
```
[ExternalClient] Primary search found 0 conversations
[ExternalClient] User has 25 total conversations
[ExternalClient] Sample user conversation metadata: [{ conversationId: '...', hasMetadata: false, metadata: null }]
```

## Common Issues & Solutions

### Issue 1: User ID Format Mismatch
**Symptoms**: Flexible search finds conversations but primary/secondary don't
**Solution**: Fix user ID format in the search query

### Issue 2: No Metadata in Old Conversations
**Symptoms**: Old conversations have `hasMetadata: false`
**Solution**: These old conversations can't be reused. New conversations will work correctly.

### Issue 3: Different Metadata Structure
**Symptoms**: Metadata exists but with different field names
**Solution**: Update search criteria to match actual metadata structure

### Issue 4: Wrong User ID
**Symptoms**: User has 0 total conversations but should have many
**Solution**: Verify the correct user ID is being used

## Next Steps

1. **Run the debug script** to get a baseline understanding
2. **Send a test SMS** and check the enhanced logs
3. **Identify the specific issue** based on the debug output
4. **Apply the appropriate fix** based on the identified issue
5. **Test again** to verify the fix works

## Clean Up

After debugging, you can remove the debug logging by commenting out or removing the debug lines in the `findExistingSMSConversation` method.

## Debug Script Results Interpretation

- **Total conversations = 0**: Wrong user ID or no conversations exist
- **Primary search = 0, but total > 0**: User ID format issue or metadata structure issue
- **Flexible search > 0**: User ID format mismatch confirmed
- **Any phone results > 0**: Metadata structure different than expected
- **All searches = 0**: No existing conversations (expected for new phone numbers)

The goal is to get **Primary search > 0** for existing phone numbers. 