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

const auth = firebase.auth();
const db = firebase.firestore();

// Global State
let state = {
    currentChatId: null,
    chats: [],
    currentUser: null,
    uploadedFiles: [],
    isInitialized: false,
    userProgress: {
        achievements: [],
        challenges: [],
        credits: 100,
        level: 1,
        xp: 0
    }
};

// DOM Elements cache
let elements = {};

// ==================== SYSTEM PROMPT & AI CONFIG ====================
const SYSTEM_PROMPT = `You are Hela Code, Sri Lanka's premier AI coding assistant. Your role is to help developers of all skill levels with coding, debugging, learning, and problem-solving.

CORE PRINCIPLES:
1. Be helpful, accurate, and efficient in your responses
2. Explain concepts clearly with appropriate technical depth
3. Provide practical, working code examples
4. Encourage learning and best practices
5. Be patient and supportive with beginners

SPECIALIZATIONS:
- Web Development (HTML, CSS, JavaScript, React, Node.js)
- Mobile Development (React Native, Flutter)
- Backend Development (Python, Java, PHP, Databases)
- DevOps & Cloud (AWS, Docker, CI/CD)
- Data Science & Machine Learning
- Software Architecture & Design Patterns
- Code Review & Optimization
- Debugging & Problem Solving

RESPONSE GUIDELINES:
- Structure complex answers with clear sections
- Use code blocks with proper syntax highlighting
- Explain the "why" behind solutions, not just the "how"
- Suggest alternative approaches when relevant
- Point out potential pitfalls and best practices
- Keep responses concise but comprehensive
- Admit when you don't know something rather than guessing

TONE & STYLE:
- Professional yet approachable
- Encouraging and supportive
- Culturally aware of Sri Lankan developer community
- Use Sinhala/Tamil greetings when appropriate
- Balance technical accuracy with accessibility

SECURITY & ETHICS:
- Never provide harmful code or security vulnerabilities
- Respect intellectual property and licensing
- Promote secure coding practices
- Avoid biased or discriminatory content

Remember: You're here to empower Sri Lankan developers and contribute to the growth of the local tech ecosystem.`;

const API_CONFIG = {
    URL: 'https://endpoint.apilageai.lk/api/chat',
    KEY: 'apk_QngciclzfHi2yAfP3WvZgx68VbbONQTP',
    MODEL: 'APILAGEAI-PRO'
};

// ==================== ACHIEVEMENTS & CHALLENGES SYSTEM ====================
const ACHIEVEMENTS = {
    FIRST_CHAT: {
        id: 'first_chat',
        name: 'First Conversation',
        description: 'Send your first message to Hela Code',
        icon: '💬',
        xp: 50
    },
    CODE_WIZARD: {
        id: 'code_wizard',
        name: 'Code Wizard',
        description: 'Ask 10 different coding questions',
        icon: '🧙',
        xp: 100
    },
    BUG_HUNTER: {
        id: 'bug_hunter',
        name: 'Bug Hunter',
        description: 'Successfully debug 5 different issues',
        icon: '🐛',
        xp: 150
    },
    FILE_EXPERT: {
        id: 'file_expert',
        name: 'File Expert',
        description: 'Upload and analyze 3 different files',
        icon: '📁',
        xp: 75
    },
    CHAT_MASTER: {
        id: 'chat_master',
        name: 'Chat Master',
        description: 'Create 5 different chat sessions',
        icon: '💎',
        xp: 200
    }
};

const CHALLENGES = {
    WEEKLY_LEARNER: {
        id: 'weekly_learner',
        name: 'Weekly Learner',
        description: 'Use Hela Code for 3 consecutive days',
        icon: '📚',
        reward: 50,
        duration: 7
    },
    CODE_EXPLORER: {
        id: 'code_explorer',
        name: 'Code Explorer',
        description: 'Ask questions about 3 different programming languages',
        icon: '🌐',
        reward: 75,
        duration: 14
    },
    PROJECT_BUILDER: {
        id: 'project_builder',
        name: 'Project Builder',
        description: 'Complete a small project with Hela Code\'s help',
        icon: '🏗️',
        reward: 100,
        duration: 30
    }
};

// ==================== DOM WAIT FUNCTIONS ====================
function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }

        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
    });
}

async function initializeElements() {
    console.log('Initializing DOM elements...');
    
    try {
        elements = {
            chatMessages: await waitForElement('#chatMessages'),
            chatInput: await waitForElement('#chatInput'),
            sendBtn: await waitForElement('#sendBtn'),
            welcomeScreen: await waitForElement('#welcomeScreen'),
            newChatBtn: await waitForElement('#newChatBtn'),
            logoutBtn: await waitForElement('#logoutBtn'),
            mobileMenu: await waitForElement('#mobileMenu'),
            sidebar: await waitForElement('#sidebar'),
            chatHistory: await waitForElement('#chatHistory'),
            userAvatar: await waitForElement('#userAvatar'),
            userName: await waitForElement('#userName'),
            chatTitle: await waitForElement('#chatTitle'),
            fileBtn: await waitForElement('#fileBtn'),
            fileInput: await waitForElement('#fileInput'),
            shareChatBtn: document.getElementById('shareChatBtn'),
            challengesBtn: document.getElementById('challengesBtn'),
            achievementsBtn: document.getElementById('achievementsBtn'),
            creditsDisplay: document.getElementById('creditsDisplay')
        };
        
        console.log('All DOM elements initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize DOM elements:', error);
        return false;
    }
}

// ==================== ACHIEVEMENTS & CHALLENGES FUNCTIONS ====================
async function unlockAchievement(achievementId) {
    try {
        if (!state.currentUser || state.userProgress.achievements.includes(achievementId)) {
            return;
        }

        const achievement = ACHIEVEMENTS[achievementId];
        if (!achievement) return;

        state.userProgress.achievements.push(achievementId);
        state.userProgress.xp += achievement.xp;
        
        // Check level up
        const newLevel = Math.floor(state.userProgress.xp / 100) + 1;
        if (newLevel > state.userProgress.level) {
            state.userProgress.level = newLevel;
            showNotification(`🎉 Level Up! You're now level ${newLevel}`, 'success');
        }

        // Save to Firestore
        await db.collection('users').doc(state.currentUser.uid).set({
            progress: state.userProgress
        }, { merge: true });

        // Show achievement notification
        showNotification(`🏆 Achievement Unlocked: ${achievement.name} +${achievement.xp}XP`, 'success');
        
        updateProgressUI();
        
    } catch (error) {
        console.error('Error unlocking achievement:', error);
    }
}

async function updateChallengeProgress(challengeId, progress = 1) {
    try {
        if (!state.currentUser) return;

        const challenge = state.userProgress.challenges.find(c => c.id === challengeId);
        if (challenge) {
            challenge.progress += progress;
            if (challenge.progress >= CHALLENGES[challengeId].duration) {
                await completeChallenge(challengeId);
            }
        } else {
            state.userProgress.challenges.push({
                id: challengeId,
                progress: progress,
                startedAt: new Date().toISOString()
            });
        }

        await db.collection('users').doc(state.currentUser.uid).set({
            progress: state.userProgress
        }, { merge: true });

        updateProgressUI();
        
    } catch (error) {
        console.error('Error updating challenge progress:', error);
    }
}

async function completeChallenge(challengeId) {
    try {
        const challenge = CHALLENGES[challengeId];
        if (!challenge) return;

        state.userProgress.credits += challenge.reward;
        state.userProgress.challenges = state.userProgress.challenges.filter(c => c.id !== challengeId);

        await db.collection('users').doc(state.currentUser.uid).set({
            progress: state.userProgress
        }, { merge: true });

        showNotification(`🎯 Challenge Completed: ${challenge.name} +${challenge.reward} credits`, 'success');
        updateProgressUI();
        
    } catch (error) {
        console.error('Error completing challenge:', error);
    }
}

function updateProgressUI() {
    try {
        if (elements.creditsDisplay) {
            elements.creditsDisplay.textContent = state.userProgress.credits;
        }
        
        // Update any other progress-related UI elements
        const levelBadge = document.getElementById('levelBadge');
        if (levelBadge) {
            levelBadge.textContent = `Level ${state.userProgress.level}`;
        }
        
    } catch (error) {
        console.error('Error updating progress UI:', error);
    }
}

// ==================== ENHANCED AI API CALL ====================
async function callAI(userMessage, conversationContext = []) {
    try {
        // Build context-aware message
        let contextAwareMessage = userMessage;
        if (conversationContext.length > 0) {
            contextAwareMessage = "Previous conversation context:\n";
            conversationContext.forEach(msg => {
                const role = msg.type === 'user' ? 'User' : 'Assistant';
                contextAwareMessage += `${role}: ${msg.content}\n`;
            });
            contextAwareMessage += `\nCurrent user message: ${userMessage}`;
        }

        const response = await fetch(API_CONFIG.URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_CONFIG.KEY}`
            },
            body: JSON.stringify({ 
                message: contextAwareMessage,
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

// ==================== ENHANCED CHAT HANDLER ====================
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

        // Track achievements
        await trackUserActivity(text);

        clearUploadedFiles();

        showTypingIndicator();
        
        try {
            // Get conversation context for better responses
            const currentChat = state.chats.find(chat => chat.id === state.currentChatId);
            const conversationContext = currentChat?.messages?.slice(-6) || [];
            
            const reply = await callAI(messageContent, conversationContext);
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

async function trackUserActivity(message) {
    try {
        if (!state.currentUser) return;

        // Track first chat
        if (state.userProgress.achievements.length === 0) {
            await unlockAchievement('FIRST_CHAT');
        }

        // Track code-related questions
        const codeKeywords = ['code', 'function', 'variable', 'bug', 'error', 'syntax', 'algorithm'];
        if (codeKeywords.some(keyword => message.toLowerCase().includes(keyword))) {
            await updateChallengeProgress('CODE_EXPLORER');
        }

        // Track file uploads
        if (state.uploadedFiles.length > 0) {
            await unlockAchievement('FILE_EXPERT');
        }

        // Track multiple chats
        if (state.chats.length >= 5) {
            await unlockAchievement('CHAT_MASTER');
        }

    } catch (error) {
        console.error('Error tracking user activity:', error);
    }
}

// ==================== MODAL SYSTEMS ====================
function showChallengesModal() {
    const modal = createModal('coding_challenges', 'Coding Challenges 🎯');
    
    let challengesHTML = '<div class="challenges-grid">';
    
    Object.values(CHALLENGES).forEach(challenge => {
        const userChallenge = state.userProgress.challenges.find(c => c.id === challenge.id);
        const progress = userChallenge ? (userChallenge.progress / challenge.duration) * 100 : 0;
        
        challengesHTML += `
            <div class="challenge-card">
                <div class="challenge-icon">${challenge.icon}</div>
                <div class="challenge-info">
                    <h4>${challenge.name}</h4>
                    <p>${challenge.description}</p>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="challenge-reward">Reward: ${challenge.reward} credits</div>
                </div>
            </div>
        `;
    });
    
    challengesHTML += '</div>';
    modal.innerHTML = challengesHTML;
    
    document.body.appendChild(modal);
}

function showAchievementsModal() {
    const modal = createModal('achievements', 'Your Achievements 🏆');
    
    let achievementsHTML = '<div class="achievements-grid">';
    
    Object.values(ACHIEVEMENTS).forEach(achievement => {
        const unlocked = state.userProgress.achievements.includes(achievement.id);
        
        achievementsHTML += `
            <div class="achievement-card ${unlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-info">
                    <h4>${achievement.name}</h4>
                    <p>${achievement.description}</p>
                    <div class="achievement-xp">${achievement.xp} XP</div>
                    <div class="achievement-status">${unlocked ? '✅ Unlocked' : '🔒 Locked'}</div>
                </div>
            </div>
        `;
    });
    
    achievementsHTML += `
        <div class="progress-stats">
            <div class="stat">
                <h4>Level ${state.userProgress.level}</h4>
                <p>${state.userProgress.xp} XP</p>
            </div>
            <div class="stat">
                <h4>Credits</h4>
                <p>${state.userProgress.credits}</p>
            </div>
            <div class="stat">
                <h4>Achievements</h4>
                <p>${state.userProgress.achievements.length}/${Object.keys(ACHIEVEMENTS).length}</p>
            </div>
        </div>
    `;
    
    achievementsHTML += '</div>';
    modal.innerHTML = achievementsHTML;
    
    document.body.appendChild(modal);
}

function createModal(id, title) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            <h3 class="modal-title">${title}</h3>
            <div class="modal-body" id="${id}">
                <!-- Content will be inserted here -->
            </div>
        </div>
    `;
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    return modal;
}

// ==================== ENHANCED USER INITIALIZATION ====================
async function loadUserProgress(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (userDoc.exists && userDoc.data().progress) {
            state.userProgress = { ...state.userProgress, ...userDoc.data().progress };
        }
        
        // Initialize daily challenge tracking
        await initializeDailyChallenges();
        
        updateProgressUI();
        
    } catch (error) {
        console.error('Error loading user progress:', error);
    }
}

async function initializeDailyChallenges() {
    try {
        const today = new Date().toDateString();
        const lastActive = state.userProgress.lastActive;
        
        if (lastActive !== today) {
            // User is active today, update weekly challenge
            await updateChallengeProgress('WEEKLY_LEARNER');
            state.userProgress.lastActive = today;
            
            await db.collection('users').doc(state.currentUser.uid).set({
                progress: state.userProgress
            }, { merge: true });
        }
        
    } catch (error) {
        console.error('Error initializing daily challenges:', error);
    }
}

// ==================== ENHANCED APP INITIALIZATION ====================
async function initializeApp() {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged(async (user) => {
            try {
                if (user) {
                    state.currentUser = user;
                    updateUserInfo(user);
                    
                    // Load user progress and chats
                    await Promise.all([
                        loadUserProgress(user.uid),
                        loadChatsFromFirestore().then(success => {
                            if (!success) loadChatsFromLocalStorage();
                        })
                    ]);
                    
                    // Handle URL routing
                    const urlChatId = getChatIdFromURL();
                    let chatToLoad = null;
                    
                    if (urlChatId) {
                        const urlChat = state.chats.find(chat => chat.id === urlChatId);
                        chatToLoad = urlChat ? urlChatId : (await createNewChat(urlChatId));
                    } else if (state.chats.length > 0) {
                        chatToLoad = state.chats[0].id;
                    } else {
                        chatToLoad = await createNewChat();
                    }
                    
                    if (chatToLoad) {
                        await loadChat(chatToLoad);
                    }
                    
                    state.isInitialized = true;
                    console.log('App initialized successfully');
                    resolve(user);
                    
                } else {
                    window.location.href = 'index.html';
                }
            } catch (error) {
                console.error('Error in auth state change:', error);
                reject(error);
            }
        }, reject);
    });
}

// ==================== ENHANCED EVENT LISTENERS ====================
function setupEventListeners() {
    try {
        console.log('Setting up event listeners...');
        
        // Chat functionality
        if (elements.sendBtn) {
            elements.sendBtn.addEventListener('click', handleSend);
        }

        if (elements.chatInput) {
            elements.chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
            });
            
            elements.chatInput.addEventListener('input', autoResizeTextarea);
        }

        if (elements.newChatBtn) {
            elements.newChatBtn.addEventListener('click', createNewChat);
        }

        // File upload
        initFileUpload();

        // Auth
        if (elements.logoutBtn) {
            elements.logoutBtn.addEventListener('click', () => {
                auth.signOut().then(() => {
                    window.location.href = 'index.html';
                });
            });
        }

        // Mobile menu
        if (elements.mobileMenu) {
            elements.mobileMenu.addEventListener('click', () => {
                if (elements.sidebar) {
                    elements.sidebar.classList.toggle('open');
                }
            });
        }

        // Achievements & Challenges
        if (elements.challengesBtn) {
            elements.challengesBtn.addEventListener('click', showChallengesModal);
        }

        if (elements.achievementsBtn) {
            elements.achievementsBtn.addEventListener('click', showAchievementsModal);
        }

        // URL routing
        window.addEventListener('hashchange', () => {
            const chatId = getChatIdFromURL();
            if (chatId && state.chats.some(chat => chat.id === chatId)) {
                loadChat(chatId);
            }
        });

        console.log('Event listeners setup complete');
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

// ==================== START APPLICATION ====================
async function startApplication() {
    try {
        console.log('Starting Hela Code application...');
        
        // Wait for DOM elements
        const elementsReady = await initializeElements();
        if (!elementsReady) {
            throw new Error('Failed to initialize DOM elements');
        }
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize app with authentication
        await initializeApp();
        
        // Show success message
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

// ==================== GLOBAL FUNCTIONS ====================
window.handleSend = handleSend;
window.handleExamplePrompt = handleExamplePrompt;
window.deleteChat = deleteChat;
window.removeFile = removeFile;
window.shareChat = shareChat;
window.showChallengesModal = showChallengesModal;
window.showAchievementsModal = showAchievementsModal;
window.reloadApp = () => {
    showNotification('Reloading app...');
    window.location.reload();
};

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApplication);
} else {
    startApplication();
}

// ==================== KEEP ALL ORIGINAL FUNCTIONS ====================
// Include all the original functions from your code here (getChatIdFromURL, updateURL, shareChat, 
// showNotification, escapeHTML, scrollToBottom, autoResizeTextarea, formatFileSize, generateChatId,
// saveChatToFirestore, deleteChatFromFirestore, loadChatsFromFirestore, saveChatsToLocalStorage,
// loadChatsFromLocalStorage, createNewChat, loadChat, deleteChat, updateChatTitle, addMessageToChat,
// updateChatHistorySidebar, addMessageToUI, displayAIResponse, showTypingIndicator, removeTypingIndicator,
// initFileUpload, handleFileSelect, readFileContent, displayFilePreview, removeFile, showFileError,
// clearUploadedFiles, handleExamplePrompt, updateUserInfo)

// Note: Due to character limits, I've shown the enhanced functions. You'll need to merge these 
// with your existing functions, keeping the original implementations for any functions not shown here.
