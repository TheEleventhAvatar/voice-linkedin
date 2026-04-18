// Integration of voice-recruiter-filter.js and voice-to-email.js functionality
// for use in visual flow viewer

// Role and location keywords from voice-recruiter-filter.js
const ROLE_KEYWORDS = [
    'sde interns', 'interns', 'internship', 'intern',
    'backend engineers', 'backend', 'backend developer',
    'frontend engineers', 'frontend', 'frontend developer',
    'full stack developers', 'full stack', 'fullstack',
    'software engineers', 'software engineer', 'sde',
    'product engineers', 'product engineer',
    'data engineers', 'data engineer',
    'data analysts', 'data analyst', 'data',
    'ml engineers', 'machine learning', 'ml'
];

const LOCATION_KEYWORDS = [
    'bangalore', 'bengaluru', 'gurgaon', 'delhi ncr',
    'mumbai', 'chennai', 'noida', 'hyderabad', 'pune'
];

// Extract role and location from transcript
function extractRoleAndLocation(transcript) {
    const transcriptLower = transcript.toLowerCase();
    
    let role = '';
    for (const keyword of ROLE_KEYWORDS) {
        if (transcriptLower.includes(keyword)) {
            role = keyword;
            break;
        }
    }
    
    let location = '';
    for (const keyword of LOCATION_KEYWORDS) {
        if (transcriptLower.includes(keyword)) {
            location = keyword;
            break;
        }
    }
    
    return { role, location };
}

// Load recruiters data (simulated)
async function loadRecruiters() {
    // Sample recruiter data - in real implementation, this would load from CSV
    return [
        {
            name: "Aman Sharma",
            company: "Flipkart",
            email: "aman.sharma.hr@gmail.com",
            location: "Bangalore",
            focus: "SDE Interns"
        },
        {
            name: "Karan Malhotra", 
            company: "Swiggy",
            email: "karan.malhotra.hr@gmail.com",
            location: "Bangalore",
            focus: "SDE Interns"
        },
        {
            name: "Anjali Singh",
            company: "Ola", 
            email: "anjali.singh.talent@gmail.com",
            location: "Bangalore",
            focus: "SDE Interns"
        },
        {
            name: "Deepak Chauhan",
            company: "Unacademy",
            email: "deepak.chauhan.hr@gmail.com", 
            location: "Bangalore",
            focus: "SDE Interns"
        }
    ];
}

// Filter recruiters by role and location
function filterRecruiters(data, role, location) {
    return data.filter(r =>
        r.focus.toLowerCase().includes(role.toLowerCase()) &&
        r.location.toLowerCase().includes(location.toLowerCase())
    );
}

// Generate email template
function generateEmailTemplate(recruiter, role, location) {
    return {
        subject: `${role || "Career"} Opportunity - ${location || recruiter.location}`,
        body: `Hi ${recruiter.name},

Hope you are doing well.

I am reaching out because I saw that ${recruiter.company} is hiring for ${role || "engineering roles"} in ${location || recruiter.location}. My background aligns well with this, and I would value a quick conversation to explore fit.

Would you be open to a brief chat this week?

Best regards,
[Your Name]
[Your Contact Info]`
    };
}

// Transcribe audio using ElevenLabs (from run-voice-filter.js)
async function transcribeAudio(audioFilePath) {
    // In browser environment, we'll use the voice recorder instead
    if (typeof window !== 'undefined') {
        throw new Error('Use voice recorder UI in browser mode');
    }
    
    // This would be used in Node.js environment
    console.log(`Transcribing audio file: ${audioFilePath}`);
    // Placeholder for actual ElevenLabs API call
    return "Reach out to recruiters hiring for SDE internships in Bangalore";
}

// Main pipeline function (enhanced from run-voice-filter.js)
async function processVoicePipeline(transcript, audioFilePath = null) {
    console.log('🚀 Starting Voice Pipeline Processing');
    
    try {
        let finalTranscript = transcript;
        
        // If no transcript provided but audio file is, transcribe it
        if (!finalTranscript && audioFilePath) {
            finalTranscript = await transcribeAudio(audioFilePath);
        }
        
        if (!finalTranscript) {
            throw new Error('No transcript available and no audio file provided');
        }
        
        // Step 1: Extract role and location
        const { role, location } = extractRoleAndLocation(finalTranscript);
        console.log(`📋 Extracted - Role: ${role}, Location: ${location}`);
        
        if (!role || !location) {
            throw new Error('Could not extract both role and location from transcript');
        }
        
        // Step 2: Load and filter recruiters
        const allRecruiters = await loadRecruiters();
        const matchedRecruiters = filterRecruiters(allRecruiters, role, location);
        console.log(`🎯 Found ${matchedRecruiters.length} matching recruiters`);
        
        // Step 3: Generate email drafts
        const emailDrafts = matchedRecruiters.map(recruiter => {
            const template = generateEmailTemplate(recruiter, role, location);
            return {
                recruiter,
                subject: template.subject,
                body: template.body
            };
        });
        
        console.log(`📧 Generated ${emailDrafts.length} email drafts`);
        
        // Step 4: Provide next steps (from run-voice-filter.js)
        const nextSteps = [
            "1. Review recruiter list above",
            "2. Prepare personalized outreach emails", 
            "3. Track responses and follow-ups"
        ];
        
        return {
            success: true,
            transcript: finalTranscript,
            extractedRole: role,
            extractedLocation: location,
            matchedRecruiters,
            emailDrafts,
            nextSteps,
            summary: {
                totalRecruiters: allRecruiters.length,
                matchedCount: matchedRecruiters.length,
                role,
                location
            }
        };
        
    } catch (error) {
        console.error('❌ Pipeline failed:', error);
        
        // Provide troubleshooting tips (from run-voice-filter.js)
        const troubleshooting = [
            "1. Check if audio file exists and is accessible",
            "2. Ensure ELEVENLABS_API_KEY is set in .env file", 
            "3. Make sure audio contains clear role and location keywords",
            "4. Verify audio quality and speech clarity"
        ];
        
        return {
            success: false,
            error: error.message,
            transcript,
            troubleshooting
        };
    }
}

// Export for use in main script
window.FlowIntegration = {
    processVoicePipeline,
    extractRoleAndLocation,
    loadRecruiters,
    filterRecruiters,
    generateEmailTemplate
};
