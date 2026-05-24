// script.js – Comprehensive centered gamified controller for English Quest
// Built with a vivid, highly interactive learning aesthetic for 9th Grade students.

const app = document.getElementById('app');

// Complete gamified application state
const state = {
  vocabData: [],
  grammarData: [],
  profile: {
    xp: 0,
    level: 1,
    streak: 0,
    maxStreak: 0,
    accuracy: 100,
    totalAnswered: 0,
    totalCorrect: 0
  },
  currentGame: {
    type: null, // 'vocab', 'grammar', 'listening', 'timed'
    questions: [],
    currentIndex: 0,
    score: 0,
    limit: 5, // questions per standard round
    streakThisRound: 0,
    listeningHintCount: 0
  },
  timer: {
    intervalId: null,
    duration: 15, // seconds per question in timed challenge
    remaining: 15
  }
};

// -------------------------------------------------------------
// 1. DATA LOADING AND FALLBACKS
// -------------------------------------------------------------
async function loadGameData() {
  try {
    const [vocabRes, grammarRes] = await Promise.all([
      fetch('data/vocab.json'),
      fetch('data/grammar.json')
    ]);
    
    if (!vocabRes.ok || !grammarRes.ok) {
      throw new Error("Không thể kết nối đến tệp dữ liệu.");
    }
    
    state.vocabData = await vocabRes.json();
    state.grammarData = await grammarRes.json();
  } catch (error) {
    console.warn("Lỗi tải tệp JSON, đang sử dụng dữ liệu dự phòng cực đẹp:", error);
    // Provide bulletproof high-quality offline fallbacks in case JSON file paths fail
    state.vocabData = [
      { "word": "journey", "translation": "hành trình" },
      { "word": "mountain", "translation": "ngọn núi" },
      { "word": "library", "translation": "thư viện" },
      { "word": "science", "translation": "khoa học" },
      { "word": "challenge", "translation": "thách thức" },
      { "word": "future", "translation": "tương lai" },
      { "word": "courage", "translation": "lòng dũng cảm" },
      { "word": "adventure", "translation": "cuộc phiêu lưu" },
      { "word": "environment", "translation": "môi trường" },
      { "word": "volunteer", "translation": "tình nguyện viên" }
    ];
    state.grammarData = [
      {
        "sentence": "She ___ to the library every Saturday afternoon.",
        "missingWord": "goes",
        "options": ["goes", "went", "gone", "going"]
      },
      {
        "sentence": "If it ___ heavily tomorrow, we will cancel our journey.",
        "missingWord": "rains",
        "options": ["rain", "rains", "rained", "raining"]
      },
      {
        "sentence": "They have already ___ their science challenge.",
        "missingWord": "finished",
        "options": ["finished", "finish", "finishing", "finishes"]
      },
      {
        "sentence": "The brave volunteer ___ ready to face the future.",
        "missingWord": "is",
        "options": ["are", "is", "was", "were"]
      },
      {
        "sentence": "I will call you immediately ___ I arrive at the mountain.",
        "missingWord": "when",
        "options": ["when", "while", "as", "if"]
      }
    ];
  }
}

// -------------------------------------------------------------
// 2. PROFILE STATE & LOCALSTORAGE PERSISTENCE
// -------------------------------------------------------------
function loadProfile() {
  const savedProfile = localStorage.getItem('eq_profile');
  if (savedProfile) {
    try {
      state.profile = { ...state.profile, ...JSON.parse(savedProfile) };
    } catch (e) {
      console.error("Lỗi phân tích dữ liệu profile:", e);
    }
  }
  recalculateLevel();
}

function saveProfile() {
  localStorage.setItem('eq_profile', JSON.stringify(state.profile));
}

function recalculateLevel() {
  const oldLevel = state.profile.level;
  const newLevel = Math.floor(state.profile.xp / 100) + 1;
  state.profile.level = newLevel;
  
  if (newLevel > oldLevel && oldLevel > 0) {
    playLevelUpSound();
    triggerLevelUpBanner(newLevel);
  }
}

function getLevelTitle(level) {
  if (level <= 1) return "Tân binh Tiếng Anh 🧑‍🚀";
  if (level === 2) return "Chiến binh Từ vựng ⚔️";
  if (level === 3) return "Hiệp sĩ Ngữ pháp 🛡️";
  if (level === 4) return "Cao thủ Nghe hiểu 🎧";
  return "Nhà Thông thái English 🧙‍♂️";
}

function updateAccuracy() {
  if (state.profile.totalAnswered > 0) {
    state.profile.accuracy = Math.round((state.profile.totalCorrect / state.profile.totalAnswered) * 100);
  } else {
    state.profile.accuracy = 100;
  }
}

// -------------------------------------------------------------
// 3. SYNTHESIZED SOUND SYSTEM (Web Audio API)
// -------------------------------------------------------------
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq, type, duration, gainStart) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(gainStart, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (error) {
    console.warn("Không khởi chạy được âm thanh:", error);
  }
}

function playCorrectSound() {
  playTone(523.25, 'sine', 0.15, 0.15);
  setTimeout(() => {
    playTone(659.25, 'sine', 0.25, 0.15);
  }, 80);
}

function playWrongSound() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.35);
    
    gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {}
}

function playLevelUpSound() {
  const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
  notes.forEach((freq, index) => {
    setTimeout(() => {
      playTone(freq, 'triangle', 0.2, 0.12);
    }, index * 60);
  });
}

// -------------------------------------------------------------
// 4. TEXT TO SPEECH (TTS) SYSTEM
// -------------------------------------------------------------
function speakText(text, lang = 'en-US') {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    // Choose a voice that matches the language if available
    const voices = speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith(lang));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn("Speech Synthesis không hỗ trợ.");
  }
}

// -------------------------------------------------------------
// 5. THEME SYSTEM
// -------------------------------------------------------------
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
  }
  
  const themeToggleBtn = document.getElementById('themeToggle');
  if (themeToggleBtn) {
    themeToggleBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    themeToggleBtn.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-theme');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      themeToggleBtn.textContent = isDark ? '☀️' : '🌙';
      playTone(600, 'sine', 0.05, 0.05);
    });
  }
}

// -------------------------------------------------------------
// 6. CONFETTI & LEVEL UP EFFECTS
// -------------------------------------------------------------
function triggerConfetti(container) {
  if (!container) return;
  const colors = ['#2ecc71', '#9b59b6', '#f1c40f', '#e74c3c', '#3498db', '#e67e22'];
  const confettiCount = 80;
  
  const confContainer = document.createElement('div');
  confContainer.id = 'confetti-container';
  container.appendChild(confContainer);
  
  for (let i = 0; i < confettiCount; i++) {
    const confetto = document.createElement('div');
    confetto.className = 'confetto';
    confetto.style.left = Math.random() * 100 + '%';
    confetto.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetto.style.animationDelay = Math.random() * 1.5 + 's';
    confetto.style.width = (Math.random() * 8 + 6) + 'px';
    confetto.style.height = (Math.random() * 8 + 6) + 'px';
    confetto.style.transform = `rotate(${Math.random() * 360}deg)`;
    confContainer.appendChild(confetto);
  }
  
  setTimeout(() => {
    confContainer.remove();
  }, 4000);
}

function triggerLevelUpBanner(level) {
  const banner = document.createElement('div');
  banner.style.position = 'fixed';
  banner.style.top = '15%';
  banner.style.left = '50%';
  banner.style.transform = 'translate(-50%, -20px)';
  banner.style.background = 'linear-gradient(135deg, #f1c40f, #e67e22)';
  banner.style.color = '#fff';
  banner.style.padding = '1.2rem 2.5rem';
  banner.style.borderRadius = '20px';
  banner.style.boxShadow = '0 10px 30px rgba(230,126,34,0.4)';
  banner.style.fontFamily = 'var(--font-title)';
  banner.style.fontSize = '1.8rem';
  banner.style.fontWeight = 'bold';
  banner.style.textAlign = 'center';
  banner.style.zIndex = '999';
  banner.style.opacity = '0';
  banner.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  banner.innerHTML = `🌟 LEVEL UP! 🌟<br><span style="font-size: 1.1rem; font-weight: normal; opacity: 0.95;">Bạn đã đạt Cấp độ ${level}: ${getLevelTitle(level)}</span>`;
  
  document.body.appendChild(banner);
  
  banner.offsetHeight; // force reflow
  banner.style.transform = 'translate(-50%, 0)';
  banner.style.opacity = '1';
  
  setTimeout(() => {
    banner.style.transform = 'translate(-50%, -20px)';
    banner.style.opacity = '0';
    setTimeout(() => banner.remove(), 500);
  }, 3500);
}

// -------------------------------------------------------------
// 7. DASHBOARD & PROFILE RENDERING
// -------------------------------------------------------------
function renderDashboard() {
  stopTimer();
  updateAccuracy();
  
  const screen = document.createElement('section');
  screen.className = 'screen active';
  screen.id = 'dashboard';
  
  const title = document.createElement('h2');
  title.className = 'dashboard-title';
  title.innerHTML = 'Học English Cực Vui! 🚀';
  screen.appendChild(title);
  
  const userPanel = document.createElement('div');
  userPanel.className = 'user-panel';
  
  const statLevel = createStatBox('CẤP ĐỘ 🌟', state.profile.level, getLevelTitle(state.profile.level), 'level');
  const statXP = createStatBox('KINH NGHIỆM ⚡', `${state.profile.xp} XP`, `${100 - (state.profile.xp % 100)} XP nữa để lên cấp`, 'xp');
  const statStreak = createStatBox('CHUỖI HIỆN TẠI 🔥', `${state.profile.streak} câu`, `Kỷ lục: ${state.profile.maxStreak} câu`, 'streak');
  const statAccuracy = createStatBox('TỶ LỆ ĐÚNG 🎯', `${state.profile.accuracy}%`, `Số câu đã làm: ${state.profile.totalAnswered}`, 'accuracy');
  
  userPanel.appendChild(statLevel);
  userPanel.appendChild(statXP);
  userPanel.appendChild(statStreak);
  userPanel.appendChild(statAccuracy);
  screen.appendChild(userPanel);
  
  const subtitle = document.createElement('h3');
  subtitle.style.marginBottom = '1.2rem';
  subtitle.style.fontFamily = 'var(--font-title)';
  subtitle.style.textAlign = 'center'; // Perfectly Centered
  subtitle.textContent = 'Chọn thử thách của bạn:';
  screen.appendChild(subtitle);
  
  const modesGrid = document.createElement('div');
  modesGrid.className = 'modes-grid';
  
  const modes = [
    {
      id: 'vocab',
      icon: '📚',
      title: 'Từ vựng Matcher',
      desc: 'Kéo thả ghép từ vựng Tiếng Anh cực kỳ sinh động.',
      action: () => startStandardGame('vocab')
    },
    {
      id: 'grammar',
      icon: '✍️',
      title: 'Ngữ pháp Chiến thần',
      desc: 'Điền từ hoàn thành các cấu trúc ngữ pháp chuẩn 9th Grade.',
      action: () => startStandardGame('grammar')
    },
    {
      id: 'listening',
      icon: '🎧',
      title: 'Nghe hiểu Siêu cấp',
      desc: 'Luyện tai nhạy bén, nghe phát âm chuẩn bản xứ và gõ lại từ.',
      action: () => startStandardGame('listening')
    },
    {
      id: 'timed',
      icon: '⚡',
      title: 'Thách thức Thời gian',
      desc: 'Chế độ sinh tử! Trả lời nhanh trong 15 giây, chuỗi câu đúng càng dài điểm càng khủng.',
      action: startTimedGame
    }
  ];
  
  modes.forEach(mode => {
    const card = document.createElement('div');
    card.className = 'mode-card';
    card.innerHTML = `
      <span class="icon">${mode.icon}</span>
      <h3>${mode.title}</h3>
      <p>${mode.desc}</p>
    `;
    card.addEventListener('click', () => {
      playTone(400, 'sine', 0.08, 0.08);
      mode.action();
    });
    modesGrid.appendChild(card);
  });
  
  screen.appendChild(modesGrid);
  
  const resetContainer = document.createElement('div');
  resetContainer.style.marginTop = '2rem';
  resetContainer.style.textAlign = 'center'; // Perfectly Centered
  
  const resetBtn = document.createElement('button');
  resetBtn.style.background = 'transparent';
  resetBtn.style.border = 'none';
  resetBtn.style.color = 'var(--color-text-light)';
  resetBtn.style.cursor = 'pointer';
  resetBtn.style.fontSize = '0.85rem';
  resetBtn.style.textDecoration = 'underline';
  resetBtn.textContent = '🔄 Đặt lại toàn bộ tiến độ chơi';
  resetBtn.addEventListener('click', () => {
    if (confirm("Bạn có chắc chắn muốn đặt lại tất cả điểm số, chuỗi câu đúng và XP về 0 không?")) {
      state.profile = {
        xp: 0,
        level: 1,
        streak: 0,
        maxStreak: 0,
        accuracy: 100,
        totalAnswered: 0,
        totalCorrect: 0
      };
      saveProfile();
      playTone(200, 'sine', 0.3, 0.1);
      renderDashboard();
    }
  });
  resetContainer.appendChild(resetBtn);
  screen.appendChild(resetContainer);
  
  app.innerHTML = '';
  app.appendChild(screen);
}

function createStatBox(label, val, subtitleText, type) {
  const box = document.createElement('div');
  box.className = `stat-box ${type}`;
  box.innerHTML = `
    <span class="label">${label}</span>
    <span class="val">${val}</span>
    <span style="font-size: 0.75rem; color: var(--color-text-light); margin-top: 0.3rem; display: block;">${subtitleText}</span>
  `;
  return box;
}

// -------------------------------------------------------------
// 8. GAME INITIALIZERS
// -------------------------------------------------------------
function startStandardGame(type) {
  state.currentGame.type = type;
  state.currentGame.currentIndex = 0;
  state.currentGame.score = 0;
  state.currentGame.streakThisRound = 0;
  
  const dataPool = type === 'vocab' || type === 'listening' ? state.vocabData : state.grammarData;
  state.currentGame.questions = shuffleArray(dataPool).slice(0, state.currentGame.limit);
  
  renderQuestion();
}

function startTimedGame() {
  state.currentGame.type = 'timed';
  state.currentGame.currentIndex = 0;
  state.currentGame.score = 0;
  state.currentGame.streakThisRound = 0;
  
  renderQuestion();
}

// -------------------------------------------------------------
// 9. SCREEN CONTROLLERS & GAME MECHANICS
// -------------------------------------------------------------
function renderQuestion() {
  stopTimer();
  const game = state.currentGame;
  
  if (game.type !== 'timed' && game.currentIndex >= game.limit) {
    showGameResults();
    return;
  }
  
  const screen = document.createElement('section');
  screen.className = 'screen active';
  screen.id = 'gameplay-screen';
  
  const feedbackOverlay = document.createElement('div');
  feedbackOverlay.className = 'feedback-overlay';
  feedbackOverlay.id = 'feedback-overlay';
  screen.appendChild(feedbackOverlay);
  
  const gameHeader = document.createElement('div');
  gameHeader.className = 'game-header';
  
  const backBtn = document.createElement('button');
  backBtn.className = 'back-btn';
  backBtn.innerHTML = '🔙';
  backBtn.title = 'Trở về trang chủ';
  backBtn.addEventListener('click', () => {
    if (confirm("Bạn muốn hủy lượt chơi này và quay về trang chủ?")) {
      playTone(300, 'sine', 0.08, 0.08);
      renderDashboard();
    }
  });
  gameHeader.appendChild(backBtn);
  
  if (game.type !== 'timed') {
    const progContainer = document.createElement('div');
    progContainer.className = 'progress-container';
    
    const progBar = document.createElement('div');
    progBar.className = 'progress-bar';
    const percent = (game.currentIndex / game.limit) * 100;
    progBar.style.width = `${percent}%`;
    
    progContainer.appendChild(progBar);
    gameHeader.appendChild(progContainer);
    
    const countIndicator = document.createElement('span');
    countIndicator.style.fontFamily = 'var(--font-title)';
    countIndicator.style.fontSize = '1.1rem';
    countIndicator.textContent = `${game.currentIndex + 1}/${game.limit}`;
    gameHeader.appendChild(countIndicator);
  } else {
    const streakIndicator = document.createElement('div');
    streakIndicator.style.fontFamily = 'var(--font-title)';
    streakIndicator.style.fontSize = '1.2rem';
    streakIndicator.innerHTML = `⚡ Điểm: <span style="color: var(--color-primary); font-weight: bold;">${game.score}</span> | Chuỗi: 🔥 <span style="color: var(--color-danger); font-weight: bold;">${state.profile.streak}</span>`;
    gameHeader.appendChild(streakIndicator);
  }
  screen.appendChild(gameHeader);
  
  let currentItem;
  if (game.type === 'timed') {
    const isVocab = Math.random() > 0.45;
    const pool = isVocab ? state.vocabData : state.grammarData;
    currentItem = pool[Math.floor(Math.random() * pool.length)];
    currentItem.isVocabItem = isVocab;
  } else {
    currentItem = game.questions[game.currentIndex];
  }
  
  if (game.type === 'timed') {
    const timerContainer = document.createElement('div');
    timerContainer.className = 'timer-container';
    
    const timerBar = document.createElement('div');
    timerBar.className = 'timer-bar';
    timerBar.id = 'timer-bar';
    
    timerContainer.appendChild(timerBar);
    screen.appendChild(timerContainer);
    
    startTimer(15, () => {
      triggerVisualFeedback(false);
      playWrongSound();
      
      state.profile.totalAnswered++;
      state.profile.streak = 0;
      saveProfile();
      
      setTimeout(() => {
        showGameResults();
      }, 1200);
    });
  }
  
  const questionBox = document.createElement('div');
  questionBox.className = 'question-box';
  
  const isListeningItem = (game.type === 'listening');
  const isVocabMatch = (game.type === 'vocab') || (game.type === 'timed' && currentItem.isVocabItem);
  
  if (isListeningItem) {
    const subTitle = document.createElement('h2');
    subTitle.textContent = "Nghe âm thanh và gõ lại từ:";
    questionBox.appendChild(subTitle);
    screen.appendChild(questionBox);
    
    const listenPanel = document.createElement('div');
    listenPanel.className = 'listening-panel';
    
    const listenBtn = document.createElement('button');
    listenBtn.className = 'audio-btn-large';
    listenBtn.innerHTML = '🔊';
    listenBtn.setAttribute('aria-label', 'Nghe từ phát âm');
    listenBtn.addEventListener('click', () => {
      speakText(currentItem.word);
    });
    listenPanel.appendChild(listenBtn);
    
    setTimeout(() => speakText(currentItem.word), 300);
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input-box';
    input.placeholder = 'Nhập từ tiếng Anh bạn nghe được...';
    input.autofocus = true;
    listenPanel.appendChild(input);
    
    const hintText = document.createElement('div');
    hintText.className = 'hints-text';
    hintText.id = 'listening-hint-box';
    hintText.innerHTML = `Gợi ý: Từ này có <strong>${currentItem.word.length}</strong> chữ cái.`;
    listenPanel.appendChild(hintText);
    
    const actionsRow = document.createElement('div');
    actionsRow.style.display = 'flex';
    actionsRow.style.gap = '1rem';
    actionsRow.style.marginTop = '0.5rem';
    
    const hintBtn = document.createElement('button');
    hintBtn.className = 'btn btn-secondary';
    hintBtn.textContent = '💡 Gợi ý chữ cái';
    hintBtn.addEventListener('click', () => {
      game.listeningHintCount++;
      playTone(550, 'sine', 0.05, 0.05);
      if (game.listeningHintCount === 1) {
        hintText.innerHTML = `Gợi ý: Cố lên! Chữ cái bắt đầu là: <span style="font-size: 1.3rem; color: var(--color-danger); font-weight: bold;">"${currentItem.word[0].toUpperCase()}"</span> (Độ dài: ${currentItem.word.length} chữ)`;
      } else {
        const masked = currentItem.word.split('').map((char, index) => index === 0 || index === currentItem.word.length - 1 ? char : '_').join(' ');
        hintText.innerHTML = `Gợi ý siêu cấp: <span style="font-size: 1.3rem; color: var(--color-danger); font-weight: bold; letter-spacing: 2px;">${masked}</span>`;
      }
    });
    actionsRow.appendChild(hintBtn);
    
    const checkBtn = document.createElement('button');
    checkBtn.className = 'btn';
    checkBtn.textContent = 'Gửi câu trả lời';
    
    const submitAnswer = () => {
      const val = input.value.trim().toLowerCase();
      if (!val) return;
      
      const correct = (val === currentItem.word.toLowerCase());
      evaluateAnswer(correct, currentItem.word, isListeningItem ? input : null);
    };
    
    checkBtn.addEventListener('click', submitAnswer);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') submitAnswer();
    });
    
    actionsRow.appendChild(checkBtn);
    listenPanel.appendChild(actionsRow);
    screen.appendChild(listenPanel);
    
  } else if (isVocabMatch) {
    const titleH2 = document.createElement('h2');
    titleH2.textContent = "Kéo từ tiếng Anh thả vào ô nghĩa tương ứng:";
    questionBox.appendChild(titleH2);
    
    const wordCard = document.createElement('div');
    wordCard.style.display = 'inline-flex';
    wordCard.style.alignItems = 'center';
    wordCard.style.gap = '0.8rem';
    wordCard.style.background = 'var(--color-primary)';
    wordCard.style.color = '#fff';
    wordCard.style.padding = '0.8rem 1.8rem';
    wordCard.style.borderRadius = '16px';
    wordCard.style.fontSize = '1.8rem';
    wordCard.style.fontFamily = 'var(--font-title)';
    wordCard.style.fontWeight = 'bold';
    wordCard.style.boxShadow = '0 6px 15px rgba(46,204,113,0.3)';
    wordCard.innerHTML = `<span>${currentItem.word}</span>`;

    // IPA display element
    const ipaDiv = document.createElement('div');
    ipaDiv.style.fontSize = '1rem';
    ipaDiv.style.marginTop = '0.4rem';
    ipaDiv.style.color = 'var(--color-text-light)';
    ipaDiv.textContent = 'IPA: loading...';

    // Fetch IPA from dictionary API
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${currentItem.word}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data[0].phonetics) {
          const phon = data[0].phonetics.find(p => p.text);
          if (phon) ipaDiv.textContent = `IPA: ${phon.text}`;
          else ipaDiv.textContent = 'IPA: N/A';
        } else {
          ipaDiv.textContent = 'IPA: N/A';
        }
      })
      .catch(() => { ipaDiv.textContent = 'IPA: N/A'; });
   wordCard.appendChild(ipaDiv);
    const audioBtn = document.createElement('button');
    audioBtn.style.background = 'rgba(255,255,255,0.2)';
    audioBtn.style.border = 'none';
    audioBtn.style.color = 'white';
    audioBtn.style.cursor = 'pointer';
    audioBtn.style.fontSize = '1.2rem';
    audioBtn.style.width = '35px';
    audioBtn.style.height = '35px';
    audioBtn.style.borderRadius = '50%';
    audioBtn.style.display = 'flex';
    audioBtn.style.alignItems = 'center';
    audioBtn.style.justifyContent = 'center';
    audioBtn.textContent = '🔊';
    audioBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      speakText(currentItem.word);
    });
    
    wordCard.appendChild(audioBtn);
    questionBox.appendChild(wordCard);
    // Auto-play pronunciation: British then American
    speakText(currentItem.word, 'en-GB');
    setTimeout(() => speakText(currentItem.word, 'en-US'), 800);
    screen.appendChild(questionBox);
    
    const layout = document.createElement('div');
    layout.className = 'drag-drop-layout';
    
    const dropZone = document.createElement('div');
    dropZone.className = 'drop-zone';
    dropZone.textContent = '📥 Thả bản dịch tiếng Việt vào đây';
    dropZone.setAttribute('role', 'status');
    layout.appendChild(dropZone);
    
    const choices = generateDistractors(currentItem.translation, 'vocab');
    
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'cards-container';
    
    choices.forEach(opt => {
      const card = document.createElement('div');
      card.className = 'draggable-card';
      card.textContent = opt;
      card.draggable = true;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      
      card.addEventListener('dragstart', (e) => {
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', opt);
      });
      
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
      });
      
      card.addEventListener('click', () => {
        const correct = (opt === currentItem.translation);
        dropZone.textContent = opt;
        if (correct) {
          dropZone.className = 'drop-zone correct-drop';
        } else {
          dropZone.className = 'drop-zone wrong-drop';
        }
        evaluateAnswer(correct, currentItem.translation, null);
      });
      
      cardsContainer.appendChild(card);
    });
    
    layout.appendChild(cardsContainer);
    screen.appendChild(layout);
    
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const val = e.dataTransfer.getData('text/plain');
      if (!val) return;
      
      dropZone.textContent = val;
      const correct = (val === currentItem.translation);
      if (correct) {
        dropZone.className = 'drop-zone correct-drop';
      } else {
        dropZone.className = 'drop-zone wrong-drop';
      }
      evaluateAnswer(correct, currentItem.translation, null);
    });
    
  } else {
    const titleH2 = document.createElement('h2');
    titleH2.textContent = "Chọn đáp án đúng nhất để điền vào chỗ trống:";
    questionBox.appendChild(titleH2);
    
    const sentenceP = document.createElement('p');
    sentenceP.className = 'grammar-sentence';
    sentenceP.innerHTML = currentItem.sentence.replace('___', '<strong>___</strong>');
    questionBox.appendChild(sentenceP);
    
    const playSentenceBtn = document.createElement('button');
    playSentenceBtn.className = 'btn btn-secondary';
    playSentenceBtn.style.marginTop = '1rem';
    playSentenceBtn.innerHTML = '🔊 Nghe cả câu';
    playSentenceBtn.addEventListener('click', () => {
      const fullText = currentItem.sentence.replace('___', currentItem.missingWord);
      speakText(fullText);
    });
    questionBox.appendChild(playSentenceBtn);
    screen.appendChild(questionBox);
    
    const choices = shuffleArray(currentItem.options);
    const optionsGrid = document.createElement('div');
    optionsGrid.className = 'options-grid';
    
    choices.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = opt;
      
      btn.addEventListener('click', () => {
        const correct = (opt === currentItem.missingWord);
        if (correct) {
          btn.style.background = 'var(--color-primary)';
          btn.style.color = '#fff';
          btn.style.borderColor = 'var(--color-primary-dark)';
        } else {
          btn.style.background = 'var(--color-danger)';
          btn.style.color = '#fff';
          btn.style.borderColor = 'var(--color-danger)';
        }
        
        if (!correct) {
          Array.from(optionsGrid.children).forEach(childBtn => {
            if (childBtn.textContent === currentItem.missingWord) {
              childBtn.style.background = 'var(--color-primary)';
              childBtn.style.color = '#fff';
              childBtn.style.border = '2px solid var(--color-primary-dark)';
            }
          });
        }
        
        evaluateAnswer(correct, currentItem.missingWord, null);
      });
      
      optionsGrid.appendChild(btn);
    });
    
    screen.appendChild(optionsGrid);
  }
  
  app.innerHTML = '';
  app.appendChild(screen);
}

// -------------------------------------------------------------
// 10. ANSWER EVALUATIONS
// -------------------------------------------------------------
function evaluateAnswer(correct, correctAnswerString, inputElement) {
  stopTimer();
  const game = state.currentGame;
  
  if (inputElement) {
    inputElement.classList.add(correct ? 'correct' : 'wrong');
    inputElement.disabled = true;
  }
  
  state.profile.totalAnswered++;
  
  if (correct) {
    state.profile.totalCorrect++;
    state.profile.streak++;
    game.score++;
    game.streakThisRound++;
    
    const xpGain = game.type === 'timed' ? 20 : 10;
    state.profile.xp += xpGain;
    
    if (state.profile.streak > state.profile.maxStreak) {
      state.profile.maxStreak = state.profile.streak;
    }
    
    playCorrectSound();
    triggerVisualFeedback(true);
  } else {
    state.profile.streak = 0;
    playWrongSound();
    triggerVisualFeedback(false);
    
    const feedbackBox = document.createElement('div');
    feedbackBox.style.marginTop = '1.5rem';
    feedbackBox.style.textAlign = 'center';
    feedbackBox.style.fontFamily = 'var(--font-title)';
    feedbackBox.style.fontSize = '1.1rem';
    feedbackBox.style.color = 'var(--color-danger)';
    feedbackBox.innerHTML = `❌ Sai rồi! Đáp án đúng là: <strong style="color: var(--color-primary-dark); font-size: 1.3rem;">"${correctAnswerString}"</strong>`;
    
    const activeScreen = document.getElementById('gameplay-screen');
    if (activeScreen) {
      activeScreen.appendChild(feedbackBox);
    }
  }
  
  saveProfile();
  
  setTimeout(() => {
    if (game.type === 'timed') {
      if (correct) {
        renderQuestion();
      } else {
        showGameResults();
      }
    } else {
      game.currentIndex++;
      renderQuestion();
    }
  }, correct ? 1200 : 2500);
}

function triggerVisualFeedback(isCorrect) {
  const overlay = document.getElementById('feedback-overlay');
  if (overlay) {
    overlay.className = isCorrect ? 'feedback-overlay correct-flash' : 'feedback-overlay wrong-flash';
    setTimeout(() => {
      overlay.className = 'feedback-overlay';
    }, 400);
  }
}

// -------------------------------------------------------------
// 11. TIMEOUT TIMER SYSTEMS
// -------------------------------------------------------------
function startTimer(seconds, onExpire) {
  state.timer.duration = seconds;
  state.timer.remaining = seconds;
  
  const bar = document.getElementById('timer-bar');
  if (bar) {
    bar.style.width = '100%';
    bar.style.backgroundColor = 'var(--color-primary)';
  }
  
  clearInterval(state.timer.intervalId);
  state.timer.intervalId = setInterval(() => {
    state.timer.remaining -= 0.1;
    const percent = (state.timer.remaining / state.timer.duration) * 100;
    
    if (bar) {
      bar.style.width = `${percent}%`;
      if (percent < 30) {
        bar.style.backgroundColor = 'var(--color-danger)';
      } else if (percent < 60) {
        bar.style.backgroundColor = 'var(--color-accent)';
      }
    }
    
    if (state.timer.remaining <= 0) {
      clearInterval(state.timer.intervalId);
      onExpire();
    }
  }, 100);
}

function stopTimer() {
  if (state.timer.intervalId) {
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
  }
}

// -------------------------------------------------------------
// 12. RESULTS SCREEN AND STATS OVERVIEWS
// -------------------------------------------------------------
function showGameResults() {
  stopTimer();
  const game = state.currentGame;
  
  const screen = document.createElement('section');
  screen.className = 'screen active';
  screen.id = 'results-screen';
  
  const card = document.createElement('div');
  card.className = 'results-card';
  
  const title = document.createElement('h2');
  title.textContent = '🎉 Thử Thách Hoàn Thành! 🎉';
  card.appendChild(title);
  
  const subtitle = document.createElement('p');
  subtitle.style.color = 'var(--color-text-light)';
  subtitle.style.fontSize = '1.1rem';
  
  if (game.type === 'timed') {
    title.textContent = '💀 Game Over! 💀';
    subtitle.innerHTML = `Bạn đã hoàn thành thử thách thời gian. Hãy rèn luyện để phá kỷ lục mới nhé!`;
  } else {
    subtitle.innerHTML = `Chúc mừng bạn đã xuất sắc vượt qua vòng luyện tập <strong>${getModeName(game.type)}</strong>!`;
  }
  card.appendChild(subtitle);
  
  if (game.score > 0) {
    setTimeout(() => triggerConfetti(screen), 200);
  }
  
  const scoreDiv = document.createElement('div');
  scoreDiv.className = 'score-display';
  if (game.type === 'timed') {
    scoreDiv.textContent = `${game.score} Điểm`;
  } else {
    scoreDiv.textContent = `${game.score} / ${game.limit}`;
  }
  card.appendChild(scoreDiv);
  
  const statsRow = document.createElement('div');
  statsRow.className = 'results-stats';
  
  const roundAccuracy = game.type === 'timed' ? 100 : Math.round((game.score / game.limit) * 100);
  const xpEarned = game.score * (game.type === 'timed' ? 20 : 10);
  
  statsRow.appendChild(createResultStatItem('Độ chính xác 🎯', `${roundAccuracy}%`));
  statsRow.appendChild(createResultStatItem('Kinh nghiệm nhận được ⚡', `+${xpEarned} XP`));
  statsRow.appendChild(createResultStatItem('Chuỗi thắng vòng này 🔥', `${game.streakThisRound} câu`));
  card.appendChild(statsRow);
  
  const btnGroup = document.createElement('div');
  btnGroup.style.display = 'flex';
  btnGroup.style.justifyContent = 'center';
  btnGroup.style.gap = '1.2rem';
  btnGroup.style.marginTop = '2rem';
  
  const homeBtn = document.createElement('button');
  homeBtn.className = 'btn btn-secondary';
  homeBtn.textContent = '🏠 Về trang chủ';
  homeBtn.addEventListener('click', () => {
    playTone(400, 'sine', 0.08, 0.08);
    renderDashboard();
  });
  btnGroup.appendChild(homeBtn);
  
  const replayBtn = document.createElement('button');
  replayBtn.className = 'btn';
  replayBtn.textContent = '🔄 Chơi lại';
  replayBtn.addEventListener('click', () => {
    playTone(450, 'sine', 0.08, 0.08);
    if (game.type === 'timed') {
      startTimedGame();
    } else {
      startStandardGame(game.type);
    }
  });
  btnGroup.appendChild(replayBtn);
  
  card.appendChild(btnGroup);
  screen.appendChild(card);
  
  app.innerHTML = '';
  app.appendChild(screen);
}

function createResultStatItem(label, value) {
  const item = document.createElement('div');
  item.className = 'stat-item';
  item.innerHTML = `
    <span class="label" style="display: block; margin-bottom: 0.3rem;">${label}</span>
    <span class="value">${value}</span>
  `;
  return item;
}

function getModeName(type) {
  if (type === 'vocab') return "Từ vựng Matcher";
  if (type === 'grammar') return "Ngữ pháp Chiến thần";
  if (type === 'listening') return "Nghe hiểu Siêu cấp";
  return "Thách thức thời gian";
}

// -------------------------------------------------------------
// 13. UTILITY ASSISTANTS
// -------------------------------------------------------------
function shuffleArray(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateDistractors(correctAnswer, type) {
  let pool = [];
  if (type === 'vocab') {
    pool = state.vocabData.map(item => item.translation);
  } else {
    pool = state.grammarData.reduce((acc, curr) => acc.concat(curr.options), []);
  }
  
  pool = [...new Set(pool)].filter(ans => ans !== correctAnswer);
  
  const distractors = shuffleArray(pool).slice(0, 3);
  distractors.push(correctAnswer);
  
  return shuffleArray(distractors);
}

// -------------------------------------------------------------
// 14. INITIALIZE APP ENTRY POINT
// -------------------------------------------------------------
async function initApp() {
  loadProfile();
  initTheme();
  
  const loader = document.createElement('section');
  loader.className = 'screen active';
  loader.style.textAlign = 'center';
  loader.style.padding = '3rem';
  loader.innerHTML = `
    <div style="font-size: 3rem; animation: spin 1.5s linear infinite; margin-bottom: 1.5rem; display: inline-block;">💫</div>
    <h2 style="font-family: var(--font-title);">Đang tải dữ liệu học tập...</h2>
    <p style="color: var(--color-text-light); margin-top: 0.5rem;">Chuẩn bị bắt đầu hành trình chinh phục tiếng Anh 9!</p>
    <style>
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
  `;
  app.appendChild(loader);
  
  await loadGameData();
  renderDashboard();
}

document.addEventListener('DOMContentLoaded', initApp);
