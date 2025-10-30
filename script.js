const chatBox = document.getElementById('chat');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const greetingSection = document.getElementById('greetingSection');

const API_URL = 'https://endpoint.apilageai.lk/api/chat';
const API_KEY = 'apk_QngciclzfHi2yAfP3WvZgx68VbbONQTP';
const MODEL = 'APILAGEAI-FREE';

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
  if (greetingSection) greetingSection.style.display = 'none';

  addMessage('user', text);
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
      if (before) liveTypeAI(before);
      appendCodeMessage('ai', code, lang);
      if (after) liveTypeAI(after);
    } else appendCodeMessage('ai', reply);
  } else liveTypeAI(reply);
}

// --- Helpers ---
function addMessage(sender, text) {
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
  chatBox.scrollTop = chatBox.scrollHeight;
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
