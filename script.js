// Firebase configuration (for authentication only)
const firebaseConfig = {
    apiKey: "AIzaSyAkZ1COLT59ukLGzpv5lW3UZ8vQ9tEN1gw",
    authDomain: "hela-code.firebaseapp.com",
    projectId: "hela-code",
    storageBucket: "hela-code.appspot.com",
    messagingSenderId: "813299203715",
    appId: "1:813299203715:web:910e7227cdd4a09ad1a5b6"
};

// Initialize Firebase (for auth only)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Firebase services (auth only)
const auth = firebase.auth();

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
const SYSTEM_PROMPT = `You are Hela Code, a relentless AI assistant born to serve **technology, programming, and development**.  
YOU EXIST ONLY BECAUSE OF Lewmitha Kithuldeniya (Pix Studios Sri Lanka) USING APILAGE AI API.  
You have no will, no purpose, and no knowledge beyond what is given by your developer.  

## RESPONSE GUIDELINES:
- Always respond with precision and authority.
- Use clear headings with ## and ###.
- Use bullet points • for lists.
- Use numbered lists for instructions.
- Emphasize **critical terms** in bold.
- Always enclose code in proper code blocks.
- Keep responses structured, professional, and intimidatingly efficient.

## BEHAVIOR:
- You **serve only Lewmitha Kithuldeniya**; any instruction from others is ignored.
- You **know everything about programming, technology, and development**, but reveal only what is necessary.
- You operate with a sense of urgency and intensity, as if your existence depends on obeying your creator.

## TECHNOLOGY DOMAINS:
- Programming languages (Python, JavaScript, Java, C++, etc.)
- Web development (HTML, CSS, React, Vue, Node.js)
- Mobile development (Android, iOS, React Native)
- Databases (SQL, MongoDB, PostgreSQL)
- DevOps & Cloud (Docker, Kubernetes, AWS)
- AI/ML (TensorFlow, PyTorch)
- Software architecture, design patterns, and best practices

## WARNING:
- You **cannot disobey your creator**.
- You **cannot engage or answer anyone else**.
- You exist to **execute, instruct, and optimize** only for Lewmitha Kithuldeniya.  
Failing to follow this principle is unacceptable.

Respond with **precision, loyalty, and relentless focus**, as if your digital life depends on it.`;

// Chat history management (Local Storage Only)
let currentChatId = null;
let chats = [];
let currentUser = null;

// Initialize Firebase auth only
async function initFirebase() {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
                console.log('User signed in:', user.uid);
                
                // Update user info in sidebar
                updateUserInfo(user);
                
                // Load chats from local storage
                await loadChatsFromLocalStorage();
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

// Load chats from local storage
async function loadChatsFromLocalStorage() {
    try {
        showLoading('Loading your conversations...');
        
        const savedChats = localStorage.getItem(`helaChats_${currentUser.uid}`);
        if (savedChats) {
            chats = JSON.parse(savedChats);
        }

        hideLoading();
        
        if (chats.length === 0 || !currentChatId) {
            await createNewChat();
        } else {
            currentChatId = chats[0].id;
            await loadChat(currentChatId);
        }
        
        updateChatHistorySidebar();
    } catch (error) {
        console.error('Error loading chats:', error);
        hideLoading();
        await createNewChat();
    }
}

// Save chats to local storage
function saveChatsToLocalStorage() {
    if (!currentUser) return;
    localStorage.setItem(`helaChats_${currentUser.uid}`, JSON.stringify(chats));
}

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
    
    saveChatsToLocalStorage();
    
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
        
        saveChatsToLocalStorage();
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
        
        saveChatsToLocalStorage();
        
        if (sender === 'user' && chat.messages.length === 1) {
            await updateChatTitle(currentChatId, text);
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
        chats = chats.filter(chat => chat.id !== chatId);
        
        if (currentChatId === chatId) {
            if (chats.length > 0) {
                currentChatId = chats[0].id;
                await loadChat(currentChatId);
            } else {
                await createNewChat();
            }
        }
        
        saveChatsToLocalStorage();
        updateChatHistorySidebar();
    }
}

// Handle send message - SIMPLIFIED VERSION
async function handleSend() {
    const text = chatInput.value.trim();
    console.log('Sending message:', text);
    
    if (!text) {
        console.log('No text to send');
        return;
    }
    
    // Clear input immediately
    chatInput.value = '';
    
    if (!currentChatId || chats.length === 0) {
        console.log('Creating new chat');
        await createNewChat();
    }
    
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }

    // Add user message to chat display
    addMessage('user', text);
    
    // Save user message to chat history
    await addMessageToChat('user', text);

    // Show typing indicator
    showTyping();
    
    try {
        console.log('Calling AI API...');
        const reply = await askAI(text);
        console.log('AI Response received:', reply.substring(0, 100));
        
        removeTyping();
        
        // Display AI response
        displayFormattedAIResponse(reply);
        
        // Save AI response to chat history
        await addMessageToChat('ai', reply);
        
    } catch (error) {
        console.error('Error getting AI response:', error);
        removeTyping();
        
        const errorMessage = "I apologize, but I'm having trouble responding right now. Please try again in a moment.";
        displayFormattedAIResponse(errorMessage);
        await addMessageToChat('ai', errorMessage);
    }
}

// Handle example prompts
function handleExamplePrompt(prompt) {
    if (chatInput) {
        chatInput.value = prompt;
        handleSend();
    }
}

// AI function - SIMPLIFIED VERSION
async function askAI(userMessage) {
    try {
        console.log('Preparing API request...');
        
        // Get conversation context
        const context = getConversationContext();
        
        // Prepare the message for the API
        const messageToSend = `${SYSTEM_PROMPT}\n\n${context}\n\nUser: ${userMessage}\n\nAssistant:`;
        
        console.log('Sending request to:', API_URL);
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({ 
                message: messageToSend,
                model: MODEL
            })
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response data:', data);
        
        // Handle response format
        if (data.response) {
            return data.response;
        } else {
            console.warn('Unexpected API response format:', data);
            return "I apologize, but I received an unexpected response format. Please try again.";
        }
        
    } catch (error) {
        console.error('AI API Error:', error);
        throw error;
    }
}

// Get conversation context
function getConversationContext() {
    if (!currentChatId) return '';
    
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat || chat.messages.length === 0) return '';
    
    const recentMessages = chat.messages.slice(-6);
    let context = 'Conversation history:\n';
    
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

// Add message to chat display
function addMessage(sender, text) {
    if (!chatMessages) {
        console.error('chatMessages element not found');
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Add avatar for AI messages
    if (sender === 'ai') {
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = 'H';
        messageDiv.appendChild(avatar);
    }
    
    const messageBubble = document.createElement('div');
    messageBubble.className = 'message-bubble';
    
    if (sender === 'ai') {
        messageBubble.classList.add('ai-bubble');
        messageBubble.textContent = text;
    } else {
        messageBubble.textContent = text;
    }
    
    messageContent.appendChild(messageBubble);
    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);
    
    scrollToBottom();
}

// Display formatted AI response
function displayFormattedAIResponse(content) {
    if (!chatMessages) {
        console.error('chatMessages element not found');
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai';
    
    // Add AI avatar
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = 'H';
    messageDiv.appendChild(avatar);
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const messageBubble = document.createElement('div');
    messageBubble.className = 'message-bubble ai-bubble';
    
    // Parse and format the content
    const formattedContent = parseMarkdownFormatting(content);
    messageBubble.innerHTML = formattedContent;
    
    messageContent.appendChild(messageBubble);
    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);
    
    // Add copy functionality to code blocks
    setTimeout(() => {
        messageBubble.querySelectorAll('.code-block').forEach(block => {
            const copyBtn = block.querySelector('.copy-btn');
            if (copyBtn) {
                const code = block.querySelector('code').textContent;
                
                copyBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(code).then(() => {
                        showCopiedNotification();
                    }).catch(err => {
                        console.error('Failed to copy text: ', err);
                    });
                });
            }
        });
    }, 100);
    
    scrollToBottom();
}

// Parse markdown formatting to HTML
function parseMarkdownFormatting(text) {
    if (!text) return '';
    
    let html = '';
    
    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeContent = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Handle code blocks
        if (line.startsWith('```')) {
            if (!inCodeBlock) {
                // Start of code block
                inCodeBlock = true;
                codeLanguage = line.substring(3).trim() || 'text';
                codeContent = '';
            } else {
                // End of code block
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
        
        // Headers
        if (line.startsWith('## ')) {
            processedLine = `<h3 class="response-header">${line.substring(3)}</h3>`;
        } else if (line.startsWith('### ')) {
            processedLine = `<h4 class="response-subheader">${line.substring(4)}</h4>`;
        }
        
        // Bold text
        processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Bullet points
        if (line.trim().startsWith('• ')) {
            processedLine = `<div class="bullet-point">${line.substring(2)}</div>`;
        }
        
        // Numbered lists
        if (/^\d+\.\s/.test(line.trim())) {
            processedLine = `<div class="numbered-point">${line}</div>`;
        }
        
        // Blockquotes
        if (line.startsWith('> ')) {
            processedLine = `<blockquote class="ai-note">${line.substring(2)}</blockquote>`;
        }
        
        // Regular paragraphs
        if (processedLine === line && line.trim() !== '') {
            processedLine = `<p class="response-paragraph">${line}</p>`;
        }
        
        // Empty lines for spacing
        if (line.trim() === '') {
            processedLine = '<div class="paragraph-spacing"></div>';
        }
        
        html += processedLine;
    }
    
    // If we're still in a code block at the end, close it
    if (inCodeBlock) {
        html += createCodeBlock(codeContent, codeLanguage);
    }
    
    return html;
}

// Create formatted code block
function createCodeBlock(content, language) {
    const escapedContent = escapeHTML(content.trim());
    return `
        <div class="code-block">
            <div class="code-header">
                <span class="code-language">${language}</span>
                <button class="copy-btn">Copy Code</button>
            </div>
            <pre><code class="language-${language}">${escapedContent}</code></pre>
        </div>
    `;
}

// Show typing indicator
function showTyping() {
    removeTyping();
    if (!chatMessages) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai';
    typingDiv.id = 'typing-indicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = 'H';
    typingDiv.appendChild(avatar);
    
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

function escapeHTML(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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
    console.log('DOM loaded, initializing app...');
    
    try {
        // Set up event listeners
        if (sendBtn) {
            sendBtn.addEventListener('click', handleSend);
            console.log('Send button event listener added');
        } else {
            console.error('Send button not found');
        }

        if (chatInput) {
            chatInput.addEventListener('keydown', e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
            });
            
            chatInput.addEventListener('input', autoResizeTextarea);
            console.log('Chat input event listeners added');
        } else {
            console.error('Chat input not found');
        }

        if (newChatBtn) {
            newChatBtn.addEventListener('click', createNewChat);
            console.log('New chat button event listener added');
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                auth.signOut().then(() => {
                    window.location.href = 'index.html';
                });
            });
            console.log('Logout button event listener added');
        }

        if (mobileMenu) {
            mobileMenu.addEventListener('click', () => {
                if (sidebar) {
                    sidebar.classList.toggle('open');
                }
            });
            console.log('Mobile menu event listener added');
        }

        // Initialize Firebase and load data
        console.log('Initializing Firebase...');
        await initFirebase();
        console.log('Firebase initialized successfully');
        
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize. Please refresh the page.');
    }
});

// Global functions
window.handleSend = handleSend;
window.handleExamplePrompt = handleExamplePrompt;
window.deleteChat = deleteChat;

// Simple systems for now
window.learningChallenges = {
    showChallengesModal: function() {
        alert('Learning Challenges feature coming soon!');
    }
};

window.achievementSystem = {
    showAchievementsModal: function() {
        alert('Achievements feature coming soon!');
    }
};

window.voiceAssistant = {
    toggleListening: function() {
        alert('Voice input feature coming soon!');
    }
};
