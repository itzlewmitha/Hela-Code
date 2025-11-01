// script.js - Firestore per-chat + messages subcollection (Firebase v8 style)

// Make sure firebase SDK scripts are loaded in your HTML (v8 namespaced)
// <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
// <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js"></script>
// <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js"></script>

// Your firebaseConfig should already be initialized elsewhere (or you can include it here)
if (!firebase.apps.length) {
    // If you already call firebase.initializeApp earlier, skip this block.
    // firebase.initializeApp(firebaseConfig);
}

// Services
const auth = firebase.auth();
const db = firebase.firestore();
const FieldValue = firebase.firestore.FieldValue;

// DOM elements (keep same names you used)
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

// API constants (keep as before)
const API_URL = 'https://endpoint.apilageai.lk/api/chat';
const API_KEY = 'apk_QngciclzfHi2yAfP3WvZgx68VbbONQTP';
const MODEL = 'APILAGEAI-PRO';

// State
let currentUser = null;
let chats = []; // metadata list (ordered by updatedAt desc)
let currentChatId = null;
let activeMessagesUnsub = null; // unsubscribe function for current chat messages listener
let chatsUnsub = null; // unsubscribe for chats list listener

// ---------- Initialization ----------

async function initApp() {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
                updateUserInfo(user);
                await loadChats();           // load chats list (no auto new chat)
                listenToChats();             // real-time updates for chat list
                resolve(user);
            } else {
                window.location.href = 'index.html';
            }
        }, reject);
    });
}

function updateUserInfo(user) {
    if (userName) userName.textContent = user.displayName || user.email || 'User';
    if (userAvatar) {
        const initial = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
        userAvatar.textContent = initial;
        if (user.photoURL) {
            userAvatar.style.backgroundImage = `url(${user.photoURL})`;
            userAvatar.style.backgroundSize = 'cover';
            userAvatar.textContent = '';
        }
    }
}

// ---------- Chats list (metadata) ----------

async function loadChats() {
    if (!currentUser) return;

    try {
        const snapshot = await db
            .collection('users')
            .doc(currentUser.uid)
            .collection('chats')
            .orderBy('updatedAt', 'desc')
            .limit(50)
            .get();

        chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Do NOT auto-create a new chat. If chats available, load the latest; otherwise show welcome screen.
        if (chats.length > 0) {
            // Keep currentChatId if it's already set and still exists; otherwise pick the most recent.
            if (!currentChatId || !chats.find(c => c.id === currentChatId)) {
                currentChatId = chats[0].id;
            }
            await loadChat(currentChatId);
        } else {
            currentChatId = null;
            if (chatMessages) chatMessages.innerHTML = '';
            if (welcomeScreen) welcomeScreen.style.display = 'flex';
            if (chatTitle) chatTitle.textContent = 'Welcome';
        }

        updateChatHistorySidebar();
    } catch (err) {
        console.error('loadChats error', err);
        showNotification('Unable to load chats. Check your connection.');
    }
}

function listenToChats() {
    if (!currentUser) return;

    // Clean previous listener if any
    if (chatsUnsub) chatsUnsub();

    chatsUnsub = db
        .collection('users')
        .doc(currentUser.uid)
        .collection('chats')
        .orderBy('updatedAt', 'desc')
        .limit(100)
        .onSnapshot(snapshot => {
            chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateChatHistorySidebar();
            // If we have a current chat selected but its metadata changed, update title
            const currentMeta = chats.find(c => c.id === currentChatId);
            if (currentMeta && chatTitle) chatTitle.textContent = currentMeta.title || 'Chat';
        }, err => {
            console.error('listenToChats snapshot error', err);
        });
}

// ---------- Create chat (metadata doc only) ----------

async function createNewChat() {
    if (!currentUser) return null;

    try {
        const chatsCol = db.collection('users').doc(currentUser.uid).collection('chats');
        const newDocRef = chatsCol.doc(); // auto id
        const now = new Date().toISOString();
        const newChat = {
            title: 'New Chat',
            createdAt: now,
            updatedAt: now
        };
        await newDocRef.set(newChat);
        // local insert at head (real-time listener will also update)
        chats.unshift({ id: newDocRef.id, ...newChat });
        currentChatId = newDocRef.id;
        updateChatHistorySidebar();
        return newDocRef.id;
    } catch (err) {
        console.error('createNewChat error', err);
        showNotification('Could not create chat. Try again.');
        return null;
    }
}

// ---------- Messages: add / listen / load ----------

async function addMessageToChat(chatId, sender, content) {
    if (!currentUser || !chatId) return;

    try {
        const messagesCol = db
            .collection('users')
            .doc(currentUser.uid)
            .collection('chats')
            .doc(chatId)
            .collection('messages');

        const now = new Date().toISOString();
        const messageDoc = {
            sender, // 'user' or 'ai'
            content,
            timestamp: now
        };

        // Add message document
        await messagesCol.add(messageDoc);

        // Update chat metadata updatedAt, and set title if was 'New Chat' and sender is user
        const chatRef = db.collection('users').doc(currentUser.uid).collection('chats').doc(chatId);
        const metaUpdate = { updatedAt: now };
        // If chat metadata says title 'New Chat' and this is the first user message, set a short title
        // We can't reliably check "first message" here, but we can try to set title if it's still New Chat
        const chatSnap = await chatRef.get();
        if (chatSnap.exists) {
            const meta = chatSnap.data();
            if ((meta.title === 'New Chat' || !meta.title) && sender === 'user') {
                const shortTitle = content.length > 30 ? content.slice(0, 30) + '...' : content;
                metaUpdate.title = shortTitle;
            }
        }

        await chatRef.set(metaUpdate, { merge: true });

    } catch (err) {
        console.error('addMessageToChat error', err);
        showNotification('Failed to save message. Check connection.');
    }
}

function startListeningMessages(chatId) {
    if (!currentUser || !chatId) return;

    // unsubscribe previous messages listener
    if (activeMessagesUnsub) activeMessagesUnsub();

    const messagesRef = db
        .collection('users')
        .doc(currentUser.uid)
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('timestamp', 'asc');

    activeMessagesUnsub = messagesRef.onSnapshot(snapshot => {
        if (chatMessages) chatMessages.innerHTML = '';
        snapshot.docs.forEach(doc => {
            const m = doc.data();
            if (m.sender === 'user') addMessage('user', m.content, false);
            else addMessage('ai', m.content, false);
        });
        // hide welcome when messages present
        if (welcomeScreen) welcomeScreen.style.display = 'none';
        scrollToBottom();
    }, err => {
        console.error('messages listener error', err);
    });
}

async function loadChat(chatId) {
    if (!currentUser || !chatId) return;

    try {
        currentChatId = chatId;
        // fetch metadata (so we have title)
        const chatRef = db.collection('users').doc(currentUser.uid).collection('chats').doc(chatId);
        const metaSnap = await chatRef.get();
        if (metaSnap.exists) {
            const meta = metaSnap.data();
            if (chatTitle) chatTitle.textContent = meta.title || 'Chat';
        }

        // Start listening to messages live (and populate UI)
        startListeningMessages(chatId);

        updateChatHistorySidebar();
    } catch (err) {
        console.error('loadChat error', err);
    }
}

// ---------- Delete Chat ----------

async function deleteChat(chatId, event) {
    if (event) event.stopPropagation();
    if (!currentUser || !chatId) return;

    if (!confirm('Are you sure you want to delete this chat?')) return;

    try {
        // delete all messages in subcollection in a simple batched loop
        const messagesCol = db.collection('users').doc(currentUser.uid).collection('chats').doc(chatId).collection('messages');
        const msgsSnap = await messagesCol.get();
        const batch = db.batch();
        msgsSnap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();

        // delete chat doc
        await db.collection('users').doc(currentUser.uid).collection('chats').doc(chatId).delete();

        // cleanup local state
        chats = chats.filter(c => c.id !== chatId);
        if (currentChatId === chatId) {
            if (activeMessagesUnsub) { activeMessagesUnsub(); activeMessagesUnsub = null; }
            if (chats.length > 0) {
                currentChatId = chats[0].id;
                await loadChat(currentChatId);
            } else {
                currentChatId = null;
                if (chatMessages) chatMessages.innerHTML = '';
                if (welcomeScreen) welcomeScreen.style.display = 'flex';
                if (chatTitle) chatTitle.textContent = 'Welcome';
            }
        }

        updateChatHistorySidebar();
    } catch (err) {
        console.error('deleteChat error', err);
        showNotification('Failed to delete chat.');
    }
}

// ---------- UI: Chat history sidebar ----------

function updateChatHistorySidebar() {
    if (!chatHistory) return;
    chatHistory.innerHTML = '';

    if (!chats || chats.length === 0) {
        chatHistory.innerHTML = '<div class="no-chats">No conversations yet</div>';
        return;
    }

    chats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
        chatItem.innerHTML = `
            <span class="chat-item-icon">💬</span>
            <span class="chat-item-title">${escapeHTML(chat.title || 'New Chat')}</span>
            <button class="delete-chat" title="Delete chat">🗑️</button>
        `;

        // open chat when clicking anywhere except delete button
        chatItem.addEventListener('click', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('delete-chat')) {
                deleteChat(chat.id, e);
                return;
            }
            loadChat(chat.id);
            if (window.innerWidth <= 768 && sidebar) sidebar.classList.remove('open');
        });

        chatHistory.appendChild(chatItem);
    });
}

// ---------- UI: Messages display ----------

function addMessage(sender, text, saveToFirestore = true) {
    // saveToFirestore parameter used by live listener false to avoid duplication
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
        // formatted content could be added here if needed; using plain text for consistency with stored messages
        messageBubble.textContent = text;
    } else {
        messageBubble.textContent = text;
    }

    messageContent.appendChild(messageBubble);
    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);
    scrollToBottom();

    // Only persist if requested (we persist via addMessageToChat which writes to Firestore)
    // The caller (handleSend and AI reply flow) will call addMessageToChat separately.
}

// ---------- Message sending flow ----------

async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Create a new chat only when user sends first message and no chat exists
    if (!currentChatId) {
        const newChatId = await createNewChat();
        if (!newChatId) {
            showNotification('Could not create chat. Try again.');
            return;
        }
        currentChatId = newChatId;
        // start listening messages for this new chat
        startListeningMessages(currentChatId);
    }

    // Add and save user message
    addMessage('user', text, false); // local UI immediately
    await addMessageToChat(currentChatId, 'user', text);
    chatInput.value = '';
    autoResizeTextarea();

    // Show typing indicator
    showTyping();

    try {
        // Get AI reply
        const reply = await callAI(text);

        // Persist AI reply
        await addMessageToChat(currentChatId, 'ai', reply);
        // hide typing will be handled by messages listener once AI message saved; still remove typing here
        removeTyping();
    } catch (err) {
        console.error('handleSend AI error', err);
        removeTyping();
        const errorMsg = "I'm having trouble responding right now. Please try again.";
        await addMessageToChat(currentChatId, 'ai', errorMsg);
    }
}

// ---------- Call AI API (unchanged behavior) ----------

async function callAI(userMessage) {
    try {
        const context = await getConversationContextForAI();

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
        if (data.response) return data.response;
        return "I apologize, but I received an unexpected response format. Please try again.";
    } catch (err) {
        console.error('callAI error', err);
        throw err;
    }
}

// Build a short conversation context from recent messages to send to AI
async function getConversationContextForAI() {
    if (!currentUser || !currentChatId) return '';

    try {
        const msgsSnap = await db
            .collection('users')
            .doc(currentUser.uid)
            .collection('chats')
            .doc(currentChatId)
            .collection('messages')
            .orderBy('timestamp', 'desc')
            .limit(6)
            .get();

        // reverse to chronological
        const messages = msgsSnap.docs.map(d => d.data()).reverse();
        let context = 'Conversation history:\n';
        messages.forEach(m => {
            const role = m.sender === 'user' ? 'User' : 'Assistant';
            context += `${role}: ${m.content}\n`;
        });
        return context;
    } catch (err) {
        console.error('getConversationContextForAI error', err);
        return '';
    }
}

// ---------- Helpers: formatting, typing, scrolling ----------

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
    const t = document.getElementById('typing-indicator');
    if (t) t.remove();
}

function scrollToBottom() {
    if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
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
    const n = document.createElement('div');
    n.className = 'notification copied-notification';
    n.textContent = message;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 2000);
}

// Auto-resize textarea
function autoResizeTextarea() {
    if (chatInput) {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    }
}

// ---------- DOM events + init ----------

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (sendBtn) sendBtn.addEventListener('click', handleSend);
        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
            });
            chatInput.addEventListener('input', autoResizeTextarea);
        }
        if (newChatBtn) newChatBtn.addEventListener('click', async () => {
            // If the user explicitly clicks New Chat, create one
            const newId = await createNewChat();
            if (newId) loadChat(newId);
        });
        if (logoutBtn) logoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => window.location.href = 'index.html');
        });
        if (mobileMenu) mobileMenu.addEventListener('click', () => {
            if (sidebar) sidebar.classList.toggle('open');
        });

        await initApp();
    } catch (err) {
        console.error('Initialization error', err);
        showNotification('Failed to initialize. Refresh the page.');
    }
});

// Expose some functions globally used in HTML
window.handleSend = handleSend;
window.deleteChat = deleteChat;
window.handleExamplePrompt = (prompt) => {
    if (chatInput) {
        chatInput.value = prompt;
        handleSend();
    }
};

// Simple placeholders (unchanged)
window.learningChallenges = { showChallengesModal: function() { alert('Learning Challenges feature coming soon!'); } };
window.achievementSystem = { showAchievementsModal: function() { alert('Achievements feature coming soon!'); } };
window.voiceAssistant = { toggleListening: function() { alert('Voice input feature coming soon!'); } };
