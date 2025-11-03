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

// DOM Elements
const elements = {
    chatMessages: document.getElementById('chatMessages'),
    chatInput: document.getElementById('chatInput'),
    sendBtn: document.getElementById('sendBtn'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    newChatBtn: document.getElementById('newChatBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    mobileMenu: document.getElementById('mobileMenu'),
    sidebar: document.getElementById('sidebar'),
    chatHistory: document.getElementById('chatHistory'),
    userAvatar: document.getElementById('userAvatar'),
    userName: document.getElementById('userName'),
    chatTitle: document.getElementById('chatTitle'),
    fileBtn: document.getElementById('fileBtn'),
    fileInput: document.getElementById('fileInput'),
    shareChatBtn: document.getElementById('shareChatBtn')
};

// API Configuration
const API_CONFIG = {
    URL: 'https://endpoint.apilageai.lk/api/chat',
    KEY: 'apk_QngciclzfHi2yAfP3WvZgx68VbbONQTP',
    MODEL: 'APILAGEAI-FREE'
};

// Global State
let state = {
    currentChatId: null,
    chats: [],
    currentUser: null,
    uploadedFiles: [],
    isOnline: true
};

// ==================== UTILITY FUNCTIONS ====================
function showNotification(message, type = 'success') {
    const notif = document.createElement('div');
    notif.className = `notification ${type === 'error' ? 'error-message' : 'copied-notification'}`;
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    if (elements.chatMessages) {
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    }
}

function autoResizeTextarea() {
    if (elements.chatInput) {
        elements.chatInput.style.height = 'auto';
        elements.chatInput.style.height = Math.min(elements.chatInput.scrollHeight, 120) + 'px';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function generateChatId() {
    return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ==================== URL ROUTING ====================
// ==================== URL ROUTING ====================
function getChatIdFromURL() {
    // Handle both formats:
    // /chat.html/chat_123  and  /chat/chat_123
    const path = window.location.pathname;
    
    // Remove .html extension if present
    const cleanPath = path.replace('.html', '');
    const parts = cleanPath.split('/');
    const chatId = parts[parts.length - 1];
    
    // Return null if it's just the base path
    return chatId && chatId !== 'chat' ? chatId : null;
}

function updateURL(chatId) {
    if (!chatId) return;
    
    // Use clean URLs without .html
    const basePath = window.location.pathname.split('/').slice(0, -1).join('/') || '';
    const newPath = `${basePath}/${chatId}`;
    
    // Update URL without page reload
    window.history.pushState({ chatId }, '', newPath);
    
    // Update page title
    const chat = state.chats.find(c => c.id === chatId);
    if (chat && chat.title !== 'New Chat') {
        document.title = `${chat.title} - Hela Code`;
    }
    
    // Show share button
    if (elements.shareChatBtn) {
        elements.shareChatBtn.style.display = 'flex';
        elements.shareChatBtn.onclick = () => shareChat(chatId);
    }
}

function shareChat(chatId) {
    const shareUrl = window.location.origin + '/chat/' + chatId;
    navigator.clipboard.writeText(shareUrl).then(() => {
        showNotification('Chat link copied to clipboard!');
    }).catch(() => {
        prompt('Copy this chat link:', shareUrl);
    });
}

// ==================== FIREBASE OPERATIONS ====================
async function saveChatToFirestore(chat) {
    try {
        await db.collection('users')
            .doc(state.currentUser.uid)
            .collection('chats')
            .doc(chat.id)
            .set({
                title: chat.title,
                messages: chat.messages,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        return true;
    } catch (error) {
        console.error('Firestore save error:', error);
        saveChatsToLocalStorage();
        return false;
    }
}

async function deleteChatFromFirestore(chatId) {
    try {
        await db.collection('users')
            .doc(state.currentUser.uid)
            .collection('chats')
            .doc(chatId)
            .delete();
        return true;
    } catch (error) {
        console.error('Firestore delete error:', error);
        return false;
    }
}

async function loadChatsFromFirestore() {
    try {
        console.log('Loading chats from Firestore for user:', state.currentUser.uid);
        
        const snapshot = await db.collection('users')
            .doc(state.currentUser.uid)
            .collection('chats')
            .orderBy('updatedAt', 'desc')
            .get();

        if (snapshot.empty) {
            console.log('No chats found in Firestore');
            state.chats = [];
            return true; // Return true even if empty - that's fine
        }

        state.chats = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title || 'New Chat',
                messages: data.messages || [],
                createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
            };
        });
        
        console.log(`Loaded ${state.chats.length} chats from Firestore`);
        return true;
        
    } catch (error) {
        console.error('Firestore load error:', error);
        // Don't show error to user, just fall back to local storage
        return false;
    }
}

// ==================== LOCAL STORAGE ====================
function saveChatsToLocalStorage() {
    if (!state.currentUser) return;
    try {
        localStorage.setItem(`helaChats_${state.currentUser.uid}`, JSON.stringify(state.chats));
    } catch (error) {
        console.error('Local storage save error:', error);
    }
}

function loadChatsFromLocalStorage() {
    if (!state.currentUser) return false;
    try {
        const saved = localStorage.getItem(`helaChats_${state.currentUser.uid}`);
        if (saved) {
            state.chats = JSON.parse(saved);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Local storage load error:', error);
        return false;
    }
}

// ==================== CHAT MANAGEMENT ====================
async function createNewChat() {
    const newChat = {
        id: generateChatId(),
        title: 'New Chat',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    state.chats.unshift(newChat);
    state.currentChatId = newChat.id;
    
    await saveChatToFirestore(newChat);
    saveChatsToLocalStorage();
    
    // Update UI
    if (elements.chatMessages) elements.chatMessages.innerHTML = '';
    if (elements.welcomeScreen) elements.welcomeScreen.style.display = 'flex';
    if (elements.chatTitle) elements.chatTitle.textContent = 'New Chat';
    
    updateURL(state.currentChatId);
    updateChatHistorySidebar();
    
    return newChat.id;
}

async function loadChat(chatId) {
    const chat = state.chats.find(c => c.id === chatId);
    if (!chat) {
        console.log('Chat not found:', chatId);
        return false;
    }
    
    state.currentChatId = chatId;
    
    // Clear chat area
    if (elements.chatMessages) {
        elements.chatMessages.innerHTML = '';
    }
    
    // Hide welcome screen
    if (elements.welcomeScreen) {
        elements.welcomeScreen.style.display = 'none';
    }
    
    // Update title
    if (elements.chatTitle) {
        elements.chatTitle.textContent = chat.title;
    }
    
    // Display messages
    chat.messages.forEach(msg => {
        if (msg.type === 'user') {
            addMessageToUI('user', msg.content);
        } else {
            displayAIResponse(msg.content);
        }
    });
    
    updateURL(state.currentChatId);
    updateChatHistorySidebar();
    scrollToBottom();
    
    return true;
}

async function deleteChat(chatId, event) {
    if (event) event.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this chat?')) {
        return;
    }
    
    // Remove from state
    state.chats = state.chats.filter(chat => chat.id !== chatId);
    
    // Delete from Firestore
    await deleteChatFromFirestore(chatId);
    
    // Update local storage
    saveChatsToLocalStorage();
    
    // Handle current chat deletion
    if (state.currentChatId === chatId) {
        if (state.chats.length > 0) {
            state.currentChatId = state.chats[0].id;
            await loadChat(state.currentChatId);
        } else {
            await createNewChat();
        }
    }
    
    updateChatHistorySidebar();
}

function updateChatTitle(chatId, firstMessage) {
    const chat = state.chats.find(c => c.id === chatId);
    if (chat && chat.title === 'New Chat') {
        const title = firstMessage.length > 30 
            ? firstMessage.substring(0, 30) + '...' 
            : firstMessage;
        chat.title = title;
        chat.updatedAt = new Date().toISOString();
        
        saveChatToFirestore(chat);
        saveChatsToLocalStorage();
        
        updateChatHistorySidebar();
        
        if (elements.chatTitle && state.currentChatId === chatId) {
            elements.chatTitle.textContent = title;
        }
    }
}

async function addMessageToChat(sender, content) {
    if (!state.currentChatId) return;
    
    const chat = state.chats.find(c => c.id === state.currentChatId);
    if (!chat) return;
    
    chat.messages.push({
        type: sender,
        content: content,
        timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 messages
    if (chat.messages.length > 100) {
        chat.messages = chat.messages.slice(-100);
    }
    
    chat.updatedAt = new Date().toISOString();
    
    // Update title if first user message
    if (sender === 'user' && chat.messages.length === 1) {
        await updateChatTitle(state.currentChatId, content);
    }
    
    // Save to both storage
    await saveChatToFirestore(chat);
    saveChatsToLocalStorage();
    
    // Update sidebar
    updateChatHistorySidebar();
}

function updateChatHistorySidebar() {
    if (!elements.chatHistory) return;
    
    elements.chatHistory.innerHTML = '';
    
    if (state.chats.length === 0) {
        elements.chatHistory.innerHTML = '<div class="no-chats">No conversations yet</div>';
        return;
    }
    
    state.chats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = `chat-item ${chat.id === state.currentChatId ? 'active' : ''}`;
        chatItem.innerHTML = `
            <span class="chat-item-icon">💬</span>
            <span class="chat-item-title">${escapeHTML(chat.title)}</span>
            <button class="delete-chat" onclick="deleteChat('${chat.id}', event)" title="Delete chat">🗑️</button>
        `;
        
        chatItem.addEventListener('click', function(e) {
            if (!e.target.classList.contains('delete-chat')) {
                loadChat(chat.id);
                if (window.innerWidth <= 768) {
                    elements.sidebar.classList.remove('open');
                }
            }
        });
        
        elements.chatHistory.appendChild(chatItem);
    });
}

// ==================== UI MESSAGE FUNCTIONS ====================
function addMessageToUI(sender, text) {
    if (!elements.chatMessages) return;
    
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
    messageBubble.className = `message-bubble ${sender === 'ai' ? 'ai-bubble' : ''}`;
    messageBubble.textContent = text;
    
    messageContent.appendChild(messageBubble);
    messageDiv.appendChild(messageContent);
    elements.chatMessages.appendChild(messageDiv);
    
    scrollToBottom();
}

function displayAIResponse(content) {
    if (!elements.chatMessages) return;
    
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
    
    // Simple formatting - you can enhance this later
    const formattedContent = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\`(.*?)\`/g, '<code>$1</code>');
    
    messageBubble.innerHTML = formattedContent;
    
    messageContent.appendChild(messageBubble);
    messageDiv.appendChild(messageContent);
    elements.chatMessages.appendChild(messageDiv);
    
    scrollToBottom();
}

function showTypingIndicator() {
    removeTypingIndicator();
    
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
    elements.chatMessages.appendChild(typingDiv);
    
    scrollToBottom();
}

function removeTypingIndicator() {
    const typing = document.getElementById('typing-indicator');
    if (typing) typing.remove();
}

// ==================== FILE UPLOAD ====================
function initFileUpload() {
    if (elements.fileBtn && elements.fileInput) {
        elements.fileBtn.addEventListener('click', () => elements.fileInput.click());
        elements.fileInput.addEventListener('change', handleFileSelect);
    }
}

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    files.forEach(file => readFileContent(file));
    elements.fileInput.value = '';
}

function readFileContent(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            
            if (content.length > 1024 * 1024) {
                showFileError(file, 'File too large (max 1MB)');
                return;
            }

            const fileData = {
                name: file.name,
                size: formatFileSize(file.size),
                content: content,
                timestamp: new Date().toISOString()
            };

            state.uploadedFiles.push(fileData);
            displayFilePreview(fileData);
            showNotification(`"${file.name}" uploaded`);

        } catch (error) {
            showFileError(file, 'Unable to read file');
        }
    };

    reader.onerror = function() {
        showFileError(file, 'Error reading file');
    };

    reader.readAsText(file);
}

function displayFilePreview(fileData) {
    if (!elements.chatMessages) return;

    const previewDiv = document.createElement('div');
    previewDiv.className = 'file-preview';
    previewDiv.innerHTML = `
        <div class="file-preview-header">
            <div class="file-name">${escapeHTML(fileData.name)}</div>
            <button class="remove-file" onclick="removeFile('${fileData.name}')">×</button>
        </div>
        <div class="file-content">${escapeHTML(fileData.content.substring(0, 500))}${fileData.content.length > 500 ? '...' : ''}</div>
    `;

    elements.chatMessages.appendChild(previewDiv);
    scrollToBottom();
}

function removeFile(fileName) {
    state.uploadedFiles = state.uploadedFiles.filter(file => file.name !== fileName);
    
    const previews = document.querySelectorAll('.file-preview');
    previews.forEach(preview => {
        if (preview.querySelector('.file-name').textContent === fileName) {
            preview.remove();
        }
    });
    
    showNotification(`"${fileName}" removed`);
}

function showFileError(file, message) {
    if (!elements.chatMessages) return;

    const errorDiv = document.createElement('div');
    errorDiv.className = 'file-error';
    errorDiv.textContent = `${file.name}: ${message}`;
    elements.chatMessages.appendChild(errorDiv);
    scrollToBottom();
    setTimeout(() => errorDiv.remove(), 5000);
}

function clearUploadedFiles() {
    const previews = document.querySelectorAll('.file-preview');
    previews.forEach(preview => preview.remove());
    state.uploadedFiles = [];
}

// ==================== AI API ====================
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
                model: API_CONFIG.MODEL
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

// ==================== MAIN CHAT HANDLER ====================
async function handleSend() {
    const text = elements.chatInput?.value.trim() || '';
    const hasFiles = state.uploadedFiles.length > 0;
    
    if (!text && !hasFiles) return;
    
    // Clear input
    if (elements.chatInput) {
        elements.chatInput.value = '';
        autoResizeTextarea();
    }
    
    // Create new chat if needed
    if (!state.currentChatId || state.chats.length === 0) {
        await createNewChat();
    }
    
    // Hide welcome screen
    if (elements.welcomeScreen) {
        elements.welcomeScreen.style.display = 'none';
    }

    // Build message content
    let messageContent = text;
    if (hasFiles) {
        messageContent += '\n\n--- Uploaded Files ---\n';
        state.uploadedFiles.forEach(file => {
            messageContent += `\nFile: ${file.name} (${file.size})\nContent:\n${file.content}\n`;
        });
    }

    // Add user message to UI and storage
    addMessageToUI('user', text);
    await addMessageToChat('user', messageContent);

    // Clear uploaded files
    clearUploadedFiles();

    // Show typing indicator
    showTypingIndicator();
    
    try {
        // Get AI response
        const reply = await callAI(messageContent);
        removeTypingIndicator();
        
        // Add AI response to UI and storage
        displayAIResponse(reply);
        await addMessageToChat('ai', reply);
        
    } catch (error) {
        removeTypingIndicator();
        
        const errorMessage = "Sorry, I'm having trouble responding. Please try again.";
        displayAIResponse(errorMessage);
        await addMessageToChat('ai', errorMessage);
    }
}

function handleExamplePrompt(prompt) {
    if (elements.chatInput) {
        elements.chatInput.value = prompt;
        handleSend();
    }
}

// ==================== USER AUTH & INIT ====================
function updateUserInfo(user) {
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
}

async function initializeApp() {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                state.currentUser = user;
                updateUserInfo(user);
                
                console.log('User authenticated:', user.uid);
                
                try {
                    // Try to load from Firestore first
                    const firestoreSuccess = await loadChatsFromFirestore();
                    if (!firestoreSuccess) {
                        console.log('Falling back to local storage');
                        await loadChatsFromLocalStorage();
                    }
                    
                    // Handle URL routing
                    const urlChatId = getChatIdFromURL();
                    console.log('URL Chat ID:', urlChatId);
                    
                    if (urlChatId) {
                        // Check if chat exists
                        const urlChat = state.chats.find(chat => chat.id === urlChatId);
                        if (urlChat) {
                            console.log('Loading URL chat:', urlChatId);
                            await loadChat(urlChatId);
                        } else {
                            console.log('URL chat not found, creating new one:', urlChatId);
                            // Create new chat with the URL ID
                            await createNewChat(urlChatId);
                        }
                    } else if (state.chats.length > 0) {
                        // Load most recent chat
                        console.log('Loading most recent chat');
                        await loadChat(state.chats[0].id);
                    } else {
                        // Create first chat
                        console.log('Creating first chat');
                        await createNewChat();
                    }
                    
                    resolve(user);
                    
                } catch (error) {
                    console.error('Initialization error:', error);
                    showNotification('Error loading chats', 'error');
                    // Create a default chat anyway
                    await createNewChat();
                    resolve(user);
                }
                
            } else {
                console.log('No user, redirecting to login');
                window.location.href = 'index.html';
            }
        }, reject);
    });
}
// ==================== EVENT LISTENERS & INIT ====================
function setupEventListeners() {
    // Send message
    if (elements.sendBtn) {
        elements.sendBtn.addEventListener('click', handleSend);
    }

    // Enter key to send
    if (elements.chatInput) {
        elements.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });
        
        elements.chatInput.addEventListener('input', autoResizeTextarea);
    }

    // New chat
    if (elements.newChatBtn) {
        elements.newChatBtn.addEventListener('click', createNewChat);
    }

    // File upload
    initFileUpload();

    // Logout
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

    // Browser back/forward
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.chatId) {
            loadChat(event.state.chatId);
        }
    });
}

// ==================== START APPLICATION ====================
document.addEventListener('DOMContentLoaded', async function() {
    try {
        setupEventListeners();
        await initializeApp();
        showNotification('Welcome to Hela Code!');
    } catch (error) {
        console.error('App initialization failed:', error);
        showNotification('Failed to load. Please refresh.', 'error');
    }
});

// Global functions for HTML onclick
window.handleSend = handleSend;
window.handleExamplePrompt = handleExamplePrompt;
window.deleteChat = deleteChat;
window.removeFile = removeFile;
window.shareChat = shareChat;

// Feature placeholders
window.learningChallenges = {
    showChallengesModal: () => alert('Challenges coming soon!')
};

window.achievementSystem = {
    showAchievementsModal: () => alert('Achievements coming soon!')
};
