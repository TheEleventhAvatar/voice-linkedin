// Global variables
let currentFlow = null;
let nodes = [];
let edges = [];
let voiceRecorder = null;
let currentAudioBlob = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Flow Viewer initialized');
    initializeVoiceRecorder();
});

// Main function to load and render the flow
async function loadFlow() {
    const canvas = document.getElementById('flowCanvas');
    const flowInfo = document.getElementById('flowInfo');
    
    try {
        // Show loading state
        canvas.innerHTML = '<div class="loading">Loading flow data...</div>';
        
        // Fetch flow.json
        const response = await fetch('flow.json');
        if (!response.ok) {
            throw new Error(`Failed to load flow.json: ${response.status} ${response.statusText}`);
        }
        
        currentFlow = await response.json();
        nodes = currentFlow.nodes || [];
        edges = currentFlow.edges || [];
        
        // Display flow information
        displayFlowInfo();
        
        // Render the flow
        renderFlow();
        
        console.log('Flow loaded successfully:', currentFlow);
        
    } catch (error) {
        console.error('Error loading flow:', error);
        canvas.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
        flowInfo.style.display = 'none';
    }
}

// Display flow information
function displayFlowInfo() {
    const flowInfo = document.getElementById('flowInfo');
    const flowTitle = document.getElementById('flowTitle');
    const flowStats = document.getElementById('flowStats');
    
    flowTitle.textContent = currentFlow.name || 'Untitled Flow';
    flowStats.innerHTML = `
        <strong>Nodes:</strong> ${nodes.length} | 
        <strong>Edges:</strong> ${edges.length} | 
        <strong>Type:</strong> ${getFlowType()}
    `;
    
    flowInfo.style.display = 'block';
}

// Determine flow type based on nodes
function getFlowType() {
    const nodeTypes = [...new Set(nodes.map(n => n.type))];
    if (nodeTypes.includes('agent') && nodeTypes.includes('mutation')) {
        return 'Hybrid Pipeline';
    } else if (nodeTypes.includes('agent')) {
        return 'AI Agent Flow';
    } else if (nodeTypes.includes('mutation')) {
        return 'Data Processing Flow';
    }
    return 'Generic Flow';
}

// Main render function
function renderFlow() {
    const canvas = document.getElementById('flowCanvas');
    canvas.innerHTML = '';
    
    // Create nodes
    nodes.forEach(node => {
        createNodeElement(node);
    });
    
    // Create arrows (edges)
    edges.forEach(edge => {
        createArrowElement(edge);
    });
}

// Create a node element
function createNodeElement(node) {
    const canvas = document.getElementById('flowCanvas');
    
    const nodeEl = document.createElement('div');
    nodeEl.className = `node ${node.type}`;
    nodeEl.id = `node-${node.id}`;
    nodeEl.style.left = `${node.position.x}px`;
    nodeEl.style.top = `${node.position.y}px`;
    
    // Node content
    let content = `
        <div class="node-title">${node.data.label}</div>
    `;
    
    if (node.data.model) {
        content += `<div class="node-subtitle">${node.data.model}</div>`;
    }
    
    if (node.data.toolName) {
        content += `<div class="node-details">Tool: ${node.data.toolName}</div>`;
    }
    
    if (node.data.provider) {
        content += `<div class="node-details">Provider: ${node.data.provider}</div>`;
    }
    
    if (node.data.path) {
        content += `<div class="node-details">Path: ${node.data.path}</div>`;
    }
    
    nodeEl.innerHTML = content;
    
    // Add click handler
    nodeEl.addEventListener('click', () => showNodeDetails(node));
    
    // Make draggable
    makeDraggable(nodeEl);
    
    canvas.appendChild(nodeEl);
}

// Create an arrow element
function createArrowElement(edge) {
    const canvas = document.getElementById('flowCanvas');
    
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) {
        console.warn(`Could not find nodes for edge ${edge.id}`);
        return;
    }
    
    const arrow = document.createElement('div');
    arrow.className = 'arrow';
    arrow.id = `arrow-${edge.id}`;
    
    // Calculate arrow position and angle
    const sourceEl = document.getElementById(`node-${sourceNode.id}`);
    const targetEl = document.getElementById(`node-${targetNode.id}`);
    
    if (!sourceEl || !targetEl) {
        console.warn(`Could not find node elements for edge ${edge.id}`);
        return;
    }
    
    const sourceRect = sourceEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    
    // Calculate center points
    const sourceX = sourceRect.left + sourceRect.width / 2 - canvasRect.left;
    const sourceY = sourceRect.top + sourceRect.height / 2 - canvasRect.top;
    const targetX = targetRect.left + targetRect.width / 2 - canvasRect.left;
    const targetY = targetRect.top + targetRect.height / 2 - canvasRect.top;
    
    // Calculate distance and angle
    const distance = Math.sqrt(Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2));
    const angle = Math.atan2(targetY - sourceY, targetX - sourceX) * (180 / Math.PI);
    
    // Position and rotate arrow
    arrow.style.left = `${sourceX}px`;
    arrow.style.top = `${sourceY}px`;
    arrow.style.width = `${distance - 20}px`; // Subtract some padding for arrow head
    arrow.style.transform = `rotate(${angle}deg)`;
    
    // Add click handler
    arrow.addEventListener('click', () => showEdgeDetails(edge));
    
    canvas.appendChild(arrow);
}

// Make element draggable
function makeDraggable(element) {
    let isDragging = false;
    let startX, startY, initialX, initialY;
    
    element.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialX = element.offsetLeft;
        initialY = element.offsetTop;
        element.style.zIndex = 1000;
        element.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        element.style.left = `${initialX + dx}px`;
        element.style.top = `${initialY + dy}px`;
        
        // Update arrows
        updateArrows();
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            element.style.zIndex = 10;
            element.style.cursor = 'move';
        }
    });
}

// Update all arrows after dragging
function updateArrows() {
    edges.forEach(edge => {
        const arrow = document.getElementById(`arrow-${edge.id}`);
        if (arrow) {
            arrow.remove();
            createArrowElement(edge);
        }
    });
}

// Show node details in console
function showNodeDetails(node) {
    console.log('Node Details:', node);
    alert(`Node: ${node.data.label}\nType: ${node.type}\nID: ${node.id}`);
}

// Show edge details in console
function showEdgeDetails(edge) {
    console.log('Edge Details:', edge);
    alert(`Edge: ${edge.source} -> ${edge.target}\nID: ${edge.id}`);
}

// Utility function to reset view
function resetView() {
    if (currentFlow) {
        renderFlow();
    }
}

// Voice recorder functions
async function initializeVoiceRecorder() {
    try {
        voiceRecorder = new VoiceRecorder();
        const initialized = await voiceRecorder.initialize();
        if (initialized) {
            console.log('Voice recorder ready');
            document.getElementById('recordBtn').disabled = false;
        } else {
            console.error('Failed to initialize voice recorder');
        }
    } catch (error) {
        console.error('Error initializing voice recorder:', error);
    }
}

function toggleRecording() {
    const recordBtn = document.getElementById('recordBtn');
    const transcribeBtn = document.getElementById('transcribeBtn');
    
    if (!voiceRecorder) {
        alert('Voice recorder not initialized. Please check microphone permissions.');
        return;
    }
    
    if (!voiceRecorder.isRecording) {
        // Start recording
        const started = voiceRecorder.startRecording();
        if (started) {
            recordBtn.textContent = '⏹ Stop Recording';
            recordBtn.classList.add('recording');
            transcribeBtn.disabled = true;
            console.log('Recording started');
        }
    } else {
        // Stop recording
        recordBtn.textContent = '🎤 Start Recording';
        recordBtn.classList.remove('recording');
        transcribeBtn.disabled = false;
        
        voiceRecorder.stopRecording().then(audioBlob => {
            currentAudioBlob = audioBlob;
            console.log('Recording stopped, audio ready for transcription');
        });
    }
}

async function transcribeRecording() {
    if (!currentAudioBlob) {
        alert('No audio recorded. Please record something first.');
        return;
    }
    
    const transcribeBtn = document.getElementById('transcribeBtn');
    const originalText = transcribeBtn.textContent;
    transcribeBtn.textContent = '🔄 Transcribing...';
    transcribeBtn.disabled = true;
    
    try {
        const transcript = await voiceRecorder.transcribeWithElevenLabs(currentAudioBlob);
        console.log('Transcription result:', transcript);
        
        // Process the transcript through the pipeline
        const pipelineResult = await window.FlowIntegration.processVoicePipeline(transcript);
        console.log('Pipeline result:', pipelineResult);
        
        // Show comprehensive result
        showPipelineResult(pipelineResult);
        
    } catch (error) {
        console.error('Pipeline failed:', error);
        alert(`Pipeline failed: ${error.message}`);
    } finally {
        transcribeBtn.textContent = originalText;
        transcribeBtn.disabled = false;
    }
}

function showTranscriptionResult(transcript) {
    // Create a modal or alert to show the transcription
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px;
        border-radius: 15px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 500px;
        width: 90%;
    `;
    
    modal.innerHTML = `
        <h3 style="margin: 0 0 15px 0; color: #333;">🎤 ElevenLabs Transcription</h3>
        <p style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 10px 0; line-height: 1.5;">${transcript}</p>
        <button onclick="this.parentElement.remove()" style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Close</button>
    `;
    
    document.body.appendChild(modal);
}

function showPipelineResult(result) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px;
        border-radius: 15px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 700px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
    `;
    
    if (result.success) {
        modal.innerHTML = `
            <h3 style="margin: 0 0 20px 0; color: #333;">🚀 Voice Pipeline Results</h3>
            
            <div style="background: #e8f5e8; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; color: #333;">📋 Extracted Information</h4>
                <p><strong>Transcript:</strong> ${result.transcript}</p>
                <p><strong>Role:</strong> ${result.extractedRole}</p>
                <p><strong>Location:</strong> ${result.extractedLocation}</p>
            </div>
            
            <div style="background: #e3f2fd; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; color: #333;">🎯 Matching Results</h4>
                <p><strong>Recruiters Found:</strong> ${result.summary.matchedCount} of ${result.summary.totalRecruiters}</p>
                <p><strong>Role:</strong> ${result.summary.role}</p>
                <p><strong>Location:</strong> ${result.summary.location}</p>
            </div>
            
            <div style="background: #f0f9ff; padding: 20px; border-radius: 10px;">
                <h4 style="margin: 0 0 10px 0; color: #333;">📧 Email Drafts (${result.emailDrafts.length})</h4>
                ${result.emailDrafts.map((draft, index) => `
                    <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #667eea;">
                        <p><strong>${index + 1}. ${draft.recruiter.name} - ${draft.recruiter.company}</strong></p>
                        <p style="margin: 5px 0; color: #666;"><strong>Email:</strong> ${draft.recruiter.email}</p>
                        <p style="margin: 5px 0; color: #666;"><strong>Subject:</strong> ${draft.subject}</p>
                        <p style="margin: 5px 0; font-size: 12px; color: #888; line-height: 1.4;">${draft.body.substring(0, 150)}...</p>
                    </div>
                `).join('')}
            </div>
            
            ${result.nextSteps ? `
            <div style="background: #fff3cd; padding: 20px; border-radius: 10px; margin-top: 20px;">
                <h4 style="margin: 0 0 10px 0; color: #333;">📋 Next Steps</h4>
                ${result.nextSteps.map((step, index) => `
                    <p style="margin: 5px 0; padding-left: 20px; position: relative;">
                        <span style="position: absolute; left: 0; color: #667eea; font-weight: bold;">${index + 1}.</span>
                        ${step}
                    </p>
                `).join('')}
            </div>
            ` : ''}
            
            <button onclick="this.parentElement.remove()" style="background: #667eea; color: white; border: none; padding: 12px 25px; border-radius: 5px; cursor: pointer; margin-top: 20px;">Close Results</button>
        `;
    } else {
        modal.innerHTML = `
            <h3 style="margin: 0 0 20px 0; color: #d32f2f;">❌ Pipeline Failed</h3>
            <div style="background: #ffebee; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <p><strong>Error:</strong> ${result.error}</p>
                <p style="margin-top: 10px;"><strong>Transcript:</strong> ${result.transcript}</p>
            </div>
            ${result.troubleshooting ? `
            <div style="background: #fff3cd; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; color: #333;">🔧 Troubleshooting Tips</h4>
                ${result.troubleshooting.map((tip, index) => `
                    <p style="margin: 5px 0; padding-left: 20px; position: relative;">
                        <span style="position: absolute; left: 0; color: #667eea; font-weight: bold;">${index + 1}.</span>
                        ${tip}
                    </p>
                `).join('')}
            </div>
            ` : ''}
            <button onclick="this.parentElement.remove()" style="background: #d32f2f; color: white; border: none; padding: 12px 25px; border-radius: 5px; cursor: pointer;">Close</button>
        `;
    }
    
    document.body.appendChild(modal);
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
        resetView();
    } else if (e.key === 'l' || e.key === 'L') {
        loadFlow();
    } else if (e.key === ' ') {
        e.preventDefault();
        toggleRecording();
    }
});
