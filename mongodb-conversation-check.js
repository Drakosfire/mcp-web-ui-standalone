#!/usr/bin/env node

/**
 * MongoDB Conversation Check Script
 * 
 * This script directly queries the MongoDB database to check:
 * 1. What conversations exist for the SMS user
 * 2. Which ones have metadata
 * 3. What the metadata structure looks like
 * 4. Why the search might not be finding them
 */

const { MongoClient, ObjectId } = require('mongodb');

// Configuration - update these values
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/LibreChat';
const TEST_PHONE = '+19709788817';
const TEST_USER_ID = '680d0b736eab93a30b0f3c2f'; // From your logs

console.log('=== CONFIGURATION ===');
console.log('MongoDB URI:', MONGODB_URI);
console.log('Test Phone:', TEST_PHONE);
console.log('Test User ID:', TEST_USER_ID);
console.log('Docker Container: chat-mongodb');

async function checkConversations() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db();

        // Check what collections exist
        console.log('\n=== COLLECTION DETECTION ===');
        const collections = await db.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name));

        // Try to find the conversations collection (case-insensitive)
        const conversationCollectionNames = ['conversations', 'Conversations', 'Conversation'];
        let conversationCollectionName = null;

        for (const name of conversationCollectionNames) {
            const exists = collections.find(c => c.name === name);
            if (exists) {
                conversationCollectionName = name;
                break;
            }
        }

        if (!conversationCollectionName) {
            console.error('❌ Could not find conversations collection!');
            console.log('Available collections:', collections.map(c => c.name));
            return;
        }

        console.log('✅ Using conversations collection:', conversationCollectionName);
        const conversations = db.collection(conversationCollectionName);

        // Convert user ID to ObjectId for proper search
        const userObjectId = new ObjectId(TEST_USER_ID);

        console.log('=== USER ID FORMATS ===');
        console.log('String:', TEST_USER_ID);
        console.log('ObjectId:', userObjectId);
        console.log('Buffer:', Buffer.from(TEST_USER_ID, 'hex'));

        // 1. Check total conversations for this user
        console.log('\n=== 1. TOTAL USER CONVERSATIONS ===');
        const totalConversations = await conversations.find({ user: userObjectId }).toArray();
        console.log(`Total conversations: ${totalConversations.length}`);

        // 2. Check how many have metadata
        console.log('\n=== 2. METADATA ANALYSIS ===');
        const withMetadata = totalConversations.filter(c => c.metadata && Object.keys(c.metadata).length > 0);
        const withoutMetadata = totalConversations.filter(c => !c.metadata || Object.keys(c.metadata).length === 0);

        console.log(`Conversations with metadata: ${withMetadata.length}`);
        console.log(`Conversations without metadata: ${withoutMetadata.length}`);

        // 3. Check for phone number in metadata
        console.log('\n=== 3. PHONE NUMBER SEARCH ===');
        const withPhoneNumber = await conversations.find({
            user: userObjectId,
            'metadata.phoneNumber': TEST_PHONE
        }).toArray();
        console.log(`Conversations with phone number in metadata: ${withPhoneNumber.length}`);

        // 4. Check for SMS source in metadata
        console.log('\n=== 4. SMS SOURCE SEARCH ===');
        const withSmsSource = await conversations.find({
            user: userObjectId,
            'metadata.source': 'sms'
        }).toArray();
        console.log(`Conversations with SMS source: ${withSmsSource.length}`);

        // 5. Combined search (what the app is doing)
        console.log('\n=== 5. COMBINED SEARCH (APP LOGIC) ===');
        const combinedSearch = await conversations.find({
            user: userObjectId,
            'metadata.phoneNumber': TEST_PHONE,
            'metadata.source': 'sms'
        }).toArray();
        console.log(`Combined search results: ${combinedSearch.length}`);

        // 6. Show recent conversations with metadata
        console.log('\n=== 6. RECENT CONVERSATIONS WITH METADATA ===');
        const recentWithMetadata = withMetadata
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, 5);

        recentWithMetadata.forEach((conv, i) => {
            console.log(`\n--- Recent Conversation ${i + 1} ---`);
            console.log(`ID: ${conv.conversationId}`);
            console.log(`Title: ${conv.title}`);
            console.log(`Updated: ${conv.updatedAt}`);
            console.log(`Metadata keys: ${Object.keys(conv.metadata || {})}`);
            console.log(`Phone number: ${conv.metadata?.phoneNumber || 'N/A'}`);
            console.log(`Source: ${conv.metadata?.source || 'N/A'}`);
            console.log(`Full metadata:`, JSON.stringify(conv.metadata, null, 2));
        });

        // 7. Show conversations that should match but don't
        console.log('\n=== 7. POTENTIAL MATCHES ===');
        const potentialMatches = await conversations.find({
            user: userObjectId,
            $or: [
                { 'metadata.phoneNumber': TEST_PHONE },
                { 'metadata.from': TEST_PHONE },
                { 'metadata.to': TEST_PHONE },
                { title: new RegExp(TEST_PHONE.replace('+', '\\+'), 'i') }
            ]
        }).toArray();

        console.log(`Potential matches: ${potentialMatches.length}`);
        potentialMatches.forEach((conv, i) => {
            console.log(`\n--- Potential Match ${i + 1} ---`);
            console.log(`ID: ${conv.conversationId}`);
            console.log(`Title: ${conv.title}`);
            console.log(`Updated: ${conv.updatedAt}`);
            console.log(`Metadata:`, JSON.stringify(conv.metadata, null, 2));
        });

        // 8. Test different user ID formats
        console.log('\n=== 8. USER ID FORMAT TESTS ===');
        const userIdString = TEST_USER_ID;
        const userIdBuffer = Buffer.from(TEST_USER_ID, 'hex');

        console.log('Testing string user ID...');
        const stringResults = await conversations.find({
            user: userIdString,
            'metadata.phoneNumber': TEST_PHONE
        }).toArray();
        console.log(`String user ID results: ${stringResults.length}`);

        console.log('Testing buffer user ID...');
        const bufferResults = await conversations.find({
            user: userIdBuffer,
            'metadata.phoneNumber': TEST_PHONE
        }).toArray();
        console.log(`Buffer user ID results: ${bufferResults.length}`);

        // 9. Summary and diagnosis
        console.log('\n=== 9. DIAGNOSIS ===');
        console.log(`User has ${totalConversations.length} total conversations`);
        console.log(`${withMetadata.length} have metadata, ${withoutMetadata.length} don't`);
        console.log(`${withPhoneNumber.length} have the phone number ${TEST_PHONE}`);
        console.log(`${withSmsSource.length} have SMS source`);
        console.log(`${combinedSearch.length} match the exact search criteria`);
        console.log(`${potentialMatches.length} are potential matches`);

        if (combinedSearch.length === 0 && potentialMatches.length > 0) {
            console.log('\n⚠️  ISSUE: Conversations exist but metadata structure is different');
        } else if (combinedSearch.length === 0 && withMetadata.length > 0) {
            console.log('\n⚠️  ISSUE: Conversations with metadata exist but phone number/source mismatch');
        } else if (combinedSearch.length > 0) {
            console.log('\n✅ CONVERSATIONS SHOULD BE FOUND - check search logic');
        } else {
            console.log('\nℹ️  No existing conversations with proper metadata - expected behavior');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('\nDisconnected from MongoDB');
    }
}

// Run the check
if (require.main === module) {
    checkConversations().catch(console.error);
}

module.exports = { checkConversations }; 