#!/usr/bin/env node

import { processVoiceToRecruiters } from './voice-recruiter-filter.js';

// Check if audio file is provided
const audioFile = process.argv[2];

if (!audioFile) {
  console.error("Usage: node run-voice-filter.js <audio-file-path>");
  console.error("\nExample: node run-voice-filter.js Recording.m4a");
  console.error("\nSupported audio formats: M4A, MP3, WAV, etc.");
  process.exit(1);
}

console.log("Voice-to-Recruiter Filter Pipeline");
console.log("==================================");
console.log(`Processing audio file: ${audioFile}\n`);

// Process the voice input and filter recruiters
processVoiceToRecruiters(audioFile)
  .then(results => {
    console.log("\n" + "=".repeat(50));
    console.log(`SUCCESS: Found ${results.length} matching recruiters!`);
    console.log("=".repeat(50));
    
    if (results.length > 0) {
      console.log("\nNext steps:");
      console.log("1. Review the recruiter list above");
      console.log("2. Prepare personalized outreach emails");
      console.log("3. Track responses and follow-ups");
    }
  })
  .catch(error => {
    console.error("\n" + "=".repeat(50));
    console.error("ERROR: Failed to process voice input");
    console.error("=".repeat(50));
    console.error(`Details: ${error.message}`);
    
    // Provide helpful troubleshooting tips
    console.error("\nTroubleshooting:");
    console.error("1. Check if audio file exists and is accessible");
    console.error("2. Ensure ELEVENLABS_API_KEY is set in .env file");
    console.error("3. Make sure audio contains clear role and location keywords");
    console.error("4. Verify audio quality and speech clarity");
    
    process.exit(1);
  });
