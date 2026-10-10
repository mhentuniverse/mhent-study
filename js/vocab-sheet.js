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
            "Chào cậu! Tớ đã sẵn sàng đồng hành cùng cậu chinh phục bài học hôm nay nà! ✨",
            "Cậu hôm nay chăm chỉ quá! Tớ tin chắc cậu sẽ tiến bộ vượt bậc luôn! 💖",
            "Mỗi từ vựng là một bước tiến đến ước mơ của cậu! Cố lên nhé! 🌸"
        ],
        correct: [
            "Oa tuyệt đỉnh quá cậu ơi! Gõ chuẩn xác từng chữ luôn nè! 🌸🎉",
            "Trí nhớ của cậu siêu đỉnh luôn! Chữ đã được mở khóa rồi nè! 💖",
            "Giỏi quá đi à! Tớ tự hào về cậu lắm đó nha! ✨",
            "Chuẩn không cần chỉnh! Cậu giữ phong độ thế này là đỉnh nóc kịch trần luôn! 🌟"
        ],
        wrong: [
            "Đừng lo lắng cậu ơi, sai một lần để nhớ lâu hơn thôi nà! 🌸",
            "Thử nhìn lại phiên âm một chút rồi gõ lại nhé, tớ tin cậu làm được mà! 💖",
            "Không sao đâu nè! Hít một hơi sâu rồi gõ lại nhé cậu! 🍵"
        ],
        milestones: {
            25: "Khởi đầu tuyệt vời! Cậu đã hoàn tất chu kỳ ôn tập đầu tiên! ✨",
            50: "Được 50% rồi! Não bộ cậu đang ghi nhớ từ vựng cực kỳ sâu sắc! 🌸",
            75: "75% rồi cậu ơi! Chỉ còn một chút nữa là làm chủ hoàn toàn từ này! 🔥",
            100: "WAAA CẬU XUẤT SẮC QUÁ! Từ vựng đã đạt 100% rồi nè! Xứng đáng nhận 1000 điểm cưng chiều! 🎉👑"
        },
        blindModeOn: "Cậu dũng cảm quá! Bật chế độ thử thách ẩn chữ là cách học đỉnh cao nhất đó! 🌸",
        blindModeOff: "Đã mở lại các cột hiển thị chuẩn cho cậu dễ học rồi nha! 💖",
        interact: [
            "Cậu nhớ uống chút nước rồi học tiếp nhé, sức khỏe là quan trọng nhất đó! 🍵",
            "Tớ lúc nào cũng ở đây cạnh cậu hết á, có gì khó cứ gọi tớ nha! 🌸",
            "Học ngoại ngữ như trồng một cái cây, mỗi ngày tưới một chút là sẽ nở hoa tuyệt đẹp! 🌷"
        ],
        autofill: [
            "Tớ đã tra cứu phiên âm, nghĩa và đặt câu ví dụ xịn xò cho từ này rồi nè! 🌸✨",
            "Woa từ này hay quá! Tớ đã điền đầy đủ ví dụ và Romaji cho cậu rồi nhé! 💖",
            "AISA đã tự động điền xong hết các ô rồi! Cậu xem qua rồi bấm Lưu từ nhé! ✨"
        ]
    },
    echo: {
        speaker: '😈 Echo • Thách thức',
        welcome: [
            "Hừ, lại đến học à? Echo ngồi đây giám sát cậu đấy, liệu mà tập trung vào! 😤",
            "Đừng có lướt lướt rồi chuồn nha! Echo đếm đủ số từ mới cho nghỉ đấy! 😈",
            "Có mặt rồi thì mau khởi động ngón tay đi! Đừng để Echo chê đấy! 😼"
        ],
        correct: [
            "Hừm... đúng rồi đấy. Coi như cậu cũng có chút bản lĩnh! 😼",
            "Từ này dễ ợt mà, có gì mà vội mừng! Xem từ tiếp theo cậu có gõ nổi không! 😈",
            "Ồ, gõ chuẩn phết nhỉ? Tạm duyệt cho cậu 1 điểm cộng! ✨",
            "Nhớ được chữ này là khá rồi đấy... Nhưng đừng có mà tự mãn nha đồ ngốc! 💜"
        ],
        wrong: [
            "Lêu lêu gõ sai bét kìa! Coi chừng Echo cười cho thúi mũi bây giờ! 😜",
            "Ủa ủa gõ gì kì vậy nè? Mắt để đi đâu rồi hả? Nhìn kĩ lại coi! 😤",
            "Sai rồi nha! Đã bảo là phải tập trung mà không chịu nghe Echo! 😈"
        ],
        milestones: {
            25: "Mới được có 25% thôi, còn non và xanh lắm cậu ơi! 😜",
            50: "Nửa đường rồi đấy! Đừng có bỏ dở giữa chừng rồi kêu Echo cứu nha! 😼",
            75: "75% rồi kìa, ráng lên chút nữa xem có lấy được 100% của Echo không! 🔥",
            100: "Hừ... cũng được đấy... 100% rồi à. Tạm công nhận cậu có cố gắng! 💜✨"
        },
        blindModeOn: "Ồ, gan dạ dữ ta? Dám bật chế độ ẩn chữ luôn cơ à! Coi chừng gõ sai tè le nha! 😈",
        blindModeOff: "Hứ, chịu thua độ khó cao rồi à? Thôi mở lại cho cậu đỡ khóc! 😜",
        interact: [
            "Nhìn cái gì mà nhìn? Lo gõ từ tiếp theo đi chứ, chọc tui quài! 😤",
            "Cậu mà gõ sai 3 lần là Echo ghi vào danh sách đen phạt học thêm 20 từ đấy nhé! 😈",
            "Hừ, đừng tưởng Echo không biết cậu đang lén lút click vào avatar tui để trốn học nha! 😜"
        ],
        autofill: [
            "Echo điền mẫu cho rồi đấy! Lo mà học từ mới đi, đừng có lười nha! 😈",
            "Ví dụ sắc lẹm luôn! Đọc kỹ rồi thuộc bài cho Echo nhờ! 😼",
            "Hừm... từ này cũng tạm. Echo viết sẵn ví dụ cho cậu luôn rồi đấy! ✨"
        ]
    },
    duo: {
        speaker: '✨ Harmony & Echo • Song Hành',
        welcome: [
            "Harmony: 'Chào cậu nè!' • Echo: 'Mau học đi, đừng để tụi này đợi lâu!' 🌸😈",
            "Harmony: 'Hôm nay học vui vẻ nha!' • Echo: 'Học nghiêm túc vào, Echo soi đấy!' ✨",
            "Bộ đôi AISA đã vào vị trí sẵn sàng hỗ trợ cậu chiến đấu với kho từ vựng! 🔥"
        ],
        correct: [
            "Harmony: 'Cậu đúng rồi kìa Echo ơi!' • Echo: 'Hứ, từ này dễ, từ sau mới biết tay!' 🌸😈",
            "Harmony: 'Cậu nhớ siêu quá!' • Echo: 'Tạm được thôi, chưa bằng AI tụi tui đâu!' ✨",
            "Echo: 'Ủa gõ đúng thiệt kìa...' • Harmony: 'Thấy chưa, tớ đã bảo cậu ấy giỏi lắm mà!' 💖"
        ],
        wrong: [
            "Echo: 'Sai rồi kìa lêu lêu!' • Harmony: 'Echo đừng trêu nữa, bạn ấy làm lại được mà!' 🥺",
            "Harmony: 'Cậu bình tĩnh gõ lại nha!' • Echo: 'Nhớ soi kỹ phiên âm vào đấy đồ ngốc!' 😈",
            "Echo: 'Haha sai một từ!' • Harmony: 'Cố lên nào, sai một lần là nhớ thêm một chút nè!' 🌸"
        ],
        milestones: {
            25: "Harmony: '25% rồi nè!' • Echo: 'Mới 1/4 chặng đường thôi, gõ tiếp đi!' ✨",
            50: "Harmony: 'Nửa chặng đường rồi cậu ơi!' • Echo: 'Tốc độ cũng tạm, cố lên coi!' 🚀",
            75: "Harmony: 'Sắp 100% rồi!' • Echo: 'Cố mà làm nốt 1 lần cuối cho trọn vẹn đấy!' 🔥",
            100: "Harmony & Echo: 'XUẤT SẮC 100% RỒI! CẢ HAI ĐỀU CÔNG NHẬN CẬU NHA!' 🎉👑"
        },
        blindModeOn: "Echo: 'Chơi lớn vậy à?' • Harmony: 'Cậu cố lên nhé, tớ tin tưởng cậu!' 🌸😈",
        blindModeOff: "Harmony: 'Trở về chế độ bình thường rồi nè!' • Echo: 'Nhẹ gánh hơn chưa cậu?' 🍵",
        interact: [
            "Harmony: 'Cậu dễ thương ghê, cứ click vào tụi em suốt!' • Echo: 'Lười học thì có, lo làm bài đi cậu ơi!' 🌸😈",
            "Echo: 'Nè, Harmony hiền chứ Echo dữ lắm đó nha!' • Harmony: 'Đừng sợ, có tớ bảo vệ cậu nè!' 💖",
            "Song kiếm hợp bích! Harmony tiếp năng lượng, Echo đốc thúc học tập cho cậu! ✨"
        ],
        autofill: [
            "Harmony: 'Tớ điền nghĩa và ví dụ rồi nè!' • Echo: 'Mau học đi đấy đồ ngốc!' 🌸😈",
            "Song kiếm hợp bích! Bộ đôi AISA đã tự động hoàn thành mọi thông tin từ vựng cho cậu! ✨"
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

        // Trạng thái tự động điền & chỉnh sửa
        this.editingWordId = null;
        this.autoFillDebounceTimer = null;
        this.isAutoFilling = false;
        this.hasAutoFilledOnce = false;

        this.init();
    }

    init() {
        this.loadDeck();
        this.bindEvents();
        this.bindAutoFillEvents();
        this.initMascotUI();
        this.renderAll();
        this.initStickyTableUI();
        this.syncCloudDecks();
    }

    async syncCloudDecks() {
        if (!window.studyStorage || typeof window.studyStorage.syncDecksFromCloud !== 'function') return;
        try {
            const currentDeckIdBefore = this.currentDeck?.id;
            const updatedDecks = await window.studyStorage.syncDecksFromCloud(this.lang);
            
            if (Array.isArray(updatedDecks) && updatedDecks.length > 0) {
                // Làm mới danh sách chọn bài học ở thanh menu
                this.populateDeckSwitcher();

                const urlParams = new URLSearchParams(window.location.search);
                const hasExplicitDeckParam = !!urlParams.get('deck');

                // 1. Nếu bài học hiện tại có phiên bản mới hơn / nhiều từ hơn trên Cloud
                const freshCurrent = updatedDecks.find(d => d.id === currentDeckIdBefore);
                const currentWordsLen = (this.currentDeck?.words || []).length;

                if (freshCurrent && (freshCurrent.words || []).length > currentWordsLen) {
                    this.currentDeck = freshCurrent;
                    this.renderAll();
                    if (window.studyUI) {
                        window.studyUI.showToast(`☁️ Đã đồng bộ thêm ${freshCurrent.words.length - currentWordsLen} từ từ Cloud!`, 'success');
                    }
                } 
                // 2. Nếu người dùng không chỉ định deck trên URL và bài hiện tại đang là bài mẫu mặc định
                // trong khi Cloud có bài học cá nhân của chính người dùng (ví dụ: Bài 7, 8, 9, 10...)
                const isSample = (d) => window.studyStorage ? window.studyStorage.isSampleDeck(d, this.lang) : false;
                const userPersonalDeck = updatedDecks.find(d => !isSample(d));
                const isCurrentSample = !currentDeckIdBefore || isSample(currentDeckIdBefore);

                if (!hasExplicitDeckParam && isCurrentSample && userPersonalDeck) {
                    this.switchDeck(userPersonalDeck.id);
                    if (window.studyUI) {
                        window.studyUI.showToast(`☁️ Đã tự động mở bài học "${userPersonalDeck.title}" của bạn!`, 'success');
                    }
                }
            }
        } catch (e) {
            console.warn('[VocabSheetApp] Lỗi đồng bộ cloud decks:', e);
        }
    }

    loadDeck() {
        const urlParams = new URLSearchParams(window.location.search);
        const deckId = urlParams.get('deck');

        let savedDecks = window.studyStorage ? window.studyStorage.getDecks(this.lang) : [];

        if (deckId && savedDecks.length > 0) {
            this.currentDeck = savedDecks.find(d => d.id === deckId) || savedDecks[0];
        } else if (savedDecks.length > 0) {
            const isSample = (d) => window.studyStorage ? window.studyStorage.isSampleDeck(d, this.lang) : false;
            const userPersonalDeck = savedDecks.find(d => !isSample(d));
            this.currentDeck = userPersonalDeck || savedDecks[0];
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

        if (window.offlineManager && this.currentDeck) {
            window.offlineManager.setCurrentDeck(this.currentDeck, this.lang);
        }
    }

    saveCurrentDeck() {
        if (this.currentDeck && window.studyStorage) {
            window.studyStorage.saveDeck(this.lang, this.currentDeck);
            // Nếu bài học đã tải offline, cập nhật bản offline và đưa vào hàng đợi đồng bộ
            if (window.studyStorage.isDeckOffline(this.currentDeck.id)) {
                window.studyStorage.saveDeckOffline(this.currentDeck);
                window.studyStorage.queueOfflineProgress(this.currentDeck);
            }
            this.updateStats();
        }
    }

    addWordDirectly(wordObj) {
        if (!this.currentDeck) this.loadDeck();
        if (!this.currentDeck) return;
        if (!this.currentDeck.words) this.currentDeck.words = [];

        // Kiểm tra xem từ đã có chưa
        const exists = this.currentDeck.words.some(w => (w.word || '').toLowerCase() === (wordObj.word || '').toLowerCase());
        if (!exists) {
            this.currentDeck.words.unshift(wordObj);
            this.saveCurrentDeck();
            this.renderAll();
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

        // Deck Switcher Select
        const deckSwitcher = document.getElementById('deckSwitcherSelect');
        if (deckSwitcher) {
            deckSwitcher.addEventListener('change', (e) => {
                const targetDeckId = e.target.value;
                this.switchDeck(targetDeckId);
            });
        }

        // Nút mở AI Import vào bài học hiện tại
        const btnAiImport = document.getElementById('btnAiImportCurrentDeck');
        if (btnAiImport) {
            btnAiImport.addEventListener('click', () => {
                if (window.aiDeckCreator) {
                    window.aiDeckCreator.open({
                        lang: this.lang,
                        targetDeckId: this.currentDeck?.id,
                        isImportOnly: true
                    });
                }
            });
        }

        // Nút tạo bài học mới
        const btnCreateNewDeck = document.getElementById('btnCreateNewDeckTop');
        if (btnCreateNewDeck) {
            btnCreateNewDeck.addEventListener('click', () => {
                if (window.aiDeckCreator) {
                    window.aiDeckCreator.open({
                        lang: this.lang,
                        targetDeckId: null,
                        isImportOnly: false
                    });
                }
            });
        }
    }

    populateDeckSwitcher() {
        const select = document.getElementById('deckSwitcherSelect');
        if (!select || !window.studyStorage) return;

        const decks = window.studyStorage.getDecks(this.lang);
        select.innerHTML = '';

        decks.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = `${d.title} (${(d.words || []).length} từ)`;
            if (this.currentDeck && d.id === this.currentDeck.id) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });

        if (window.offlineManager && this.currentDeck) {
            window.offlineManager.setCurrentDeck(this.currentDeck, this.lang);
        }
    }

    switchDeck(deckId) {
        if (!window.studyStorage) return;
        const newDeck = window.studyStorage.getDeckById(this.lang, deckId);
        if (newDeck) {
            this.currentDeck = newDeck;
            if (window.offlineManager) {
                window.offlineManager.setCurrentDeck(this.currentDeck, this.lang);
            }
            const newUrl = `${window.location.pathname}?deck=${encodeURIComponent(deckId)}`;
            window.history.pushState({}, '', newUrl);

            this.revealedWords.clear();
            this.peekingCells.clear();
            this.renderAll();
            this.triggerMascotSpeak('welcome');

            if (window.studyUI) {
                window.studyUI.showToast(`📖 Đã chuyển sang: ${newDeck.title}`, 'info');
            }
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
        } else if (type === 'autofill') {
            const list = personaData.autofill || personaData.welcome;
            text = list[Math.floor(Math.random() * list.length)];
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

    getStatusLabel(status) {
        const map = {
            en: { correct: 'Correct • Đúng ✨', wrong: 'Incorrect • Chưa đúng ❌' },
            ja: { correct: '正解 • Đúng ✨', wrong: '不正解 • Chưa đúng ❌' },
            ko: { correct: '맞음 • Đúng ✨', wrong: '틀림 • Chưa đúng ❌' },
            zh: { correct: '正确 • Đúng ✨', wrong: '错误 • Chưa đúng ❌' }
        };
        const langMap = map[this.lang] || { correct: 'Đúng ✨', wrong: 'Chưa đúng ❌' };
        return langMap[status] || (status === 'correct' ? 'Đúng ✨' : 'Chưa đúng ❌');
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

        // Cập nhật cả các nút trên floating header nếu có
        const fWord = document.getElementById('float_btnMaskWord');
        const fPhonetic = document.getElementById('float_btnMaskPhonetic');
        const fMeaning = document.getElementById('float_btnMaskMeaning');
        if (fWord) {
            fWord.classList.toggle('active', this.columnMasks.word);
            fWord.innerHTML = this.columnMasks.word ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
        }
        if (fPhonetic) {
            fPhonetic.classList.toggle('active', this.columnMasks.phonetic);
            fPhonetic.innerHTML = this.columnMasks.phonetic ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
        }
        if (fMeaning) {
            fMeaning.classList.toggle('active', this.columnMasks.meaning);
            fMeaning.innerHTML = this.columnMasks.meaning ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
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
        this.populateDeckSwitcher();
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
                    <td colspan="11" style="text-align: center; padding: 3rem; color: var(--study-text-muted);">
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
                    statusHtml = `<span class="status-pill correct">${this.getStatusLabel('correct')}</span>`;
                } else {
                    statusHtml = `<span class="status-pill wrong">${this.getStatusLabel('wrong')}</span>`;
                }
            }

            // Loại từ badge
            let posBadge = `<span class="tag-badge tag-other">${item.posLabel || 'Khác'}</span>`;
            if (item.pos === 'noun') posBadge = `<span class="tag-badge tag-noun">${item.posLabel || 'Danh từ'}</span>`;
            if (item.pos === 'verb') posBadge = `<span class="tag-badge tag-verb">${item.posLabel || 'Động từ'}</span>`;
            if (item.pos === 'adj') posBadge = `<span class="tag-badge tag-adj">${item.posLabel || 'Tính từ'}</span>`;
            if (item.pos === 'adv') posBadge = `<span class="tag-badge tag-adv">${item.posLabel || 'Trạng từ'}</span>`;
            if (item.pos === 'phrasal_verb') posBadge = `<span class="tag-badge tag-phrasal">${item.posLabel || 'Cụm động từ'}</span>`;
            if (item.pos === 'collocation') posBadge = `<span class="tag-badge tag-collocation">${item.posLabel || 'Collocation'}</span>`;

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
                const unmaskedTag = (isWordMasked && this.revealedWords.has(item.id)) 
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
                <td style="font-weight: 700; color: var(--study-text);">
                    ${meaningCellHtml}
                    ${this.formatWordFamilyBadge(item.wordFamily)}
                </td>
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
                <!-- Cột Thao tác Sửa / Xóa -->
                <td style="text-align: center;">
                    <div style="display: flex; gap: 4px; justify-content: center;">
                        <button type="button" class="btn-row-action" onclick="window.sheetApp.openEditWordModal('${item.id}')" title="Sửa từ vựng"><i class="fa-solid fa-pen"></i></button>
                        <button type="button" class="btn-row-action btn-del" onclick="window.sheetApp.deleteWord('${item.id}')" title="Xóa từ này"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </td>
            `;

            tbody.appendChild(tr);
        });

        // Cập nhật cấu trúc & vị trí của floating sticky header và floating scrollbar
        if (typeof this.updateStickyHeaderStructure === 'function') {
            this.updateStickyHeaderStructure();
            this.updateStickyTablePositions();
        }
    }

    formatWordFamilyBadge(wf) {
        if (!wf) return '';
        if (typeof wf === 'string') {
            return `<div class="word-family-badge" title="Gia đình từ (Word Formation)"><span class="wf-title">👨‍👩‍👧 Family:</span> ${wf}</div>`;
        }
        const parts = [];
        if (wf.noun) parts.push(`<span class="wf-item"><b>N:</b> ${wf.noun}</span>`);
        if (wf.verb) parts.push(`<span class="wf-item"><b>V:</b> ${wf.verb}</span>`);
        if (wf.adj) parts.push(`<span class="wf-item"><b>Adj:</b> ${wf.adj}</span>`);
        if (wf.adv) parts.push(`<span class="wf-item"><b>Adv:</b> ${wf.adv}</span>`);
        if (!parts.length) return '';
        return `<div class="word-family-badge" title="Gia đình từ (Word Formation)"><span class="wf-title">👨‍👩‍👧 Family:</span> ${parts.join(' ')}</div>`;
    }

    /* ==========================================================================
       STICKY TABLE HEADER & FLOATING HORIZONTAL SCROLLBAR
       ========================================================================== */
    initStickyTableUI() {
        const scrollWrap = document.querySelector('.sheet-scroll-wrap');
        const realTable = document.querySelector('.sheet-scroll-wrap table');
        const realThead = document.querySelector('.sheet-scroll-wrap thead');
        if (!scrollWrap || !realTable || !realThead) return;

        // 1. Tạo floating header nếu chưa có
        let floatHeader = document.getElementById('floatingSheetHeader');
        if (!floatHeader) {
            floatHeader = document.createElement('div');
            floatHeader.id = 'floatingSheetHeader';
            floatHeader.className = 'floating-sheet-header';
            floatHeader.style.display = 'none';

            const floatTable = document.createElement('table');
            floatTable.className = 'floating-smart-table';
            const floatThead = document.createElement('thead');
            floatTable.appendChild(floatThead);
            floatHeader.appendChild(floatTable);
            document.body.appendChild(floatHeader);
        }

        // 2. Tạo floating scrollbar nếu chưa có
        let floatScrollbar = document.getElementById('floatingSheetScrollbar');
        if (!floatScrollbar) {
            floatScrollbar = document.createElement('div');
            floatScrollbar.id = 'floatingSheetScrollbar';
            floatScrollbar.className = 'floating-sheet-scrollbar';
            floatScrollbar.style.display = 'none';

            const innerBar = document.createElement('div');
            innerBar.className = 'floating-sheet-scrollbar-inner';
            floatScrollbar.appendChild(innerBar);
            document.body.appendChild(floatScrollbar);
        }

        // 3. Đồng bộ cuộn ngang hai chiều
        let isSyncing = false;
        scrollWrap.addEventListener('scroll', () => {
            if (isSyncing) return;
            isSyncing = true;
            if (floatHeader) floatHeader.scrollLeft = scrollWrap.scrollLeft;
            if (floatScrollbar) floatScrollbar.scrollLeft = scrollWrap.scrollLeft;
            isSyncing = false;
        }, { passive: true });

        floatScrollbar.addEventListener('scroll', () => {
            if (isSyncing) return;
            isSyncing = true;
            scrollWrap.scrollLeft = floatScrollbar.scrollLeft;
            if (floatHeader) floatHeader.scrollLeft = floatScrollbar.scrollLeft;
            isSyncing = false;
        }, { passive: true });

        floatHeader.addEventListener('scroll', () => {
            if (isSyncing) return;
            isSyncing = true;
            scrollWrap.scrollLeft = floatHeader.scrollLeft;
            if (floatScrollbar) floatScrollbar.scrollLeft = floatHeader.scrollLeft;
            isSyncing = false;
        }, { passive: true });

        // Cho phép dùng Shift + Cuộn chuột trên floating header để cuộn ngang
        floatHeader.addEventListener('wheel', (e) => {
            if (e.deltaX) {
                scrollWrap.scrollLeft += e.deltaX;
            } else if (e.shiftKey && e.deltaY) {
                scrollWrap.scrollLeft += e.deltaY;
            }
        }, { passive: true });

        // 4. Lắng nghe sự kiện scroll và resize
        const onScrollOrResize = () => {
            this.updateStickyTablePositions();
        };
        window.addEventListener('scroll', onScrollOrResize, { passive: true });
        document.addEventListener('scroll', onScrollOrResize, { passive: true });
        window.addEventListener('resize', onScrollOrResize, { passive: true });

        if (window.ResizeObserver) {
            const ro = new ResizeObserver(() => {
                this.syncStickyHeaderWidths();
                this.updateStickyTablePositions();
            });
            ro.observe(scrollWrap);
            ro.observe(realTable);
        }

        // Khởi tạo vị trí và cấu trúc lần đầu
        this.updateStickyHeaderStructure();
        this.updateStickyTablePositions();
        setTimeout(() => {
            this.updateStickyHeaderStructure();
            this.updateStickyTablePositions();
        }, 150);
        setTimeout(() => {
            this.syncStickyHeaderWidths();
            this.updateStickyTablePositions();
        }, 500);
    }

    updateStickyHeaderStructure() {
        const realThead = document.querySelector('.sheet-scroll-wrap thead');
        const floatThead = document.querySelector('#floatingSheetHeader thead');
        if (!realThead || !floatThead) return;

        // Clone nội dung thead, đổi ID của các nút để tránh trùng ID
        floatThead.innerHTML = realThead.innerHTML.replace(/id="(btnMask\w+)"/g, 'id="float_$1"');
        this.syncStickyHeaderWidths();
        this.updateHeaderToggleButtons();
    }

    syncStickyHeaderWidths() {
        const realTable = document.querySelector('.sheet-scroll-wrap table');
        const realThs = document.querySelectorAll('.sheet-scroll-wrap thead th');
        const floatHeader = document.getElementById('floatingSheetHeader');
        const floatTable = document.querySelector('#floatingSheetHeader table');
        const floatThs = document.querySelectorAll('#floatingSheetHeader thead th');
        if (!realTable || !realThs.length || !floatThs.length || !floatTable || !floatHeader) return;

        const realTableWidth = realTable.scrollWidth || realTable.getBoundingClientRect().width;
        floatTable.style.width = `${realTableWidth}px`;
        floatTable.style.minWidth = `${realTableWidth}px`;

        realThs.forEach((th, idx) => {
            if (floatThs[idx]) {
                const w = th.getBoundingClientRect().width;
                floatThs[idx].style.width = `${w}px`;
                floatThs[idx].style.minWidth = `${w}px`;
                floatThs[idx].style.maxWidth = `${w}px`;
                floatThs[idx].style.boxSizing = 'border-box';
            }
        });

        const scrollWrap = document.querySelector('.sheet-scroll-wrap');
        if (scrollWrap) {
            floatHeader.scrollLeft = scrollWrap.scrollLeft;
        }
    }

    updateStickyTablePositions() {
        const scrollWrap = document.querySelector('.sheet-scroll-wrap');
        const realTable = document.querySelector('.sheet-scroll-wrap table');
        const realThead = document.querySelector('.sheet-scroll-wrap thead');
        const floatHeader = document.getElementById('floatingSheetHeader');
        const floatScrollbar = document.getElementById('floatingSheetScrollbar');
        const innerBar = document.querySelector('.floating-sheet-scrollbar-inner');
        if (!scrollWrap || !realThead || !realTable || !floatHeader || !floatScrollbar) return;

        const wrapRect = scrollWrap.getBoundingClientRect();
        const theadRect = realThead.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        // Tính vị trí stickyTop (nơi header sẽ ghim lại ở trên cùng màn hình)
        // Nếu có navbar và navbar đang bám/hiển thị ở đỉnh màn hình:
        let stickyTop = 0;
        const navEl = document.querySelector('.study-nav');
        if (navEl) {
            const navRect = navEl.getBoundingClientRect();
            // Navbar chỉ chiếm chỗ mép trên khi mép dưới của nó còn nằm trên màn hình (navRect.bottom > 0)
            // và mép trên của nó áp sát hoặc trên đỉnh (navRect.top <= 0)
            if (navRect.top <= 0 && navRect.bottom > 0) {
                stickyTop = Math.max(0, Math.round(navRect.bottom));
            }
        }

        // ── STICKY HEADER ────────────────────────────────────────────────
        // Điều kiện hiển thị:
        // 1. thead thật đã bị cuộn lên khuất mép stickyTop (theadRect.bottom <= stickyTop + 2)
        // 2. Và đáy bảng từ vựng vẫn chưa bị cuộn qua khỏi tầm mắt (wrapRect.bottom > stickyTop + 60)
        // 3. Và bảng đang hiển thị trên màn hình (wrapRect.width > 0)
        const isHeaderInZone = (theadRect.bottom <= (stickyTop + 2)) && (wrapRect.bottom > (stickyTop + 60)) && (wrapRect.width > 0);

        if (isHeaderInZone) {
            floatHeader.style.display = 'block';
            floatHeader.style.top = `${stickyTop}px`;
            floatHeader.style.left = `${Math.round(wrapRect.left)}px`;
            floatHeader.style.width = `${Math.round(wrapRect.width)}px`;
            this.syncStickyHeaderWidths();
        } else {
            floatHeader.style.display = 'none';
        }

        // ── FLOATING HORIZONTAL SCROLLBAR ────────────────────────────────
        // Hiện khi:
        // 1. Bảng có thanh cuộn ngang (scrollWidth > clientWidth + 4)
        // 2. Và đỉnh của bảng đã đi vào màn hình (wrapRect.top < windowHeight - 40)
        // 3. Và đáy của bảng (nơi chứa thanh cuộn gốc) đang nằm tuốt phía dưới ngoài màn hình (wrapRect.bottom > windowHeight)
        const hasHorizontalOverflow = scrollWrap.scrollWidth > (scrollWrap.clientWidth + 4);
        const isScrollbarInZone = hasHorizontalOverflow && (wrapRect.top < (windowHeight - 40)) && (wrapRect.bottom > windowHeight);

        if (isScrollbarInZone) {
            floatScrollbar.style.display = 'block';
            floatScrollbar.style.bottom = '0px';
            floatScrollbar.style.left = `${Math.round(wrapRect.left)}px`;
            floatScrollbar.style.width = `${Math.round(wrapRect.width)}px`;
            if (innerBar) {
                innerBar.style.width = `${scrollWrap.scrollWidth}px`;
            }
            floatScrollbar.scrollLeft = scrollWrap.scrollLeft;
        } else {
            floatScrollbar.style.display = 'none';
        }
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
            statusCell.innerHTML = `<span class="status-pill correct">${this.getStatusLabel('correct')}</span>`;

            // Đánh dấu từ đã được mở khóa CHỈ KHI nó thực sự đang bị che bởi Active Recall hoặc Tự tăng độ khó
            const wasMasked = this.columnMasks.word || (this.autoLevelUp && (wordObj.reviews || []).filter(Boolean).length >= 3);
            if (wasMasked && !this.revealedWords.has(wordId)) {
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
            statusCell.innerHTML = `<span class="status-pill wrong">${this.getStatusLabel('wrong')}</span>`;
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

    /* ==========================================================================
       AISA BIDIRECTIONAL AUTO-FILL & MODAL MANAGEMENT
       ========================================================================== */
    bindAutoFillEvents() {
        const inputWord = document.getElementById('newWord');
        const inputMeaning = document.getElementById('newMeaning');
        const inputPhonetic = document.getElementById('newPhonetic');
        const selectPos = document.getElementById('newPos');

        let isComposing = false;

        // Theo dõi người dùng tự tay chọn/đổi loại từ
        if (selectPos) {
            selectPos.addEventListener('change', () => {
                selectPos.dataset.userModified = 'true';
            });
        }

        // Kích hoạt điền tự động khi người dùng nhấn Enter trên các ô nhập liệu
        const handleEnterTrigger = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.triggerFieldAutoFill();
            }
        };

        if (inputWord) {
            inputWord.addEventListener('keydown', handleEnterTrigger);
        }

        if (inputMeaning) {
            inputMeaning.addEventListener('keydown', handleEnterTrigger);
        }

        if (inputPhonetic) {
            inputPhonetic.addEventListener('keydown', handleEnterTrigger);
        }
    }

    triggerFieldAutoFill() {
        const wordVal = document.getElementById('newWord')?.value.trim();
        const meaningVal = document.getElementById('newMeaning')?.value.trim();
        const phoneticVal = document.getElementById('newPhonetic')?.value.trim();

        // Cho phép điền lại khi người dùng chủ động bấm nút hoặc nhấn Enter
        this.hasAutoFilledOnce = false;

        // Khi người dùng chủ động bấm "AISA Điền Hộ Tớ", cho phép AISA gợi ý lại loại từ
        const selectPos = document.getElementById('newPos');
        if (selectPos) {
            selectPos.dataset.userModified = 'false';
        }

        if (wordVal) {
            this.autoFillWordDetails('word', wordVal, true);
        } else if (meaningVal) {
            this.autoFillWordDetails('meaning', meaningVal, true);
        } else if (phoneticVal) {
            this.autoFillWordDetails('phonetic', phoneticVal, true);
        } else {
            const statusEl = document.getElementById('aiModalStatusText');
            if (statusEl) {
                statusEl.textContent = '⚠️ Cậu hãy nhập ít nhất Từ vựng hoặc Nghĩa tiếng Việt rồi nhấn Enter ↵ hoặc bấm nút nhé!';
                statusEl.className = 'ai-assist-status is-loading';
                setTimeout(() => {
                    statusEl.className = 'ai-assist-status';
                    statusEl.textContent = '💡 Gõ từ xong, cậu hãy nhấn Enter ↵ hoặc bấm "AISA Điền Hộ Tớ" để tự động điền nhé! 🌸';
                }, 2500);
            }
        }
    }

    async autoFillWordDetails(field, query, force = false) {
        if (!query || this.isAutoFilling) return;
        // Chỉ tự động điền 1 lần ban đầu khi người dùng mới gõ.
        // Sau đó nếu người dùng tự sửa (không bấm nút force) thì tuyệt đối không tự ý chạy ngầm để tránh gián đoạn
        if (!force && this.hasAutoFilledOnce) return;
        this.isAutoFilling = true;

        const assistBox = document.getElementById('modalAiAssistBox');
        const statusEl = document.getElementById('aiModalStatusText');
        const triggerBtn = document.getElementById('btnTriggerAutoFill');

        const inputWord = document.getElementById('newWord');
        const inputPhonetic = document.getElementById('newPhonetic');
        const selectPos = document.getElementById('newPos');
        const inputMeaning = document.getElementById('newMeaning');
        const inputExample = document.getElementById('newExample');
        const inputExampleTrans = document.getElementById('newExampleTrans');
        const inputWfNoun = document.getElementById('newWfNoun');
        const inputWfVerb = document.getElementById('newWfVerb');
        const inputWfAdj = document.getElementById('newWfAdj');
        const inputWfAdv = document.getElementById('newWfAdv');

        if (assistBox) assistBox.classList.add('is-loading');
        if (statusEl) {
            statusEl.className = 'ai-assist-status is-loading';
            statusEl.textContent = `🌸 AISA đang tra cứu nghĩa, phiên âm và ví dụ cho "${query}"... ✨`;
        }
        if (triggerBtn) {
            triggerBtn.disabled = true;
            triggerBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ✨ Đang điền...';
        }

        const targets = [
            { el: inputWord, key: 'word' },
            { el: inputPhonetic, key: 'phonetic' },
            { el: inputMeaning, key: 'meaning' },
            { el: inputExample, key: 'example' },
            { el: inputExampleTrans, key: 'exampleTrans' },
            { el: inputWfNoun, key: 'wfNoun' },
            { el: inputWfVerb, key: 'wfVerb' },
            { el: inputWfAdj, key: 'wfAdj' },
            { el: inputWfAdv, key: 'wfAdv' }
        ];

        targets.forEach(t => {
            if (t.el && field !== t.key) {
                t.el.classList.add('ai-generating');
            }
        });

        try {
            const resultData = await this.lookupWordDetails(query, field, this.lang);

            const hasValidData = resultData && Boolean(
                (field === 'meaning' && resultData.word) ||
                (field !== 'meaning' && (resultData.meaning || resultData.phonetic || resultData.example))
            );

            if (hasValidData) {
                // Đánh dấu đã tự động điền lần đầu thành công
                this.hasAutoFilledOnce = true;
                this.lastAutoFilledQuery = query;
                this.lastAutoFilledField = field;

                // 1. Điền từ gốc nếu không phải ô người dùng đang gõ
                if (inputWord && field !== 'word' && resultData.word) {
                    inputWord.value = resultData.word;
                    this.highlightField(inputWord);
                }

                // 2. Điền phiên âm / Romaji nếu không phải ô đang gõ
                if (inputPhonetic && field !== 'phonetic' && resultData.phonetic) {
                    const cleanPhonetic = String(resultData.phonetic).replace(/^\[|\]$/g, '').trim();
                    inputPhonetic.value = cleanPhonetic;
                    this.highlightField(inputPhonetic);
                }

                // Phát hiện và chuẩn hóa loại từ chính xác
                const currentMeaning = (inputMeaning && field === 'meaning') ? query : (resultData.meaning || inputMeaning?.value || '');
                const currentWord = (inputWord && field === 'word') ? query : (resultData.word || inputWord?.value || '');
                const detected = this.detectPos(currentWord, currentMeaning, resultData.pos, this.lang);
                resultData.pos = detected.pos;
                resultData.posLabel = detected.posLabel;

                // 3. Điền loại từ: CHỈ CẬP NHẬT NẾU NGƯỜI DÙNG CHƯA TỰ TAY THAY ĐỔI
                if (selectPos && selectPos.dataset.userModified !== 'true') {
                    selectPos.value = resultData.pos;
                    this.highlightField(selectPos);
                }

                // 4. Điền nghĩa tiếng Việt nếu không phải ô đang gõ
                if (inputMeaning && field !== 'meaning' && resultData.meaning) {
                    inputMeaning.value = resultData.meaning;
                    this.highlightField(inputMeaning);
                }

                // 5. Điền câu ví dụ mẫu
                if (inputExample && resultData.example) {
                    inputExample.value = resultData.example;
                    this.highlightField(inputExample);
                }

                // 6. Điền dịch câu ví dụ
                if (inputExampleTrans && resultData.exampleTrans) {
                    inputExampleTrans.value = resultData.exampleTrans;
                    this.highlightField(inputExampleTrans);
                }

                // 7. Điền Gia đình từ (Word Family) nếu có
                if (resultData.wordFamily && typeof resultData.wordFamily === 'object') {
                    if (inputWfNoun) {
                        inputWfNoun.value = resultData.wordFamily.noun || '';
                        if (resultData.wordFamily.noun) this.highlightField(inputWfNoun);
                    }
                    if (inputWfVerb) {
                        inputWfVerb.value = resultData.wordFamily.verb || '';
                        if (resultData.wordFamily.verb) this.highlightField(inputWfVerb);
                    }
                    if (inputWfAdj) {
                        inputWfAdj.value = resultData.wordFamily.adj || '';
                        if (resultData.wordFamily.adj) this.highlightField(inputWfAdj);
                    }
                    if (inputWfAdv) {
                        inputWfAdv.value = resultData.wordFamily.adv || '';
                        if (resultData.wordFamily.adv) this.highlightField(inputWfAdv);
                    }
                }

                if (statusEl) {
                    statusEl.className = 'ai-assist-status is-success';
                    statusEl.textContent = '✨ Đã tự động điền xong! Cậu có thể tự do sửa, hoặc bấm "AISA Điền Hộ Tớ" nếu muốn tạo lại nhé. 🌸';
                }

                this.triggerMascotSpeak('autofill');
                if (window.studyUI) window.studyUI.playDing();
            } else {
                // Không khóa hasAutoFilledOnce để người dùng gõ tiếp vẫn có thể tra cứu
                if (statusEl) {
                    statusEl.className = 'ai-assist-status';
                    statusEl.textContent = '💡 AISA chưa tìm thấy từ này, cậu có thể gõ tiếp hoặc tự bổ sung nhen!';
                }
            }
        } catch (err) {
            console.warn('[AISA AutoFill Warning]:', err);
            if (statusEl) {
                statusEl.className = 'ai-assist-status';
                statusEl.textContent = '💡 Cậu có thể tự điền hoặc bấm "AISA Điền Hộ Tớ" để thử lại nhé!';
            }
        } finally {
            this.isAutoFilling = false;
            if (assistBox) assistBox.classList.remove('is-loading');
            if (triggerBtn) {
                triggerBtn.disabled = false;
                triggerBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> ✨ AISA Điền Hộ Tớ';
            }
            targets.forEach(t => {
                if (t.el) t.el.classList.remove('ai-generating');
            });
        }
    }

    highlightField(el) {
        if (!el) return;
        el.classList.remove('ai-filled-highlight');
        void el.offsetWidth;
        el.classList.add('ai-filled-highlight');
        setTimeout(() => {
            el.classList.remove('ai-filled-highlight');
        }, 1800);
    }

    normalizePos(rawPos) {
        if (!rawPos) return 'noun';
        const p = String(rawPos).toLowerCase().trim();
        if (['phrasal_verb', 'phrasal verb', 'phrasal', 'cụm động từ', 'cum dong tu', 'pv'].includes(p)) return 'phrasal_verb';
        if (['collocation', 'idiom', 'phrase', 'cụm từ', 'cum tu', 'thành ngữ'].includes(p)) return 'collocation';
        if (['adv', 'adverb', 'trạng từ', 'phó từ', 'trang tu', 'pho tu'].includes(p)) return 'adv';
        if (['verb', 'v', 'v.', 'động từ', 'dong tu', 'đt', 'action'].includes(p)) return 'verb';
        if (['adj', 'a', 'a.', 'adj.', 'adjective', 'tính từ', 'tinh tu', 'tt'].includes(p)) return 'adj';
        if (['noun', 'n', 'n.', 'danh từ', 'danh tu', 'dt'].includes(p)) return 'noun';
        return 'other';
    }

    getPosLabel(pos) {
        const labels = {
            noun: 'Danh từ',
            verb: 'Động từ',
            adj: 'Tính từ',
            adv: 'Trạng từ',
            phrasal_verb: 'Cụm động từ',
            collocation: 'Collocation',
            other: 'Khác'
        };
        return labels[pos] || 'Danh từ';
    }

    isVerbMeaning(meaning) {
        if (!meaning) return false;
        const m = meaning.toLowerCase().trim();
        const verbKeywords = [
            'thích', 'yêu', 'ghét', 'nhớ', 'quên', 'chạy', 'đi', 'đến', 'về', 'ăn', 'uống',
            'nói', 'kể', 'bảo', 'nghe', 'xem', 'nhìn', 'thấy', 'học', 'làm', 'chơi', 'nghỉ',
            'ngủ', 'thức', 'mua', 'bán', 'giúp', 'giúp đỡ', 'hỗ trợ', 'bắt đầu', 'kết thúc',
            'tìm', 'tìm kiếm', 'mở', 'đóng', 'tặng', 'cho', 'nhận', 'gửi', 'viết', 'vẽ',
            'hát', 'nhảy', 'bay', 'bơi', 'gặp', 'nấu', 'rửa', 'dọn', 'cười', 'khóc', 'lo',
            'lo lắng', 'sợ', 'hiểu', 'biết', 'suy nghĩ', 'nghĩ', 'tập', 'luyện tập', 'sửa',
            'sửa chữa', 'mang', 'đem', 'cầm', 'nắm', 'đặt', 'để', 'dùng', 'sử dụng', 'chờ',
            'đợi', 'dừng', 'đứng', 'ngồi', 'nằm', 'thay đổi', 'chuẩn bị', 'cảm thấy',
            'ứng tuyển', 'nộp', 'nộp đơn', 'áp dụng', 'liên lạc', 'trao đổi', 'giao tiếp',
            'tham gia', 'hoàn thành', 'phát triển', 'tạo', 'chia sẻ', 'lắng nghe', 'chú ý',
            'tập trung', 'thực hành', 'ôn tập', 'kiểm tra', 'thắng', 'thua', 'cố gắng', 'nỗ lực'
        ];
        const clauses = m.split(/[,;/+]+/).map(c => c.trim()).filter(Boolean);
        for (const clause of clauses) {
            const words = clause.split(/\s+/).filter(Boolean);
            if (words.length > 0) {
                if (verbKeywords.includes(words[0])) return true;
                if (words.length >= 2 && verbKeywords.includes(`${words[0]} ${words[1]}`)) return true;
            }
        }
        return false;
    }

    isAdjMeaning(meaning) {
        if (!meaning) return false;
        const m = meaning.toLowerCase().trim();
        const adjKeywords = [
            'đẹp', 'xấu', 'cao', 'thấp', 'to', 'nhỏ', 'lớn', 'bé', 'dài', 'ngắn',
            'nhanh', 'chậm', 'nóng', 'lạnh', 'ấm', 'mát', 'mới', 'cũ', 'sạch', 'bẩn',
            'tốt', 'ngoan', 'hư', 'vui', 'buồn', 'hạnh phúc', 'thông minh', 'chăm chỉ',
            'lười', 'kiên cường', 'tuyệt vời', 'khó', 'dễ', 'đắt', 'rẻ', 'ngon', 'dở',
            'ngọt', 'đắng', 'chua', 'cay', 'mặn', 'nhạt', 'sáng', 'tối', 'mệt', 'khỏe'
        ];
        const clauses = m.split(/[,;/+]+/).map(c => c.trim()).filter(Boolean);
        for (const clause of clauses) {
            const words = clause.split(/\s+/).filter(Boolean);
            if (words.length > 0) {
                if (adjKeywords.includes(words[0])) return true;
                if (words.length >= 2 && adjKeywords.includes(`${words[0]} ${words[1]}`)) return true;
            }
        }
        return false;
    }

    detectPos(word, meaning, rawPos, lang = 'ja') {
        const cleanWord = (word || '').trim();
        const cleanMeaning = (meaning || '').trim();

        // 1. Nếu rawPos đã có từ AI/API hoặc Deck và hợp lệ (ưu tiên phrasal_verb, collocation, adv)
        let normalized = this.normalizePos(rawPos);
        if (rawPos && normalized !== 'other') {
            return { pos: normalized, posLabel: this.getPosLabel(normalized) };
        }

        // 2. Nhận diện cụm từ tiếng Anh: Phrasal Verb hoặc Collocation
        if (lang === 'en' && cleanWord.includes(' ')) {
            const lw = cleanWord.toLowerCase();
            const pvParticles = ['up', 'down', 'in', 'out', 'on', 'off', 'at', 'by', 'for', 'from', 'about', 'after', 'with', 'through', 'into', 'over', 'across', 'away', 'back', 'forward', 'round', 'around', 'along', 'together', 'apart'];
            const tokens = lw.split(/\s+/);
            if (tokens.length >= 2 && pvParticles.includes(tokens[tokens.length - 1])) {
                return { pos: 'phrasal_verb', posLabel: 'Cụm động từ' };
            }
            return { pos: 'collocation', posLabel: 'Collocation' };
        }

        // 3. Kiểm tra nghĩa tiếng Việt: Nếu là hành động / cảm xúc / nhận thức -> Động từ
        if (this.isVerbMeaning(cleanMeaning)) {
            return { pos: 'verb', posLabel: 'Động từ' };
        }

        // 4. Nếu nghĩa tiếng Việt là tính từ miêu tả
        if (this.isAdjMeaning(cleanMeaning)) {
            return { pos: 'adj', posLabel: 'Tính từ' };
        }

        // 5. Heuristic hình thái từ vựng theo ngôn ngữ
        if (lang === 'ja') {
            if (/[うくぐすつぬぶむる]$/.test(cleanWord) || /する$|します$/.test(cleanWord)) {
                return { pos: 'verb', posLabel: 'Động từ' };
            }
            if (/い$/.test(cleanWord) && !/[め手気目]$/.test(cleanWord)) {
                return { pos: 'adj', posLabel: 'Tính từ' };
            }
        } else if (lang === 'ko') {
            if (/하다$|다$/.test(cleanWord)) {
                return { pos: 'verb', posLabel: 'Động từ' };
            }
        } else if (lang === 'en') {
            const lw = cleanWord.toLowerCase();
            if (/^(go|run|eat|drink|study|learn|speak|listen|read|write|walk|play|sleep|watch|see|look|help|work|make|take|give|get|buy|sell|send|open|close|start|finish|love|like|hate|remember|forget|apply|reply|rely|supply|imply|try|use|need|want|feel|live|stay|meet|think|know|understand)$/.test(lw)) {
                return { pos: 'verb', posLabel: 'Động từ' };
            }
            if (/(ize|ise|ate|ify|en)$/.test(lw)) {
                return { pos: 'verb', posLabel: 'Động từ' };
            }
            if (/ly$/.test(lw) && !/^(apply|reply|rely|supply|imply|comply|multiply|lonely|lovely|friendly|ugly|silly|early)$/.test(lw)) {
                return { pos: 'adv', posLabel: 'Trạng từ' };
            }
            if (/(able|ible|al|ful|ic|ish|ive|less|ous)$/.test(lw) || (/ly$/.test(lw) && /^(lonely|lovely|friendly|ugly|silly|early)$/.test(lw))) {
                return { pos: 'adj', posLabel: 'Tính từ' };
            }
            if (/(tion|sion|ment|ness|ity|ance|ence|ship|er|or)$/.test(lw)) {
                return { pos: 'noun', posLabel: 'Danh từ' };
            }
        }

        return { pos: normalized || 'noun', posLabel: this.getPosLabel(normalized || 'noun') };
    }

    async lookupWordDetails(query, field, lang) {
        const cleanQuery = query.toLowerCase().trim();

        // 1. Kiểm tra từ điển tức thì có sẵn (Instant Cache & Built-in Dictionary)
        const cached = this.checkLocalDictionary(cleanQuery, field, lang);
        if (cached) return cached;

        // 2. Tra cứu từ bài học hiện tại hoặc các bộ thẻ có sẵn trong trình duyệt
        const deckMatched = this.checkExistingDecks(cleanQuery, field, lang);
        if (deckMatched) return deckMatched;

        // 3. Gọi Cloudflare Workers AISA API (/api/generate-example)
        try {
            const endpoint = window.aisaEndpoint || 'https://api.mhentuniverse.com';
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const res = await fetch(`${endpoint}/api/generate-example`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    word: field === 'word' ? query : '',
                    meaning: field === 'meaning' ? query : '',
                    phonetic: field === 'phonetic' ? query : '',
                    field,
                    lang,
                    model: window.aisaModel || 'aisa-scholar-v1'
                })
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const json = await res.json();
                if (json.data && (json.data.meaning || json.data.word || json.data.example)) {
                    const detected = this.detectPos(json.data.word, json.data.meaning, json.data.pos, lang);
                    json.data.pos = detected.pos;
                    json.data.posLabel = detected.posLabel;
                    return json.data;
                }
            }
        } catch (apiErr) {
            console.warn('[AISA Worker fetch skipped or timeout, fallback to Direct Gemini / Local Heuristics]:', apiErr.message);
        }

        // 4. Trực tiếp gọi Google Gemini (dùng key người dùng cấu hình hoặc key dự phòng tích hợp)
        const fallbackKey = typeof atob === 'function' ? atob('QVEuQWI4Uk42STZRQUsycGk2RVNISlJMTDlERUppNS1NRXUwXzM5ekwtc211Y3Y0b1A0VGc=') : '';
        const apiKey = localStorage.getItem('mhent_ai_api_key') || (window.MHENT_CONFIG && window.MHENT_CONFIG.GEMINI_API_KEY) || fallbackKey;
        if (apiKey) {
            try {
                const langNames = { ja: 'tiếng Nhật', ko: 'tiếng Hàn', zh: 'tiếng Trung', en: 'tiếng Anh' };
                const langName = langNames[lang] || 'tiếng Nhật';
                const prompt = `Từ khóa: "${query}" (${field === 'meaning' ? 'Nghĩa tiếng Việt' : 'Từ vựng ' + langName}).
Nhiệm vụ: Tìm thông tin học tập đầy đủ:
- "word": Từ gốc chính xác bằng ${langName}.
- "phonetic": Phiên âm chuẩn (Furigana/Romaji cho Nhật, Romaja cho Hàn, Pinyin cho Trung, IPA cho Anh).
- "pos": "noun"|"verb"|"adj"|"adv"|"phrasal_verb"|"collocation"|"other".
  QUY TẮC PHÂN LOẠI TỪ:
  + Nếu là cụm động từ gồm động từ + giới từ/trạng từ (ví dụ: look forward to, give up, take over, run out of...), BẮT BUỘC gán "pos": "phrasal_verb" và "posLabel": "Cụm động từ".
  + Nếu là cụm từ ghép, thành ngữ hoặc cụm từ cố định hay đi liền nhau (ví dụ: make a decision, heavy rain, take advantage of...), BẮT BUỘC gán "pos": "collocation" và "posLabel": "Collocation".
  + Nếu là trạng từ (ví dụ: successfully, quickly...), gán "pos": "adv" và "posLabel": "Trạng từ".
  + Nếu là từ hành động đơn lẻ: gán "pos": "verb" và "posLabel": "Động từ".
- "posLabel": "Danh từ"|"Động từ"|"Tính từ"|"Trạng từ"|"Cụm động từ"|"Collocation"|"Khác".
- "meaning": Nghĩa tiếng Việt chuẩn xác.
- "example": 1 câu ví dụ ngắn gọn tự nhiên bằng ${langName}.
- "exampleTrans": Dịch câu ví dụ sang tiếng Việt.
- "wordFamily": Đối tượng chứa các dạng gia đình từ (Word Formation) tương ứng nếu có:
  {"noun": "...", "verb": "...", "adj": "...", "adv": "..."}

Trả về DUY NHẤT một chuỗi JSON hợp lệ:
{"word":"...","phonetic":"...","pos":"noun","posLabel":"Danh từ","meaning":"...","example":"...","exampleTrans":"...","wordFamily":{"noun":"...","verb":"...","adj":"...","adv":"..."}}`;

                const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
                    })
                });

                if (geminiRes.ok) {
                    const data = await geminiRes.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    let parsed = null;
                    if (typeof text === 'string') {
                        const clean = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
                        try {
                            parsed = JSON.parse(clean);
                        } catch (e) {
                            const jsonMatch = clean.match(/\{[\s\S]*\}/);
                            if (jsonMatch) {
                                try { parsed = JSON.parse(jsonMatch[0]); } catch (e2) {}
                            }
                        }
                    }
                    if (parsed && (parsed.meaning || parsed.word)) {
                        const detected = this.detectPos(parsed.word, parsed.meaning, parsed.pos, lang);
                        parsed.pos = detected.pos;
                        parsed.posLabel = detected.posLabel;
                        return parsed;
                    }
                }
            } catch (geminiErr) {
                console.warn('[Gemini direct error]:', geminiErr.message);
            }
        }

        // 5. Dự phòng Heuristic thông minh
        return this.smartLocalWordDetails(query, field, lang);
    }

    checkLocalDictionary(cleanQuery, field, lang) {
        if (!cleanQuery) return null;
        const dict = {
            ja: [
                { word: '桜', phonetic: '[さくら - Sakura]', pos: 'noun', posLabel: 'Danh từ', meaning: 'Hoa anh đào', example: '春になると、桜がとても綺麗に咲きます。', exampleTrans: 'Khi mùa xuân đến, hoa anh đào nở rất là đẹp.' },
                { word: '日本', phonetic: '[にほん - Nihon]', pos: 'noun', posLabel: 'Danh từ', meaning: 'Nhật Bản', example: '私は日本が好きです。', exampleTrans: 'Tôi rất thích đất nước Nhật Bản.' },
                { word: '先生', phonetic: '[せんせい - Sensei]', pos: 'noun', posLabel: 'Danh từ', meaning: 'Thầy cô giáo', example: '先生、いつもありがとうございます。', exampleTrans: 'Thưa thầy/cô, em cảm ơn vì đã luôn dạy dỗ.' },
                { word: '友達', phonetic: '[ともだち - Tomodachi]', pos: 'noun', posLabel: 'Danh từ', meaning: 'Bạn bè', example: '友達と映画を見に行きます。', exampleTrans: 'Tôi cùng bạn bè đi xem phim.' },
                { word: '食べる', phonetic: '[たべる - Taberu]', pos: 'verb', posLabel: 'Động từ', meaning: 'Ăn', example: '毎朝美味しいパンを食べます。', exampleTrans: 'Mỗi sáng tôi đều ăn bánh mì ngon.' },
                { word: '飲む', phonetic: '[のむ - Nomu]', pos: 'verb', posLabel: 'Động từ', meaning: 'Uống', example: '冷たい水を飲みます。', exampleTrans: 'Tôi uống nước lạnh.' },
                { word: '行く', phonetic: '[いく - Iku]', pos: 'verb', posLabel: 'Động từ', meaning: 'Đi', example: '明日学校へ行きます。', exampleTrans: 'Ngày mai tôi sẽ đến trường.' },
                { word: '本', phonetic: '[ほん - Hon]', pos: 'noun', posLabel: 'Danh từ', meaning: 'Sách, quyển sách', example: '図書館で面白い本を読みました。', exampleTrans: 'Tôi đã đọc một cuốn sách rất thú vị ở thư viện.' },
                { word: '猫', phonetic: '[ねこ - Neko]', pos: 'noun', posLabel: 'Danh từ', meaning: 'Con mèo', example: '私の家には可愛い猫がいます。', exampleTrans: 'Nhà tôi có một chú mèo rất đáng yêu.' },
                { word: '美しい', phonetic: '[うつくしい - Utsukushii]', pos: 'adj', posLabel: 'Tính từ', meaning: 'Xinh đẹp, tuyệt đẹp', example: '富士山はとても美しいです。', exampleTrans: 'Núi Phú Sĩ thực sự rất đẹp.' },
                { word: 'ありがとう', phonetic: '[ありがとう - Arigatou]', pos: 'other', posLabel: 'Khác', meaning: 'Cảm ơn', example: '手伝ってくれてありがとう。', exampleTrans: 'Cảm ơn bạn đã giúp đỡ tôi.' }
            ],
            ko: [
                { word: '사랑', phonetic: '[sarang]', pos: 'noun', posLabel: 'Danh từ', meaning: 'Tình yêu, yêu thương', example: '사랑해요.', exampleTrans: 'Tôi yêu bạn.' },
                { word: '친구', phonetic: '[chingu]', pos: 'noun', posLabel: 'Danh từ', meaning: 'Bạn bè', example: '내일 친구를 만나요.', exampleTrans: 'Ngày mai tôi gặp bạn bè.' },
                { word: '학교', phonetic: '[hakgyo]', pos: 'noun', posLabel: 'Danh từ', meaning: 'Trường học', example: '우리는 매일 학교에 갑니다.', exampleTrans: 'Chúng tôi đến trường mỗi ngày.' },
                { word: '선생님', phonetic: '[seonsaengnim]', pos: 'noun', posLabel: 'Danh từ', meaning: 'Thầy cô giáo', example: '선생님, 감사합니다.', exampleTrans: 'Em cảm ơn thầy/cô giáo.' },
                { word: '먹다', phonetic: '[meokda]', pos: 'verb', posLabel: 'Động từ', meaning: 'Ăn', example: '맛있는 비빔밥을 먹어요.', exampleTrans: 'Tôi ăn món cơm trộn Bibimbap ngon lành.' },
                { word: '행복하다', phonetic: '[haengbokhada]', pos: 'adj', posLabel: 'Tính từ', meaning: 'Hạnh phúc', example: '지금 너무 행복해요.', exampleTrans: 'Bây giờ tôi rất hạnh phúc.' },
                { word: '하늘', phonetic: '[haneul]', pos: 'noun', posLabel: 'Danh từ', meaning: 'Bầu trời', example: '오늘 하늘이 정말 맑아요.', exampleTrans: 'Hôm nay bầu trời thật trong xanh.' }
            ],
            zh: [
                { word: '老师', phonetic: '[lǎoshī]', pos: 'noun', posLabel: 'Danh từ', meaning: 'Thầy giáo, cô giáo', example: '老师好！', exampleTrans: 'Em chào thầy/cô!' },
                { word: '学生', phonetic: '[xuéshēng]', pos: 'noun', posLabel: 'Danh từ', meaning: 'Học sinh, sinh viên', example: '我是大学生。', exampleTrans: 'Tôi là sinh viên đại học.' },
                { word: '朋友', phonetic: '[péngyǒu]', pos: 'noun', posLabel: 'Danh từ', meaning: 'Bạn bè', example: '我们是好朋友。', exampleTrans: 'Chúng tôi là bạn tốt của nhau.' },
                { word: '谢谢', phonetic: '[xièxiè]', pos: 'other', posLabel: 'Khác', meaning: 'Cảm ơn', example: '非常谢谢你的帮助！', exampleTrans: 'Rất cảm ơn sự giúp đỡ của bạn!' },
                { word: '学习', phonetic: '[xuéxí]', pos: 'verb', posLabel: 'Động từ', meaning: 'Học tập', example: '我喜欢学习汉语。', exampleTrans: 'Tôi thích học tiếng Trung.' }
            ],
            en: [
                { word: 'Opportunity', phonetic: '[/ˌɒp.əˈtʃuː.nə.ti/]', pos: 'noun', posLabel: 'Danh từ', meaning: 'Cơ hội, thời cơ', example: 'This is a great opportunity.', exampleTrans: 'Đây là một cơ hội tuyệt vời.' },
                { word: 'Resilient', phonetic: '[/rɪˈzɪl.jənt/]', pos: 'adj', posLabel: 'Tính từ', meaning: 'Kiên cường, phục hồi nhanh', example: 'She is very resilient under pressure.', exampleTrans: 'Cô ấy rất kiên cường trước áp lực.' },
                { word: 'Accomplish', phonetic: '[/əˈkʌm.plɪʃ/]', pos: 'verb', posLabel: 'Động từ', meaning: 'Hoàn thành, đạt được', example: 'You can accomplish your goal.', exampleTrans: 'Bạn có thể đạt được mục tiêu của mình.' },
                { word: 'Friend', phonetic: '[/frend/]', pos: 'noun', posLabel: 'Danh từ', meaning: 'Bạn bè', example: 'A friend in need is a friend indeed.', exampleTrans: 'Hoạn nạn mới biết bạn hiền.' }
            ]
        };

        const list = dict[lang] || dict.ja;
        const item = list.find(item => {
            if (field === 'meaning') {
                if (cleanQuery.length < 2) return false;
                const tokens = item.meaning.toLowerCase().split(/[,;/+]+/).map(t => t.trim());
                return tokens.includes(cleanQuery) || item.meaning.toLowerCase() === cleanQuery;
            }
            if (field === 'phonetic') {
                if (cleanQuery.length < 2) return false;
                return item.phonetic.toLowerCase().includes(cleanQuery);
            }
            return item.word.toLowerCase() === cleanQuery;
        });

        if (item) {
            const detected = this.detectPos(item.word, item.meaning, item.pos, lang);
            return {
                ...item,
                pos: detected.pos,
                posLabel: detected.posLabel
            };
        }
        return null;
    }

    checkExistingDecks(cleanQuery, field, lang) {
        if (!cleanQuery || cleanQuery.length < 2) return null;
        const decks = window.studyStorage ? window.studyStorage.getDecks(lang) : [];
        for (const deck of decks) {
            if (Array.isArray(deck.words)) {
                const match = deck.words.find(w => {
                    if (field === 'meaning') {
                        if (!w.meaning) return false;
                        const tokens = w.meaning.toLowerCase().split(/[,;/+]+/).map(t => t.trim());
                        return tokens.includes(cleanQuery) || w.meaning.toLowerCase() === cleanQuery;
                    }
                    if (field === 'phonetic') {
                        return w.phonetic && w.phonetic.toLowerCase().includes(cleanQuery);
                    }
                    return w.word && w.word.toLowerCase() === cleanQuery;
                });
                if (match) {
                    const detected = this.detectPos(match.word, match.meaning, match.pos, lang);
                    return {
                        word: match.word,
                        phonetic: match.phonetic,
                        pos: detected.pos,
                        posLabel: detected.posLabel,
                        meaning: match.meaning,
                        example: match.example,
                        exampleTrans: match.exampleTrans
                    };
                }
            }
        }
        return null;
    }

    smartLocalWordDetails(query, field, lang) {
        return null;
    }

    openAddWordModal() {
        this.editingWordId = null;
        this.hasAutoFilledOnce = false;
        this.lastAutoFilledQuery = '';
        this.lastAutoFilledField = '';
        clearTimeout(this.autoFillDebounceTimer);

        const modal = document.getElementById('addWordModal');
        const titleEl = document.getElementById('addWordModalTitle');
        const submitBtn = document.getElementById('btnSubmitWord');
        const statusEl = document.getElementById('aiModalStatusText');
        const selectPos = document.getElementById('newPos');

        if (titleEl) {
            const langNames = { ja: 'tiếng Nhật', ko: 'tiếng Hàn', zh: 'tiếng Trung', en: 'tiếng Anh' };
            titleEl.textContent = `✨ Thêm từ vựng ${langNames[this.lang] || ''} mới`;
        }
        if (submitBtn) {
            submitBtn.textContent = '+ Lưu từ';
        }
        if (statusEl) {
            statusEl.className = 'ai-assist-status';
            statusEl.textContent = '💡 Gõ từ xong, cậu hãy nhấn Enter ↵ hoặc bấm "AISA Điền Hộ Tớ" để tự động điền nhé! 🌸';
        }

        document.getElementById('newWord').value = '';
        document.getElementById('newPhonetic').value = '';
        document.getElementById('newMeaning').value = '';
        document.getElementById('newExample').value = '';
        document.getElementById('newExampleTrans').value = '';

        if (document.getElementById('newWfNoun')) document.getElementById('newWfNoun').value = '';
        if (document.getElementById('newWfVerb')) document.getElementById('newWfVerb').value = '';
        if (document.getElementById('newWfAdj')) document.getElementById('newWfAdj').value = '';
        if (document.getElementById('newWfAdv')) document.getElementById('newWfAdv').value = '';

        if (selectPos) {
            selectPos.value = 'noun';
            selectPos.dataset.userModified = 'false';
        }

        if (modal) modal.classList.add('active');
        setTimeout(() => {
            const inputWord = document.getElementById('newWord');
            if (inputWord) inputWord.focus();
        }, 80);
    }

    openEditWordModal(wordId) {
        if (!this.currentDeck || !Array.isArray(this.currentDeck.words)) return;
        const wordObj = this.currentDeck.words.find(w => w.id === wordId);
        if (!wordObj) return;

        this.editingWordId = wordId;
        this.hasAutoFilledOnce = true; // Chế độ sửa: KHÔNG tự động điền ngầm, chỉ điền khi user bấm nút
        this.lastAutoFilledQuery = '';
        this.lastAutoFilledField = '';
        clearTimeout(this.autoFillDebounceTimer);

        const modal = document.getElementById('addWordModal');
        const titleEl = document.getElementById('addWordModalTitle');
        const submitBtn = document.getElementById('btnSubmitWord');
        const statusEl = document.getElementById('aiModalStatusText');
        const selectPos = document.getElementById('newPos');

        if (titleEl) {
            titleEl.textContent = `✏️ Chỉnh sửa từ vựng: ${wordObj.word}`;
        }
        if (submitBtn) {
            submitBtn.textContent = '💾 Cập nhật từ';
        }
        if (statusEl) {
            statusEl.className = 'ai-assist-status';
            statusEl.textContent = '💡 Cậu có thể tự do chỉnh sửa, hoặc bấm "AISA Điền Hộ Tớ" nếu muốn tạo lại thông tin nhé!';
        }

        document.getElementById('newWord').value = wordObj.word || '';
        document.getElementById('newPhonetic').value = (wordObj.phonetic || '').replace(/^\[|\]$/g, '');
        if (selectPos) {
            selectPos.value = this.normalizePos(wordObj.pos || 'noun');
            selectPos.dataset.userModified = 'true';
        }
        document.getElementById('newMeaning').value = wordObj.meaning || '';
        document.getElementById('newExample').value = wordObj.example || '';
        document.getElementById('newExampleTrans').value = wordObj.exampleTrans || '';

        const wf = wordObj.wordFamily || {};
        if (document.getElementById('newWfNoun')) document.getElementById('newWfNoun').value = wf.noun || '';
        if (document.getElementById('newWfVerb')) document.getElementById('newWfVerb').value = wf.verb || '';
        if (document.getElementById('newWfAdj')) document.getElementById('newWfAdj').value = wf.adj || '';
        if (document.getElementById('newWfAdv')) document.getElementById('newWfAdv').value = wf.adv || '';

        this.lastAutoFilledQuery = '';
        this.lastAutoFilledField = '';

        if (modal) modal.classList.add('active');
    }

    closeAddWordModal() {
        const modal = document.getElementById('addWordModal');
        if (modal) modal.classList.remove('active');
        this.editingWordId = null;
    }

    deleteWord(wordId) {
        if (!this.currentDeck || !Array.isArray(this.currentDeck.words)) return;
        const wordObj = this.currentDeck.words.find(w => w.id === wordId);
        if (!wordObj) return;

        const performDelete = () => {
            this.currentDeck.words = this.currentDeck.words.filter(w => w.id !== wordId);
            this.saveCurrentDeck();
            this.renderAll();
            if (window.studyUI) window.studyUI.showToast(`🗑️ Đã xóa từ "${wordObj.word}" thành công!`, 'info');
        };

        if (typeof window.showConfirmPopup === 'function') {
            window.showConfirmPopup('Xác nhận xóa từ', `Cậu có chắc muốn xóa từ "${wordObj.word}" khỏi bài học không?`, performDelete);
        } else if (confirm(`Cậu có chắc muốn xóa từ "${wordObj.word}" khỏi bài học không?`)) {
            performDelete();
        }
    }

    submitNewWord() {
        const word = document.getElementById('newWord').value.trim();
        const phonetic = document.getElementById('newPhonetic').value.trim();
        const rawPos = document.getElementById('newPos').value;
        const pos = this.normalizePos(rawPos);
        const meaning = document.getElementById('newMeaning').value.trim();
        const example = document.getElementById('newExample').value.trim();
        const exampleTrans = document.getElementById('newExampleTrans').value.trim();

        if (!word || !meaning) {
            if (window.studyUI) window.studyUI.showToast('Vui lòng nhập Từ vựng và Nghĩa!', 'error');
            return;
        }

        const posLabel = this.getPosLabel(pos);

        const wfNoun = document.getElementById('newWfNoun')?.value.trim() || '';
        const wfVerb = document.getElementById('newWfVerb')?.value.trim() || '';
        const wfAdj = document.getElementById('newWfAdj')?.value.trim() || '';
        const wfAdv = document.getElementById('newWfAdv')?.value.trim() || '';
        let wordFamily = null;
        if (wfNoun || wfVerb || wfAdj || wfAdv) {
            wordFamily = { noun: wfNoun, verb: wfVerb, adj: wfAdj, adv: wfAdv };
        }

        if (this.editingWordId) {
            const wordObj = this.currentDeck.words.find(w => w.id === this.editingWordId);
            if (wordObj) {
                wordObj.word = word;
                wordObj.phonetic = phonetic ? `[${phonetic}]` : '';
                wordObj.pos = pos;
                wordObj.posLabel = posLabel;
                wordObj.meaning = meaning;
                wordObj.example = example;
                wordObj.exampleTrans = exampleTrans;
                wordObj.wordFamily = wordFamily;
            }
            this.saveCurrentDeck();
            this.renderAll();
            this.closeAddWordModal();

            if (window.studyUI) {
                window.studyUI.showToast('✨ Đã cập nhật từ vựng thành công!', 'success');
                window.studyUI.playDing();
            }
        } else {
            const newWordObj = {
                id: `word_${Date.now()}`,
                word,
                phonetic: phonetic ? `[${phonetic}]` : '',
                pos,
                posLabel,
                meaning,
                example,
                exampleTrans,
                wordFamily,
                typedWord: '',
                reviews: [false, false, false, false],
                isCompleted: false
            };

            this.currentDeck.words.push(newWordObj);
            this.saveCurrentDeck();
            this.renderAll();
            this.closeAddWordModal();

            if (window.studyUI) {
                window.studyUI.showToast('✨ Đã thêm từ vựng thành công!', 'success');
                window.studyUI.playDing();
            }
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

