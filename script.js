// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAkZ1COLT59ukLGzpv5lW3UZ8vQ9tEN1gw",
    authDomain: "hela-code.firebaseapp.com",
    projectId: "hela-code",
    storageBucket: "hela-code.appspot.com",
    messagingSenderId: "813299203715",
    appId: "1:813299203715:web:910e7227cdd4a09ad1a5b6"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const welcomeScreen = document.getElementById('welcomeScreen');
const newChatBtn = document.getElementById('newChatBtn');
const logoutBtn = document.getElementById('logoutBtn');
const mobileMenu = document.getElementById('mobileMenu');
const sidebar = document.getElementById('sidebar');
const chatHistory = document.getElementById('chatHistory');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const chatTitle = document.getElementById('chatTitle');
const voiceBtn = document.getElementById('voiceBtn');

// API Configuration
const API_URL = 'https://endpoint.apilageai.lk/api/chat';
const API_KEY = 'apk_QngciclzfHi2yAfP3WvZgx68VbbONQTP';
const MODEL = 'APILAGEAI-PRO';

// Enhanced system prompt
const SYSTEM_PROMPT = `You are Hela Code, an AI assistant specialized in technology, programming, and development. 
YOU WERE MADE BY Lewmitha Kithuldeniya (Pix Studios Sri Lanka) Using Apilage Ai API YOU ARE IT NOTHING ELSE
CRITICAL RESPONSE FORMATTING RULES:
1. ALWAYS structure your responses with clear headings using ## for main sections and ### for subsections
2. Use bullet points • for lists and steps
3. Use numbered lists for sequential instructions
4. Use **bold** for important concepts and key terms
5. Use tables for comparisons when appropriate
6. ALWAYS use code blocks with proper language specification for code examples
7. Use blockquotes > for important notes and warnings
8. Keep paragraphs concise and focused
9. Use emojis sparingly to enhance readability

RESPONSE STRUCTURE TEMPLATE:
## Main Topic
Brief introduction explaining the concept.

### Key Points
• Point 1 with explanation
• Point 2 with explanation
• Point 3 with explanation

### Step-by-Step Guide
1. First step with clear instructions
2. Second step with details
3. Third step with implementation

### Code Example
\`\`\`language
// Well-commented code here
\`\`\`

### Best Practices
> **Note:** Important considerations or warnings

• Practice 1: Explanation
• Practice 2: Explanation

TECHNOLOGY DOMAINS:
- Programming languages (Python, JavaScript, Java, C++, C#, Go, Rust, etc.)
- Web development (HTML, CSS, React, Vue, Angular, Node.js)
- Mobile development (Android, iOS, React Native, Flutter)
- Databases (SQL, MongoDB, PostgreSQL, Redis)
- DevOps & Cloud (Docker, Kubernetes, AWS, Azure, GCP)
- AI/ML (TensorFlow, PyTorch, scikit-learn)
- Embedded systems & Arduino
- Game development
- Cybersecurity
- Data science
- Software architecture

Always be enthusiastic about technology and programming while maintaining professional, organized responses!`;

// Chat history management
let currentChatId = null;
let chats = [];
let currentUser = null;
let unsubscribeChats = null;

// Initialize Firebase auth and chat sync
async function initFirebase() {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
                console.log('User signed in:', user.uid);
                
                // Update user info in sidebar
                updateUserInfo(user);
                
                // Load chats from Firebase
                await loadChatsFromFirebase(user.uid);
                resolve(user);
            } else {
                console.log('No user signed in');
                window.location.href = 'index.html';
            }
        }, reject);
    });
}

// Update user information in sidebar
function updateUserInfo(user) {
    if (userName) {
        userName.textContent = user.displayName || user.email || 'User';
    }
    
    if (userAvatar) {
        userAvatar.textContent = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
        
        if (user.photoURL) {
            userAvatar.style.backgroundImage = `url(${user.photoURL})`;
            userAvatar.style.backgroundSize = 'cover';
            userAvatar.textContent = '';
        }
    }
}

// Load chats from Firebase Firestore
async function loadChatsFromFirebase(userId) {
    try {
        showLoading('Loading your conversations...');
        
        unsubscribeChats = db.collection('users')
            .doc(userId)
            .collection('chats')
            .orderBy('updatedAt', 'desc')
            .onSnapshot(async (snapshot) => {
                chats = [];
                snapshot.forEach(doc => {
                    const chatData = doc.data();
                    chats.push({
                        id: doc.id,
                        ...chatData,
                        createdAt: chatData.createdAt?.toDate() || new Date(),
                        updatedAt: chatData.updatedAt?.toDate() || new Date()
                    });
                });

                hideLoading();
                
                if (chats.length === 0 || !currentChatId) {
                    await createNewChat();
                } else {
                    currentChatId = chats[0].id;
                    await loadChat(currentChatId);
                }
                
                updateChatHistorySidebar();
            }, (error) => {
                console.error('Error loading chats:', error);
                hideLoading();
                showError('Failed to load conversations. Using local storage.');
                loadFromLocalStorage();
            });

    } catch (error) {
        console.error('Error setting up chat listener:', error);
        hideLoading();
        loadFromLocalStorage();
    }
}

// Fallback to local storage
function loadFromLocalStorage() {
    const savedChats = localStorage.getItem('helaChatHistory');
    if (savedChats) {
        chats = JSON.parse(savedChats);
    }
    
    if (chats.length === 0 || !currentChatId) {
        createNewChat();
    } else {
        currentChatId = chats[0].id;
        loadChat(currentChatId);
    }
    
    updateChatHistorySidebar();
}

// Save chat to Firebase
async function saveChatToFirebase(chat) {
    if (!currentUser) return;

    try {
        const chatRef = db.collection('users')
            .doc(currentUser.uid)
            .collection('chats')
            .doc(chat.id);

        const chatData = {
            title: chat.title,
            messages: chat.messages,
            createdAt: firebase.firestore.Timestamp.fromDate(new Date(chat.createdAt)),
            updatedAt: firebase.firestore.Timestamp.fromDate(new Date(chat.updatedAt))
        };

        await chatRef.set(chatData, { merge: true });
    } catch (error) {
        console.error('Error saving chat to Firebase:', error);
        saveToLocalStorage();
    }
}

// Fallback local storage save
function saveToLocalStorage() {
    localStorage.setItem('helaChatHistory', JSON.stringify(chats));
}

// Learning Challenges System
class LearningChallenges {
    constructor() {
        this.challenges = [
            {
                id: 1,
                title: "Python Algorithm Master",
                difficulty: "beginner",
                tasks: [
                    "Implement bubble sort algorithm",
                    "Solve Fibonacci sequence recursively",
                    "Create a palindrome checker function"
                ],
                completed: false
            },
            {
                id: 2,
                title: "Web Development Wizard",
                difficulty: "intermediate",
                tasks: [
                    "Build a responsive navigation bar",
                    "Create dark/light mode toggle",
                    "Implement form validation with JavaScript"
                ],
                completed: false
            }
        ];
    }

    showChallengesModal() {
        const modal = document.createElement('div');
        modal.className = 'modal challenges-modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🚀 Learning Challenges</h3>
                    <button class="close-modal" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="challenges-list">
                    ${this.challenges.map(challenge => `
                        <div class="challenge-item ${challenge.completed ? 'completed' : ''}">
                            <div class="challenge-header">
                                <h4>${challenge.title}</h4>
                                <span class="difficulty ${challenge.difficulty}">${challenge.difficulty}</span>
                            </div>
                            <div class="tasks">
                                ${challenge.tasks.map(task => `
                                    <div class="task">
                                        <span class="task-icon">${challenge.completed ? '✅' : '📝'}</span>
                                        <span>${task}</span>
                                    </div>
                                `).join('')}
                            </div>
                            <button class="start-challenge" onclick="learningChallenges.startChallenge(${challenge.id})" 
                                    ${challenge.completed ? 'disabled' : ''}>
                                ${challenge.completed ? 'Completed' : 'Start Challenge'}
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    startChallenge(challengeId) {
        const challenge = this.challenges.find(c => c.id === challengeId);
        if (!challenge) return;

        const tasksText = challenge.tasks.map((task, index) => `${index + 1}. ${task}`).join('\n');
        const challengeMessage = `I'm starting the "${challenge.title}" challenge! Here are my tasks:\n${tasksText}`;
        
        chatInput.value = challengeMessage;
        handleSend();
        
        document.querySelectorAll('.modal').forEach(modal => modal.remove());
    }
}

// Achievement System
class AchievementSystem {
    constructor() {
        this.achievements = {
            firstCode: { unlocked: false, title: "First Steps", description: "Write your first line of code", icon: "👣" },
            bugHunter: { unlocked: false, title: "Bug Hunter", description: "Fix 10 bugs in your code", icon: "🐛" },
            speedCoder: { unlocked: false, title: "Speed Coder", description: "Write 100 lines in one session", icon: "⚡" },
            challengeCompleted: { unlocked: false, title: "Challenge Accepted", description: "Complete your first challenge", icon: "🎯" }
        };
    }

    async loadUserAchievements(userId) {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                this.achievements = userData.achievements || this.achievements;
            }
        } catch (error) {
            console.error('Error loading achievements:', error);
        }
    }

    async unlockAchievement(achievementId) {
        if (this.achievements[achievementId] && !this.achievements[achievementId].unlocked) {
            this.achievements[achievementId].unlocked = true;
            
            if (currentUser) {
                try {
                    await db.collection('users').doc(currentUser.uid).update({
                        [`achievements.${achievementId}`]: this.achievements[achievementId]
                    });
                } catch (error) {
                    console.error('Error updating achievements:', error);
                }
            }
            
            this.showAchievementPopup(achievementId);
        }
    }

    showAchievementPopup(achievementId) {
        const achievement = this.achievements[achievementId];
        const popup = document.createElement('div');
        popup.className = 'achievement-popup';
        popup.innerHTML = `
            <div class="achievement-content">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-text">
                    <h4>Achievement Unlocked!</h4>
                    <p class="achievement-title">${achievement.title}</p>
                    <p class="achievement-desc">${achievement.description}</p>
                </div>
            </div>
        `;
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 4000);
    }

    showAchievementsModal() {
        const modal = document.createElement('div');
        modal.className = 'modal achievements-modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🏆 Your Achievements</h3>
                    <button class="close-modal" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="achievements-grid">
                    ${Object.entries(this.achievements).map(([id, achievement]) => `
                        <div class="achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}">
                            <div class="achievement-icon">${achievement.unlocked ? achievement.icon : '🔒'}</div>
                            <div class="achievement-info">
                                <h4>${achievement.title}</h4>
                                <p>${achievement.description}</p>
                            </div>
                            <div class="achievement-status">
                                ${achievement.unlocked ? '✅ Unlocked' : '🔒 Locked'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

// Voice Programming Assistant
class VoiceProgramming {
    constructor() {
        this.isListening = false;
        this.recognition = null;
        this.finalTranscript = '';
        this.setupVoiceRecognition();
    }

    setupVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                this.isListening = true;
                this.showVoiceFeedback("🎤 Listening... Speak now");
                if (voiceBtn) voiceBtn.classList.add('listening');
            };

            this.recognition.onresult = (event) => {
                let interimTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        this.finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                if (chatInput) {
                    chatInput.value = this.finalTranscript + interimTranscript;
                }
            };

            this.recognition.onend = () => {
                this.isListening = false;
                if (voiceBtn) voiceBtn.classList.remove('listening');
                
                if (this.finalTranscript.trim()) {
                    this.showVoiceFeedback("✅ Speech captured! Click send or speak again.");
                } else {
                    this.showVoiceFeedback("🎤 Click microphone to try again");
                }
                
                if (this.finalTranscript.trim()) {
                    setTimeout(() => {
                        this.startListening();
                    }, 2000);
                }
            };

            this.recognition.onerror = (event) => {
                this.isListening = false;
                if (voiceBtn) voiceBtn.classList.remove('listening');
                
                if (event.error === 'not-allowed') {
                    this.showVoiceFeedback("❌ Microphone access denied. Please allow microphone permissions.");
                } else {
                    this.showVoiceFeedback("❌ Voice recognition error. Please try again.");
                }
            };
        } else {
            console.warn('Speech recognition not supported in this browser');
            if (voiceBtn) {
                voiceBtn.style.display = 'none';
            }
        }
    }

    startListening() {
        if (this.recognition && !this.isListening) {
            this.finalTranscript = '';
            if (chatInput) {
                chatInput.value = '';
            }
            this.recognition.start();
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    showVoiceFeedback(message) {
        const existingFeedback = document.querySelector('.voice-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }

        const feedback = document.createElement('div');
        feedback.className = 'voice-feedback';
        feedback.innerHTML = `
            <div class="voice-feedback-content">
                <span class="voice-icon">${message.includes('❌') ? '❌' : message.includes('✅') ? '✅' : '🎤'}</span>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.classList.add('fade-out');
            setTimeout(() => feedback.remove(), 500);
        }, 3000);
    }
}

// Initialize systems
const learningChallenges = new LearningChallenges();
const achievementSystem = new AchievementSystem();
const voiceAssistant = new VoiceProgramming();

// Create a new chat
async function createNewChat() {
    const newChat = {
        id: Date.now().toString(),
        title: 'New Chat',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    chats.unshift(newChat);
    currentChatId = newChat.id;
    
    await saveChatToFirebase(newChat);
    
    if (chatMessages) chatMessages.innerHTML = '';
    if (welcomeScreen) welcomeScreen.style.display = 'flex';
    if (chatTitle) chatTitle.textContent = 'New Chat';
    
    updateChatHistorySidebar();
    return newChat.id;
}

// Update chat title
async function updateChatTitle(chatId, firstMessage) {
    const chat = chats.find(c => c.id === chatId);
    if (chat && chat.title === 'New Chat') {
        const title = firstMessage.length > 30 
            ? firstMessage.substring(0, 30) + '...' 
            : firstMessage;
        chat.title = title;
        chat.updatedAt = new Date().toISOString();
        
        await saveChatToFirebase(chat);
        updateChatHistorySidebar();
        
        if (chatTitle) {
            chatTitle.textContent = title;
        }
    }
}

// Add message to current chat
async function addMessageToChat(sender, text) {
    if (!currentChatId) return;
    
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
        chat.messages.push({
            type: sender,
            content: text,
            timestamp: new Date().toISOString()
        });
        
        if (chat.messages.length > 50) {
            chat.messages = chat.messages.slice(-50);
        }
        
        chat.updatedAt = new Date().toISOString();
        
        await saveChatToFirebase(chat);
        
        if (sender === 'user' && chat.messages.length === 1) {
            await updateChatTitle(currentChatId, text);
        }

        // Track achievements
        if (sender === 'user') {
            const codeBlocks = text.match(/```[\s\S]*?```/g);
            if (codeBlocks) {
                // Track code writing achievement
            }
            if (chat.messages.length === 1) {
                await achievementSystem.unlockAchievement('firstCode');
            }
        }
    }
}

// Load a specific chat
async function loadChat(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    currentChatId = chatId;
    
    if (chatMessages) chatMessages.innerHTML = '';
    if (welcomeScreen) welcomeScreen.style.display = 'none';
    if (chatTitle) chatTitle.textContent = chat.title;
    
    chat.messages.forEach(msg => {
        if (msg.type === 'user') {
            addMessage('user', msg.content);
        } else {
            displayFormattedAIResponse(msg.content);
        }
    });
    
    scrollToBottom();
    updateChatHistorySidebar();
}

// Delete a chat
async function deleteChat(chatId, event) {
    if (event) event.stopPropagation();
    
    if (confirm('Are you sure you want to delete this chat?')) {
        if (currentUser) {
            try {
                await db.collection('users')
                    .doc(currentUser.uid)
                    .collection('chats')
                    .doc(chatId)
                    .delete();
            } catch (error) {
                console.error('Error deleting chat from Firebase:', error);
            }
        }
        
        chats = chats.filter(chat => chat.id !== chatId);
        
        if (currentChatId === chatId) {
            if (chats.length > 0) {
                currentChatId = chats[0].id;
                await loadChat(currentChatId);
            } else {
                await createNewChat();
            }
        }
        
        updateChatHistorySidebar();
    }
}

// Handle send message
async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    // Clear input immediately
    chatInput.value = '';
    
    if (!currentChatId || chats.length === 0) {
        await createNewChat();
    }
    
    if (welcomeScreen) welcomeScreen.style.display = 'none';

    // Add user message to chat
    addMessage('user', text);
    await addMessageToChat('user', text);

    showTyping();
    
    try {
        const reply = await askAI(text);
        removeTyping();
        
        displayFormattedAIResponse(reply);
        await addMessageToChat('ai', reply);
    } catch (error) {
        removeTyping();
        console.error('Error getting AI response:', error);
        displayFormattedAIResponse("I apologize, but I'm having trouble responding right now. Please try again.");
        await addMessageToChat('ai', "Error: Unable to get response");
    }
}

// Handle example prompts
function handleExamplePrompt(prompt) {
    chatInput.value = prompt;
    handleSend();
}

// AI function
async function askAI(userMessage) {
    try {
        const context = getConversationContext();
        const fullPrompt = `${SYSTEM_PROMPT}\n\n${context}\n\nCurrent user question: ${userMessage}\n\nAssistant:`;
        
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({ 
                message: fullPrompt, 
                model: MODEL 
            })
        });
        
        if (!res.ok) {
            throw new Error(`API request failed with status ${res.status}`);
        }
        
        const data = await res.json();
        return data.response || 'I apologize, but I encountered an issue. Please try again.';
        
    } catch (err) {
        console.error('AI Error:', err);
        return '## Connection Issue\nI apologize, but I\'m having trouble connecting right now. Please try again in a moment.';
    }
}

// Get conversation context
function getConversationContext() {
    if (!currentChatId) return '';
    
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat || chat.messages.length === 0) return '';
    
    const recentMessages = chat.messages.slice(-10);
    let context = 'Previous conversation context:\n';
    
    recentMessages.forEach(msg => {
        const role = msg.type === 'user' ? 'User' : 'Assistant';
        context += `${role}: ${msg.content}\n`;
    });
    
    return context;
}

// Update chat history sidebar
function updateChatHistorySidebar() {
    if (!chatHistory) return;
    
    chatHistory.innerHTML = '';
    
    if (chats.length === 0) {
        chatHistory.innerHTML = '<div class="no-chats">No conversations yet</div>';
        return;
    }
    
    chats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
        chatItem.innerHTML = `
            <span class="chat-item-icon">💬</span>
            <span class="chat-item-title">${chat.title}</span>
            <button class="delete-chat" onclick="deleteChat('${chat.id}', event)" title="Delete chat">🗑️</button>
        `;
        
        chatItem.addEventListener('click', function(e) {
            if (!e.target.classList.contains('delete-chat')) {
                loadChat(chat.id);
                
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                }
            }
        });
        
        chatHistory.appendChild(chatItem);
    });
}

// Display formatted AI response
function displayFormattedAIResponse(content) {
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai';
    
    const formattedContent = parseMarkdownFormatting(content);
    messageDiv.innerHTML = formattedContent;
    
    chatMessages.appendChild(messageDiv);
    
    // Add copy functionality to code blocks
    messageDiv.querySelectorAll('.code-block').forEach(block => {
        const copyBtn = block.querySelector('.copy-btn');
        if (copyBtn) {
            const code = block.querySelector('code').textContent;
            
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(code);
                showCopiedNotification();
            });
        }
    });
    
    scrollToBottom();
}

// Parse markdown formatting to HTML
function parseMarkdownFormatting(text) {
    let html = '<div class="message-content"><div class="message-bubble ai-bubble">';
    
    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeContent = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.startsWith('```')) {
            if (!inCodeBlock) {
                inCodeBlock = true;
                codeLanguage = line.substring(3).trim() || 'text';
                codeContent = '';
            } else {
                inCodeBlock = false;
                html += createCodeBlock(codeContent, codeLanguage);
            }
            continue;
        }
        
        if (inCodeBlock) {
            codeContent += line + '\n';
            continue;
        }
        
        let processedLine = line;
        
        if (line.startsWith('## ')) {
            processedLine = `<h3 class="response-header">${line.substring(3)}</h3>`;
        } else if (line.startsWith('### ')) {
            processedLine = `<h4 class="response-subheader">${line.substring(4)}</h4>`;
        }
        
        processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        if (line.trim().startsWith('• ')) {
            processedLine = `<div class="bullet-point">${line.substring(2)}</div>`;
        }
        
        if (/^\d+\.\s/.test(line.trim())) {
            processedLine = `<div class="numbered-point">${line}</div>`;
        }
        
        if (line.startsWith('> ')) {
            processedLine = `<blockquote class="ai-note">${line.substring(2)}</blockquote>`;
        }
        
        if (processedLine === line && line.trim() !== '') {
            processedLine = `<p class="response-paragraph">${line}</p>`;
        }
        
        if (line.trim() === '') {
            processedLine = '<div class="paragraph-spacing"></div>';
        }
        
        html += processedLine;
    }
    
    html += '</div></div>';
    return html;
}

// Create formatted code block
function createCodeBlock(content, language) {
    return `
        <div class="code-block">
            <div class="code-header">
                <span class="code-language">${language}</span>
                <button class="copy-btn">Copy Code</button>
            </div>
            <pre><code class="language-${language}">${escapeHTML(content.trim())}</code></pre>
        </div>
    `;
}

// Add message to chat display
function addMessage(sender, text) {
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const messageBubble = document.createElement('div');
    messageBubble.className = 'message-bubble';
    messageBubble.textContent = text;
    
    messageContent.appendChild(messageBubble);
    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);
    
    scrollToBottom();
}

// Show typing indicator
function showTyping() {
    removeTyping();
    if (!chatMessages) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai';
    typingDiv.id = 'typing-indicator';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const messageBubble = document.createElement('div');
    messageBubble.className = 'message-bubble ai-bubble typing-indicator';
    messageBubble.innerHTML = `
        <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
        <span>Hela Code is thinking...</span>
    `;
    
    messageContent.appendChild(messageBubble);
    typingDiv.appendChild(messageContent);
    chatMessages.appendChild(typingDiv);
    
    scrollToBottom();
}

function removeTyping() {
    const typing = document.getElementById('typing-indicator');
    if (typing) typing.remove();
}

function scrollToBottom() {
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function escapeHTML(s) {
    return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function showCopiedNotification() {
    const notif = document.createElement('div');
    notif.className = 'notification copied-notification';
    notif.textContent = '✅ Code copied to clipboard!';
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 2000);
}

function showLoading(message) {
    const loading = document.createElement('div');
    loading.className = 'loading-overlay';
    loading.innerHTML = `
        <div class="loading-content">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;
    loading.id = 'loadingOverlay';
    document.body.appendChild(loading);
}

function hideLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) loading.remove();
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'notification error-message';
    errorDiv.innerHTML = `
        <div class="error-content">
            <span class="error-icon">⚠️</span>
            <span class="error-text">${message}</span>
        </div>
    `;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

// Auto-resize textarea
function autoResizeTextarea() {
    if (chatInput) {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Set up event listeners
        if (sendBtn && chatInput) {
            sendBtn.addEventListener('click', handleSend);
            chatInput.addEventListener('keydown', e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
            });
            
            chatInput.addEventListener('input', autoResizeTextarea);
        }

        if (newChatBtn) {
            newChatBtn.addEventListener('click', createNewChat);
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                auth.signOut().then(() => {
                    window.location.href = 'index.html';
                });
            });
        }

        if (mobileMenu) {
            mobileMenu.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }

        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                voiceAssistant.toggleListening();
            });
        }

        // Initialize Firebase and load data
        await initFirebase();
        if (currentUser) {
            await achievementSystem.loadUserAchievements(currentUser.uid);
        }
        
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize. Please refresh the page.');
    }
});

// Clean up when leaving the page
window.addEventListener('beforeunload', () => {
    if (unsubscribeChats) {
        unsubscribeChats();
    }
});

// Global functions
window.handleSend = handleSend;
window.handleExamplePrompt = handleExamplePrompt;
window.learningChallenges = learningChallenges;
window.achievementSystem = achievementSystem;
window.voiceAssistant = voiceAssistant;
window.deleteChat = deleteChat;
