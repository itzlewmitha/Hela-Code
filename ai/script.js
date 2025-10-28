// Hela Code unified chat logic
const chatBox = document.getElementById('chatBox') || document.getElementById('chat');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const greetingSection = document.getElementById('greetingSection');

const API_URL = 'https://endpoint.apilageai.lk/api/chat';
const API_KEY = 'apk_QngciclzfHi2yAfP3WvZgx68VbbONQTP';
const MODEL = 'APILAGEAI-FREE';

// Message rendering
function addMessage(sender, text) {
  const message = document.createElement('div');
  message.classList.add('message', sender);
  const bubble = document.createElement('div');
  bubble.classList.add('bubble');
  bubble.innerHTML = escapeHTML(text);
  message.appendChild(bubble);
  chatBox.appendChild(message);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Send button + Enter key
sendBtn.addEventListener('click', handleSend);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

async function handleSend() {
  const text = input.value.trim();
  if (!text) return;

  if (greetingSection) greetingSection.style.display = 'none';
  addMessage('user', text);
  input.value = '';

  const lowerMsg = text.toLowerCase();

  // greeting
  if (/^(hi|hello|hey|hy|hii|hiii|heyy|hiya)\b/i.test(lowerMsg)) {
    liveTypeAI("Hey there 👋 Ready to write, debug, and explore some programming today?");
    return;
  }

  // thank you
  if (/thank\s*you|thanks|thx|ty/i.test(lowerMsg)) {
    liveTypeAI("You're welcome! 🙌 Always happy to help with code.");
    return;
  }

  // who made you
  if (/who\s*are\s*you|what\s*are\s*you|your\s*name|who\s*made\s*you/i.test(lowerMsg)) {
    liveTypeAI("Hela Code — created by Lewmitha Kithuldeniya using the Apilage AI API.");
    return;
  }

  // only code questions
  if (!isCodeRelated(text)) {
    liveTypeAI("I only respond to coding or debugging questions.");
    return;
  }

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
      appendCodeMessage('ai', `\`\`\`${lang}\n${code}\`\`\``);
      if (after) liveTypeAI(after);
    } else {
      appendCodeMessage('ai', reply);
    }
  } else {
    liveTypeAI(reply);
  }
}

// Utilities
function isCodeRelated(text) {
  const words = [
    'code','function','class','variable','python','javascript','java','c++','c#',
    'html','css','react','node','algorithm','array','loop','if','else','for','while',
    'def','return','import','export','const','let','var','sql','query','bash','shell',
    'script','json','xml','regex','compile','run','execute','error','bug','fix','debug',
    'print','log','output','input','stdin','stdout','file','read','write','save'
  ];
  if (/```[\s\S]*?```/.test(text)) return true;
  return words.some(w => text.toLowerCase().includes(w));
}

function isCodeBlock(text) {
  return /```[\s\S]*?```/.test(text);
}

function appendCodeMessage(sender, text) {
  const match = text.match(/```(\w+)?\n?([\s\S]*?)```/);
  const lang = match?.[1] || '';
  const code = match?.[2] || text;

  const msg = document.createElement('div');
  msg.className = `message ${sender}`;
  msg.innerHTML = `
    <div class="bubble code-bubble">
      <pre><code class="${lang}"></code></pre>
      <button class="copy-btn">Copy</button>
    </div>
  `;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;

  const codeElem = msg.querySelector('code');
  const lines = code.split('\n');
  let i = 0;
  function typeLine() {
    if (i < lines.length) {
      codeElem.innerHTML += (i > 0 ? '\n' : '') + escapeHTML(lines[i]);
      chatBox.scrollTop = chatBox.scrollHeight;
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
  const notif = document.createElement('div');
  notif.className = 'copied-notification';
  notif.textContent = 'Copied!';
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
  chatBox.appendChild(typing);
  chatBox.scrollTop = chatBox.scrollHeight;
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
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;

  let i = 0;
  function typeChar() {
    if (i <= text.length) {
      bubble.innerHTML = escapeHTML(text.slice(0, i));
      chatBox.scrollTop = chatBox.scrollHeight;
      i++;
      setTimeout(typeChar, 18 + Math.random() * 30);
    }
  }
  typeChar();
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
      body: JSON.stringify({
        message,
        enableGoogleSearch: false,
        model: MODEL
      })
    });
    const data = await res.json();
    return data.response || 'No response';
  } catch (err) {
    console.error(err);
    return 'Error connecting to AI';
  }
}
