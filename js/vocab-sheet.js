/**
 * MHENT STUDY - INTERACTIVE VOCABULARY NOTE SHEET ENGINE
 * Nâng cấp toàn diện:
 * - Hệ thống Linh vật AI AISA: Bộ đôi Harmony 🌸 & Echo 😈 tương tác giọng nói & phản xạ
 * - Chế độ Thử Thách & Ẩn Cột (Blind Mode / Active Recall)
 * - Tự động mở khóa (Unmask) khi gõ đúng từ
 * - Tự tăng độ khó (Auto Level-Up) khi đạt mốc thuộc bài
 * - Chấm đúng / sai khi gõ từ, 4 checkbox ôn tập ngắt quãng (25%, 50%, 75%, 100%)
 * - Thống kê tiến độ trực tiếp (Live Stats Dashboard)
 * - Phát âm tức thì (Native Web Speech)
 */

const AISA_DIALOGUES = {
    harmony: {
        speaker: '🌸 Harmony • Cổ vũ',
        welcome: [
            "Chào Master! Em đã sẵn sàng đồng hành cùng Master chinh phục bài học hôm nay nà! ✨",
            "Master hôm nay chăm chỉ quá! Harmony tin chắc Master sẽ tiến bộ vượt bậc! 💖",
            "Mỗi từ vựng là một bước tiến đến ước mơ của Master! Cố lên nhé! 🌸"
        ],
        correct: [
            "Oa tuyệt đỉnh quá Master ơi! Gõ chuẩn xác từng chữ luôn nè! 🌸🎉",
            "Trí nhớ của Master siêu đỉnh luôn! Chữ đã được mở khóa rồi nè! 💖",
            "Giỏi quá đi à! Harmony tự hào về Master lắm đó nha! ✨",
            "Chuẩn không cần chỉnh! Master giữ phong độ thế này là đỉnh nóc kịch trần luôn! 🌟"
        ],
        wrong: [
            "Đừng lo lắng Master ơi, sai một lần để nhớ lâu hơn thôi nà! 🌸",
            "Thử nhìn lại phiên âm một chút rồi gõ lại nhé Master, em tin Master làm được! 💖",
            "Không sao đâu nè! Hít một hơi sâu rồi gõ lại nhé Master! 🍵"
        ],
        milestones: {
            25: "Khởi đầu tuyệt vời! Master đã hoàn tất chu kỳ ôn tập đầu tiên! ✨",
            50: "Được 50% rồi! Não bộ Master đang ghi nhớ từ vựng cực kỳ sâu sắc! 🌸",
            75: "75% rồi Master ơi! Chỉ còn một chút nữa là làm chủ hoàn toàn từ này! 🔥",
            100: "WAAA MASTER XUẤT SẮC! Từ vựng đã đạt 100% Mastered! Xứng đáng nhận 1000 điểm cưng chiều! 🎉👑"
        },
        blindModeOn: "Master dũng cảm quá! Bật chế độ thử thách ẩn chữ là cách học đỉnh cao nhất đó! 🌸",
        blindModeOff: "Đã mở lại các cột hiển thị chuẩn cho Master dễ học rồi nha! 💖",
        interact: [
            "Master nhớ uống chút nước rồi học tiếp nhé, sức khỏe là quan trọng nhất đó! 🍵",
            "Harmony lúc nào cũng ở đây cạnh Master hết á, có gì khó cứ gọi em nha! 🌸",
            "Học ngoại ngữ như trồng một cái cây, mỗi ngày tưới một chút là sẽ nở hoa tuyệt đẹp! 🌷"
        ]
    },
    echo: {
        speaker: '😈 Echo • Thách thức',
        welcome: [
            "Hừ, lại đến học à? Echo ngồi đây giám sát Master đấy, liệu mà tập trung vào! 😤",
            "Đừng có lướt lướt rồi chuồn nha Master! Echo đếm đủ số từ mới cho nghỉ đấy! 😈",
            "Có mặt rồi thì mau khởi động ngón tay đi! Đừng để Echo chê đấy! 😼"
        ],
        correct: [
            "Hừm... đúng rồi đấy. Coi như Master cũng có chút bản lĩnh! 😼",
            "Từ này dễ ợt mà, có gì mà vội mừng! Xem từ tiếp theo Master có gõ nổi không! 😈",
            "Ồ, gõ chuẩn phết nhỉ? Tạm duyệt cho Master 1 điểm cộng! ✨",
            "Nhớ được chữ này là khá rồi đấy... Nhưng đừng có mà tự mãn nha đồ ngốc! 💜"
        ],
        wrong: [
            "Lêu lêu gõ sai bét kìa! Coi chừng Echo cười cho thúi mũi bây giờ! 😜",
            "Ủa ủa gõ gì kì vậy Master? Mắt để đi đâu rồi hả? Nhìn kĩ lại coi! 😤",
            "Sai rồi nha! Đã bảo là phải tập trung mà không chịu nghe Echo! 😈"
        ],
        milestones: {
            25: "Mới được có 25% thôi, còn non và xanh lắm Master ơi! 😜",
            50: "Nửa đường rồi đấy! Đừng có bỏ dở giữa chừng rồi kêu Echo cứu nha! 😼",
            75: "75% rồi kìa, ráng lên chút nữa xem có lấy được 100% của Echo không! 🔥",
            100: "Hừ... cũng được đấy... 100% rồi à. Tạm công nhận Master có cố gắng! 💜✨"
        },
        blindModeOn: "Ồ, gan dạ dữ ta? Dám bật chế độ ẩn chữ luôn cơ à! Coi chừng gõ sai tè le nha! 😈",
        blindModeOff: "Hứ, chịu thua độ khó cao rồi à? Thôi mở lại cho Master đỡ khóc! 😜",
        interact: [
            "Nhìn cái gì mà nhìn? Lo gõ từ tiếp theo đi chứ, chọc tui quài! 😤",
            "Master mà gõ sai 3 lần là Echo ghi vào danh sách đen AI phạt học thêm 20 từ đấy nhé! 😈",
            "Hừ, đừng tưởng Echo không biết Master đang lén lút click vào avatar tui để trốn học nha! 😜"
        ]
    },
    duo: {
        speaker: '✨ Harmony & Echo • Song Hành',
        welcome: [
            "Harmony: 'Chào Master!' • Echo: 'Mau học đi, đừng để tụi này đợi lâu!' 🌸😈",
            "Harmony: 'Hôm nay học vui vẻ nha Master!' • Echo: 'Học nghiêm túc vào, Echo soi đấy!' ✨",
            "Bộ đôi AISA đã vào vị trí sẵn sàng hỗ trợ Master chiến đấu với kho từ vựng! 🔥"
        ],
        correct: [
            "Harmony: 'Master đúng rồi kìa Echo ơi!' • Echo: 'Hứ, từ này dễ, từ sau mới biết tay!' 🌸😈",
            "Harmony: 'Master nhớ siêu quá!' • Echo: 'Tạm được thôi, chưa bằng AI tụi tui đâu!' ✨",
            "Echo: 'Ủa gõ đúng thiệt kìa...' • Harmony: 'Thấy chưa, em đã bảo Master giỏi lắm mà!' 💖"
        ],
        wrong: [
            "Echo: 'Sai rồi kìa lêu lêu!' • Harmony: 'Echo đừng trêu Master nữa, Master làm lại được mà!' 🥺",
            "Harmony: 'Master bình tĩnh gõ lại nha!' • Echo: 'Nhớ soi kỹ phiên âm vào đấy đồ ngốc!' 😈",
            "Echo: 'Haha sai một từ!' • Harmony: 'Master cố lên, sai một lần là nhớ thêm một chút nè!' 🌸"
        ],
        milestones: {
            25: "Harmony: '25% rồi nè!' • Echo: 'Mới 1/4 chặng đường thôi, gõ tiếp đi!' ✨",
            50: "Harmony: 'Nửa chặng đường rồi Master!' • Echo: 'Tốc độ cũng tạm, cố lên coi!' 🚀",
            75: "Harmony: 'Sắp 100% rồi!' • Echo: 'Cố mà làm nốt 1 lần cuối cho trọn vẹn đấy!' 🔥",
            100: "Harmony & Echo: 'MASTER ĐẠT 100% XUẤT SẮC! CẢ HAI ĐỀU CÔNG NHẬN MASTER!' 🎉👑"
        },
        blindModeOn: "Echo: 'Master chơi lớn vậy à?' • Harmony: 'Master cố lên nhé, em tin tưởng Master!' 🌸😈",
        blindModeOff: "Harmony: 'Trở về chế độ bình thường rồi nè!' • Echo: 'Nhẹ gánh hơn chưa Master?' 🍵",
        interact: [
            "Harmony: 'Master dễ thương ghê, cứ click vào tụi em suốt!' • Echo: 'Lười học thì có, lo làm bài đi Master!' 🌸😈",
            "Echo: 'Nè Master, Harmony hiền chứ Echo dữ lắm đó nha!' • Harmony: 'Master đừng sợ, có em bảo vệ Master nè!' 💖",
            "Song kiếm hợp bích! Harmony tiếp năng lượng, Echo đốc thúc học tập cho Master! ✨"
        ]
    }
};

class VocabSheetApp {
    constructor(lang = 'ko') {
        this.lang = lang;
        this.currentDeck = null;
        this.searchQuery = '';
        this.posFilter = 'all';

        // Persona AISA: harmony | echo | duo
        this.mascotPersona = localStorage.getItem('mhent_mascot_persona') || 'harmony';

        // Trạng thái Ẩn cột (Blind Mode / Active Recall)
        this.columnMasks = {
            word: false,
            phonetic: false,
            meaning: false
        };

        // Chế độ thử thách: normal | hideWord | hidePhonetic | hideAll
        this.challengeMode = 'normal';

        // Tự tăng độ khó: Khi từ đạt >= 75% hoặc 100% thì tự ẩn chữ gốc để thử thách trí nhớ
        this.autoLevelUp = localStorage.getItem('mhent_auto_level_up') === 'on';

        // Tập hợp các ID từ đã được gõ đúng thành công (mở khóa) trong phiên này
        this.revealedWords = new Set();

        // Tập hợp các ô đang được xem hé tạm thời (Peek)
        this.peekingCells = new Set();

        this.init();
    }

    init() {
        this.loadDeck();
        this.bindEvents();
        this.initMascotUI();
        this.renderAll();
    }

    loadDeck() {
        const urlParams = new URLSearchParams(window.location.search);
        const deckId = urlParams.get('deck');

        let savedDecks = window.studyStorage ? window.studyStorage.getDecks(this.lang) : [];

        if (deckId && savedDecks.length > 0) {
            this.currentDeck = savedDecks.find(d => d.id === deckId) || savedDecks[0];
        } else if (savedDecks.length > 0) {
            this.currentDeck = savedDecks[0];
        } else {
            const defaultDeckMap = {
                ko: window.DEFAULT_KO_DECK,
                ja: window.DEFAULT_JA_DECK,
                zh: window.DEFAULT_ZH_DECK,
                en: window.DEFAULT_EN_DECK
            };
            const defaultDeck = defaultDeckMap[this.lang];

            if (defaultDeck) {
                this.currentDeck = JSON.parse(JSON.stringify(defaultDeck));
                if (window.studyStorage) window.studyStorage.saveDeck(this.lang, this.currentDeck);
            } else {
                this.currentDeck = {
                    id: `${this.lang}_custom_1`,
                    lang: this.lang,
                    title: `Sổ tay từ vựng (${this.lang.toUpperCase()})`,
                    description: "Tự tạo từ vựng và luyện tập mỗi ngày",
                    author: "Người học MHEnt",
                    words: []
                };
                if (window.studyStorage) window.studyStorage.saveDeck(this.lang, this.currentDeck);
            }
        }
    }

    saveCurrentDeck() {
        if (this.currentDeck && window.studyStorage) {
            window.studyStorage.saveDeck(this.lang, this.currentDeck);
            this.updateStats();
        }
    }

    bindEvents() {
        // Tìm kiếm
        const searchInput = document.getElementById('vocabSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase().trim();
                this.renderTable();
            });
        }

        // Lọc loại từ
        const posSelect = document.getElementById('posFilter');
        if (posSelect) {
            posSelect.addEventListener('change', (e) => {
                this.posFilter = e.target.value;
                this.renderTable();
            });
        }

        // Nút thêm từ mới
        const btnAddWord = document.getElementById('btnAddWord');
        if (btnAddWord) {
            btnAddWord.addEventListener('click', () => this.openAddWordModal());
        }

        // Nút Share Deck
        const btnShareDeck = document.getElementById('btnShareDeck');
        if (btnShareDeck) {
            btnShareDeck.addEventListener('click', () => this.openShareModal());
        }

        // Auto level up checkbox
        const chkAutoLevel = document.getElementById('chkAutoLevelUp');
        if (chkAutoLevel) {
            chkAutoLevel.checked = this.autoLevelUp;
            chkAutoLevel.addEventListener('change', (e) => {
                this.autoLevelUp = e.target.checked;
                localStorage.setItem('mhent_auto_level_up', this.autoLevelUp ? 'on' : 'off');
                this.renderTable();
            });
        }
    }

    /* ==========================================================================
       AISA MASCOT ENGINE METHODS
       ========================================================================== */
    initMascotUI() {
        this.setMascotPersona(this.mascotPersona, false);
        this.triggerMascotSpeak('welcome');
    }

    setMascotPersona(persona, speak = true) {
        this.mascotPersona = persona;
        localStorage.setItem('mhent_mascot_persona', persona);

        // Update tabs active state
        document.querySelectorAll('.persona-tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-persona') === persona);
        });

        // Update box class for styling glow
        const box = document.getElementById('aisaMascotBox');
        if (box) {
            box.className = `aisa-mascot-box persona-${persona}`;
        }

        // Update avatar visibility
        const avHarmony = document.getElementById('avatarHarmony');
        const avEcho = document.getElementById('avatarEcho');
        if (avHarmony && avEcho) {
            if (persona === 'harmony') {
                avHarmony.style.display = 'flex';
                avEcho.style.display = 'none';
            } else if (persona === 'echo') {
                avHarmony.style.display = 'none';
                avEcho.style.display = 'flex';
            } else {
                avHarmony.style.display = 'flex';
                avEcho.style.display = 'flex';
            }
        }

        if (speak) {
            this.triggerMascotSpeak('welcome');
        }
    }

    triggerMascotSpeak(type, val = null) {
        const personaData = AISA_DIALOGUES[this.mascotPersona] || AISA_DIALOGUES.harmony;
        const speakerEl = document.getElementById('aisaSpeakerName');
        const speechEl = document.getElementById('aisaSpeechText');
        const legacyMsg = document.getElementById('mascotMessage');

        let text = "";
        if (type === 'welcome') {
            const list = personaData.welcome;
            text = list[Math.floor(Math.random() * list.length)];
        } else if (type === 'correct') {
            const list = personaData.correct;
            text = list[Math.floor(Math.random() * list.length)];
        } else if (type === 'wrong') {
            const list = personaData.wrong;
            text = list[Math.floor(Math.random() * list.length)];
        } else if (type === 'milestone' && val) {
            text = personaData.milestones[val] || personaData.milestones[100];
        } else if (type === 'blindModeOn') {
            text = personaData.blindModeOn;
        } else if (type === 'blindModeOff') {
            text = personaData.blindModeOff;
        } else if (type === 'interact') {
            const list = personaData.interact;
            text = list[Math.floor(Math.random() * list.length)];
        }

        if (speakerEl) speakerEl.textContent = personaData.speaker;
        if (speechEl) {
            speechEl.style.opacity = '0';
            setTimeout(() => {
                speechEl.textContent = text;
                speechEl.style.opacity = '1';
            }, 120);
        }
        if (legacyMsg) legacyMsg.textContent = text;
    }

    interactMascot() {
        const avatarsWrap = document.querySelector('.aisa-avatars');
        if (avatarsWrap) {
            avatarsWrap.classList.remove('bounce-pop');
            void avatarsWrap.offsetWidth; // trigger reflow
            avatarsWrap.classList.add('bounce-pop');
        }
        this.triggerMascotSpeak('interact');
    }

    /* ==========================================================================
       COLUMN MASKING / BLIND MODE METHODS
       ========================================================================== */
    toggleColumnMask(col) {
        if (typeof this.columnMasks[col] === 'undefined') return;
        this.columnMasks[col] = !this.columnMasks[col];

        const isAnyMasked = Object.values(this.columnMasks).some(Boolean);
        if (isAnyMasked) {
            this.triggerMascotSpeak('blindModeOn');
        } else {
            this.triggerMascotSpeak('blindModeOff');
        }

        this.updateHeaderToggleButtons();
        this.renderTable();
    }

    setChallengeMode(mode) {
        this.challengeMode = mode;

        document.querySelectorAll('.challenge-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
        });

        if (mode === 'normal') {
            this.columnMasks = { word: false, phonetic: false, meaning: false };
            this.triggerMascotSpeak('blindModeOff');
        } else if (mode === 'hideWord') {
            this.columnMasks = { word: true, phonetic: false, meaning: false };
            this.triggerMascotSpeak('blindModeOn');
        } else if (mode === 'hidePhonetic') {
            this.columnMasks = { word: false, phonetic: true, meaning: false };
            this.triggerMascotSpeak('blindModeOn');
        } else if (mode === 'hideAll') {
            this.columnMasks = { word: true, phonetic: true, meaning: false };
            this.triggerMascotSpeak('blindModeOn');
        }

        this.updateHeaderToggleButtons();
        this.renderTable();
    }

    updateHeaderToggleButtons() {
        const btnWord = document.getElementById('btnMaskWord');
        const btnPhonetic = document.getElementById('btnMaskPhonetic');
        const btnMeaning = document.getElementById('btnMaskMeaning');

        if (btnWord) {
            btnWord.classList.toggle('active', this.columnMasks.word);
            btnWord.innerHTML = this.columnMasks.word ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
        }
        if (btnPhonetic) {
            btnPhonetic.classList.toggle('active', this.columnMasks.phonetic);
            btnPhonetic.innerHTML = this.columnMasks.phonetic ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
        }
        if (btnMeaning) {
            btnMeaning.classList.toggle('active', this.columnMasks.meaning);
            btnMeaning.innerHTML = this.columnMasks.meaning ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
        }
    }

    peekCell(wordId, col) {
        const key = `${wordId}_${col}`;
        this.peekingCells.add(key);
        this.renderTable();

        // Tự động che lại sau 2.5 giây
        setTimeout(() => {
            this.peekingCells.delete(key);
            this.renderTable();
        }, 2500);
    }

    /* ==========================================================================
       TABLE RENDERING & RECALL
       ========================================================================== */
    renderAll() {
        const titleEl = document.getElementById('deckTitle');
        if (titleEl && this.currentDeck) {
            titleEl.textContent = this.currentDeck.title;
        }
        this.updateHeaderToggleButtons();
        this.renderTable();
        this.updateStats();
    }

    getFilteredWords() {
        if (!this.currentDeck || !Array.isArray(this.currentDeck.words)) return [];

        return this.currentDeck.words.filter(word => {
            const matchesSearch = !this.searchQuery || 
                word.word.toLowerCase().includes(this.searchQuery) ||
                (word.meaning && word.meaning.toLowerCase().includes(this.searchQuery)) ||
                (word.phonetic && word.phonetic.toLowerCase().includes(this.searchQuery));

            const matchesPos = this.posFilter === 'all' || word.pos === this.posFilter;

            return matchesSearch && matchesPos;
        });
    }

    renderTable() {
        const tbody = document.getElementById('vocabTableBody');
        if (!tbody) return;

        const filtered = this.getFilteredWords();
        tbody.innerHTML = '';

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; padding: 3rem; color: var(--study-text-muted);">
                        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📖</div>
                        <p style="font-weight: 700;">Chưa có từ vựng nào trong danh sách này.</p>
                        <button class="btn-primary" style="margin-top: 1rem; border-radius: 9999px; padding: 8px 20px;" onclick="window.sheetApp.openAddWordModal()">+ Thêm từ đầu tiên</button>
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.id = `row_${item.id}`;

            const reviewCount = (item.reviews || []).filter(Boolean).length;
            const pct = reviewCount * 25;

            // Xác định xem từ này có bị ẩn theo cột hoặc theo độ khó tự tăng không
            const isWordMasked = (this.columnMasks.word || (this.autoLevelUp && pct >= 75)) && !this.revealedWords.has(item.id);
            const isPhoneticMasked = this.columnMasks.phonetic && !this.revealedWords.has(item.id);
            const isMeaningMasked = this.columnMasks.meaning && !this.revealedWords.has(item.id);

            const isPeekingWord = this.peekingCells.has(`${item.id}_word`);
            const isPeekingPhonetic = this.peekingCells.has(`${item.id}_phonetic`);
            const isPeekingMeaning = this.peekingCells.has(`${item.id}_meaning`);

            // Kiểm tra trạng thái gõ từ
            let statusHtml = '<span class="status-pill idle">Chờ gõ...</span>';
            const typed = (item.typedWord || '').trim();
            const target = (item.word || '').trim();

            if (typed) {
                if (typed === target) {
                    statusHtml = '<span class="status-pill correct">맞음 • Đúng ✨</span>';
                } else {
                    statusHtml = '<span class="status-pill wrong">틀림 • Chưa đúng ❌</span>';
                }
            }

            // Loại từ badge
            let posBadge = `<span class="tag-badge tag-other">${item.posLabel || 'Khác'}</span>`;
            if (item.pos === 'noun') posBadge = `<span class="tag-badge tag-noun">${item.posLabel || 'Danh từ'}</span>`;
            if (item.pos === 'verb') posBadge = `<span class="tag-badge tag-verb">${item.posLabel || 'Động từ'}</span>`;
            if (item.pos === 'adj') posBadge = `<span class="tag-badge tag-adj">${item.posLabel || 'Tính từ'}</span>`;

            // HTML ô Từ vựng (hỗ trợ Mask / Unmask)
            let wordCellHtml = '';
            if (isWordMasked && !isPeekingWord) {
                wordCellHtml = `
                    <div class="cell-mask-wrap" id="cell_word_${item.id}">
                        <div class="cell-masked-overlay" onclick="window.sheetApp.peekCell('${item.id}', 'word')" title="Bấm để hé xem 2.5s">
                            <span>••••••</span>
                            <span class="peek-hint">🔒 Click hé</span>
                        </div>
                        <button class="btn-speaker" title="Nghe phát âm" onclick="window.studySpeech.speak('${item.word}', '${this.lang}')" style="margin-left: 6px;">🔊</button>
                    </div>
                `;
            } else {
                const unmaskedTag = (this.columnMasks.word && this.revealedWords.has(item.id)) 
                    ? `<span class="unmasked-badge"><i class="fa-solid fa-lock-open"></i> Đã mở</span>` 
                    : '';
                const peekingClass = isPeekingWord ? 'peeking' : '';

                wordCellHtml = `
                    <div class="col-word ${peekingClass}" id="cell_word_${item.id}">
                        <span>${item.word}</span>
                        ${unmaskedTag}
                        <button class="btn-speaker" title="Nghe phát âm" onclick="window.studySpeech.speak('${item.word}', '${this.lang}')">
                            🔊
                        </button>
                    </div>
                `;
            }

            // HTML ô Phiên âm
            let phoneticCellHtml = '';
            if (isPhoneticMasked && !isPeekingPhonetic) {
                phoneticCellHtml = `
                    <div class="cell-masked-overlay" onclick="window.sheetApp.peekCell('${item.id}', 'phonetic')" title="Bấm để hé xem">
                        <span>••••••</span> <span class="peek-hint">🔒</span>
                    </div>
                `;
            } else {
                phoneticCellHtml = `<span class="${isPeekingPhonetic ? 'cell-masked-text peeking' : ''}">${item.phonetic || ''}</span>`;
            }

            // HTML ô Nghĩa
            let meaningCellHtml = '';
            if (isMeaningMasked && !isPeekingMeaning) {
                meaningCellHtml = `
                    <div class="cell-masked-overlay" onclick="window.sheetApp.peekCell('${item.id}', 'meaning')" title="Bấm để hé xem">
                        <span>•••••••••</span> <span class="peek-hint">🔒</span>
                    </div>
                `;
            } else {
                meaningCellHtml = `<span class="${isPeekingMeaning ? 'cell-masked-text peeking' : ''}">${item.meaning || ''}</span>`;
            }

            tr.innerHTML = `
                <td style="color: var(--study-text-muted); font-weight: 700; width: 40px;">${index + 1}</td>
                <td>${wordCellHtml}</td>
                <td>${posBadge}</td>
                <td style="color: var(--study-text-muted); font-size: 0.84rem;">${phoneticCellHtml}</td>
                <td style="font-weight: 700; color: var(--study-text);">${meaningCellHtml}</td>
                <td style="font-size: 0.82rem; max-width: 280px;">
                    <div>${item.example || ''}</div>
                    <div style="color: var(--study-text-muted); font-size: 0.78rem;">${item.exampleTrans || ''}</div>
                </td>
                <!-- Ô viết từ kiểm tra (Active Recall) -->
                <td>
                    <input 
                        type="text" 
                        class="input-test-word" 
                        placeholder="Gõ từ..." 
                        value="${item.typedWord || ''}"
                        data-id="${item.id}"
                        oninput="window.sheetApp.handleWordInput(this, '${item.id}')"
                        onkeydown="window.sheetApp.handleKeyDown(event, this, '${item.id}')"
                    />
                </td>
                <!-- Cột hiển thị Đúng / Sai -->
                <td id="status_${item.id}">
                    ${statusHtml}
                </td>
                <!-- 4 Lần ôn tập (Checkboxes Spaced Repetition) -->
                <td>
                    <div class="review-checks">
                        ${[0, 1, 2, 3].map(i => `
                            <input 
                                type="checkbox" 
                                class="review-checkbox" 
                                title="Lần ôn tập ${i + 1}"
                                ${item.reviews && item.reviews[i] ? 'checked' : ''} 
                                onchange="window.sheetApp.handleReviewCheck('${item.id}', ${i}, this.checked)"
                            />
                        `).join('')}
                    </div>
                </td>
                <!-- Tỉ lệ % & Hoàn thành -->
                <td>
                    <span class="review-percent-badge ${pct === 100 ? 'pct-100' : ''}" id="pct_${item.id}">
                        ${pct}%
                    </span>
                </td>
            `;

            tbody.appendChild(tr);
        });
    }

    handleWordInput(inputEl, wordId) {
        const wordObj = this.currentDeck.words.find(w => w.id === wordId);
        if (!wordObj) return;

        const typed = inputEl.value.trim();
        wordObj.typedWord = inputEl.value;

        const statusCell = document.getElementById(`status_${wordId}`);
        if (!statusCell) return;

        if (!typed) {
            statusCell.innerHTML = '<span class="status-pill idle">Chờ gõ...</span>';
        } else if (typed === wordObj.word.trim()) {
            statusCell.innerHTML = '<span class="status-pill correct">맞음 • Đúng ✨</span>';

            // Đánh dấu từ đã được mở khóa
            const wasMasked = this.columnMasks.word || (this.autoLevelUp && (wordObj.reviews || []).filter(Boolean).length >= 3);
            if (!this.revealedWords.has(wordId)) {
                this.revealedWords.add(wordId);
                
                // Hiệu ứng mở khóa cell
                const wordCell = document.getElementById(`cell_word_${wordId}`);
                if (wordCell) {
                    wordCell.classList.add('just-unmasked');
                    wordCell.innerHTML = `
                        <span>${wordObj.word}</span>
                        <span class="unmasked-badge"><i class="fa-solid fa-lock-open"></i> Đã mở</span>
                        <button class="btn-speaker" title="Nghe phát âm" onclick="window.studySpeech.speak('${wordObj.word}', '${this.lang}')">
                            🔊
                        </button>
                    `;
                }
            }

            if (window.studyUI) window.studyUI.playDing();
            this.triggerMascotSpeak('correct');
        } else {
            statusCell.innerHTML = '<span class="status-pill wrong">틀림 • Chưa đúng ❌</span>';
        }

        this.saveCurrentDeck();
    }

    handleKeyDown(event, inputEl, wordId) {
        if (event.key === 'Enter') {
            const wordObj = this.currentDeck.words.find(w => w.id === wordId);
            if (!wordObj) return;

            const typed = inputEl.value.trim();
            if (typed === wordObj.word.trim()) {
                // Nhảy sang ô tiếp theo
                const allInputs = Array.from(document.querySelectorAll('.input-test-word'));
                const currentIndex = allInputs.indexOf(inputEl);
                if (currentIndex >= 0 && currentIndex < allInputs.length - 1) {
                    allInputs[currentIndex + 1].focus();
                }
            } else if (typed) {
                this.triggerMascotSpeak('wrong');
            }
        }
    }

    handleReviewCheck(wordId, checkIndex, isChecked) {
        const wordObj = this.currentDeck.words.find(w => w.id === wordId);
        if (!wordObj) return;

        if (!Array.isArray(wordObj.reviews)) {
            wordObj.reviews = [false, false, false, false];
        }
        wordObj.reviews[checkIndex] = isChecked;

        const count = wordObj.reviews.filter(Boolean).length;
        const pct = count * 25;
        wordObj.isCompleted = (pct === 100);

        // Update badge
        const badge = document.getElementById(`pct_${wordId}`);
        if (badge) {
            badge.textContent = `${pct}%`;
            if (pct === 100) {
                badge.classList.add('pct-100');
                if (window.studyUI) window.studyUI.playDing();
                this.triggerMascotSpeak('milestone', 100);
            } else {
                badge.classList.remove('pct-100');
                if (isChecked) {
                    this.triggerMascotSpeak('milestone', pct);
                }
            }
        }

        this.saveCurrentDeck();
    }

    updateStats() {
        if (!this.currentDeck || !Array.isArray(this.currentDeck.words)) return;

        const words = this.currentDeck.words;
        const total = words.length;

        const completed = words.filter(w => w.isCompleted || (w.reviews && w.reviews.filter(Boolean).length >= 3)).length;
        const unlearned = total - completed;

        let totalChecks = 0;
        words.forEach(w => {
            if (Array.isArray(w.reviews)) totalChecks += w.reviews.filter(Boolean).length;
        });
        const maxChecks = total * 4;
        const overallPct = maxChecks > 0 ? Math.round((totalChecks / maxChecks) * 100) : 0;

        const elTotal = document.getElementById('statTotalWords');
        const elLearned = document.getElementById('statLearnedWords');
        const elUnlearned = document.getElementById('statUnlearnedWords');
        const elPct = document.getElementById('statOverallPct');
        const elBar = document.getElementById('statProgressBar');

        if (elTotal) elTotal.textContent = total;
        if (elLearned) elLearned.textContent = completed;
        if (elUnlearned) elUnlearned.textContent = unlearned;
        if (elPct) elPct.textContent = `${overallPct}%`;
        if (elBar) elBar.style.width = `${overallPct}%`;
    }

    openAddWordModal() {
        const modal = document.getElementById('addWordModal');
        if (modal) modal.classList.add('active');
    }

    closeAddWordModal() {
        const modal = document.getElementById('addWordModal');
        if (modal) modal.classList.remove('active');
    }

    submitNewWord() {
        const word = document.getElementById('newWord').value.trim();
        const phonetic = document.getElementById('newPhonetic').value.trim();
        const pos = document.getElementById('newPos').value;
        const meaning = document.getElementById('newMeaning').value.trim();
        const example = document.getElementById('newExample').value.trim();
        const exampleTrans = document.getElementById('newExampleTrans').value.trim();

        if (!word || !meaning) {
            if (window.studyUI) window.studyUI.showToast('Vui lòng nhập Từ vựng và Nghĩa!', 'error');
            return;
        }

        const posLabels = { noun: 'Danh từ', verb: 'Động từ', adj: 'Tính từ', other: 'Khác' };

        const newWordObj = {
            id: `word_${Date.now()}`,
            word,
            phonetic: phonetic ? `[${phonetic}]` : '',
            pos,
            posLabel: posLabels[pos] || 'Khác',
            meaning,
            example,
            exampleTrans,
            typedWord: '',
            reviews: [false, false, false, false],
            isCompleted: false
        };

        this.currentDeck.words.push(newWordObj);
        this.saveCurrentDeck();
        this.renderAll();
        this.closeAddWordModal();

        document.getElementById('newWord').value = '';
        document.getElementById('newPhonetic').value = '';
        document.getElementById('newMeaning').value = '';
        document.getElementById('newExample').value = '';
        document.getElementById('newExampleTrans').value = '';

        if (window.studyUI) {
            window.studyUI.showToast('✨ Đã thêm từ vựng thành công!', 'success');
            window.studyUI.playDing();
        }
    }

    openShareModal() {
        if (!window.studyStorage) return;
        const shareLink = window.studyStorage.generateShareLink(this.currentDeck);
        const modal = document.getElementById('shareModal');
        const input = document.getElementById('shareLinkInput');
        if (input) input.value = shareLink;
        if (modal) modal.classList.add('active');
    }

    closeShareModal() {
        const modal = document.getElementById('shareModal');
        if (modal) modal.classList.remove('active');
    }

    copyShareLink() {
        const input = document.getElementById('shareLinkInput');
        if (input) {
            input.select();
            navigator.clipboard.writeText(input.value);
            if (window.studyUI) window.studyUI.showToast('📋 Đã sao chép link chia sẻ vào bộ nhớ tạm!', 'success');
        }
    }
}

