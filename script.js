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

// Enable offline persistence for better cross-device experience
db.enablePersistence()
  .catch((err) => {
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

// API Configuration
const API_URL = 'https://endpoint.apilageai.lk/api/chat';
const API_KEY = 'apk_QngciclzfHi2yAfP3WvZgx68VbbONQTP';
const MODEL = 'APILAGEAI-PRO';

// Chat management
let currentChatId = null;
let chats = [];
let currentUser = null;
let uploadedFiles = [];

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

// Save chat to Firestore with retry logic
async function saveChatToFirestore(chat) {
    const maxRetries = 3;
    let retries = 0;
    
    while (retries < maxRetries) {
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
            
            console.log('Chat saved to Firestore:', chat.id);
            return;
        } catch (error) {
            retries++;
            console.error(`Attempt ${retries} failed to save chat:`, error);
            
            if (retries === maxRetries) {
                console.error('All retries failed, saving to local storage');
                saveChatsToLocalStorage();
                throw error;
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
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
        console.log('Chat deleted from Firestore:', chatId);
    } catch (error) {
        console.error('Error deleting chat from Firestore:', error);
        // Don't throw error for delete operations
    }
}

// Load chats from Firestore with fallback
async function loadChats() {
    try {
        console.log('Loading chats from Firestore for user:', currentUser.uid);
        
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

        // If no chats in Firestore, try local storage
        if (chats.length === 0) {
            await loadChatsFromLocalStorage();
        }

        if (chats.length === 0 || !currentChatId) {
            await createNewChat();
        } else {
            currentChatId = chats[0].id;
            await loadChat(currentChatId);
        }
        
        updateChatHistorySidebar();
        
    } catch (error) {
        console.error('Error loading chats from Firestore:', error);
        // Fallback to local storage
        await loadChatsFromLocalStorage();
    }
}

// Load chats from local storage
async function loadChatsFromLocalStorage() {
    try {
        const savedChats = localStorage.getItem(`helaChats_${currentUser.uid}`);
        if (savedChats) {
            chats = JSON.parse(savedChats);
            console.log('Loaded', chats.length, 'chats from local storage');
        } else {
            chats = [];
        }

        if (chats.length === 0) {
            await createNewChat();
        } else {
            currentChatId = chats[0].id;
            await loadChat(currentChatId);
        }
    } catch (error) {
        console.error('Error loading chats from local storage:', error);
        await createNewChat();
    }
}

// Save chats to local storage
function saveChatsToLocalStorage() {
    if (!currentUser) return;
    try {
        localStorage.setItem(`helaChats_${currentUser.uid}`, JSON.stringify(chats));
        console.log('Chats saved to local storage');
    } catch (error) {
        console.error('Error saving to local storage:', error);
    }
}

// Create a new chat
async function createNewChat() {
    const newChat = {
        id: generateChatId(),
        title: 'New Chat',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    chats.unshift(newChat);
    currentChatId = newChat.id;
    
    // Save to Firestore
    try {
        await saveChatToFirestore(newChat);
    } catch (error) {
        console.error('Failed to save to Firestore, using local storage only');
        saveChatsToLocalStorage();
    }
    
    if (chatMessages) chatMessages.innerHTML = '';
    if (welcomeScreen) welcomeScreen.style.display = 'flex';
    if (chatTitle) chatTitle.textContent = 'New Chat';
    
    updateChatHistorySidebar();
    return newChat.id;
}

// Generate unique chat ID
function generateChatId() {
    return Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
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
        
        // Update in Firestore
        try {
            await saveChatToFirestore(chat);
        } catch (error) {
            console.error('Failed to update chat title in Firestore:', error);
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
        
        // Keep only last 50 messages to prevent large documents
        if (chat.messages.length > 50) {
            chat.messages = chat.messages.slice(-50);
        }
        
        chat.updatedAt = new Date().toISOString();
        
        // Save to Firestore
        try {
            await saveChatToFirestore(chat);
        } catch (error) {
            console.error('Failed to save message to Firestore:', error);
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
        
        // Delete from Firestore
        try {
            await deleteChatFromFirestore(chatId);
        } catch (error) {
            console.error('Failed to delete from Firestore:', error);
        }
        
        // Always update local storage
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

// FILE UPLOAD FUNCTIONS
function initFileUpload() {
    if (fileBtn && fileInput) {
        fileBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', handleFileSelect);
    }
}

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    files.forEach(file => {
        readFileContent(file);
    });

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
            console.error('Error reading file:', error);
            showFileError(file, 'Unable to read file content');
        }
    };

    reader.onerror = function() {
        showFileError(file, 'Error reading file');
    };

    reader.readAsText(file);
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

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        console.error('Error getting AI response:', error);
        removeTyping();
        
        const errorMessage = "I'm having trouble responding right now. Please try again.";
        displayAIResponse(errorMessage);
        await addMessageToChat('ai', errorMessage);
    }
}

// [Rest of the functions remain the same - handleExamplePrompt, callAI, getConversationContext, updateChatHistorySidebar, addMessage, displayAIResponse, formatResponse, createCodeBlock, showTyping, removeTyping, scrollToBottom, escapeHTML, showNotification, autoResizeTextarea]

// ... [Include all the remaining functions from the previous script.js exactly as they were] ...

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

        initFileUpload();

        if (newChatBtn) newChatBtn.addEventListener('click', createNewChat);

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
