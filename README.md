# Voice-to-LinkedIn Post Generator

A powerful MCP (Model Context Protocol) tool that converts voice notes into professional LinkedIn posts using AI.

## 🎯 How It Works

### 🎤 Voice → Text (ElevenLabs)
- **Input**: Audio file (M4A, MP3, etc.)
- **Process**: ElevenLabs Speech-to-Text API transcribes the audio
- **Output**: Raw text transcript

### 🤖 AI → LinkedIn Post (OpenAI)
- **Input**: Raw transcript from voice
- **Process**: OpenAI GPT-4o-mini generates a professional LinkedIn post
- **Rules Applied**:
  - Strong hook to grab attention
  - Short paragraphs for readability
  - Professional tone
  - Slight storytelling elements
  - No emojis (clean business style)

### 🔧 MCP → Tool Execution
- **Protocol**: Model Context Protocol (MCP)
- **Server**: Custom MCP server exposes the tool
- **Client**: Any MCP-compatible AI agent can call the tool
- **Result**: Structured JSON with transcript and LinkedIn post

## 📁 Project Structure

```
voice-linkedin/
├── agent.ts              # MCP client that calls the tool
├── mcp-server.ts         # MCP server with voice-to-LinkedIn tool
├── .env                  # API keys (ElevenLabs + OpenAI)
├── package.json           # Dependencies
├── tsconfig.json         # TypeScript configuration
└── Recording.m4a        # Sample audio file for testing
```

## 🚀 Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure API Keys
Create `.env` file with your API keys:
```env
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Start the MCP Server
```bash
npx tsx mcp-server.ts
```

### 4. Use the Tool
```bash
npx tsx agent.ts
```

## 🛠️ Usage Example

### Input
- Audio file: `./Recording.m4a`
- Voice content: "Hey everyone, I just finished building this amazing voice-to-LinkedIn tool..."

### Output
```json
{
  "transcript": "Hey everyone, I just finished building this amazing voice-to-LinkedIn tool...",
  "linkedinPost": "🚀 Just shipped something I'm really excited about!\n\nI've been working on a voice-to-LinkedIn post generator that transforms spoken ideas into professional content. Here's what makes it special:\n\n🎤 Voice-to-text conversion using ElevenLabs API\n🤖 AI-powered content generation with OpenAI\n🔧 MCP protocol for seamless integration\n\nThe workflow is simple: speak your idea, get a polished LinkedIn post ready to publish. No more staring at blank screens wondering what to write!\n\nWhat's your biggest challenge with content creation? I'd love to hear your thoughts.\n\n#ContentCreation #AI #VoiceTech #LinkedIn #Productivity"
}
```

## 🔧 MCP Tool Details

### Tool Name
`voiceToLinkedInPost`

### Parameters
- `filePath` (string): Path to the audio file to transcribe

### Returns
- `transcript`: Raw text from voice transcription
- `linkedinPost`: AI-generated LinkedIn post content

## 📋 Dependencies

- **@modelcontextprotocol/sdk**: MCP client/server implementation
- **axios**: HTTP client for API calls
- **form-data**: Multipart form data for file uploads
- **dotenv**: Environment variable management
- **zod**: Schema validation

## 🎯 Key Features

- **Voice-to-Text**: High-quality transcription using ElevenLabs
- **AI Content Generation**: Professional LinkedIn posts with GPT-4o-mini
- **MCP Protocol**: Compatible with any MCP-enabled AI agent
- **Error Handling**: Comprehensive error reporting and debugging
- **TypeScript**: Full type safety and IntelliSense support

## 🔍 Technical Details

### MCP Server Architecture
- Uses `McpServer` class from MCP SDK
- Registers `voiceToLinkedInPost` tool with proper schema
- Handles file validation and API error responses
- Returns structured JSON responses

### API Integration
- **ElevenLabs**: Speech-to-text with `scribe_v1` model
- **OpenAI**: Content generation with `gpt-4o-mini` model
- **Error Handling**: Detailed API error logging and response formatting

## 🐛 Troubleshooting

### Common Issues

1. **422 Error from ElevenLabs**
   - Ensure `model_id` is set to `scribe_v1`
   - Check API key is valid and has credits

2. **File Not Found**
   - Verify audio file path exists
   - Use relative paths like `./Recording.m4a`

3. **API Key Issues**
   - Check `.env` file is in project root
   - Verify API keys are correctly copied

### Debug Mode
Run with debug output:
```bash
npx tsx agent.ts
# Look for console.error messages in MCP server output
```

## 📄 License

MIT License - feel free to use this in your projects!
