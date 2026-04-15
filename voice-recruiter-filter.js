import csv from "csvtojson";
import path from "path";
import fs from "fs";
import FormData from 'form-data';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Load recruiters data
async function loadRecruiters() {
  const jsonArray = await csv().fromFile(path.join(process.cwd(), "recuriters.csv"));
  return jsonArray;
}

// Filter recruiters by role and location
function filterRecruiters(data, role, location) {
  return data.filter(r =>
    r.focus.toLowerCase().includes(role.toLowerCase()) &&
    r.location.toLowerCase().includes(location.toLowerCase())
  );
}

// Extract role and location from voice transcript using simple keyword matching
function extractRoleAndLocation(transcript) {
  const transcriptLower = transcript.toLowerCase();
  
  // Common role keywords
  const roleKeywords = [
    'sde interns', 'interns', 'internship', 'intern',
    'backend engineers', 'backend', 'backend developer',
    'frontend engineers', 'frontend', 'frontend developer',
    'full stack developers', 'full stack', 'fullstack',
    'data analysts', 'data analyst', 'data',
    'ml engineers', 'machine learning', 'ml',
    'software engineers', 'software engineer', 'sde',
    'product engineers', 'product engineer',
    'data engineers', 'data engineer'
  ];
  
  // Common location keywords
  const locationKeywords = [
    'bangalore', 'bengaluru', 'gurgaon', 'delhi ncr',
    'mumbai', 'chennai', 'noida', 'hyderabad', 'pune'
  ];
  
  // Extract role
  let role = '';
  for (const keyword of roleKeywords) {
    if (transcriptLower.includes(keyword)) {
      role = keyword;
      break;
    }
  }
  
  // Extract location
  let location = '';
  for (const keyword of locationKeywords) {
    if (transcriptLower.includes(keyword)) {
      location = keyword;
      break;
    }
  }
  
  return { role, location };
}

// Main function to process voice input and filter recruiters
async function processVoiceToRecruiters(audioFilePath) {
  try {
    console.log("Processing voice input to extract recruiter criteria...");
    
    // Step 1: Transcribe audio (using existing voice-to-text setup)
    const transcript = await transcribeAudio(audioFilePath);
    console.log("Transcript:", transcript);
    
    // Step 2: Extract role and location from transcript
    const { role, location } = extractRoleAndLocation(transcript);
    console.log("Extracted Role:", role);
    console.log("Extracted Location:", location);
    
    if (!role || !location) {
      throw new Error("Could not extract both role and location from voice input. Please mention both clearly.");
    }
    
    // Step 3: Load and filter recruiters
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

// Transcribe audio using ElevenLabs (reuse existing logic)
async function transcribeAudio(audioFilePath) {
  if (!fs.existsSync(audioFilePath)) {
    throw new Error(`Audio file not found: ${audioFilePath}`);
  }
  
  // Check if API key is configured
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || apiKey === 'your_elevenlabs_api_key_here') {
    throw new Error(
      'ELEVENLABS_API_KEY not configured. Please:\n' +
      '1. Get an API key from https://elevenlabs.io\n' +
      '2. Add it to your .env file: ELEVENLABS_API_KEY=your_actual_key_here\n' +
      '3. Or use the demo version: node demo-voice-filter.js'
    );
  }
  
  const form = new FormData();
  form.append('file', fs.createReadStream(audioFilePath));
  form.append('model_id', 'scribe_v1');
  form.append('language_code', 'en');
  console.log("Sending transcription request with English language...");
  
  try {
    const response = await axios.post(
      'https://api.elevenlabs.io/v1/speech-to-text',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'xi-api-key': process.env.ELEVENLABS_API_KEY
        }
      }
    );
    
    return response.data.text;
  } catch (error) {
    console.error("Transcription error details:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    throw new Error(`Transcription failed: ${error.response?.data?.detail || error.message}`);
  }
}

// Export for use in other scripts
export { processVoiceToRecruiters, extractRoleAndLocation, loadRecruiters, filterRecruiters };

// If run directly, process command line arguments
if (import.meta.url === `file://${process.argv[1]}`) {
  const audioFile = process.argv[2];
  if (!audioFile) {
    console.error("Usage: node voice-recruiter-filter.js <audio-file-path>");
    process.exit(1);
  }
  
  processVoiceToRecruiters(audioFile)
    .then(results => {
      console.log(`\nSuccessfully processed voice input and found ${results.length} matching recruiters.`);
    })
    .catch(error => {
      console.error("Failed to process voice input:", error.message);
      process.exit(1);
    });
}
