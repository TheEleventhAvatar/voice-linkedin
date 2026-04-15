#!/usr/bin/env node

import { loadRecruiters, filterRecruiters, generateEmailTemplate } from './filter.js';

// Test email templates for different recruiter types
async function testEmailTemplates() {
  console.log("Testing Email Templates");
  console.log("======================\n");
  
  // Load recruiters
  const recruiters = await loadRecruiters();
  
  // Test different roles and locations
  const testCases = [
    { role: 'sde interns', location: 'Bangalore' },
    { role: 'backend engineers', location: 'Gurgaon' },
    { role: 'frontend engineers', location: 'Mumbai' },
    { role: 'ml engineers', location: 'Bangalore' }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n--- Testing: ${testCase.role} in ${testCase.location} ---`);
    
    // Filter recruiters
    const matchedRecruiters = filterRecruiters(recruiters, testCase.role, testCase.location);
    
    if (matchedRecruiters.length === 0) {
      console.log("No matching recruiters found.");
      continue;
    }
    
    // Show first 2 matching recruiters and their email templates
    const sampleRecruiters = matchedRecruiters.slice(0, 2);
    
    sampleRecruiters.forEach((recruiter, index) => {
      console.log(`\n${index + 1}. ${recruiter.name} - ${recruiter.company}`);
      console.log(`   Email: ${recruiter.email}`);
      console.log(`   Focus: ${recruiter.focus}`);
      
      // Generate email template
      const template = generateEmailTemplate(recruiter, testCase.role, testCase.location);
      
      console.log(`\n   Subject: ${template.subject}`);
      console.log(`   Body Preview: ${template.body.split('\n').slice(0, 3).join('\n')}...`);
      console.log(`   Full Body Length: ${template.body.length} characters`);
    });
    
    console.log(`\nTotal matches: ${matchedRecruiters.length}`);
  }
  
  console.log("\n" + "=".repeat(50));
  console.log("EMAIL TEMPLATE TESTING COMPLETED");
  console.log("=".repeat(50));
  console.log("\nTo send actual emails:");
  console.log("1. Get an AgentMail inbox ID from https://agentmail.to");
  console.log("2. Ensure AGENTMAIL_API_KEY is set in .env");
  console.log("3. Run: node voice-to-email.js <audio-file> <inbox-id>");
  console.log("4. Or test with dry run: node voice-to-email.js <audio-file> <inbox-id> --dry-run");
}

// Test email sending functionality (without actually sending)
async function testEmailSending() {
  console.log("\n\nTesting Email Sending Setup");
  console.log("============================\n");
  
  // Check environment variables
  const agentMailKey = process.env.AGENTMAIL_API_KEY;
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  
  console.log("Environment Variables Status:");
  console.log(`- AGENTMAIL_API_KEY: ${agentMailKey ? 'Configured' : 'Not configured'}`);
  console.log(`- ELEVENLABS_API_KEY: ${elevenLabsKey ? 'Configured' : 'Not configured'}`);
  
  if (!agentMailKey || agentMailKey === 'your_agentmail_api_key_here') {
    console.log("\nTo configure AgentMail:");
    console.log("1. Sign up at https://agentmail.to");
    console.log("2. Create an inbox");
    console.log("3. Get your API key and inbox ID");
    console.log("4. Add to .env: AGENTMAIL_API_KEY=your_key_here");
  }
  
  if (!elevenLabsKey || elevenLabsKey === 'your_elevenlabs_api_key_here') {
    console.log("\nTo configure ElevenLabs:");
    console.log("1. Sign up at https://elevenlabs.io");
    console.log("2. Get your API key");
    console.log("3. Add to .env: ELEVENLABS_API_KEY=your_key_here");
  }
  
  // Show sample recruiter for testing
  const recruiters = await loadRecruiters();
  const sampleRecruiter = recruiters[0];
  
  console.log(`\nSample Recruiter for Testing:`);
  console.log(`- Name: ${sampleRecruiter.name}`);
  console.log(`- Company: ${sampleRecruiter.company}`);
  console.log(`- Email: ${sampleRecruiter.email}`);
  console.log(`- Location: ${sampleRecruiter.location}`);
  console.log(`- Focus: ${sampleRecruiter.focus}`);
}

// Run tests
testEmailTemplates()
  .then(() => testEmailSending())
  .catch(error => {
    console.error("Test failed:", error);
    process.exit(1);
  });
