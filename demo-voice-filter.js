#!/usr/bin/env node

import { extractRoleAndLocation, loadRecruiters, filterRecruiters } from './voice-recruiter-filter.js';

// Demo function that uses mock transcript instead of actual audio
async function demoVoiceToRecruiters(mockTranscript) {
  try {
    console.log("Demo: Processing voice transcript to extract recruiter criteria...");
    console.log("Mock Transcript:", mockTranscript);
    
    // Extract role and location from transcript
    const { role, location } = extractRoleAndLocation(mockTranscript);
    console.log("Extracted Role:", role);
    console.log("Extracted Location:", location);
    
    if (!role || !location) {
      throw new Error("Could not extract both role and location from voice input. Please mention both clearly.");
    }
    
    // Load and filter recruiters
    const recruiters = await loadRecruiters();
    const filteredRecruiters = filterRecruiters(recruiters, role, location);
    
    console.log(`\nFound ${filteredRecruiters.length} matching recruiters:`);
    filteredRecruiters.forEach((recruiter, index) => {
      console.log(`${index + 1}. ${recruiter.name} - ${recruiter.company} (${recruiter.location})`);
      console.log(`   Email: ${recruiter.email}`);
      console.log(`   Focus: ${recruiter.focus}\n`);
    });
    
    return filteredRecruiters;
    
  } catch (error) {
    console.error("Error processing voice input:", error.message);
    throw error;
  }
}

// Test with different voice input examples
const testTranscripts = [
  "I'm looking for SDE interns in Bangalore",
  "Find me backend engineers in Gurgaon",
  "I need frontend developers in Mumbai",
  "Looking for ML engineers in Bangalore",
  "Find data analysts in Bangalore"
];

console.log("Voice-to-Recruiter Filter Demo");
console.log("===============================");

// Run demo with first transcript
demoVoiceToRecruiters(testTranscripts[0])
  .then(results => {
    console.log("\n" + "=".repeat(50));
    console.log(`DEMO SUCCESS: Found ${results.length} matching recruiters!`);
    console.log("=".repeat(50));
    
    console.log("\nOther test transcripts you can try:");
    testTranscripts.slice(1).forEach((transcript, index) => {
      console.log(`${index + 1}. "${transcript}"`);
    });
    
    console.log("\nTo test with real audio:");
    console.log("1. Add your ELEVENLABS_API_KEY to .env file");
    console.log("2. Run: node run-voice-filter.js your-audio-file.m4a");
  })
  .catch(error => {
    console.error("\n" + "=".repeat(50));
    console.error("DEMO ERROR: Failed to process voice input");
    console.error("=".repeat(50));
    console.error(`Details: ${error.message}`);
    process.exit(1);
  });
