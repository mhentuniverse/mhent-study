/**
 * MHENT STUDY - INTERACTIVE VOCABULARY NOTE SHEET ENGINE
 * Tái hiện và tối ưu hóa logic trong Video TikTok:
 * - Tự động chấm đúng / sai khi gõ từ (Active Recall)
 * - 4 checkbox ôn tập ngắt quãng (25%, 50%, 75%, 100%)
 * - Thống kê tiến độ trực tiếp (Live Stats Dashboard)
 * - Loa phát âm tức thì (Native Web Speech)
 */
class VocabSheetApp {
    constructor(lang = 'ko') {
        this.lang = lang;
        this.currentDeck = null;
        this.searchQuery = '';
        this.posFilter = 'all';

        this.init();
    }

    init() {
        this.loadDeck();
        this.bindEvents();
        this.renderAll();
    }

    loadDeck() {
        // Kiểm tra xem URL có truyền deckId không
        const urlParams = new URLSearchParams(window.location.search);
        const deckId = urlParams.get('deck');

        let savedDecks = window.studyStorage.getDecks(this.lang);

        if (deckId && savedDecks.length > 0) {
            this.currentDeck = savedDecks.find(d => d.id === deckId) || savedDecks[0];
        } else if (savedDecks.length > 0) {
            this.currentDeck = savedDecks[0];
        } else {
            // Khởi tạo deck mặc định từ sample theo từng ngôn ngữ
            const defaultDeckMap = {
                ko: window.DEFAULT_KO_DECK,
                ja: window.DEFAULT_JA_DECK,
                zh: window.DEFAULT_ZH_DECK,
                en: window.DEFAULT_EN_DECK
            };
            const defaultDeck = defaultDeckMap[this.lang];

            if (defaultDeck) {
                this.currentDeck = JSON.parse(JSON.stringify(defaultDeck));
                window.studyStorage.saveDeck(this.lang, this.currentDeck);
            } else {
                // Generic deck
                this.currentDeck = {
                    id: `${this.lang}_custom_1`,
                    lang: this.lang,
                    title: `Sổ tay từ vựng của tôi (${this.lang.toUpperCase()})`,
                    description: "Tự tạo từ vựng và luyện tập mỗi ngày",
                    author: "Người học MHEnt",
                    words: []
                };
                window.studyStorage.saveDeck(this.lang, this.currentDeck);
            }
        }
    }

    saveCurrentDeck() {
        if (this.currentDeck) {
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
    }

    renderAll() {
        const titleEl = document.getElementById('deckTitle');
        if (titleEl && this.currentDeck) {
            titleEl.textContent = this.currentDeck.title;
        }
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
                    <td colspan="10" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📖</div>
                        <p style="font-weight: 600;">Chưa có từ vựng nào trong danh sách này.</p>
                        <button class="btn-primary" style="margin-top: 1rem;" onclick="window.sheetApp.openAddWordModal()">+ Thêm từ đầu tiên</button>
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach((item, index) => {
            const tr = document.createElement('tr');

            // Tính % thuộc từ (dựa vào 4 checkbox)
            const reviewCount = (item.reviews || []).filter(Boolean).length;
            const pct = reviewCount * 25;

            // Kiểm tra trạng thái gõ từ
            let statusHtml = '<span class="status-pill idle">Chờ gõ...</span>';
            const typed = (item.typedWord || '').trim();
            const target = (item.word || '').trim();

            if (typed) {
                if (typed === target) {
                    statusHtml = '<span class="status-pill correct">맞음 • Đúng ✨</span>';
                } else {
                    statusHtml = '<span class="status-pill wrong">틀림 • Sai ❌</span>';
                }
            }

            // Loại từ badge
            let posBadge = `<span class="tag-badge tag-other">${item.posLabel || 'Khác'}</span>`;
            if (item.pos === 'noun') posBadge = `<span class="tag-badge tag-noun">${item.posLabel || 'Danh từ'}</span>`;
            if (item.pos === 'verb') posBadge = `<span class="tag-badge tag-verb">${item.posLabel || 'Động từ'}</span>`;
            if (item.pos === 'adj') posBadge = `<span class="tag-badge tag-adj">${item.posLabel || 'Tính từ'}</span>`;

            tr.innerHTML = `
                <td style="color: var(--text-muted); font-weight: 700; width: 40px;">${index + 1}</td>
                <td>
                    <div class="col-word">
                        <span>${item.word}</span>
                        <button class="btn-speaker" title="Nghe phát âm" onclick="window.studySpeech.speak('${item.word}', '${this.lang}')">
                            🔊
                        </button>
                    </div>
                </td>
                <td>${posBadge}</td>
                <td style="color: var(--text-muted); font-size: 0.82rem;">${item.phonetic || ''}</td>
                <td style="font-weight: 600; color: var(--text-primary);">${item.meaning || ''}</td>
                <td style="font-size: 0.82rem; max-width: 280px;">
                    <div>${item.example || ''}</div>
                    <div style="color: var(--text-muted); font-size: 0.78rem;">${item.exampleTrans || ''}</div>
                </td>
                <!-- Ô viết từ kiểm tra (Tính năng video) -->
                <td>
                    <input 
                        type="text" 
                        class="input-test-word" 
                        placeholder="Gõ từ..." 
                        value="${item.typedWord || ''}"
                        data-id="${item.id}"
                        oninput="window.sheetApp.handleWordInput(this, '${item.id}')"
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
            window.studyUI.playDing(); // Ting!
        } else {
            statusCell.innerHTML = '<span class="status-pill wrong">틀림 • Sai ❌</span>';
            // Không kêu sai liên tục khi gõ dở, chỉ khi enter hoặc dài hơn
        }

        this.saveCurrentDeck();
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
                window.studyUI.playDing();
            } else {
                badge.classList.remove('pct-100');
            }
        }

        this.saveCurrentDeck();
    }

    updateStats() {
        if (!this.currentDeck || !Array.isArray(this.currentDeck.words)) return;

        const words = this.currentDeck.words;
        const total = words.length;

        // Từ được tính là đã học nếu % đạt 100% hoặc có ít nhất 1 lần ôn
        const completed = words.filter(w => w.isCompleted || (w.reviews && w.reviews.filter(Boolean).length >= 3)).length;
        const unlearned = total - completed;

        // Tính % toàn bảng (tổng review / tổng khả dụng)
        let totalChecks = 0;
        words.forEach(w => {
            if (Array.isArray(w.reviews)) totalChecks += w.reviews.filter(Boolean).length;
        });
        const maxChecks = total * 4;
        const overallPct = maxChecks > 0 ? Math.round((totalChecks / maxChecks) * 100) : 0;

        // Update UI
        const elTotal = document.getElementById('statTotalWords');
        const elLearned = document.getElementById('statLearnedWords');
        const elUnlearned = document.getElementById('statUnlearnedWords');
        const elPct = document.getElementById('statOverallPct');
        const elBar = document.getElementById('statProgressBar');
        const elMascotMsg = document.getElementById('mascotMessage');

        if (elTotal) elTotal.textContent = total;
        if (elLearned) elLearned.textContent = completed;
        if (elUnlearned) elUnlearned.textContent = unlearned;
        if (elPct) elPct.textContent = `${overallPct}%`;
        if (elBar) elBar.style.width = `${overallPct}%`;

        if (elMascotMsg) {
            if (overallPct === 100) elMascotMsg.textContent = "Xuất sắc! Cậu đã hoàn thành 100% rồi! 🎉";
            else if (overallPct >= 70) elMascotMsg.textContent = "Sắp xong rồi, phong độ đỉnh quá cậu ơi! 🚀";
            else if (overallPct >= 30) elMascotMsg.textContent = "Đang tiến bộ rất tốt, tiếp tục nhé! 👏";
            else elMascotMsg.textContent = "Bắt đầu học và tích checkbox mỗi ngày nào! 🔥";
        }
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
            window.studyUI.showToast('Vui lòng nhập Từ vựng và Nghĩa!', 'error');
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

        // Reset form
        document.getElementById('newWord').value = '';
        document.getElementById('newPhonetic').value = '';
        document.getElementById('newMeaning').value = '';
        document.getElementById('newExample').value = '';
        document.getElementById('newExampleTrans').value = '';

        window.studyUI.showToast('✨ Đã thêm từ vựng thành công!', 'success');
        window.studyUI.playDing();
    }

    openShareModal() {
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
            window.studyUI.showToast('📋 Đã sao chép link chia sẻ vào bộ nhớ tạm!', 'success');
        }
    }
}
