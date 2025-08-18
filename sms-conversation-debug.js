#!/usr/bin/env node

/**
 * SMS Conversation Debug Script
 * 
 * This script helps debug the SMS conversation reuse issue by:
 * 1. Testing the search logic directly
 * 2. Checking user ID formats
 * 3. Verifying metadata structure
 * 4. Simulating the ExternalClient search
 */

const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

// Mock the logger for testing
const logger = {
    info: console.log,
    debug: console.log,
    warn: console.warn,
    error: console.error
};

// MongoDB connection (use your actual connection string)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/LibreChat';

// Test phone number (replace with your test number)
const TEST_PHONE = '+19709788817';

// User ID to test (replace with your actual user ID)
const TEST_USER_ID = '673c7c9a885e42080d8f7a9b'; // Replace with actual user ID

async function debugSMSConversationSearch() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        logger.info('Connected to MongoDB');

        // Get the Conversation model
        const { Conversation } = require('./LibreChat/api/db/models');

        // Test different user ID formats
        const testUserId = TEST_USER_ID;
        const testUserIdObj = new ObjectId(testUserId);
        const testUserIdString = testUserId.toString();

        // Also test Buffer format (common issue)
        const testUserIdBuffer = Buffer.from(testUserId, 'hex');
        const testUserIdFromBuffer = new ObjectId(testUserIdBuffer);

        logger.info('=== SMS Conversation Search Debug ===');
        logger.info(`Testing with phone number: ${TEST_PHONE}`);
        logger.info(`Testing with user ID: ${testUserId}`);
        logger.info(`User ID formats:`, {
            string: testUserIdString,
            objectId: testUserIdObj,
            buffer: testUserIdBuffer,
            bufferToObjectId: testUserIdFromBuffer,
            stringType: typeof testUserIdString,
            objectIdType: typeof testUserIdObj,
            bufferType: typeof testUserIdBuffer
        });

        // 1. Check total conversations for this user
        logger.info('\n=== 1. Total User Conversations ===');
        const totalConversations = await Conversation.find({ user: testUserIdObj }).lean();
        logger.info(`Total conversations for user: ${totalConversations.length}`);

        if (totalConversations.length > 0) {
            logger.info('Sample conversations:');
            totalConversations.slice(0, 3).forEach(c => {
                logger.info(`  - ${c.conversationId}: ${c.title} (metadata: ${JSON.stringify(c.metadata)})`);
            });
        }

        // 2. Primary search (exact match)
        logger.info('\n=== 2. Primary Search (Exact Match) ===');
        const primaryResults = await Conversation.find({
            user: testUserIdObj,
            'metadata.phoneNumber': TEST_PHONE,
            'metadata.source': 'sms'
        }).lean();
        logger.info(`Primary search found: ${primaryResults.length} conversations`);

        primaryResults.forEach(c => {
            logger.info(`  - ${c.conversationId}: ${c.title}`);
            logger.info(`    Metadata: ${JSON.stringify(c.metadata, null, 2)}`);
        });

        // 3. Secondary search (broader match)
        logger.info('\n=== 3. Secondary Search (Broader Match) ===');
        const secondaryResults = await Conversation.find({
            user: testUserIdObj,
            $or: [
                { 'metadata.phoneNumber': TEST_PHONE },
                { 'metadata.from': TEST_PHONE }
            ]
        }).lean();
        logger.info(`Secondary search found: ${secondaryResults.length} conversations`);

        secondaryResults.forEach(c => {
            logger.info(`  - ${c.conversationId}: ${c.title}`);
            logger.info(`    Metadata: ${JSON.stringify(c.metadata, null, 2)}`);
        });

        // 4. Flexible user ID search (including Buffer format)
        logger.info('\n=== 4. Flexible User ID Search ===');
        const flexibleResults = await Conversation.find({
            $or: [
                { user: testUserIdObj },
                { user: testUserIdString },
                { user: testUserId },
                { user: testUserIdBuffer },
                { user: testUserIdFromBuffer }
            ],
            'metadata.phoneNumber': TEST_PHONE
        }).lean();
        logger.info(`Flexible search found: ${flexibleResults.length} conversations`);

        flexibleResults.forEach(c => {
            logger.info(`  - ${c.conversationId}: ${c.title}`);
            logger.info(`    User: ${c.user} (type: ${typeof c.user})`);
            logger.info(`    Metadata: ${JSON.stringify(c.metadata, null, 2)}`);
        });

        // 5. Buffer format test (common issue with SMS users)
        logger.info('\n=== 5. Buffer Format Test ===');
        const bufferResults = await Conversation.find({
            user: testUserIdFromBuffer,
            'metadata.phoneNumber': TEST_PHONE,
            'metadata.source': 'sms'
        }).lean();
        logger.info(`Buffer format search found: ${bufferResults.length} conversations`);

        bufferResults.forEach(c => {
            logger.info(`  - ${c.conversationId}: ${c.title}`);
            logger.info(`    User: ${c.user} (type: ${typeof c.user})`);
            logger.info(`    Metadata: ${JSON.stringify(c.metadata, null, 2)}`);
        });

        // 6. Check for any conversations with phone number in ANY field
        logger.info('\n=== 6. Phone Number in Any Field ===');
        const anyPhoneResults = await Conversation.find({
            user: testUserIdObj,
            $or: [
                { title: new RegExp(TEST_PHONE.replace('+', '\\+'), 'i') },
                { 'metadata.phoneNumber': TEST_PHONE },
                { 'metadata.from': TEST_PHONE },
                { 'metadata.to': TEST_PHONE }
            ]
        }).lean();
        logger.info(`Phone number in any field found: ${anyPhoneResults.length} conversations`);

        anyPhoneResults.forEach(c => {
            logger.info(`  - ${c.conversationId}: ${c.title}`);
            logger.info(`    Metadata: ${JSON.stringify(c.metadata, null, 2)}`);
        });

        // 7. Summary
        logger.info('\n=== SUMMARY ===');
        logger.info(`Total conversations for user: ${totalConversations.length}`);
        logger.info(`Primary search (exact): ${primaryResults.length}`);
        logger.info(`Secondary search (broader): ${secondaryResults.length}`);
        logger.info(`Buffer format search: ${bufferResults.length}`);
        logger.info(`Flexible user ID search: ${flexibleResults.length}`);
        logger.info(`Phone number in any field: ${anyPhoneResults.length}`);

        if (primaryResults.length === 0 && bufferResults.length > 0) {
            logger.warn('⚠️  ISSUE FOUND: Buffer to ObjectId conversion needed');
        } else if (primaryResults.length === 0 && secondaryResults.length === 0 && flexibleResults.length > 0) {
            logger.warn('⚠️  ISSUE FOUND: User ID format mismatch');
        } else if (primaryResults.length === 0 && anyPhoneResults.length > 0) {
            logger.warn('⚠️  ISSUE FOUND: Metadata structure mismatch');
        } else if (primaryResults.length > 0) {
            logger.info('✅ PRIMARY SEARCH WORKING - conversations should be reused');
        } else {
            logger.info('ℹ️  No existing conversations found - this is expected for new phone numbers');
        }

    } catch (error) {
        logger.error('Error in debug script:', error);
    } finally {
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');
    }
}

// Run the debug script
if (require.main === module) {
    debugSMSConversationSearch().catch(console.error);
}

module.exports = { debugSMSConversationSearch }; 