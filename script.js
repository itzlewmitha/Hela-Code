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
    isInitialized: false
};

// DOM Elements cache
let elements = {};

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
            shareChatBtn: document.getElementById('shareChatBtn')
        };
        
        console.log('All DOM elements initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize DOM elements:', error);
        return false;
    }
}

// ==================== UTILITY FUNCTIONS ====================
function showNotification(message, type = 'success') {
    try {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(notif => notif.remove());
        
        const notif = document.createElement('div');
        notif.className = `notification ${type === 'error' ? 'error-message' : 'copied-notification'}`;
        notif.textContent = message;
        document.body.appendChild(notif);
        
        setTimeout(() => {
            if (notif.parentNode) {
                notif.parentNode.removeChild(notif);
            }
        }, 3000);
    } catch (error) {
        console.error('Error showing notification:', error);
    }
}

function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    setTimeout(() => {
        try {
            if (elements.chatMessages) {
                elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
            }
        } catch (error) {
            console.error('Error scrolling:', error);
        }
    }, 100);
}

function autoResizeTextarea() {
    try {
        if (elements.chatInput) {
            elements.chatInput.style.height = 'auto';
            elements.chatInput.style.height = Math.min(elements.chatInput.scrollHeight, 120) + 'px';
        }
    } catch (error) {
        console.error('Error resizing textarea:', error);
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
function getChatIdFromURL() {
    try {
        const path = window.location.pathname;
        const match = path.match(/\/(chat|chat\.html)\/(.+)/);
        return match ? match[2] : null;
    } catch (error) {
        console.error('Error getting chat ID from URL:', error);
        return null;
    }
}

function updateURL(chatId) {
    try {
        if (!chatId) return;
        
        const newPath = `/chat/${chatId}`;
        window.history.pushState({ chatId }, '', newPath);
        
        if (elements.shareChatBtn) {
            elements.shareChatBtn.style.display = 'flex';
            elements.shareChatBtn.onclick = () => shareChat(chatId);
        }
    } catch (error) {
        console.error('Error updating URL:', error);
    }
}

function shareChat(chatId) {
    try {
        const shareUrl = `${window.location.origin}/chat/${chatId}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            showNotification('Chat link copied to clipboard!');
        }).catch(() => {
            prompt('Copy this chat link:', shareUrl);
        });
    } catch (error) {
        console.error('Error sharing chat:', error);
        showNotification('Error sharing chat', 'error');
    }
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
        const snapshot = await db.collection('users')
            .doc(state.currentUser.uid)
            .collection('chats')
            .orderBy('updatedAt', 'desc')
            .get();

        if (snapshot.empty) {
            state.chats = [];
            return true;
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
        return false;
    }
}

// ==================== LOCAL STORAGE ====================
function saveChatsToLocalStorage() {
    try {
        if (!state.currentUser) return;
        localStorage.setItem(`helaChats_${state.currentUser.uid}`, JSON.stringify(state.chats));
    } catch (error) {
        console.error('Local storage save error:', error);
    }
}

function loadChatsFromLocalStorage() {
    try {
        if (!state.currentUser) return false;
        const saved = localStorage.getItem(`helaChats_${state.currentUser.uid}`);
        if (saved) {
            state.chats = JSON.parse(saved);
            console.log(`Loaded ${state.chats.length} chats from local storage`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Local storage load error:', error);
        return false;
    }
}

// ==================== CHAT MANAGEMENT ====================
async function createNewChat(specificId = null) {
    try {
        const newChat = {
            id: specificId || generateChatId(),
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
        if (elements.chatMessages) {
            elements.chatMessages.innerHTML = '';
        }
        if (elements.welcomeScreen) {
            elements.welcomeScreen.style.display = 'flex';
        }
        if (elements.chatTitle) {
            elements.chatTitle.textContent = 'New Chat';
        }
        
        updateURL(state.currentChatId);
        updateChatHistorySidebar();
        
        console.log('Created new chat:', newChat.id);
        return newChat.id;
    } catch (error) {
        console.error('Error creating new chat:', error);
        showNotification('Error creating chat', 'error');
        return null;
    }
}

async function loadChat(chatId) {
    try {
        console.log('Loading chat:', chatId);
        
        const chat = state.chats.find(c => c.id === chatId);
        if (!chat) {
            console.error('Chat not found:', chatId);
            showNotification('Chat not found', 'error');
            return false;
        }
        
        state.currentChatId = chatId;
        
        // Clear chat area
        if (elements.chatMessages) {
            elements.chatMessages.innerHTML = '';
        }
        
        // Update title
        if (elements.chatTitle) {
            elements.chatTitle.textContent = chat.title;
        }
        
        // Show/hide welcome screen based on messages
        if (elements.welcomeScreen) {
            if (chat.messages && chat.messages.length > 0) {
                elements.welcomeScreen.style.display = 'none';
            } else {
                elements.welcomeScreen.style.display = 'flex';
            }
        }
        
        // Rebuild messages
        if (chat.messages && chat.messages.length > 0) {
            console.log(`Rebuilding ${chat.messages.length} messages`);
            chat.messages.forEach(msg => {
                if (msg.type === 'user') {
                    addMessageToUI('user', msg.content);
                } else {
                    displayAIResponse(msg.content);
                }
            });
        }
        
        updateURL(state.currentChatId);
        updateChatHistorySidebar();
        scrollToBottom();
        
        console.log('Chat loaded successfully:', chatId);
        return true;
    } catch (error) {
        console.error('Error loading chat:', error);
        showNotification('Error loading chat', 'error');
        return false;
    }
}

async function deleteChat(chatId, event) {
    try {
        if (event) event.stopPropagation();
        
        if (!confirm('Are you sure you want to delete this chat?')) {
            return;
        }
        
        state.chats = state.chats.filter(chat => chat.id !== chatId);
        
        await deleteChatFromFirestore(chatId);
        saveChatsToLocalStorage();
        
        if (state.currentChatId === chatId) {
            if (state.chats.length > 0) {
                state.currentChatId = state.chats[0].id;
                await loadChat(state.currentChatId);
            } else {
                await createNewChat();
            }
        }
        
        updateChatHistorySidebar();
        showNotification('Chat deleted');
    } catch (error) {
        console.error('Error deleting chat:', error);
        showNotification('Error deleting chat', 'error');
    }
}

function updateChatTitle(chatId, firstMessage) {
    try {
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
    } catch (error) {
        console.error('Error updating chat title:', error);
    }
}

async function addMessageToChat(sender, content) {
    try {
        if (!state.currentChatId) return;
        
        const chat = state.chats.find(c => c.id === state.currentChatId);
        if (!chat) return;
        
        chat.messages.push({
            type: sender,
            content: content,
            timestamp: new Date().toISOString()
        });
        
        if (chat.messages.length > 100) {
            chat.messages = chat.messages.slice(-100);
        }
        
        chat.updatedAt = new Date().toISOString();
        
        if (sender === 'user' && chat.messages.length === 1) {
            await updateChatTitle(state.currentChatId, content);
        }
        
        await saveChatToFirestore(chat);
        saveChatsToLocalStorage();
        
        updateChatHistorySidebar();
    } catch (error) {
        console.error('Error adding message to chat:', error);
        showNotification('Error saving message', 'error');
    }
}

function updateChatHistorySidebar() {
    try {
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
                    if (window.innerWidth <= 768 && elements.sidebar) {
                        elements.sidebar.classList.remove('open');
                    }
                }
            });
            
            elements.chatHistory.appendChild(chatItem);
        });
    } catch (error) {
        console.error('Error updating chat history:', error);
    }
}

// ==================== UI MESSAGE FUNCTIONS ====================
function addMessageToUI(sender, text) {
    try {
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
    } catch (error) {
        console.error('Error adding message to UI:', error);
    }
}

function displayAIResponse(content) {
    try {
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
        
        const formattedContent = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\`(.*?)\`/g, '<code>$1</code>');
        
        messageBubble.innerHTML = formattedContent;
        
        messageContent.appendChild(messageBubble);
        messageDiv.appendChild(messageContent);
        elements.chatMessages.appendChild(messageDiv);
        
        scrollToBottom();
    } catch (error) {
        console.error('Error displaying AI response:', error);
    }
}

function showTypingIndicator() {
    try {
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
    } catch (error) {
        console.error('Error showing typing indicator:', error);
    }
}

function removeTypingIndicator() {
    try {
        const typing = document.getElementById('typing-indicator');
        if (typing && typing.parentNode) {
            typing.parentNode.removeChild(typing);
        }
    } catch (error) {
        console.error('Error removing typing indicator:', error);
    }
}

// ==================== FILE UPLOAD ====================
function initFileUpload() {
    try {
        if (elements.fileBtn && elements.fileInput) {
            elements.fileBtn.addEventListener('click', () => elements.fileInput.click());
            elements.fileInput.addEventListener('change', handleFileSelect);
        }
    } catch (error) {
        console.error('Error initializing file upload:', error);
    }
}

function handleFileSelect(event) {
    try {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        files.forEach(file => readFileContent(file));
        elements.fileInput.value = '';
    } catch (error) {
        console.error('Error handling file select:', error);
        showNotification('Error uploading file', 'error');
    }
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
    try {
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
    } catch (error) {
        console.error('Error displaying file preview:', error);
    }
}

function removeFile(fileName) {
    try {
        state.uploadedFiles = state.uploadedFiles.filter(file => file.name !== fileName);
        
        const previews = document.querySelectorAll('.file-preview');
        previews.forEach(preview => {
            if (preview.querySelector('.file-name').textContent === fileName) {
                preview.remove();
            }
        });
        
        showNotification(`"${fileName}" removed`);
    } catch (error) {
        console.error('Error removing file:', error);
    }
}

function showFileError(file, message) {
    try {
        if (!elements.chatMessages) return;

        const errorDiv = document.createElement('div');
        errorDiv.className = 'file-error';
        errorDiv.textContent = `${file.name}: ${message}`;
        elements.chatMessages.appendChild(errorDiv);
        scrollToBottom();
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    } catch (error) {
        console.error('Error showing file error:', error);
    }
}

function clearUploadedFiles() {
    try {
        const previews = document.querySelectorAll('.file-preview');
        previews.forEach(preview => {
            if (preview.parentNode) {
                preview.parentNode.removeChild(preview);
            }
        });
        state.uploadedFiles = [];
    } catch (error) {
        console.error('Error clearing uploaded files:', error);
    }
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
            const reply = await callAI(messageContent);
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

function handleExamplePrompt(prompt) {
    try {
        if (elements.chatInput) {
            elements.chatInput.value = prompt;
            handleSend();
        }
    } catch (error) {
        console.error('Error handling example prompt:', error);
    }
}

// ==================== USER AUTH & INIT ====================
function updateUserInfo(user) {
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
    } catch (error) {
        console.error('Error updating user info:', error);
    }
}

async function initializeApp() {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged(async (user) => {
            try {
                if (user) {
                    state.currentUser = user;
                    updateUserInfo(user);
                    
                    console.log('Loading user data...');
                    const firestoreSuccess = await loadChatsFromFirestore();
                    if (!firestoreSuccess) {
                        await loadChatsFromLocalStorage();
                    }
                    
                    const urlChatId = getChatIdFromURL();
                    let chatToLoad = null;
                    
                    if (urlChatId) {
                        const urlChat = state.chats.find(chat => chat.id === urlChatId);
                        if (urlChat) {
                            chatToLoad = urlChatId;
                        } else {
                            await createNewChat(urlChatId);
                            chatToLoad = urlChatId;
                        }
                    } else if (state.chats.length > 0) {
                        chatToLoad = state.chats[0].id;
                    } else {
                        const newChatId = await createNewChat();
                        chatToLoad = newChatId;
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

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    try {
        console.log('Setting up event listeners...');
        
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

        initFileUpload();

        if (elements.logoutBtn) {
            elements.logoutBtn.addEventListener('click', () => {
                auth.signOut().then(() => {
                    window.location.href = 'index.html';
                });
            });
        }

        if (elements.mobileMenu) {
            elements.mobileMenu.addEventListener('click', () => {
                if (elements.sidebar) {
                    elements.sidebar.classList.toggle('open');
                }
            });
        }

        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.chatId) {
                loadChat(event.state.chatId);
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
        
        // Step 1: Wait for DOM elements
        const elementsReady = await initializeElements();
        if (!elementsReady) {
            throw new Error('Failed to initialize DOM elements');
        }
        
        // Step 2: Setup event listeners
        setupEventListeners();
        
        // Step 3: Initialize app with authentication
        await initializeApp();
        
        // Step 4: Show success message
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

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApplication);
} else {
    startApplication();
}

// Global functions for HTML onclick
window.handleSend = handleSend;
window.handleExamplePrompt = handleExamplePrompt;
window.deleteChat = deleteChat;
window.removeFile = removeFile;
window.shareChat = shareChat;

// Manual recovery function
window.reloadApp = () => {
    showNotification('Reloading app...');
    window.location.reload();
};

// Feature placeholders
window.learningChallenges = {
    showChallengesModal: () => alert('Challenges are only for pro users!')
};

window.achievementSystem = {
    showAchievementsModal: () => alert('Achievements are only for pro users!')
};
