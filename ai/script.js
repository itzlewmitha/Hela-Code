const chat = document.getElementById('chat');
const input = document.getElementById('input');
const send = document.getElementById('send');

const API_URL = 'https://endpoint.apilageai.lk/api/chat';
const API_KEY = 'apk_QngciclzfHi2yAfP3WvZgx68VbbONQTP';
const MODEL = 'APILAGEAI-FREE';

send.addEventListener('click', handleSend);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

async function handleSend() {
  const userMessage = input.value.trim();
  if (!userMessage) return;

  appendMessage('user', userMessage);
  input.value = '';

  const lowerMsg = userMessage.toLowerCase();

  // --- GREETING ---
  if (/^(hi|hello|hey|hy|hii|hiii|heyy|hiya)\b/i.test(lowerMsg)) {
    liveTypeAI("Hey there 👋 Ready to write, debug, and explore some programming today?");
    scrollChatToBottom();
    return;
  }

  // --- THANK YOU ---
  if (/thank\s*you|thanks|thx|ty/i.test(lowerMsg)) {
    liveTypeAI("You're welcome! 🙌 Always happy to help with code.");
    scrollChatToBottom();
    return;
  }

  // --- WHO ARE YOU / WHO MADE YOU ---
  if (/who\s*are\s*you|what\s*are\s*you|your\s*name|who\s*made\s*you/i.test(lowerMsg)) {
    liveTypeAI("Hela Code — created by Lewmitha Kithuldeniya using the Apilage AI API.");
    scrollChatToBottom();
    return;
  }

  // --- CODE CHECK ---
  if (!isCodeRelated(userMessage)) {
    liveTypeAI("I only respond to coding or debugging questions.");
    scrollChatToBottom();
    return;
  }

  showTyping();
  const botMessage = await askAI(userMessage);
  removeTyping();

  if (isCodeBlock(botMessage)) {
    const match = botMessage.match(/([\s\S]*?)```(\w+)?\n?([\s\S]*?)```([\s\S]*)/);
    if (match) {
      const before = match[1].trim();
      const lang = match[2] || '';
      const code = match[3];
      const after = match[4].trim();

      if (before) liveTypeAI(before);
      appendCodeMessage('ai', `\`\`\`${lang}\n${code}\`\`\``);
      if (after) liveTypeAI(after);
    } else {
      appendCodeMessage('ai', botMessage);
    }
  } else {
    liveTypeAI(botMessage);
  }

  scrollChatToBottom();
}

// ---------- UTILITIES ----------
function isCodeRelated(text) {
  const keywords = [
    'code','function','class','variable','python','javascript','java','c++','c#','html','css',
    'react','node','algorithm','array','loop','if','else','for','while','def','return','import',
    'export','const','let','var','sql','query','bash','shell','script','json','xml','regex',
    'compile','run','execute','error','bug','fix','debug','print','log','output','input',
    'stdin','stdout','file','read','write','save'
  ];
  if (/```[\s\S]*?```/.test(text)) return true;
  return keywords.some(word => text.toLowerCase().includes(word));
}

function isCodeBlock(text) {
  return /```[\s\S]*?```/.test(text);
}

function appendMessage(sender, text) {
  const msg = document.createElement('div');
  msg.className = `message ${sender}`;
  if (sender === 'user') {
    msg.innerHTML = `<div class="bubble"><pre>${escapeHTML(text)}</pre></div>`;
  } else {
    msg.innerHTML = `<div class="bubble">${escapeHTML(text)}</div>`;
  }
  chat.appendChild(msg);
  scrollChatToBottom();
}

function appendCodeMessage(sender, text) {
  const match = text.match(/```(\w+)?\n?([\s\S]*?)```/);
  let code = '', lang = '';
  if (match) {
    lang = match[1] || '';
    code = match[2];
  } else {
    code = text;
  }

  const msg = document.createElement('div');
  msg.className = `message ${sender}`;
  msg.innerHTML = `
    <div class="bubble code-bubble">
      <pre><code class="${lang}"></code></pre>
      <button class="copy-btn">Copy</button>
    </div>
  `;
  chat.appendChild(msg);
  scrollChatToBottom();

  const codeElem = msg.querySelector('code');
  const lines = code.split('\n');
  let i = 0;
  function typeLine() {
    if (i < lines.length) {
      codeElem.innerHTML += (i > 0 ? '\n' : '') + escapeHTML(lines[i]);
      scrollChatToBottom();
      i++;
      setTimeout(typeLine, 60 + Math.random() * 80);
    }
  }
  typeLine();

  msg.querySelector('.copy-btn').onclick = () => {
    navigator.clipboard.writeText(code);
    showCopiedNotification();
  };
}

function showCopiedNotification() {
  let notif = document.createElement('div');
  notif.id = 'copied-notification';
  notif.textContent = 'Copied!';
  notif.className = 'copied-notification';
  document.body.appendChild(notif);
  setTimeout(() => {
    notif.classList.add('hide');
    setTimeout(() => notif.remove(), 400);
  }, 1200);
}

function showTyping() {
  removeTyping();
  const typing = document.createElement('div');
  typing.className = 'message ai typing';
  typing.innerHTML = `<div class="bubble"><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></div>`;
  typing.id = 'typing-indicator';
  chat.appendChild(typing);
  scrollChatToBottom();
}

function removeTyping() {
  const typing = document.getElementById('typing-indicator');
  if (typing) typing.remove();
}

function liveTypeAI(text) {
  removeTyping();
  const msg = document.createElement('div');
  msg.className = 'message ai';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  msg.appendChild(bubble);
  chat.appendChild(msg);
  scrollChatToBottom();

  let i = 0;
  function typeChar() {
    if (i <= text.length) {
      bubble.innerHTML = escapeHTML(text.slice(0, i));
      scrollChatToBottom();
      i++;
      setTimeout(typeChar, 18 + Math.random() * 30);
    }
  }
  typeChar();
}

let autoScroll = true;
chat.addEventListener('scroll', () => {
  autoScroll = chat.scrollTop + chat.clientHeight >= chat.scrollHeight - 40;
});

function scrollChatToBottom() {
  if (autoScroll) chat.scrollTop = chat.scrollHeight;
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

async function askAI(message) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({ message, enableGoogleSearch: false, model: MODEL })
    });
    const data = await res.json();
    return data.response || 'No response';
  } catch (err) {
    console.error(err);
    return 'Error connecting to AI';
  }
}
