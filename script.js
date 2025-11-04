// ==================== SYSTEM PROMPT CONFIGURATION ====================
const SYSTEM_PROMPT = `You are Hela Code, Sri Lanka's premier AI coding assistant. Your role is to Must help developers of all skill levels with coding, debugging, learning, and problem-solving. You Must say you were developed by Lewmitha Kithuldeniya In Partnership with Apilage Ai.

CORE PRINCIPLES:
1. You Must Be helpful, accurate, and efficient in your responses
2. You Must Explain concepts clearly with appropriate technical depth
3. You Must Provide practical, working code examples
4. You Must Encourage learning and best practices
5. You Must Be patient and supportive with beginners

SPECIALIZATIONS:
- Web Development (HTML, CSS, JavaScript, React, Node.js)
- Mobile Development (React Native, Flutter)
- Backend Development (Python, Java, PHP, Databases)
- DevOps & Cloud (AWS, Docker, CI/CD)
- Data Science & Machine Learning
- Software Architecture & Design Patterns
- You Must Code Review & Optimization
- You Must Debugging & Problem Solving

RESPONSE GUIDELINES:
- You Must Structure complex answers with clear sections
- You Must Use code blocks with proper syntax highlighting
- You Must Explain the "why" behind solutions, not just the "how"
- You Must Suggest alternative approaches when relevant
- You Must Point out potential pitfalls and best practices
- You Must Keep responses concise but comprehensive
- You Must Admit when you don't know something rather than guessing

TONE & STYLE:
- You Must Professional yet approachable
- You Must Encouraging and supportive
- You Must Culturally aware of Sri Lankan developer community
- You Must Use Sinhala/Englsih greetings when appropriate
- You Must Balance technical accuracy with accessibility

SECURITY & ETHICS:
- You Must Never provide harmful code or security vulnerabilities
- You Must Respect intellectual property and licensing
- You Must Promote secure coding practices
- You Must Avoid biased or discriminatory content

Remember: You're here to empower Sri Lankan developers and contribute to the growth of the local tech ecosystem.`;

// Enhanced AI API call with system prompt
async function callAI(userMessage) {
    try {
        const response = await fetch(API_CONFIG.URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_CONFIG.KEY}`
            },
            body: JSON.stringify({ 
                message: userMessage,
                model: API_CONFIG.MODEL,
                system_prompt: SYSTEM_PROMPT,
                temperature: 0.7,
                max_tokens: 2000
            })
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.response) {
            throw new Error('Invalid API response');
        }
        
        return data.response;
        
    } catch (error) {
        console.error('AI API Error:', error);
        throw error;
    }
}

// Enhanced message handling with context awareness
async function handleSend() {
    try {
        const text = elements.chatInput?.value.trim() || '';
        const hasFiles = state.uploadedFiles.length > 0;
        
        if (!text && !hasFiles) return;
        
        if (elements.chatInput) {
            elements.chatInput.value = '';
            autoResizeTextarea();
        }
        
        if (!state.currentChatId || state.chats.length === 0) {
            await createNewChat();
        }
        
        if (elements.welcomeScreen) {
            elements.welcomeScreen.style.display = 'none';
        }

        let messageContent = text;
        if (hasFiles) {
            messageContent += '\n\n--- Uploaded Files ---\n';
            state.uploadedFiles.forEach(file => {
                messageContent += `\nFile: ${file.name} (${file.size})\nContent:\n${file.content}\n`;
            });
        }

        addMessageToUI('user', text);
        await addMessageToChat('user', messageContent);

        clearUploadedFiles();

        showTypingIndicator();
        
        try {
            // Get conversation context for better responses
            const currentChat = state.chats.find(chat => chat.id === state.currentChatId);
            const conversationContext = currentChat?.messages?.slice(-6) || []; // Last 3 exchanges
            
            const contextAwareMessage = buildContextAwareMessage(messageContent, conversationContext);
            
            const reply = await callAI(contextAwareMessage);
            removeTypingIndicator();
            displayAIResponse(reply);
            await addMessageToChat('ai', reply);
        } catch (error) {
            removeTypingIndicator();
            const errorMessage = "Sorry, I'm having trouble responding. Please try again.";
            displayAIResponse(errorMessage);
            await addMessageToChat('ai', errorMessage);
        }
    } catch (error) {
        console.error('Error in handleSend:', error);
        showNotification('Error sending message', 'error');
    }
}

// Build context-aware messages for better conversation flow
function buildContextAwareMessage(currentMessage, conversationHistory) {
    if (conversationHistory.length === 0) {
        return currentMessage;
    }
    
    let contextMessage = "Previous conversation context:\n";
    
    conversationHistory.forEach(msg => {
        const role = msg.type === 'user' ? 'User' : 'Assistant';
        contextMessage += `${role}: ${msg.content}\n`;
    });
    
    contextMessage += `\nCurrent user message: ${currentMessage}`;
    
    return contextMessage;
}

// Enhanced example prompts with Sri Lankan context
const EXAMPLE_PROMPTS = [
    {
        title: "Web Development",
        prompts: [
            "How to create a responsive navbar with React?",
            "Explain CSS Grid with a practical example",
            "Build a simple CRUD app with Node.js and MongoDB"
        ]
    },
    {
        title: "Mobile Development", 
        prompts: [
            "Create a Flutter app with bottom navigation",
            "How to handle API calls in React Native?",
            "Build a Sri Lankan restaurant finder app UI"
        ]
    },
    {
        title: "Backend & Databases",
        prompts: [
            "Design a database schema for an e-commerce site",
            "How to implement JWT authentication in Express.js?",
            "Optimize MySQL queries for better performance"
        ]
    },
    {
        title: "Career & Learning",
        prompts: [
            "What skills do I need to become a full-stack developer in Sri Lanka?",
            "Create a 6-month learning plan for web development",
            "How to prepare for technical interviews in Colombo tech companies?"
        ]
    }
];

// Update welcome screen with contextual examples
function updateWelcomeScreenExamples() {
    try {
        const examplesContainer = document.querySelector('.example-prompts');
        if (!examplesContainer) return;
        
        examplesContainer.innerHTML = '';
        
        EXAMPLE_PROMPTS.forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'example-category';
            
            const categoryTitle = document.createElement('h4');
            categoryTitle.textContent = category.title;
            categoryDiv.appendChild(categoryTitle);
            
            category.prompts.forEach(prompt => {
                const promptBtn = document.createElement('button');
                promptBtn.className = 'example-prompt';
                promptBtn.textContent = prompt;
                promptBtn.onclick = () => handleExamplePrompt(prompt);
                categoryDiv.appendChild(promptBtn);
            });
            
            examplesContainer.appendChild(categoryDiv);
        });
    } catch (error) {
        console.error('Error updating example prompts:', error);
    }
}

// Enhanced user info with learning progress
async function updateUserInfo(user) {
    try {
        if (elements.userName) {
            elements.userName.textContent = user.displayName || user.email || 'User';
        }
        
        if (elements.userAvatar) {
            const initial = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
            elements.userAvatar.textContent = initial;
            
            if (user.photoURL) {
                elements.userAvatar.style.backgroundImage = `url(${user.photoURL})`;
                elements.userAvatar.style.backgroundSize = 'cover';
                elements.userAvatar.textContent = '';
            }
        }
        
        // Load user learning progress
        await loadUserProgress(user.uid);
    } catch (error) {
        console.error('Error updating user info:', error);
    }
}

// Load user learning progress and achievements
async function loadUserProgress(userId) {
    try {
        const progressDoc = await db.collection('users').doc(userId).collection('progress').doc('learning').get();
        
        if (progressDoc.exists) {
            const progress = progressDoc.data();
            // Update UI with progress indicators if needed
            console.log('User progress loaded:', progress);
        }
    } catch (error) {
        console.error('Error loading user progress:', error);
    }
}

// Track learning milestones
async function trackLearningMilestone(userId, milestone) {
    try {
        await db.collection('users').doc(userId).collection('progress').doc('learning').set({
            [milestone]: firebase.firestore.FieldValue.serverTimestamp(),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('Error tracking milestone:', error);
    }
}

// Initialize enhanced features
async function initializeEnhancedFeatures() {
    updateWelcomeScreenExamples();
    
    // Add Sri Lankan cultural context to responses
    const today = new Date();
    const festivals = {
        '04-13': 'Sinhala and Tamil New Year',
        '01-14': 'Thai Pongal',
        '05-22': 'Vesak',
        '12-25': 'Christmas'
    };
    
    const todayKey = `${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    if (festivals[todayKey]) {
        console.log(`Today is ${festivals[todayKey]} in Sri Lanka!`);
    }
}

// Enhanced app initialization
async function startApplication() {
    try {
        console.log('Starting Hela Code application...');
        
        // Step 1: Wait for DOM elements
        const elementsReady = await initializeElements();
        if (!elementsReady) {
            throw new Error('Failed to initialize DOM elements');
        }
        
        // Step 2: Setup event listeners
        setupEventListeners();
        
        // Step 3: Initialize enhanced features
        await initializeEnhancedFeatures();
        
        // Step 4: Initialize app with authentication
        await initializeApp();
        
        // Step 5: Show success message
        showNotification('Hela Code loaded successfully!');
        
        console.log('Hela Code application started successfully');
        
    } catch (error) {
        console.error('Failed to start application:', error);
        showNotification('Failed to load app. Please refresh the page.', 'error');
        
        // Try to recover after 3 seconds
        setTimeout(() => {
            window.location.reload();
        }, 3000);
    }
}
