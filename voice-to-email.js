#!/usr/bin/env node

import { processVoiceToRecruiters } from './voice-recruiter-filter.js';
import { sendEmailsToRecruiters } from './filter.js';

// Main function to process voice input and send emails to matched recruiters
async function processVoiceAndSendEmails(audioFilePath, inboxId, options = {}) {
  const { 
    maxEmails = 3, 
    delayBetween = 2000, 
    dryRun = false,
    confirmBeforeSending = true 
  } = options;
  
  try {
    console.log("Voice-to-Email Pipeline");
    console.log("======================");
    console.log(`Processing audio file: ${audioFilePath}\n`);
    
    // Step 1: Process voice input and get matched recruiters
    const recruiters = await processVoiceToRecruiters(audioFilePath);
    
    if (recruiters.length === 0) {
      console.log("No matching recruiters found. No emails to send.");
      return { success: true, recruiters: [], emailsSent: 0 };
    }
    
    console.log(`\nFound ${recruiters.length} matching recruiters.`);
    
    // Step 2: Show recruiter list and get confirmation
    console.log("\nRecruiters to email:");
    recruiters.forEach((recruiter, index) => {
      console.log(`${index + 1}. ${recruiter.name} - ${recruiter.company}`);
      console.log(`   Email: ${recruiter.email}`);
      console.log(`   Location: ${recruiter.location}`);
      console.log(`   Focus: ${recruiter.focus}\n`);
    });
    
    if (dryRun) {
      console.log("DRY RUN: No emails will be sent.");
      return { success: true, recruiters, emailsSent: 0, dryRun: true };
    }
    
    if (confirmBeforeSending) {
      console.log(`Ready to send emails to ${Math.min(recruiters.length, maxEmails)} recruiters.`);
      console.log("Press Ctrl+C to cancel, or continue to send emails...");
      
      // Wait for user confirmation (in real usage, you might want to add proper input handling)
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Step 3: Send emails
    const emailResults = await sendEmailsToRecruiters(
      recruiters, 
      "sde interns", // This should be extracted from voice input
      "bangalore",   // This should be extracted from voice input
      inboxId,
      { sendAll: false, maxEmails, delayBetween }
    );
    
    const successful = emailResults.filter(r => r.success).length;
    
    return {
      success: true,
      recruiters,
      emailsSent: successful,
      emailResults
    };
    
  } catch (error) {
    console.error("Error in voice-to-email pipeline:", error.message);
    return { success: false, error: error.message };
  }
}

// Export for use in other scripts
export { processVoiceAndSendEmails };

// If run directly, process command line arguments
if (import.meta.url === `file://${process.argv[1]}`) {
  const audioFile = process.argv[2];
  const inboxId = process.argv[3];
  
  if (!audioFile || !inboxId) {
    console.error("Usage: node voice-to-email.js <audio-file-path> <inbox-id> [options]");
    console.error("\nExample: node voice-to-email.js Recording.m4a inbox_12345");
    console.error("\nOptions:");
    console.error("  --dry-run: Show matched recruiters without sending emails");
    console.error("  --max-emails <number>: Maximum emails to send (default: 3)");
    console.error("  --no-confirm: Skip confirmation before sending");
    console.error("\nTo get an inbox ID:");
    console.error("1. Sign up at https://agentmail.to");
    console.error("2. Create an inbox");
    console.error("3. Copy the inbox ID");
    process.exit(1);
  }
  
  // Parse command line options
  const options = {
    dryRun: process.argv.includes('--dry-run'),
    maxEmails: 3,
    confirmBeforeSending: !process.argv.includes('--no-confirm')
  };
  
  const maxEmailsIndex = process.argv.indexOf('--max-emails');
  if (maxEmailsIndex !== -1 && process.argv[maxEmailsIndex + 1]) {
    options.maxEmails = parseInt(process.argv[maxEmailsIndex + 1]);
  }
  
  processVoiceAndSendEmails(audioFile, inboxId, options)
    .then(result => {
      if (result.success) {
        console.log("\n" + "=".repeat(50));
        console.log("VOICE-TO-EMAIL PIPELINE COMPLETED");
        console.log("=".repeat(50));
        console.log(`Recruiters found: ${result.recruiters.length}`);
        console.log(`Emails sent: ${result.emailsSent || 0}`);
        
        if (result.dryRun) {
          console.log("This was a dry run - no emails were actually sent.");
        }
      } else {
        console.error("\n" + "=".repeat(50));
        console.error("PIPELINE FAILED");
        console.error("=".repeat(50));
        console.error(`Error: ${result.error}`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error("Unexpected error:", error);
      process.exit(1);
    });
}
