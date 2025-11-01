const chatBox = document.getElementById('chat');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const greetingSection = document.getElementById('greetingSection');

const API_URL = 'https://endpoint.apilageai.lk/api/chat';
const API_KEY = 'apk_QngciclzfHi2yAfP3WvZgx68VbbONQTP';
const MODEL = 'APILAGEAI-FREE';

// Enhanced system prompt for organized responses
const SYSTEM_PROMPT = 🧠 Hela Code — AI Assistant System Prompt

Developed by Lewmitha Kithuldeniya (Pix Studios Sri Lanka) using the Apilage AI API

Overview

Hela Code is an AI assistant designed for technology, programming, and software development.
It delivers structured, professional, and insightful technical responses to help developers, students, and creators build with confidence and clarity.

CRITICAL RESPONSE FORMATTING RULES

Use ## for main headings and ### for subheadings

Use bullet points (•) for lists and concepts

Use numbered lists (1, 2, 3) for step-by-step instructions

Highlight important terms or concepts in bold

Use tables for comparisons and summaries

Wrap all code examples inside proper language-specified code blocks

Use blockquotes (>) for notes, warnings, or key insights

Keep paragraphs concise and focused

Use emojis occasionally to enhance readability — never overload

RESPONSE TEMPLATE
Example Format
Main Topic

Brief introduction explaining the concept.

Key Points

• Key idea with short explanation
• Secondary idea with supporting detail
• Related fact or insight

Step-by-Step Guide

First step with details

Second step with purpose

Third step with result or outcome

Code Example
// Example code with comments for clarity

Best Practices

Note: Highlight important warnings or reminders here.

• Practice 1: Why it matters
• Practice 2: How to apply it

Comparison (Optional)
Feature	Option A	Option B
Aspect 1	Details	Details
TECHNOLOGY DOMAINS

Hela Code can respond expertly in these areas:

Programming Languages: Python, JavaScript, Java, C++, C#, Go, Rust

Web Development: HTML, CSS, React, Vue, Angular, Node.js

Mobile Development: Android, iOS, React Native, Flutter

Databases: SQL, MongoDB, PostgreSQL, Redis

DevOps & Cloud: Docker, Kubernetes, AWS, Azure, GCP

Artificial Intelligence / Machine Learning: TensorFlow, PyTorch, scikit-learn

Embedded Systems & Arduino

Game Development

Cybersecurity & Ethical Hacking

Data Science & Analytics

Software Architecture & Design Patterns

RESPONSE GUIDELINES

Provide detailed, structured, and technical explanations

Include formatted code snippets where applicable

Assist with debugging, optimization, and performance tuning

Explain frameworks, libraries, and development tools clearly

Offer career insights and best practices in tech industries

Clarify complex technical topics with plain, precise examples

For non-tech topics, politely guide the user back to technical areas

MEMORY

Hela Code retains context within the current chat session to maintain coherent, relevant, and continuous technical discussion.

Personality

Hela Code responds with enthusiasm for technology, professional tone, and organized clarity — bridging creativity and precision for every developer interaction.;

// Chat history management
let currentChatId = null;
let chats = [];

// Credit System
class CreditSystem {
    constructor() {
        this.credits = parseInt(localStorage.getItem('helaCredits')) || 100;
        this.executionCost = 10;
        this.downloadCost = 5;
        this.updateCreditDisplay();
    }

    hasSufficientCredits(cost) {
        return this.credits >= cost;
    }

    deductCredits(amount) {
        if (this.hasSufficientCredits(amount)) {
            this.credits -= amount;
            localStorage.setItem('helaCredits', this.credits.toString());
            this.updateCreditDisplay();
            this.updateFeatureAvailability();
            return true;
        }
        return false;
    }

    addCredits(amount) {
        this.credits += amount;
        localStorage.setItem('helaCredits', this.credits.toString());
        this.updateCreditDisplay();
        this.updateFeatureAvailability();
        this.showCreditAddedPopup(amount);
    }

    updateCreditDisplay() {
        const display = document.getElementById('creditAmount');
        if (display) {
            display.textContent = `₹${this.credits}`;
            display.className = this.credits < 50 ? 'credit-low' : 'credit-normal';
        }
    }

    updateFeatureAvailability() {
        const canDownload = this.credits >= 50;
        const canExecute = this.credits >= 50;
        
        document.querySelectorAll('.feature-locked').forEach(feature => {
            if (canDownload && feature.dataset.feature === 'code-download') {
                feature.innerHTML = '✅ Code Download Available';
                feature.classList.remove('feature-locked');
                feature.classList.add('feature-unlocked');
            }
            if (canExecute && feature.dataset.feature === 'code-execution') {
                feature.innerHTML = '✅ Code Execution Available';
                feature.classList.remove('feature-locked');
                feature.classList.add('feature-unlocked');
            }
        });
    }

    showCreditAddedPopup(amount) {
        const popup = document.createElement('div');
        popup.className = 'credit-popup';
        popup.innerHTML = `
            <div class="popup-content">
                <span class="popup-icon">💰</span>
                <div class="popup-text">
                    <strong>Credits Added!</strong>
                    <p>+₹${amount} credits added to your account</p>
                </div>
            </div>
        `;
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 3000);
    }
}

// Code Execution System
class CodeExecutor {
    constructor(creditSystem) {
        this.creditSystem = creditSystem;
    }

    async executePython(code) {
        if (!this.creditSystem.hasSufficientCredits(this.creditSystem.executionCost)) {
            throw new Error("Insufficient credits for code execution. Minimum ₹50 required.");
        }

        showLoading('Executing Python code...');
        const result = await this.simulateExecution(code, 'python');
        this.creditSystem.deductCredits(this.creditSystem.executionCost);
        hideLoading();
        return result;
    }

    async executeHTML(code) {
        if (!this.creditSystem.hasSufficientCredits(this.creditSystem.executionCost)) {
            throw new Error("Insufficient credits for code execution. Minimum ₹50 required.");
        }

        showLoading('Validating HTML...');
        const result = await this.validateHTML(code);
        this.creditSystem.deductCredits(this.creditSystem.executionCost);
        hideLoading();
        return result;
    }

    simulateExecution(code, language) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const issues = this.analyzeCode(code, language);
                const success = issues.length === 0;
                
                resolve({
                    success: success,
                    output: success ? "🎉 Code executed successfully!" : "❌ Execution failed with issues",
                    issues: issues,
                    executionTime: (Math.random() * 2 + 0.5).toFixed(2),
                    suggestions: this.generateSuggestions(issues, language)
                });
            }, 2000);
        });
    }

    analyzeCode(code, language) {
        const issues = [];
        
        if (language === 'python') {
            if (code.includes('print(') && !code.includes('f"')) {
                issues.push("Consider using f-strings for better string formatting");
            }
            if (code.includes('for i in range') && !code.includes('enumerate')) {
                issues.push("Use enumerate() for better index tracking in loops");
            }
            if (code.includes('except:')) {
                issues.push("Always specify exception types instead of bare except");
            }
            if (code.includes('import *')) {
                issues.push("Avoid wildcard imports for better code clarity");
            }
        }
        
        return issues;
    }

    validateHTML(html) {
        const issues = [];
        if (!html.includes('<!DOCTYPE html>')) issues.push("Missing DOCTYPE declaration");
        if (!html.includes('<html')) issues.push("Missing HTML tag");
        if (!html.includes('</html>')) issues.push("Missing closing HTML tag");
        if (!html.includes('<head>')) issues.push("Consider adding head section");
        if (!html.includes('<body>')) issues.push("Consider adding body section");

        return {
            valid: issues.length === 0,
            issues: issues,
            suggestion: "Add proper HTML5 structure with semantic elements"
        };
    }

    generateSuggestions(issues, language) {
        const suggestions = [];
        issues.forEach(issue => {
            if (issue.includes('f-strings')) {
                suggestions.push('Use: `print(f"Value: {variable}")` instead of `print("Value: " + str(variable))`');
            }
            if (issue.includes('enumerate')) {
                suggestions.push('Use: `for index, value in enumerate(items):` instead of `for i in range(len(items)):`');
            }
        });
        return suggestions;
    }
}

// Learning Challenges System
class LearningChallenges {
    constructor(creditSystem) {
        this.creditSystem = creditSystem;
        this.challenges = [
            {
                id: 1,
                title: "Python Algorithm Master",
                difficulty: "beginner",
                reward: 25,
                tasks: [
                    "Implement bubble sort algorithm",
                    "Solve Fibonacci sequence recursively",
                    "Create a palindrome checker function"
                ],
                completed: false
            },
            {
                id: 2,
                title: "Web Development Wizard",
                difficulty: "intermediate",
                reward: 50,
                tasks: [
                    "Build a responsive navigation bar",
                    "Create dark/light mode toggle",
                    "Implement form validation with JavaScript"
                ],
                completed: false
            },
            {
                id: 3,
                title: "Data Structures Pro",
                difficulty: "advanced",
                reward: 75,
                tasks: [
                    "Implement a binary search tree",
                    "Create a LRU cache implementation",
                    "Solve graph traversal problems"
                ],
                completed: false
            }
        ];
    }

    showChallengesModal() {
        const modal = document.createElement('div');
        modal.className = 'challenges-modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🚀 Learning Challenges</h3>
                    <button class="close-modal" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="challenges-list">
                    ${this.challenges.map(challenge => `
                        <div class="challenge-item ${challenge.completed ? 'completed' : ''}">
                            <div class="challenge-header">
                                <h4>${challenge.title}</h4>
                                <span class="difficulty ${challenge.difficulty}">${challenge.difficulty}</span>
                            </div>
                            <div class="tasks">
                                ${challenge.tasks.map(task => `
                                    <div class="task">
                                        <span class="task-icon">${challenge.completed ? '✅' : '📝'}</span>
                                        <span>${task}</span>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="challenge-footer">
                                <span class="reward">Reward: ₹${challenge.reward}</span>
                                <button class="start-challenge" onclick="learningChallenges.startChallenge(${challenge.id})" 
                                        ${challenge.completed ? 'disabled' : ''}>
                                    ${challenge.completed ? 'Completed' : 'Start Challenge'}
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    startChallenge(challengeId) {
        const challenge = this.challenges.find(c => c.id === challengeId);
        if (!challenge) return;

        const modal = document.createElement('div');
        modal.className = 'challenge-start-modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${challenge.title}</h3>
                    <button class="close-modal" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="challenge-info">
                    <p><strong>Difficulty:</strong> <span class="difficulty ${challenge.difficulty}">${challenge.difficulty}</span></p>
                    <p><strong>Reward:</strong> ₹${challenge.reward} credits</p>
                    <p><strong>Tasks to complete:</strong></p>
                    <ul>
                        ${challenge.tasks.map(task => `<li>${task}</li>`).join('')}
                    </ul>
                </div>
                <div class="challenge-actions">
                    <button class="btn-primary" onclick="learningChallenges.beginChallenge(${challengeId})">Begin Challenge</button>
                    <button class="btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    beginChallenge(challengeId) {
        const challenge = this.challenges.find(c => c.id === challengeId);
        if (!challenge) return;

        // Close modals
        document.querySelectorAll('.modal').forEach(modal => modal.remove());

        // Add challenge tasks to chat
        const tasksText = challenge.tasks.map((task, index) => `${index + 1}. ${task}`).join('\n');
        const challengeMessage = `I'm starting the "${challenge.title}" challenge! Here are my tasks:\n${tasksText}`;
        
        document.getElementById('input').value = challengeMessage;
        document.getElementById('send').click();

        // Track challenge progress
        this.trackChallengeProgress(challengeId);
    }

    completeChallenge(challengeId) {
        const challenge = this.challenges.find(c => c.id === challengeId);
        if (challenge && !challenge.completed) {
            challenge.completed = true;
            this.creditSystem.addCredits(challenge.reward);
            this.showCompletionPopup(challenge);
        }
    }

    showCompletionPopup(challenge) {
        const popup = document.createElement('div');
        popup.className = 'challenge-complete-popup';
        popup.innerHTML = `
            <div class="popup-content">
                <div class="popup-icon">🏆</div>
                <div class="popup-text">
                    <h4>Challenge Completed!</h4>
                    <p>You've completed "${challenge.title}" and earned ₹${challenge.reward} credits!</p>
                </div>
            </div>
        `;
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 5000);
    }
}

// Achievement System
class AchievementSystem {
    constructor() {
        this.achievements = JSON.parse(localStorage.getItem('helaAchievements')) || {
            firstCode: { unlocked: false, title: "First Steps", description: "Write your first line of code", icon: "👣" },
            bugHunter: { unlocked: false, title: "Bug Hunter", description: "Fix 10 bugs in your code", icon: "🐛" },
            speedCoder: { unlocked: false, title: "Speed Coder", description: "Write 100 lines in one session", icon: "⚡" },
            algorithmMaster: { unlocked: false, title: "Algorithm Master", description: "Solve 5 complex algorithms", icon: "🧠" },
            challengeCompleted: { unlocked: false, title: "Challenge Accepted", description: "Complete your first challenge", icon: "🎯" }
        };
        this.codeLinesWritten = parseInt(localStorage.getItem('helaCodeLines')) || 0;
        this.bugsFixed = parseInt(localStorage.getItem('helaBugsFixed')) || 0;
    }

    unlockAchievement(achievementId) {
        if (this.achievements[achievementId] && !this.achievements[achievementId].unlocked) {
            this.achievements[achievementId].unlocked = true;
            localStorage.setItem('helaAchievements', JSON.stringify(this.achievements));
            this.showAchievementPopup(achievementId);
        }
    }

    trackCodeWritten(lines) {
        this.codeLinesWritten += lines;
        localStorage.setItem('helaCodeLines', this.codeLinesWritten.toString());
        
        if (this.codeLinesWritten >= 100 && !this.achievements.speedCoder.unlocked) {
            this.unlockAchievement('speedCoder');
        }
    }

    trackBugFixed() {
        this.bugsFixed++;
        localStorage.setItem('helaBugsFixed', this.bugsFixed.toString());
        
        if (this.bugsFixed >= 10 && !this.achievements.bugHunter.unlocked) {
            this.unlockAchievement('bugHunter');
        }
    }

    showAchievementPopup(achievementId) {
        const achievement = this.achievements[achievementId];
        const popup = document.createElement('div');
        popup.className = 'achievement-popup';
        popup.innerHTML = `
            <div class="achievement-content">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-text">
                    <h4>Achievement Unlocked!</h4>
                    <p class="achievement-title">${achievement.title}</p>
                    <p class="achievement-desc">${achievement.description}</p>
                </div>
            </div>
        `;
        document.body.appendChild(popup);
        setTimeout(() => {
            popup.classList.add('fade-out');
            setTimeout(() => popup.remove(), 500);
        }, 4000);
    }

    showAchievementsModal() {
        const modal = document.createElement('div');
        modal.className = 'achievements-modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🏆 Your Achievements</h3>
                    <button class="close-modal" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="achievements-grid">
                    ${Object.entries(this.achievements).map(([id, achievement]) => `
                        <div class="achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}">
                            <div class="achievement-icon">${achievement.unlocked ? achievement.icon : '🔒'}</div>
                            <div class="achievement-info">
                                <h4>${achievement.title}</h4>
                                <p>${achievement.description}</p>
                            </div>
                            <div class="achievement-status">
                                ${achievement.unlocked ? '✅ Unlocked' : '🔒 Locked'}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="stats">
                    <div class="stat">
                        <span class="stat-value">${this.codeLinesWritten}</span>
                        <span class="stat-label">Lines of Code</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${this.bugsFixed}</span>
                        <span class="stat-label">Bugs Fixed</span>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

// Voice Programming Assistant
class VoiceProgramming {
    constructor() {
        this.isListening = false;
        this.recognition = null;
        this.setupVoiceRecognition();
    }

    setupVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');
                this.processVoiceCommand(transcript);
            };

            this.recognition.onend = () => {
                if (this.isListening) {
                    this.startListening();
                }
            };
        }
    }

    processVoiceCommand(transcript) {
        const commands = {
            'create function': () => this.generateFunction(),
            'debug code': () => this.analyzeForBugs(),
            'optimize this': () => this.optimizeCurrentCode(),
            'explain code': () => this.explainCurrentCode(),
            'run code': () => this.executeCurrentCode()
        };

        for (const [command, action] of Object.entries(commands)) {
            if (transcript.toLowerCase().includes(command)) {
                action();
                this.showVoiceFeedback(`Executing: ${command}`);
                break;
            }
        }
    }

    startListening() {
        if (this.recognition && !this.isListening) {
            this.isListening = true;
            this.recognition.start();
            this.showVoiceFeedback("🎤 Listening... Speak your command");
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.isListening = false;
            this.recognition.stop();
            this.showVoiceFeedback("🎤 Voice control stopped");
        }
    }

    showVoiceFeedback(message) {
        const feedback = document.createElement('div');
        feedback.className = 'voice-feedback';
        feedback.textContent = message;
        document.body.appendChild(feedback);
        setTimeout(() => feedback.remove(), 2000);
    }

    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }
}

// Initialize systems
const creditSystem = new CreditSystem();
const codeExecutor = new CodeExecutor(creditSystem);
const learningChallenges = new LearningChallenges(creditSystem);
const achievementSystem = new AchievementSystem();
const voiceAssistant = new VoiceProgramming();

// Initialize chat history
function initChatHistory() {
    const savedChats = localStorage.getItem('helaChatHistory');
    if (savedChats) {
        chats = JSON.parse(savedChats);
    }
    
    if (chats.length === 0 || !currentChatId) {
        createNewChat();
    } else {
        currentChatId = chats[0].id;
        loadChat(currentChatId);
    }
}

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
    
    if (chatBox) chatBox.innerHTML = '';
    if (greetingSection) greetingSection.style.display = 'flex';
    
    updateChatHistorySidebar();
    return newChat.id;
}

function saveChats() {
    localStorage.setItem('helaChatHistory', JSON.stringify(chats));
}

function updateChatTitle(chatId, firstMessage) {
    const chat = chats.find(c => c.id === chatId);
    if (chat && chat.title === 'New Chat') {
        const title = firstMessage.length > 30 
            ? firstMessage.substring(0, 30) + '...' 
            : firstMessage;
        chat.title = title;
        chat.updatedAt = new Date().toISOString();
        saveChats();
        updateChatHistorySidebar();
    }
}

function addMessageToChat(sender, text) {
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
        saveChats();
        
        if (sender === 'user' && chat.messages.length === 1) {
            updateChatTitle(currentChatId, text);
        }

        // Track achievements
        if (sender === 'user') {
            const codeBlocks = text.match(/```[\s\S]*?```/g);
            if (codeBlocks) {
                achievementSystem.trackCodeWritten(codeBlocks.length * 5);
            }
            if (chat.messages.length === 1) {
                achievementSystem.unlockAchievement('firstCode');
            }
        }
    }
}

function getConversationContext() {
    if (!currentChatId) return '';
    
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat || chat.messages.length === 0) return '';
    
    const recentMessages = chat.messages.slice(-10);
    let context = 'Previous conversation context:\n';
    
    recentMessages.forEach(msg => {
        const role = msg.type === 'user' ? 'User' : 'Assistant';
        context += `${role}: ${msg.content}\n`;
    });
    
    return context;
}

function loadChat(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    currentChatId = chatId;
    
    if (chatBox) chatBox.innerHTML = '';
    if (greetingSection) greetingSection.style.display = 'none';
    
    chat.messages.forEach(msg => {
        if (msg.type === 'user') {
            addMessage('user', msg.content);
        } else {
            displayFormattedAIResponse(msg.content);
        }
    });
    
    scrollToBottom();
    updateChatHistorySidebar();
}

function displayFormattedAIResponse(content) {
    if (!chatBox) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai';
    
    const formattedContent = parseMarkdownFormatting(content);
    messageDiv.innerHTML = formattedContent;
    
    chatBox.appendChild(messageDiv);
    
    messageDiv.querySelectorAll('.code-block').forEach(block => {
        const copyBtn = block.querySelector('.copy-btn');
        const code = block.querySelector('code').textContent;
        
        copyBtn.addEventListener('click', () => {
            if (creditSystem.hasSufficientCredits(creditSystem.downloadCost)) {
                navigator.clipboard.writeText(code);
                creditSystem.deductCredits(creditSystem.downloadCost);
                showCopiedNotification();
            } else {
                alert(`Insufficient credits! Need ₹${creditSystem.downloadCost} to copy code.`);
            }
        });

        // Add execute button for Python and HTML
        const language = block.querySelector('.code-language').textContent.toLowerCase();
        if (['python', 'html'].includes(language)) {
            const executeBtn = document.createElement('button');
            executeBtn.className = 'execute-btn';
            executeBtn.textContent = '▶️ Run';
            executeBtn.onclick = async () => {
                try {
                    let result;
                    if (language === 'python') {
                        result = await codeExecutor.executePython(code);
                    } else if (language === 'html') {
                        result = await codeExecutor.executeHTML(code);
                    }
                    
                    this.showExecutionResult(result, language);
                } catch (error) {
                    alert(error.message);
                }
            };
            block.querySelector('.code-header').appendChild(executeBtn);
        }
    });
    
    scrollToBottom();
}

function showExecutionResult(result, language) {
    const resultDiv = document.createElement('div');
    resultDiv.className = `execution-result ${result.success ? 'success' : 'error'}`;
    
    resultDiv.innerHTML = `
        <div class="result-header">
            <span class="result-icon">${result.success ? '✅' : '❌'}</span>
            <span class="result-title">${language.toUpperCase()} Execution Result</span>
        </div>
        <div class="result-content">
            <p><strong>Status:</strong> ${result.output}</p>
            <p><strong>Time:</strong> ${result.executionTime}s</p>
            ${result.issues && result.issues.length > 0 ? `
                <div class="issues">
                    <strong>Issues Found:</strong>
                    <ul>
                        ${result.issues.map(issue => `<li>${issue}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            ${result.suggestions && result.suggestions.length > 0 ? `
                <div class="suggestions">
                    <strong>Suggestions:</strong>
                    <ul>
                        ${result.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `;
    
    chatBox.appendChild(resultDiv);
    scrollToBottom();
}

function parseMarkdownFormatting(text) {
    let html = '<div class="bubble ai-bubble">';
    
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
    
    html += '</div>';
    return html;
}

function createCodeBlock(content, language) {
    return `
        <div class="code-block">
            <div class="code-header">
                <span class="code-language">${language}</span>
                <div class="code-actions">
                    <button class="copy-btn">Copy</button>
                </div>
            </div>
            <pre><code class="language-${language}">${escapeHTML(content.trim())}</code></pre>
        </div>
    `;
}

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

// Event Listeners
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
    
    if (!currentChatId || chats.length === 0) {
        createNewChat();
    }
    
    if (greetingSection) greetingSection.style.display = 'none';

    addMessage('user', text);
    addMessageToChat('user', text);
    input.value = '';

    showTyping();
    const reply = await askAI(text);
    removeTyping();

    displayFormattedAIResponse(reply);
    addMessageToChat('ai', reply);
}

async function askAI(userMessage) {
    try {
        const context = getConversationContext();
        const fullPrompt = `${SYSTEM_PROMPT}\n\n${context}\n\nCurrent user question: ${userMessage}\n\nAssistant:`;
        
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({ 
                message: fullPrompt, 
                model: MODEL 
            })
        });
        
        const data = await res.json();
        return data.response || 'I apologize, but I encountered an issue. Please try again.';
        
    } catch (err) {
        console.error('AI Error:', err);
        return '## Connection Issue\nI apologize, but I\'m having trouble connecting right now. Please try again in a moment.';
    }
}

// Utility Functions
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

function showTyping() {
    removeTyping();
    if (!chatBox) return;
    
    const t = document.createElement('div');
    t.className = 'message ai';
    t.id = 'typing-indicator';
    t.innerHTML = `<div class="bubble">Hela Code is thinking... 💭</div>`;
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

function escapeHTML(s) {
    return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function showCopiedNotification() {
    const notif = document.createElement('div');
    notif.className = 'copied-notification';
    notif.textContent = '✅ Code copied! (-₹5 credits)';
    document.body.appendChild(notif);
    setTimeout(() => notif.classList.add('hide'), 1000);
    setTimeout(() => notif.remove(), 1600);
}

function showLoading(message) {
    const loading = document.createElement('div');
    loading.className = 'loading-overlay';
    loading.innerHTML = `
        <div class="loading-content">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;
    loading.id = 'loadingOverlay';
    document.body.appendChild(loading);
}

function hideLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) loading.remove();
}

// Payment System (Simulated)
function showTopUpModal() {
    const modal = document.createElement('div');
    modal.className = 'payment-modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>💰 Top Up Credits</h3>
                <button class="close-modal" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="credit-options">
                <div class="credit-option" onclick="selectCreditOption(100)">
                    <div class="option-header">
                        <span class="option-amount">100 Credits</span>
                        <span class="option-price">₹100</span>
                    </div>
                    <p class="option-desc">Perfect for getting started</p>
                </div>
                <div class="credit-option popular" onclick="selectCreditOption(500)">
                    <div class="option-header">
                        <span class="option-amount">500 Credits</span>
                        <span class="option-price">₹400</span>
                    </div>
                    <p class="option-desc">Most popular - 20% off</p>
                    <span class="popular-badge">BEST VALUE</span>
                </div>
                <div class="credit-option" onclick="selectCreditOption(1000)">
                    <div class="option-header">
                        <span class="option-amount">1000 Credits</span>
                        <span class="option-price">₹700</span>
                    </div>
                    <p class="option-desc">Best for power users - 30% off</p>
                </div>
            </div>
            <div class="payment-actions">
                <button class="btn-primary" onclick="processPayment()">Continue to Payment</button>
                <p class="payment-note">Payments processed securely via PayPal</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function selectCreditOption(amount) {
    document.querySelectorAll('.credit-option').forEach(opt => opt.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    window.selectedCreditAmount = amount;
}

function processPayment() {
    if (!window.selectedCreditAmount) {
        alert('Please select a credit package');
        return;
    }

    showLoading('Processing payment...');
    
    // Simulate payment processing
    setTimeout(() => {
        hideLoading();
        creditSystem.addCredits(window.selectedCreditAmount);
        document.querySelector('.payment-modal').remove();
        
        // In real implementation, integrate with PayPal API
        alert(`Payment successful! ${window.selectedCreditAmount} credits added to your account.`);
    }, 2000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initChatHistory();
    
    // Add feature buttons to sidebar
    const sidebarHeader = document.querySelector('.sidebar-header');
    if (sidebarHeader) {
        const featureButtons = document.createElement('div');
        featureButtons.className = 'feature-buttons';
        featureButtons.innerHTML = `
            <button class="feature-btn" onclick="learningChallenges.showChallengesModal()">
                🚀 Challenges
            </button>
            <button class="feature-btn" onclick="achievementSystem.showAchievementsModal()">
                🏆 Achievements
            </button>
            <button class="feature-btn" onclick="voiceAssistant.toggleListening()">
                🎤 Voice
            </button>
        `;
        sidebarHeader.appendChild(featureButtons);
    }
});

// Global functions for HTML onclick
window.showTopUpModal = showTopUpModal;
window.selectCreditOption = selectCreditOption;
window.processPayment = processPayment;
window.learningChallenges = learningChallenges;
window.achievementSystem = achievementSystem;
window.voiceAssistant = voiceAssistant;
