// ElevenLabs Voice Recording Integration for Flow Viewer
class VoiceRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.audioBlob = null;
    }

    async initialize() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });
            
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.audioChunks = [];
            };
            
            console.log('Voice recorder initialized');
            return true;
        } catch (error) {
            console.error('Error initializing voice recorder:', error);
            return false;
        }
    }

    startRecording() {
        if (this.isRecording) return false;
        
        this.audioChunks = [];
        this.mediaRecorder.start();
        this.isRecording = true;
        console.log('Recording started');
        return true;
    }

    stopRecording() {
        if (!this.isRecording) return null;
        
        this.mediaRecorder.stop();
        this.isRecording = false;
        console.log('Recording stopped');
        
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(this.audioBlob);
            }, 500);
        });
    }

    getAudioFile() {
        if (!this.audioBlob) return null;
        
        const fileName = `recording_${new Date().getTime()}.webm`;
        return new File([this.audioBlob], fileName, { type: 'audio/webm' });
    }

    async transcribeWithElevenLabs(audioBlob) {
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        formData.append('model_id', 'scribe_v1');
        formData.append('language_code', 'en');

        try {
            const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
                method: 'POST',
                headers: {
                    'xi-api-key': 'YOUR_ELEVENLABS_API_KEY' // Replace with actual key
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`ElevenLabs API error: ${response.status}`);
            }

            const data = await response.json();
            return data.text;
        } catch (error) {
            console.error('Transcription error:', error);
            throw error;
        }
    }
}

// Export for use in main script
window.VoiceRecorder = VoiceRecorder;
