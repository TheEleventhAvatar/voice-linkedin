#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function listInboxes() {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  
  if (!apiKey || apiKey === 'your_agentmail_api_key_here') {
    console.error('AGENTMAIL_API_KEY not configured. Please add it to your .env file');
    process.exit(1);
  }
  
  try {
    console.log('Fetching your AgentMail inboxes...\n');
    
    const response = await axios.get(
      'https://api.agentmail.to/v0/inboxes',
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('API Response:', response.data);
    
    // Handle different response formats
    let inboxes = [];
    if (Array.isArray(response.data)) {
      inboxes = response.data;
    } else if (response.data.inboxes && Array.isArray(response.data.inboxes)) {
      inboxes = response.data.inboxes;
    } else if (response.data.data && Array.isArray(response.data.data)) {
      inboxes = response.data.data;
    } else {
      console.log('Unexpected response format. Showing raw response:');
      console.log(JSON.stringify(response.data, null, 2));
      return;
    }
    
    if (inboxes.length === 0) {
      console.log('No inboxes found. You need to create an inbox first.');
      console.log('\nTo create an inbox:');
      console.log('1. Go to https://agentmail.to');
      console.log('2. Sign up and create an inbox');
      console.log('3. Copy the inbox ID from your dashboard');
      return;
    }
    
    console.log(`Found ${inboxes.length} inbox(es):\n`);
    
    inboxes.forEach((inbox, index) => {
      const inboxId = inbox.inbox_id || inbox.id;
      const email = inbox.email || inbox.email_address;
      const name = inbox.display_name || inbox.name || 'No name';
      
      console.log(`${index + 1}. Inbox ID: ${inboxId}`);
      console.log(`   Email: ${email}`);
      console.log(`   Name: ${name}`);
      console.log(`   Status: ${inbox.status || 'Active'}`);
      console.log(`   Created: ${inbox.created_at ? new Date(inbox.created_at).toLocaleDateString() : 'Unknown'}`);
      console.log('');
    });
    
    console.log('Usage:');
    console.log('node voice-to-email.js Recording2.m4a <inbox_id>');
    console.log('\nExample:');
    const firstInboxId = inboxes[0].inbox_id || inboxes[0].id;
    console.log(`node voice-to-email.js Recording2.m4a ${firstInboxId}`);
    
  } catch (error) {
    console.error('Error fetching inboxes:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\nThis appears to be an authentication error. Please check:');
      console.log('1. Your AGENTMAIL_API_KEY is correct');
      console.log('2. The API key has the right permissions');
      console.log('3. Your account is active');
    }
  }
}

// Run the function
listInboxes();
