import csv from "csvtojson";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

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

// Send email using AgentMail API
async function sendEmail(recruiter, subject, body, inboxId) {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  
  if (!apiKey || apiKey === 'your_agentmail_api_key_here') {
    throw new Error('AGENTMAIL_API_KEY not configured. Please add it to your .env file');
  }
  
  if (!inboxId) {
    throw new Error('inbox_id is required. Please provide a valid AgentMail inbox ID');
  }
  
  try {
    const response = await axios.post(
      `https://api.agentmail.to/v0/inboxes/${inboxId}/messages/send`,
      {
        to: recruiter.email,
        subject: subject,
        text: body,
        // Optional: Add HTML version
        html: body.replace(/\n/g, '<br>')
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`Email sent successfully to ${recruiter.name} at ${recruiter.email}`);
    return response.data;
    
  } catch (error) {
    console.error(`Failed to send email to ${recruiter.email}:`, error.response?.data || error.message);
    throw error;
  }
}

// Generate personalized email template for recruiter outreach
function generateEmailTemplate(recruiter, role, location) {
  const templates = {
    'sde interns': {
      subject: `SDE Internship Opportunity - ${location}`,
      body: `Hi ${recruiter.name},

Hope you're having a great week!

I'm reaching out because I noticed ${recruiter.company} is hiring SDE interns in ${location}. I'm currently looking for internship opportunities and would love to contribute to your team.

I have experience in software development and am particularly interested in the work ${recruiter.company} is doing. Would you be open to a brief chat about potential internship opportunities?

Looking forward to hearing from you!

Best regards,
[Your Name]
[Your Contact Info]`
    },
    'backend engineers': {
      subject: `Backend Engineering Opportunity - ${location}`,
      body: `Hi ${recruiter.name},

Hope you're doing well!

I came across ${recruiter.company} and saw you're hiring backend engineers in ${location}. With my background in backend development, I thought this could be a great match.

I have experience with server-side technologies and would be excited to discuss how my skills could benefit your team.

Would you be available for a quick conversation next week?

Best regards,
[Your Name]
[Your Contact Info]`
    },
    'frontend engineers': {
      subject: `Frontend Engineering Opportunity - ${location}`,
      body: `Hi ${recruiter.name},

Hope you're having a productive week!

I noticed ${recruiter.company} is looking for frontend engineers in ${location}. My experience in frontend development and passion for creating great user experiences aligns well with what you're looking for.

I'd love to learn more about the role and discuss how I can contribute to ${recruiter.company}'s frontend team.

Are you available for a brief chat?

Best regards,
[Your Name]
[Your Contact Info]`
    },
    'default': {
      subject: `Career Opportunity - ${location}`,
      body: `Hi ${recruiter.name},

Hope you're doing well!

I'm reaching out because I'm interested in opportunities at ${recruiter.company} in ${location}. I saw that you're involved in recruiting and thought you might be the right person to connect with.

I'd love to learn more about current openings and discuss how my background could be a good fit for your team.

Would you be open to a conversation?

Best regards,
[Your Name]
[Your Contact Info]`
    }
  };
  
  const template = templates[role.toLowerCase()] || templates['default'];
  return template;
}

// Send emails to all matched recruiters
async function sendEmailsToRecruiters(recruiters, role, location, inboxId, options = {}) {
  const { sendAll = true, maxEmails = 5, delayBetween = 2000 } = options;
  const results = [];
  
  console.log(`\nSending emails to ${recruiters.length} matched recruiters...`);
  
  const recruitersToEmail = sendAll ? recruiters : recruiters.slice(0, maxEmails);
  
  for (let i = 0; i < recruitersToEmail.length; i++) {
    const recruiter = recruitersToEmail[i];
    
    try {
      const template = generateEmailTemplate(recruiter, role, location);
      const result = await sendEmail(recruiter, template.subject, template.body, inboxId);
      
      results.push({
        success: true,
        recruiter: recruiter.name,
        email: recruiter.email,
        company: recruiter.company,
        messageId: result.id
      });
      
      console.log(`(${i + 1}/${recruitersToEmail.length}) Email sent to ${recruiter.name} at ${recruiter.company}`);
      
      // Add delay between emails to avoid rate limiting
      if (i < recruitersToEmail.length - 1 && delayBetween > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetween));
      }
      
    } catch (error) {
      results.push({
        success: false,
        recruiter: recruiter.name,
        email: recruiter.email,
        company: recruiter.company,
        error: error.message
      });
      
      console.error(`Failed to send email to ${recruiter.name}: ${error.message}`);
    }
  }
  
  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\nEmail sending completed:`);
  console.log(`- Successful: ${successful}`);
  console.log(`- Failed: ${failed}`);
  
  if (failed > 0) {
    console.log(`\nFailed emails:`);
    results.filter(r => !r.success).forEach(result => {
      console.log(`- ${result.recruiter} (${result.email}): ${result.error}`);
    });
  }
  
  return results;
}

// Export functions for use in other modules
export { loadRecruiters, filterRecruiters, sendEmail, generateEmailTemplate, sendEmailsToRecruiters };

// If run directly, load and display all recruiters
if (import.meta.url === `file://${process.argv[1]}`) {
  loadRecruiters().then(data => {
    console.log(`Loaded ${data.length} recruiters:`);
    data.forEach((recruiter, index) => {
      console.log(`${index + 1}. ${recruiter.name} - ${recruiter.company} (${recruiter.location})`);
      console.log(`   Email: ${recruiter.email}`);
      console.log(`   Focus: ${recruiter.focus}\n`);
    });
  });
}