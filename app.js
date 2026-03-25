// ── State ──
let currentTopic = null;
let cards = [];
let cardIndex = 0;
let showingAnswer = false;
let seen = new Set();

// ── Elements ──
const $ = id => document.getElementById(id);
const homeScreen = $('homeScreen');
const quizScreen = $('quizScreen');
const topicDropdown = $('topicDropdown');
const topicGrid = $('topicGrid');
const backBtn = $('backBtn');
const appTitle = $('appTitle');
const flashcard = $('flashcard');
const cardSource = $('cardSource');
const cardLabel = $('cardLabel');
const cardContent = $('cardContent');
const progressBar = $('progressBar');
const statsText = $('statsText');
const scoreText = $('scoreText');
const prevBtn = $('prevBtn');
const nextBtn = $('nextBtn');
const showBtn = $('showBtn');
const readQBtn = $('readQBtn');
const readABtn = $('readABtn');
const shuffleBtn = $('shuffleBtn');
const voiceSelect = $('voiceSelect');
const speedRange = $('speedRange');
const speedValue = $('speedValue');

// ── Topic List ──
const topics = Object.keys(FLASHCARD_DATA).sort();

function getProgress(topic) {
    try {
        const d = JSON.parse(localStorage.getItem('aqt_progress') || '{}');
        return d[topic] || 0;
    } catch { return 0; }
}

function saveProgress(topic, count) {
    try {
        const d = JSON.parse(localStorage.getItem('aqt_progress') || '{}');
        d[topic] = Math.max(d[topic] || 0, count);
        localStorage.setItem('aqt_progress', JSON.stringify(d));
    } catch {}
}

function buildCircle(pct) {
    const r = 20, c = 2 * Math.PI * r;
    const offset = c * (1 - pct);
    return `<svg width="50" height="50" viewBox="0 0 50 50">
        <circle cx="25" cy="25" r="${r}" fill="none" stroke="#0f3460" stroke-width="4"/>
        <circle cx="25" cy="25" r="${r}" fill="none" stroke="#4ecca3" stroke-width="4"
            stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round"/>
    </svg><span class="progress-text">${Math.round(pct * 100)}%</span>`;
}

function renderHome() {
    topicGrid.innerHTML = '';
    topics.forEach(topic => {
        const count = FLASHCARD_DATA[topic].length;
        const prog = getProgress(topic);
        const pct = Math.min(prog / count, 1);
        const card = document.createElement('div');
        card.className = 'topic-card';
        card.innerHTML = `
            <div class="topic-card-info">
                <div class="topic-card-name">${topic}</div>
                <div class="topic-card-count">${count} cards</div>
            </div>
            <div class="topic-card-progress">${buildCircle(pct)}</div>`;
        card.addEventListener('click', () => startQuiz(topic));
        topicGrid.appendChild(card);
    });
}

// ── Dropdown ──
topics.forEach(topic => {
    const opt = document.createElement('option');
    opt.value = topic;
    opt.textContent = `${topic} (${FLASHCARD_DATA[topic].length})`;
    topicDropdown.appendChild(opt);
});

topicDropdown.addEventListener('change', () => {
    if (topicDropdown.value) startQuiz(topicDropdown.value);
});

// ── Quiz ──
function startQuiz(topic) {
    currentTopic = topic;
    cards = [...FLASHCARD_DATA[topic]];
    cardIndex = 0;
    showingAnswer = false;
    seen = new Set();
    topicDropdown.value = topic;

    homeScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    backBtn.classList.remove('hidden');
    appTitle.textContent = topic;

    renderCard();
}

function goHome() {
    speechSynthesis.cancel();
    currentTopic = null;
    quizScreen.classList.add('hidden');
    homeScreen.classList.remove('hidden');
    backBtn.classList.add('hidden');
    appTitle.textContent = 'AQT Flashcard Quiz';
    topicDropdown.value = '';
    renderHome();
}

backBtn.addEventListener('click', goHome);

function renderCard() {
    if (!cards.length) return;
    const card = cards[cardIndex];
    showingAnswer = false;
    flashcard.classList.remove('show-answer');
    cardSource.textContent = card.source || '';
    cardLabel.textContent = 'Question';
    cardContent.textContent = card.question;
    showBtn.textContent = 'Show Answer';

    seen.add(cardIndex);
    saveProgress(currentTopic, seen.size);

    const pct = ((cardIndex + 1) / cards.length) * 100;
    progressBar.style.width = pct + '%';
    statsText.textContent = `Card ${cardIndex + 1} of ${cards.length}`;
    scoreText.textContent = `${seen.size} seen`;

    flashcard.scrollTop = 0;
}

function toggleAnswer() {
    if (!cards.length) return;
    const card = cards[cardIndex];
    showingAnswer = !showingAnswer;
    if (showingAnswer) {
        flashcard.classList.add('show-answer');
        cardLabel.textContent = 'Answer';
        cardContent.textContent = card.answer;
        showBtn.textContent = 'Show Question';
    } else {
        flashcard.classList.remove('show-answer');
        cardLabel.textContent = 'Question';
        cardContent.textContent = card.question;
        showBtn.textContent = 'Show Answer';
    }
    flashcard.scrollTop = 0;
}

function nextCard() {
    speechSynthesis.cancel();
    if (cardIndex < cards.length - 1) {
        cardIndex++;
        renderCard();
    }
}

function prevCard() {
    speechSynthesis.cancel();
    if (cardIndex > 0) {
        cardIndex--;
        renderCard();
    }
}

function shuffleCards() {
    speechSynthesis.cancel();
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    cardIndex = 0;
    seen = new Set();
    renderCard();
}

// Buttons
flashcard.addEventListener('click', toggleAnswer);
showBtn.addEventListener('click', toggleAnswer);
nextBtn.addEventListener('click', nextCard);
prevBtn.addEventListener('click', prevCard);
shuffleBtn.addEventListener('click', shuffleCards);

// ── Speech ──
let voices = [];
function loadVoices() {
    voices = speechSynthesis.getVoices();
    voiceSelect.innerHTML = '';
    const preferred = voices.filter(v => v.lang.startsWith('en'));
    const list = preferred.length ? preferred : voices;
    list.forEach((v, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = v.name.substring(0, 30) + (v.lang ? ` (${v.lang})` : '');
        voiceSelect.appendChild(opt);
    });
}
speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

speedRange.addEventListener('input', () => {
    speedValue.textContent = parseFloat(speedRange.value).toFixed(1) + 'x';
});

function speak(text) {
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const preferred = voices.filter(v => v.lang.startsWith('en'));
    const list = preferred.length ? preferred : voices;
    const idx = parseInt(voiceSelect.value) || 0;
    if (list[idx]) utter.voice = list[idx];
    utter.rate = parseFloat(speedRange.value);
    speechSynthesis.speak(utter);
}

readQBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (cards.length) speak(cards[cardIndex].question);
});

readABtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (cards.length) speak(cards[cardIndex].answer);
});

// ── Keyboard ──
document.addEventListener('keydown', (e) => {
    if (!currentTopic) return;
    switch (e.key) {
        case ' ': e.preventDefault(); toggleAnswer(); break;
        case 'ArrowRight': case 'Enter': nextCard(); break;
        case 'ArrowLeft': prevCard(); break;
        case 'a': case 'A': speak(cards[cardIndex]?.answer || ''); break;
        case 's': case 'S': shuffleCards(); break;
        case 'Escape': goHome(); break;
    }
});

// ── Swipe ──
let touchStartX = 0;
let touchStartY = 0;

flashcard.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

flashcard.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].screenX - touchStartX;
    const dy = e.changedTouches[0].screenY - touchStartY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) nextCard();
        else prevCard();
        e.preventDefault();
    }
});

// ── Init ──
renderHome();

// ── Service Worker ──
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}
