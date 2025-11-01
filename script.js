<!-- Include Firebase compat SDKs -->
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>

<script>
// ===================== FIREBASE CONFIG =====================
const firebaseConfig = {
    apiKey: "AIzaSyAkZ1COLT59ukLGzpv5lW3UZ8vQ9tEN1gw",
    authDomain: "hela-code.firebaseapp.com",
    projectId: "hela-code",
    storageBucket: "hela-code.appspot.com",
    messagingSenderId: "813299203715",
    appId: "1:813299203715:web:910e7227cdd4a09ad1a5b6"
};

// Initialize Firebase (prevent reinit)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// ===================== DOM ELEMENTS =====================
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const welcomeScreen = document.getElementById('welcomeScreen');
const newChatBtn = document.getElementById('newChatBtn');
const logoutBtn = document.getElementById('logoutBtn');
const chatHistory = document.getElementById('chatHistory');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const chatTitle = document.getElementById('chatTitle');
const sidebar = document.getElementById('sidebar');
const mobileMenu = document.getElementById('mobileMenu');

// ===================== API CONFIG =====================
const API_URL = 'https://endpoint.apilageai.lk/api/chat';
const API_KEY = 'apk_QngciclzfHi2yAfP3WvZgx68VbbONQTP';
const MODEL = 'APILAGEAI-PRO';

// ===================== VARIABLES =====================
let currentUser = null;
let currentChatId = null;
let chats = [];

// ===================== INIT APP =====================
async function initApp() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            updateUserInfo(user);
            await loadChats();
        } else {
            window.location.href = 'index.html';
        }
    });
}

// ===================== LOAD & SAVE CHATS =====================
async function loadChats() {
    const userRef = db.collection('users').doc(currentUser.uid);
    const chatsRef = userRef.collection('chats');

    const snapshot = await chatsRef.orderBy('updatedAt', 'desc').get();
    chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (chats.length > 0) {
        currentChatId = chats[0].id;
        await loadChat(currentChatId);
    } else {
        if (welcomeScreen) welcomeScreen.style.display = 'flex';
    }

    updateChatHistorySidebar();
}

async function saveChat(chat) {
    const userRef = db.collection('users').doc(currentUser.uid);
    const chatRef = userRef.collection('chats').doc(chat.id);
    await chatRef.set(chat);
}

// ===================== CHAT CREATION =====================
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
    await saveChat(newChat);

    if (chatMessages) chatMessages.innerHTML = '';
    if (chatTitle) chatTitle.textContent = 'New Chat';
    if (welcomeScreen) welcomeScreen.style.display = 'flex';

    updateChatHistorySidebar();
    return newChat.id;
}

// ===================== LOAD CHAT =====================
async function loadChat(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    currentChatId = chatId;
    chatMessages.innerHTML = '';
    if (chatTitle) chatTitle.textContent = chat.title;
    if (welcomeScreen) welcomeScreen.style.display = 'none';

    chat.messages.forEach(msg => {
        if (msg.type === 'user') addMessage('user', msg.content);
        else displayAIResponse(msg.content);
    });

    scrollToBottom();
}

// ===================== MESSAGE HANDLING =====================
async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';

    if (!currentChatId) await createNewChat();

    addMessage('user', text);
    await addMessageToChat('user', text);

    showTyping();

    try {
        const reply = await callAI(text);
        removeTyping();
        displayAIResponse(reply);
        await addMessageToChat('ai', reply);
    } catch {
        removeTyping();
        displayAIResponse("⚠️ I'm having trouble responding right now.");
    }
}

async function addMessageToChat(sender, text) {
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;

    chat.messages.push({
        type: sender,
        content: text,
        timestamp: new Date().toISOString()
    });

    chat.updatedAt = new Date().toISOString();
    if (chat.title === 'New Chat' && sender === 'user')
        chat.title = text.substring(0, 30);

    await saveChat(chat);
    updateChatHistorySidebar();
}

// ===================== CALL AI =====================
async function callAI(userMessage) {
    const context = getConversationContext();
    const messageToSend = `
You are Hela Code, an AI programming assistant created by Lewmitha Kithuldeniya (Pix Studios Sri Lanka) using Apilage AI API.

${context}
User: ${userMessage}
Assistant:
`;

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({ message: messageToSend, model: MODEL })
    });

    const data = await response.json();
    return data.response || "Sorry, unexpected response.";
}

function getConversationContext() {
    if (!currentChatId) return '';
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return '';
    const msgs = chat.messages.slice(-6);
    return msgs.map(m => `${m.type === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
}

// ===================== UI UPDATES =====================
function updateUserInfo(user) {
    userName.textContent = user.displayName || user.email;
    userAvatar.textContent = (user.displayName || user.email || 'U')[0].toUpperCase();
}

function updateChatHistorySidebar() {
    chatHistory.innerHTML = '';
    if (!chats.length) {
        chatHistory.innerHTML = '<div class="no-chats">No chats yet</div>';
        return;
    }

    chats.forEach(chat => {
        const div = document.createElement('div');
        div.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
        div.innerHTML = `
            <span class="chat-item-icon">💬</span>
            <span class="chat-item-title">${chat.title}</span>
        `;
        div.onclick = () => loadChat(chat.id);
        chatHistory.appendChild(div);
    });
}

// ===================== MESSAGE DISPLAY =====================
function addMessage(sender, text) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    div.innerHTML = `<div class="message-bubble">${text}</div>`;
    chatMessages.appendChild(div);
    scrollToBottom();
}

function displayAIResponse(content) {
    const div = document.createElement('div');
    div.className = 'message ai';
    div.innerHTML = `<div class="message-bubble ai-bubble">${content}</div>`;
    chatMessages.appendChild(div);
    scrollToBottom();
}

function showTyping() {
    removeTyping();
    const div = document.createElement('div');
    div.id = 'typing-indicator';
    div.className = 'message ai';
    div.innerHTML = `<div class="message-bubble ai-bubble"><div class="typing-dots"><div></div><div></div><div></div></div></div>`;
    chatMessages.appendChild(div);
    scrollToBottom();
}

function removeTyping() {
    const t = document.getElementById('typing-indicator');
    if (t) t.remove();
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ===================== EVENT LISTENERS =====================
document.addEventListener('DOMContentLoaded', async () => {
    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });
    newChatBtn.addEventListener('click', createNewChat);
    logoutBtn.addEventListener('click', () => auth.signOut());
    mobileMenu.addEventListener('click', () => sidebar.classList.toggle('open'));
    initApp();
});
</script>
