const chatBox = document.getElementById('chat');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const greetingSection = document.getElementById('greetingSection');

const API_URL = 'https://endpoint.apilageai.lk/api/chat';
const API_KEY = 'apk_QngciclzfHi2yAfP3WvZgx68VbbONQTP';
const MODEL = 'APILAGEAI-FREE';

// Chat history management
let currentChatId = null;
let chats = [];

// Initialize chat history
function initChatHistory() {
    const savedChats = localStorage.getItem('helaChatHistory');
    if (savedChats) {
        chats = JSON.parse(savedChats);
    }
    
    // Create new chat if no chats exist or no current chat
    if (chats.length === 0 || !currentChatId) {
        createNewChat();
    } else {
        // Load the most recent chat
        currentChatId = chats[0].id;
        loadChat(currentChatId);
    }
}

// Create a new chat
function createNewChat() {
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
    
    // Clear chat interface
    if (chatBox) chatBox.innerHTML = '';
    if (greetingSection) greetingSection.style.display = 'flex';
    
    // Update chat history sidebar
    updateChatHistorySidebar();
    
    return newChat.id;
}

// Save chats to localStorage
function saveChats() {
    localStorage.setItem('helaChatHistory', JSON.stringify(chats));
}

// Update chat title based on first message
function updateChatTitle(chatId, firstMessage) {
    const chat = chats.find(c => c.id === chatId);
    if (chat && chat.title === 'New Chat') {
        // Create a title from the first message (max 30 chars)
        const title = firstMessage.length > 30 
            ? firstMessage.substring(0, 30) + '...' 
            : firstMessage;
        chat.title = title;
        chat.updatedAt = new Date().toISOString();
        saveChats();
        updateChatHistorySidebar();
    }
}

// Add message to current chat
function addMessageToChat(sender, text) {
    if (!currentChatId) return;
    
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
        chat.messages.push({
            type: sender,
            content: text,
            timestamp: new Date().toISOString()
        });
        
        chat.updatedAt = new Date().toISOString();
        saveChats();
        
        // Update title if this is the first user message
        if (sender === 'user' && chat.messages.length === 1) {
            updateChatTitle(currentChatId, text);
        }
    }
}

// Load a specific chat
function loadChat(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    currentChatId = chatId;
    
    // Clear current chat display
    if (chatBox) chatBox.innerHTML = '';
    if (greetingSection) greetingSection.style.display = 'none';
    
    // Load all messages
    chat.messages.forEach(msg => {
        if (msg.type === 'user') {
            addMessage('user', msg.content);
        } else {
            if (isCodeBlock(msg.content)) {
                const match = msg.content.match(/([\s\S]*?)```(\w+)?\n?([\s\S]*?)```([\s\S]*)/);
                if (match) {
                    const before = match[1].trim();
                    const lang = match[2] || '';
                    const code = match[3];
                    const after = match[4].trim();
                    if (before) addMessage('ai', before);
                    appendCodeMessage('ai', code, lang);
                    if (after) addMessage('ai', after);
                } else {
                    appendCodeMessage('ai', msg.content);
                }
            } else {
                addMessage('ai', msg.content);
            }
        }
    });
    
    scrollToBottom();
    updateChatHistorySidebar();
}

// Update chat history sidebar
function updateChatHistorySidebar() {
    const chatHistoryContainer = document.getElementById('chatHistory');
    if (!chatHistoryContainer) return;
    
    chatHistoryContainer.innerHTML = '';
    
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
                
                // Close sidebar on mobile
                if (window.innerWidth <= 768) {
                    const sidebar = document.getElementById('sidebar');
                    const overlay = document.getElementById('overlay');
                    if (sidebar) sidebar.classList.remove('open');
                    if (overlay) overlay.classList.remove('open');
                }
            }
        });
        
        chatHistoryContainer.appendChild(chatItem);
    });
}

// Delete a chat
function deleteChat(chatId, event) {
    event.stopPropagation();
    
    if (confirm('Are you sure you want to delete this chat?')) {
        chats = chats.filter(chat => chat.id !== chatId);
        
        if (currentChatId === chatId) {
            if (chats.length > 0) {
                currentChatId = chats[0].id;
                loadChat(currentChatId);
            } else {
                createNewChat();
            }
        }
        
        saveChats();
        updateChatHistorySidebar();
    }
}

// Check if elements exist before adding event listeners
if (sendBtn && input) {
    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });
}

async function handleSend() {
    const text = input.value.trim();
    if (!text) return;
    
    // Create new chat if none exists
    if (!currentChatId || chats.length === 0) {
        createNewChat();
    }
    
    if (greetingSection) greetingSection.style.display = 'none';

    addMessage('user', text);
    addMessageToChat('user', text);
    input.value = '';

    const lowerMsg = text.toLowerCase();

    if (/^(hi|hello|hey|hy|hiya)\b/i.test(lowerMsg))
        return liveTypeAI("Hey there 👋 Ready to write, debug, and explore some programming today?");
    if (/thank\s*you|thanks|thx/i.test(lowerMsg))
        return liveTypeAI("You're welcome! 🙌 Always happy to help with code.");
    if (/who\s*are\s*you|what\s*are\s*you|your\s*name|who\s*made\s*you/i.test(lowerMsg))
        return liveTypeAI("Hela Code — created by Lewmitha Kithuldeniya using the Apilage AI API.");
    if (!isCodeRelated(text))
        return liveTypeAI("I only respond to coding or debugging questions.");

    showTyping();
    const reply = await askAI(text);
    removeTyping();

    if (isCodeBlock(reply)) {
        const match = reply.match(/([\s\S]*?)```(\w+)?\n?([\s\S]*?)```([\s\S]*)/);
        if (match) {
            const before = match[1].trim();
            const lang = match[2] || '';
            const code = match[3];
            const after = match[4].trim();
            if (before) {
                liveTypeAI(before);
                addMessageToChat('ai', before);
            }
            appendCodeMessage('ai', code, lang);
            addMessageToChat('ai', `\`\`\`${lang}\n${code}\n\`\`\``);
            if (after) {
                liveTypeAI(after);
                addMessageToChat('ai', after);
            }
        } else {
            appendCodeMessage('ai', reply);
            addMessageToChat('ai', `\`\`\`\n${reply}\n\`\`\``);
        }
    } else {
        liveTypeAI(reply);
        addMessageToChat('ai', reply);
    }
}

// --- Helpers ---
function addMessage(sender, text) {
    if (!chatBox) return;
    
    const msg = document.createElement('div');
    msg.classList.add('message', sender);
    const bubble = document.createElement('div');
    bubble.classList.add('bubble');
    bubble.innerHTML = escapeHTML(text);
    msg.appendChild(bubble);
    chatBox.appendChild(msg);
    scrollToBottom();
}

function appendCodeMessage(sender, code, lang = '') {
    if (!chatBox) return;
    
    const msg = document.createElement('div');
    msg.className = `message ${sender}`;
    msg.innerHTML = `
        <div class="bubble code-bubble">
            <pre><code class="${lang}"></code></pre>
            <button class="copy-btn">Copy</button>
        </div>`;
    chatBox.appendChild(msg);

    const codeElem = msg.querySelector('code');
    codeElem.textContent = code;

    msg.querySelector('.copy-btn').onclick = () => {
        navigator.clipboard.writeText(code);
        showCopiedNotification();
    };

    scrollToBottom();
}

function liveTypeAI(text) {
    if (!chatBox) return;
    
    const msg = document.createElement('div');
    msg.classList.add('message', 'ai');
    const bubble = document.createElement('div');
    bubble.classList.add('bubble');
    msg.appendChild(bubble);
    chatBox.appendChild(msg);

    let i = 0;
    (function type() {
        if (i <= text.length) {
            bubble.innerHTML = escapeHTML(text.slice(0, i));
            scrollToBottom();
            i++;
            setTimeout(type, 20);
        }
    })();
}

function showTyping() {
    removeTyping();
    if (!chatBox) return;
    
    const t = document.createElement('div');
    t.className = 'message ai';
    t.id = 'typing-indicator';
    t.innerHTML = `<div class="bubble">...</div>`;
    chatBox.appendChild(t);
    scrollToBottom();
}

function removeTyping() {
    const t = document.getElementById('typing-indicator');
    if (t) t.remove();
}

function scrollToBottom() {
    if (chatBox) {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

function isCodeRelated(text) {
    const words = ['code','function','python','javascript','java','html','css','bug','debug','error','loop','if','else','return','const','let','sql','fix','print','output'];
    return /```[\s\S]*?```/.test(text) || words.some(w => text.toLowerCase().includes(w));
}

function isCodeBlock(text) { return /```[\s\S]*?```/.test(text); }

function escapeHTML(s) {
    return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

async function askAI(msg) {
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {'Content-Type':'application/json','Authorization':`Bearer ${API_KEY}`},
            body: JSON.stringify({ message: msg, model: MODEL })
        });
        const data = await res.json();
        return data.response || 'No response';
    } catch (err) {
        console.error(err);
        return 'Error connecting to AI';
    }
}

function showCopiedNotification() {
    const notif = document.createElement('div');
    notif.className = 'copied-notification';
    notif.textContent = 'Copied!';
    document.body.appendChild(notif);
    setTimeout(() => notif.classList.add('hide'), 1000);
    setTimeout(() => notif.remove(), 1600);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initChatHistory();
});
