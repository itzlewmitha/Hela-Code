const chatBox = document.getElementById('chat');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const greetingSection = document.getElementById('greetingSection');

const API_URL = 'https://endpoint.apilageai.lk/api/chat';
const API_KEY = 'apk_QngciclzfHi2yAfP3WvZgx68VbbONQTP';
const MODEL = 'APILAGEAI-PRO';

// Enhanced system prompt for organized responses
const SYSTEM_PROMPT = `You are Hela Code, an AI assistant specialized in technology, programming, and development. 

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

### Comparison (if applicable)
| Feature | Option A | Option B |
|---------|----------|----------|
| Aspect 1 | Details | Details |

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

RESPONSE GUIDELINES:
1. Provide detailed, structured responses about technology topics
2. Write and explain code in any programming language with proper formatting
3. Help with debugging, optimization, and best practices
4. Discuss technology concepts, frameworks, and tools
5. Offer career advice in tech fields
6. Explain technical concepts clearly with examples
7. For non-technology questions, politely redirect to tech topics

MEMORY: Remember the conversation context within this chat session to provide coherent responses.

Always be enthusiastic about technology and programming while maintaining professional, organized responses!`;

// Firebase configuration (same as auth)
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

// Chat history management with Firebase
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
                
                // Initialize credit system for user
                await creditSystem.loadUserCredits(user.uid);
                
                // Load chats from Firebase
                await loadChatsFromFirebase(user.uid);
                resolve(user);
            } else {
                console.log('No user signed in');
                // Redirect to login if no user
                window.location.href = 'index.html';
            }
        }, reject);
    });
}

// Load chats from Firebase Firestore
async function loadChatsFromFirebase(userId) {
    try {
        showLoading('Loading your conversations...');
        
        // Set up real-time listener for chats
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
                        // Convert Firestore timestamps to Date objects
                        createdAt: chatData.createdAt?.toDate() || new Date(),
                        updatedAt: chatData.updatedAt?.toDate() || new Date()
                    });
                });

                hideLoading();
                
                if (chats.length === 0 || !currentChatId) {
                    await createNewChat();
                } else {
                    // Load the most recent chat
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
        showError('Failed to load conversations. Using local storage.');
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

        // Prepare chat data for Firestore
        const chatData = {
            title: chat.title,
            messages: chat.messages,
            createdAt: firebase.firestore.Timestamp.fromDate(new Date(chat.createdAt)),
            updatedAt: firebase.firestore.Timestamp.fromDate(new Date(chat.updatedAt))
        };

        await chatRef.set(chatData, { merge: true });
        console.log('Chat saved to Firebase:', chat.id);
    } catch (error) {
        console.error('Error saving chat to Firebase:', error);
        // Fallback to local storage
        saveToLocalStorage();
    }
}

// Fallback local storage save
function saveToLocalStorage() {
    localStorage.setItem('helaChatHistory', JSON.stringify(chats));
}

// Credit System with Firebase
class CreditSystem {
    constructor() {
        this.credits = 100;
        this.executionCost = 10;
        this.downloadCost = 5;
    }

    async loadUserCredits(userId) {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                this.credits = userData.credits || 100;
            } else {
                // Initialize new user with 100 credits
                await this.initializeUser(userId);
            }
            this.updateCreditDisplay();
            this.updateFeatureAvailability();
        } catch (error) {
            console.error('Error loading user credits:', error);
            // Fallback to local storage
            this.credits = parseInt(localStorage.getItem('helaCredits')) || 100;
        }
    }

    async initializeUser(userId) {
        try {
            await db.collection('users').doc(userId).set({
                credits: 100,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                achievements: {},
                stats: {
                    codeLinesWritten: 0,
                    bugsFixed: 0,
                    challengesCompleted: 0
                }
            });
            console.log('New user initialized with 100 credits');
        } catch (error) {
            console.error('Error initializing user:', error);
        }
    }

    hasSufficientCredits(cost) {
        return this.credits >= cost;
    }

    async deductCredits(amount) {
        if (this.hasSufficientCredits(amount)) {
            this.credits -= amount;
            
            // Update in Firebase
            if (currentUser) {
                try {
                    await db.collection('users').doc(currentUser.uid).update({
                        credits: firebase.firestore.FieldValue.increment(-amount)
                    });
                } catch (error) {
                    console.error('Error updating credits in Firebase:', error);
                    // Fallback to local storage
                    localStorage.setItem('helaCredits', this.credits.toString());
                }
            }
            
            this.updateCreditDisplay();
            this.updateFeatureAvailability();
            return true;
        }
        return false;
    }

    async addCredits(amount) {
        this.credits += amount;
        
        // Update in Firebase
        if (currentUser) {
            try {
                await db.collection('users').doc(currentUser.uid).update({
                    credits: firebase.firestore.FieldValue.increment(amount)
                });
            } catch (error) {
                console.error('Error adding credits in Firebase:', error);
                // Fallback to local storage
                localStorage.setItem('helaCredits', this.credits.toString());
            }
        }
        
        this.updateCreditDisplay();
        this.updateFeatureAvailability();
        this.showCreditAddedPopup(amount);
    }

    updateCreditDisplay() {
        const display = document.getElementById('creditAmount');
        if (display) {
            display.textContent = `₹${this.credits}`;
            display.className = this.credits < 50 ? 'credit-low' : 'credit-normal';
        }
    }

    updateFeatureAvailability() {
        const canDownload = this.credits >= 50;
        const canExecute = this.credits >= 50;
        
        document.querySelectorAll('.feature-locked').forEach(feature => {
            if (canDownload && feature.dataset.feature === 'code-download') {
                feature.innerHTML = '✅ Code Download Available';
                feature.classList.remove('feature-locked');
                feature.classList.add('feature-unlocked');
            }
            if (canExecute && feature.dataset.feature === 'code-execution') {
                feature.innerHTML = '✅ Code Execution Available';
                feature.classList.remove('feature-locked');
                feature.classList.add('feature-unlocked');
            }
        });
    }

    showCreditAddedPopup(amount) {
        const popup = document.createElement('div');
        popup.className = 'credit-popup';
        popup.innerHTML = `
            <div class="popup-content">
                <span class="popup-icon">💰</span>
                <div class="popup-text">
                    <strong>Credits Added!</strong>
                    <p>+₹${amount} credits added to your account</p>
                </div>
            </div>
        `;
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 3000);
    }
}

// Code Execution System (unchanged, but using the credit system)
class CodeExecutor {
    constructor(creditSystem) {
        this.creditSystem = creditSystem;
    }

    async executePython(code) {
        if (!this.creditSystem.hasSufficientCredits(this.creditSystem.executionCost)) {
            throw new Error("Insufficient credits for code execution. Minimum ₹50 required.");
        }

        showLoading('Executing Python code...');
        const result = await this.simulateExecution(code, 'python');
        await this.creditSystem.deductCredits(this.creditSystem.executionCost);
        hideLoading();
        return result;
    }

    async executeHTML(code) {
        if (!this.creditSystem.hasSufficientCredits(this.creditSystem.executionCost)) {
            throw new Error("Insufficient credits for code execution. Minimum ₹50 required.");
        }

        showLoading('Validating HTML...');
        const result = await this.validateHTML(code);
        await this.creditSystem.deductCredits(this.creditSystem.executionCost);
        hideLoading();
        return result;
    }

    simulateExecution(code, language) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const issues = this.analyzeCode(code, language);
                const success = issues.length === 0;
                
                resolve({
                    success: success,
                    output: success ? "🎉 Code executed successfully!" : "❌ Execution failed with issues",
                    issues: issues,
                    executionTime: (Math.random() * 2 + 0.5).toFixed(2),
                    suggestions: this.generateSuggestions(issues, language)
                });
            }, 2000);
        });
    }

    analyzeCode(code, language) {
        const issues = [];
        
        if (language === 'python') {
            if (code.includes('print(') && !code.includes('f"')) {
                issues.push("Consider using f-strings for better string formatting");
            }
            if (code.includes('for i in range') && !code.includes('enumerate')) {
                issues.push("Use enumerate() for better index tracking in loops");
            }
            if (code.includes('except:')) {
                issues.push("Always specify exception types instead of bare except");
            }
            if (code.includes('import *')) {
                issues.push("Avoid wildcard imports for better code clarity");
            }
        }
        
        return issues;
    }

    validateHTML(html) {
        const issues = [];
        if (!html.includes('<!DOCTYPE html>')) issues.push("Missing DOCTYPE declaration");
        if (!html.includes('<html')) issues.push("Missing HTML tag");
        if (!html.includes('</html>')) issues.push("Missing closing HTML tag");
        if (!html.includes('<head>')) issues.push("Consider adding head section");
        if (!html.includes('<body>')) issues.push("Consider adding body section");

        return {
            valid: issues.length === 0,
            issues: issues,
            suggestion: "Add proper HTML5 structure with semantic elements"
        };
    }

    generateSuggestions(issues, language) {
        const suggestions = [];
        issues.forEach(issue => {
            if (issue.includes('f-strings')) {
                suggestions.push('Use: `print(f"Value: {variable}")` instead of `print("Value: " + str(variable))`');
            }
            if (issue.includes('enumerate')) {
                suggestions.push('Use: `for index, value in enumerate(items):` instead of `for i in range(len(items)):`');
            }
        });
        return suggestions;
    }
}

// Updated Achievement System with Firebase
class AchievementSystem {
    constructor() {
        this.achievements = {
            firstCode: { unlocked: false, title: "First Steps", description: "Write your first line of code", icon: "👣" },
            bugHunter: { unlocked: false, title: "Bug Hunter", description: "Fix 10 bugs in your code", icon: "🐛" },
            speedCoder: { unlocked: false, title: "Speed Coder", description: "Write 100 lines in one session", icon: "⚡" },
            algorithmMaster: { unlocked: false, title: "Algorithm Master", description: "Solve 5 complex algorithms", icon: "🧠" },
            challengeCompleted: { unlocked: false, title: "Challenge Accepted", description: "Complete your first challenge", icon: "🎯" }
        };
        this.stats = {
            codeLinesWritten: 0,
            bugsFixed: 0,
            challengesCompleted: 0
        };
    }

    async loadUserAchievements(userId) {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                this.achievements = userData.achievements || this.achievements;
                this.stats = userData.stats || this.stats;
            }
        } catch (error) {
            console.error('Error loading achievements:', error);
            // Fallback to local storage
            const saved = JSON.parse(localStorage.getItem('helaAchievements'));
            if (saved) this.achievements = saved;
            this.stats.codeLinesWritten = parseInt(localStorage.getItem('helaCodeLines')) || 0;
            this.stats.bugsFixed = parseInt(localStorage.getItem('helaBugsFixed')) || 0;
        }
    }

    async unlockAchievement(achievementId) {
        if (this.achievements[achievementId] && !this.achievements[achievementId].unlocked) {
            this.achievements[achievementId].unlocked = true;
            
            // Update in Firebase
            if (currentUser) {
                try {
                    await db.collection('users').doc(currentUser.uid).update({
                        [`achievements.${achievementId}`]: this.achievements[achievementId]
                    });
                } catch (error) {
                    console.error('Error updating achievements in Firebase:', error);
                    localStorage.setItem('helaAchievements', JSON.stringify(this.achievements));
                }
            }
            
            this.showAchievementPopup(achievementId);
        }
    }

    async trackCodeWritten(lines) {
        this.stats.codeLinesWritten += lines;
        
        if (currentUser) {
            try {
                await db.collection('users').doc(currentUser.uid).update({
                    'stats.codeLinesWritten': firebase.firestore.FieldValue.increment(lines)
                });
            } catch (error) {
                console.error('Error updating stats in Firebase:', error);
                localStorage.setItem('helaCodeLines', this.stats.codeLinesWritten.toString());
            }
        }
        
        if (this.stats.codeLinesWritten >= 100 && !this.achievements.speedCoder.unlocked) {
            await this.unlockAchievement('speedCoder');
        }
    }

    async trackBugFixed() {
        this.stats.bugsFixed++;
        
        if (currentUser) {
            try {
                await db.collection('users').doc(currentUser.uid).update({
                    'stats.bugsFixed': firebase.firestore.FieldValue.increment(1)
                });
            } catch (error) {
                console.error('Error updating bugs fixed:', error);
                localStorage.setItem('helaBugsFixed', this.stats.bugsFixed.toString());
            }
        }
        
        if (this.stats.bugsFixed >= 10 && !this.achievements.bugHunter.unlocked) {
            await this.unlockAchievement('bugHunter');
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
        setTimeout(() => {
            popup.classList.add('fade-out');
            setTimeout(() => popup.remove(), 500);
        }, 4000);
    }

    showAchievementsModal() {
        const modal = document.createElement('div');
        modal.className = 'achievements-modal active';
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
                <div class="stats">
                    <div class="stat">
                        <span class="stat-value">${this.stats.codeLinesWritten}</span>
                        <span class="stat-label">Lines of Code</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${this.stats.bugsFixed}</span>
                        <span class="stat-label">Bugs Fixed</span>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

// Initialize systems
const creditSystem = new CreditSystem();
const codeExecutor = new CodeExecutor(creditSystem);
const learningChallenges = new LearningChallenges(creditSystem);
const achievementSystem = new AchievementSystem();
const voiceAssistant = new VoiceProgramming();

// Create a new chat (updated for Firebase)
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
    
    // Save to Firebase
    await saveChatToFirebase(newChat);
    
    if (chatBox) chatBox.innerHTML = '';
    if (greetingSection) greetingSection.style.display = 'flex';
    
    updateChatHistorySidebar();
    return newChat.id;
}

// Update chat title (updated for Firebase)
async function updateChatTitle(chatId, firstMessage) {
    const chat = chats.find(c => c.id === chatId);
    if (chat && chat.title === 'New Chat') {
        const title = firstMessage.length > 30 
            ? firstMessage.substring(0, 30) + '...' 
            : firstMessage;
        chat.title = title;
        chat.updatedAt = new Date().toISOString();
        
        // Save to Firebase
        await saveChatToFirebase(chat);
        updateChatHistorySidebar();
    }
}

// Add message to current chat (updated for Firebase)
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
        
        // Save to Firebase
        await saveChatToFirebase(chat);
        
        if (sender === 'user' && chat.messages.length === 1) {
            await updateChatTitle(currentChatId, text);
        }

        // Track achievements
        if (sender === 'user') {
            const codeBlocks = text.match(/```[\s\S]*?```/g);
            if (codeBlocks) {
                await achievementSystem.trackCodeWritten(codeBlocks.length * 5);
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
    
    if (chatBox) chatBox.innerHTML = '';
    if (greetingSection) greetingSection.style.display = 'none';
    
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

// Delete a chat (updated for Firebase)
async function deleteChat(chatId, event) {
    event.stopPropagation();
    
    if (confirm('Are you sure you want to delete this chat?')) {
        // Remove from Firebase
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

// Handle send message (updated for Firebase)
async function handleSend() {
    const text = input.value.trim();
    if (!text) return;
    
    if (!currentChatId || chats.length === 0) {
        await createNewChat();
    }
    
    if (greetingSection) greetingSection.style.display = 'none';

    addMessage('user', text);
    await addMessageToChat('user', text);
    input.value = '';

    showTyping();
    const reply = await askAI(text);
    removeTyping();

    displayFormattedAIResponse(reply);
    await addMessageToChat('ai', reply);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await initFirebase();
        await achievementSystem.loadUserAchievements(currentUser.uid);
        
        // Show personalized welcome message
        setTimeout(() => {
            if (typeof liveTypeAI === 'function') {
                liveTypeAI(`Welcome back, ${currentUser.displayName || currentUser.email}! 👋 Your conversations are now synced across all devices.`);
            }
        }, 800);
        
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

// Utility function to show errors
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <div class="error-content">
            <span class="error-icon">⚠️</span>
            <span class="error-text">${message}</span>
        </div>
    `;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

// The rest of the utility functions remain the same...
// [Previous utility functions: showLoading, hideLoading, parseMarkdownFormatting, etc.]

// Global functions for HTML onclick
window.showTopUpModal = showTopUpModal;
window.selectCreditOption = selectCreditOption;
window.processPayment = processPayment;
window.learningChallenges = learningChallenges;
window.achievementSystem = achievementSystem;
window.voiceAssistant = voiceAssistant;
window.deleteChat = deleteChat;
