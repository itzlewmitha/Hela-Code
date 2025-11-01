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

// Enable offline persistence
db.enablePersistence().catch((err) => {
    console.log('Persistence failed: ', err);
});

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
const fileBtn = document.getElementById('fileBtn');
const fileInput = document.getElementById('fileInput');
const shareChatBtn = document.getElementById('shareChatBtn');

// API Configuration
const API_URL = 'https://endpoint.apilageai.lk/api/chat';
const API_KEY = 'apk_QngciclzfHi2yAfP3WvZgx68VbbONQTP';
const MODEL = 'APILAGEAI-PRO';

// Chat management
let currentChatId = null;
let chats = [];
let currentUser = null;
let uploadedFiles = [];

// Utility Functions
function showNotification(message) {
    const notif = document.createElement('div');
    notif.className = 'notification copied-notification';
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 2000);
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

function scrollToBottom() {
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function autoResizeTextarea() {
    if (chatInput) {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    }
}

// URL Routing Functions
function getChatIdFromURL() {
    const path = window.location.pathname;
    const parts = path.split('/');
    return parts[parts.length - 1] || null;
}

function updateURL(chatId) {
    const newUrl = `${window.location.origin}${window.location.pathname.split('/').slice(0, -1).join('/')}/${chatId}`;
    window.history.pushState({ chatId }, '', newUrl);
    updateShareButton(chatId);
}

function updateShareButton(chatId) {
    if (shareChatBtn && chatId && chatId !== 'chat.html') {
        shareChatBtn.style.display = 'flex';
        shareChatBtn.onclick = () => shareChat(chatId);
    } else {
        shareChatBtn.style.display = 'none';
    }
}

function shareChat(chatId) {
    const shareUrl = `${window.location.origin}${window.location.pathname.split('/').slice(0, -1).join('/')}/${chatId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
        showNotification('Chat link copied to clipboard!');
    }).catch(() => {
        prompt('Share this chat link:', shareUrl);
    });
}

// Initialize the application
async function initApp() {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
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

// Generate unique chat ID
function generateChatId() {
    return Date.now().toString();
}

// Save chats to local storage
function saveChatsToLocalStorage() {
    if (!currentUser) return;
    try {
        localStorage.setItem(`helaChats_${currentUser.uid}`, JSON.stringify(chats));
    } catch (error) {
        console.error('Error saving to local storage:', error);
    }
}

// Save chat to Firestore
async function saveChatToFirestore(chat) {
    try {
        await db.collection('users')
            .doc(currentUser.uid)
            .collection('chats')
            .doc(chat.id)
            .set({
                title: chat.title,
                messages: chat.messages,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
    } catch (error) {
        console.error('Error saving chat to Firestore:', error);
        saveChatsToLocalStorage();
        throw error;
    }
}

// Delete chat from Firestore
async function deleteChatFromFirestore(chatId) {
    try {
        await db.collection('users')
            .doc(currentUser.uid)
            .collection('chats')
            .doc(chatId)
            .delete();
    } catch (error) {
        console.error('Error deleting chat from Firestore:', error);
    }
}

// Load chats from Firestore
async function loadChats() {
    try {
        const urlChatId = getChatIdFromURL();
        console.log('URL Chat ID:', urlChatId);
        
        const snapshot = await db.collection('users')
            .doc(currentUser.uid)
            .collection('chats')
            .orderBy('updatedAt', 'desc')
            .get();
        
        if (!snapshot.empty) {
            chats = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title || 'New Chat',
                    messages: data.messages || [],
                    createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                    updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : new Date().toISOString()
                };
            });
            console.log('Loaded', chats.length, 'chats from Firestore');
        } else {
            chats = [];
            console.log('No chats found in Firestore');
        }

        // Handle URL routing
        if (urlChatId && urlChatId !== 'chat.html') {
            const urlChat = chats.find(chat => chat.id === urlChatId);
            if (urlChat) {
                currentChatId = urlChatId;
                await loadChat(currentChatId);
                updateURL(currentChatId);
            } else {
                // Create new chat with the URL ID
                await createNewChat(urlChatId);
            }
        } else if (chats.length > 0) {
            // Load most recent chat
            currentChatId = chats[0].id;
            await loadChat(currentChatId);
            updateURL(currentChatId);
        } else {
            // Create first chat
            await createNewChat();
        }
        
        updateChatHistorySidebar();
        
    } catch (error) {
        console.error('Error loading chats from Firestore:', error);
        await loadChatsFromLocalStorage();
    }
}

// Load chats from local storage
async function loadChatsFromLocalStorage() {
    try {
        const savedChats = localStorage.getItem(`helaChats_${currentUser.uid}`);
        if (savedChats) {
            chats = JSON.parse(savedChats);
        } else {
            chats = [];
        }
    } catch (error) {
        console.error('Error loading chats from local storage:', error);
        chats = [];
    }
}

// Create a new chat
async function createNewChat(specificId = null) {
    const newChat = {
        id: specificId || generateChatId(),
        title: 'New Chat',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    chats.unshift(newChat);
    currentChatId = newChat.id;
    
    try {
        await saveChatToFirestore(newChat);
    } catch (error) {
        saveChatsToLocalStorage();
    }
    
    if (chatMessages) chatMessages.innerHTML = '';
    if (welcomeScreen) welcomeScreen.style.display = 'flex';
    if (chatTitle) chatTitle.textContent = 'New Chat';
    
    updateURL(currentChatId);
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
        
        try {
            await saveChatToFirestore(chat);
        } catch (error) {
            saveChatsToLocalStorage();
        }
        
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
        
        try {
            await saveChatToFirestore(chat);
        } catch (error) {
            saveChatsToLocalStorage();
        }
        
        if (sender === 'user' && chat.messages.length === 1) {
            await updateChatTitle(currentChatId, text);
        }
    }
}

// Load a specific chat
async function loadChat(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) {
        console.log('Chat not found:', chatId);
        return;
    }
    
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
    updateURL(currentChatId);
}

// Delete a chat
async function deleteChat(chatId, event) {
    if (event) event.stopPropagation();
    
    if (confirm('Are you sure you want to delete this chat?')) {
        chats = chats.filter(chat => chat.id !== chatId);
        
        await deleteChatFromFirestore(chatId);
        saveChatsToLocalStorage();
        
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

// FILE UPLOAD FUNCTIONS
function initFileUpload() {
    if (fileBtn && fileInput) {
        fileBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileSelect);
    }
}

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    files.forEach(file => readFileContent(file));
    fileInput.value = '';
}

function readFileContent(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            
            if (content.length > 1024 * 1024) {
                showFileError(file, 'File too large for text extraction (max 1MB)');
                return;
            }

            const fileData = {
                name: file.name,
                size: formatFileSize(file.size),
                type: file.type,
                content: content,
                timestamp: new Date().toISOString()
            };

            uploadedFiles.push(fileData);
            displayFilePreview(fileData);
            showNotification(`File "${file.name}" uploaded successfully`);

        } catch (error) {
            showFileError(file, 'Unable to read file content');
        }
    };

    reader.onerror = function() {
        showFileError(file, 'Error reading file');
    };

    reader.readAsText(file);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function displayFilePreview(fileData) {
    if (!chatMessages) return;

    const previewDiv = document.createElement('div');
    previewDiv.className = 'file-preview';
    previewDiv.innerHTML = `
        <div class="file-preview-header">
            <div>
                <div class="file-name">${escapeHTML(fileData.name)}</div>
                <div class="file-size">${fileData.size}</div>
            </div>
            <button class="remove-file" onclick="removeFile('${fileData.name}')">×</button>
        </div>
        <div class="file-content">${escapeHTML(fileData.content.substring(0, 1000))}${fileData.content.length > 1000 ? '...' : ''}</div>
    `;

    chatMessages.appendChild(previewDiv);
    scrollToBottom();
}

function removeFile(fileName) {
    uploadedFiles = uploadedFiles.filter(file => file.name !== fileName);
    
    const previews = document.querySelectorAll('.file-preview');
    previews.forEach(preview => {
        if (preview.querySelector('.file-name').textContent === fileName) {
            preview.remove();
        }
    });
    
    showNotification(`File "${fileName}" removed`);
}

function showFileError(file, message) {
    if (!chatMessages) return;

    const errorDiv = document.createElement('div');
    errorDiv.className = 'file-error';
    errorDiv.textContent = `${file.name}: ${message}`;
    chatMessages.appendChild(errorDiv);
    scrollToBottom();
    setTimeout(() => errorDiv.remove(), 5000);
}

function getFileLanguage(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const languageMap = {
        'js': 'javascript', 'jsx': 'jsx', 'ts': 'typescript', 'tsx': 'tsx',
        'py': 'python', 'html': 'html', 'css': 'css', 'java': 'java',
        'cpp': 'cpp', 'c': 'c', 'php': 'php', 'rb': 'ruby', 'go': 'go',
        'rs': 'rust', 'json': 'json', 'xml': 'xml', 'csv': 'csv',
        'md': 'markdown', 'sql': 'sql', 'yaml': 'yaml', 'yml': 'yaml',
        'sh': 'bash', 'bat': 'batch', 'ps1': 'powershell', 'lua': 'lua'
    };
    return languageMap[ext] || 'text';
}

function clearUploadedFiles() {
    const previews = document.querySelectorAll('.file-preview');
    previews.forEach(preview => preview.remove());
    uploadedFiles = [];
}

// Enhanced handleSend to include file content
async function handleSend() {
    const text = chatInput.value.trim();
    const hasFiles = uploadedFiles.length > 0;
    
    if (!text && !hasFiles) return;
    
    chatInput.value = '';
    
    if (!currentChatId || chats.length === 0) {
        await createNewChat();
    }
    
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }

    let messageContent = text;
    
    if (hasFiles) {
        messageContent += '\n\n--- Uploaded Files ---\n';
        uploadedFiles.forEach(file => {
            messageContent += `\n📁 ${file.name} (${file.size}):\n\`\`\`${getFileLanguage(file.name)}\n${file.content}\n\`\`\`\n`;
        });
    }

    addMessage('user', text);
    await addMessageToChat('user', messageContent);
    clearUploadedFiles();

    showTyping();
    
    try {
        const reply = await callAI(messageContent);
        removeTyping();
        displayAIResponse(reply);
        await addMessageToChat('ai', reply);
    } catch (error) {
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
        
        const messageToSend = `You are Hela Code, an AI programming assistant. Be helpful and enthusiastic about technology!

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
        return data.response || "I apologize, but I received an unexpected response format.";
        
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
    messageBubble.innerHTML = formatResponse(content);
    
    messageContent.appendChild(messageBubble);
    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);
    
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

// Initialize application
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Set up event listeners
        if (sendBtn) sendBtn.addEventListener('click', handleSend);

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
            newChatBtn.addEventListener('click', async () => {
                await createNewChat();
            });
        }

        initFileUpload();

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                auth.signOut().then(() => {
                    window.location.href = 'index.html';
                });
            });
        }

        if (mobileMenu) {
            mobileMenu.addEventListener('click', () => {
                if (sidebar) sidebar.classList.toggle('open');
            });
        }

        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.chatId) {
                loadChat(event.state.chatId);
            }
        });

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
window.removeFile = removeFile;
window.shareChat = shareChat;

// Feature placeholders
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
