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

// API Configuration
const API_URL = 'https://endpoint.apilageai.lk/api/chat';
const API_KEY = 'apk_QngciclzfHi2yAfP3WvZgx68VbbONQTP';
const MODEL = 'SUPER';

// Chat management
let currentChatId = null;
let chats = [];
let currentUser = null;

// Initialize the application
async function initApp() {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
                console.log('User signed in:', user.uid);
                
                updateUserInfo(user);
                await loadChats();
                resolve(user);
            } else {
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
async function loadChats() {
    try {
        const savedChats = localStorage.getItem(`helaChats_${currentUser.uid}`);
        if (savedChats) {
            chats = JSON.parse(savedChats);
        }

        if (chats.length === 0 || !currentChatId) {
            await createNewChat();
        } else {
            currentChatId = chats[0].id;
            await loadChat(currentChatId);
        }
        
        updateChatHistorySidebar();
    } catch (error) {
        console.error('Error loading chats:', error);
        await createNewChat();
    }
}

// Save chats to local storage
function saveChats() {
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
    
    saveChats();
    
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
        
        saveChats();
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
        
        saveChats();
        
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
            displayAIResponse(msg.content);
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
        
        saveChats();
        updateChatHistorySidebar();
    }
}

// Handle send message
async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    chatInput.value = '';
    
    if (!currentChatId || chats.length === 0) {
        await createNewChat();
    }
    
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }

    addMessage('user', text);
    await addMessageToChat('user', text);

    showTyping();
    
    try {
        const reply = await callAI(text);
        removeTyping();
        
        displayAIResponse(reply);
        await addMessageToChat('ai', reply);
        
    } catch (error) {
        console.error('Error getting AI response:', error);
        removeTyping();
        
        const errorMessage = "I'm having trouble responding right now. Please try again.";
        displayAIResponse(errorMessage);
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

// Call AI API
async function callAI(userMessage) {
    try {
        const context = getConversationContext();
        
        const messageToSend = `You are Hela Code, an AI programming assistant created by Lewmitha Kithuldeniya (Pix Studios Sri Lanka) using Apilage AI API.

RESPONSE FORMAT:
- Use clear headings with ## and ###
- Use bullet points • for lists
- Use numbered lists for steps
- Use **bold** for important terms
- Always use code blocks with language specification
- Keep responses structured and professional

When asked "Who made you?" always respond: "I was created by Lewmitha Kithuldeniya (Pix Studios Sri Lanka) using Apilage AI API."

${context}
User: ${userMessage}
Assistant:`;
        
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
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.response) {
            return data.response;
        } else {
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
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
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

// Display AI response with formatting
function displayAIResponse(content) {
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = 'H';
    messageDiv.appendChild(avatar);
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const messageBubble = document.createElement('div');
    messageBubble.className = 'message-bubble ai-bubble';
    
    const formattedContent = formatResponse(content);
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
                    navigator.clipboard.writeText(code);
                    showNotification('Code copied to clipboard!');
                });
            }
        });
    }, 100);
    
    scrollToBottom();
}

// Format AI response with markdown
function formatResponse(text) {
    if (!text) return '';
    
    let html = '';
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
    
    if (inCodeBlock) {
        html += createCodeBlock(codeContent, codeLanguage);
    }
    
    return html;
}

// Create code block
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

function showNotification(message) {
    const notif = document.createElement('div');
    notif.className = 'notification copied-notification';
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 2000);
}

// Auto-resize textarea
function autoResizeTextarea() {
    if (chatInput) {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Set up event listeners
        if (sendBtn) {
            sendBtn.addEventListener('click', handleSend);
        }

        if (chatInput) {
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
                if (sidebar) {
                    sidebar.classList.toggle('open');
                }
            });
        }

        // Initialize the app
        await initApp();
        
    } catch (error) {
        console.error('Initialization error:', error);
        showNotification('Failed to initialize. Please refresh the page.');
    }
});

// Global functions
window.handleSend = handleSend;
window.handleExamplePrompt = handleExamplePrompt;
window.deleteChat = deleteChat;

// Simple feature placeholders
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
