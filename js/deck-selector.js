/**
 * MHENT STUDY - DECK SELECTOR MODAL
 * Hộp thoại chọn Sổ từ vựng / Bộ bài học mục tiêu khi lưu từ vựng từ Từ điển AI hoặc Lời bài hát
 * Tự động đồng bộ với Supabase Cloud & LocalStorage
 */

class StudyDeckSelector {
    constructor() {
        this.currentWordObj = null;
        this.currentLang = 'en';
        this.onSaveCallback = null;
        this.isOpen = false;

        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.mount());
        } else {
            this.mount();
        }
    }

    mount() {
        if (document.getElementById('deck-selector-modal')) return;

        const html = `
        <div id="deck-selector-modal" class="deck-selector-overlay" role="dialog" aria-modal="true" aria-label="Chọn bộ bài học để lưu">
            <div class="deck-selector-card">
                <!-- Header -->
                <div class="deck-selector-header">
                    <div class="deck-selector-title">
                        <i class="fa-solid fa-folder-plus" style="color: #0ea5e9;"></i>
                        <span>Lưu vào Bộ Từ Vựng Học Tập</span>
                    </div>
                    <button type="button" id="deck-selector-close" class="deck-selector-close-btn" title="Đóng">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <!-- Word Preview Summary -->
                <div class="deck-word-preview">
                    <div class="deck-word-title-row">
                        <span id="deck-prev-word" class="deck-prev-word">Word</span>
                        <span id="deck-prev-phonetic" class="deck-prev-phonetic">/phonetic/</span>
                        <span id="deck-prev-pos" class="deck-prev-pos">Danh từ</span>
                    </div>
                    <div id="deck-prev-meaning" class="deck-prev-meaning">Nghĩa tiếng Việt</div>
                </div>

                <!-- Body: Deck Selection List -->
                <div class="deck-selector-body">
                    <div class="deck-list-label">
                        <span><i class="fa-solid fa-book-bookmark" style="color: #6366f1;"></i> Chọn bộ bài học muốn thêm từ vào:</span>
                        <span id="deck-lang-tag" class="deck-lang-tag">🇰🇷 Tiếng Hàn</span>
                    </div>

                    <div id="deck-selector-list" class="deck-selector-list">
                        <!-- Injected dynamically -->
                        <div class="deck-loading-skeleton">
                            <i class="fa-solid fa-spinner fa-spin"></i> Đang tải danh sách bài học...
                        </div>
                    </div>

                    <!-- Option Create New Deck -->
                    <div class="deck-new-group">
                        <label class="deck-option-card new-deck-toggle">
                            <input type="radio" name="target_deck" value="__NEW__" id="radio-new-deck">
                            <div class="deck-card-info">
                                <span class="deck-card-title"><i class="fa-solid fa-plus-circle" style="color: #10b981;"></i> Tạo một bộ bài học mới...</span>
                                <span class="deck-card-desc">Tạo sổ bài học riêng cho chủ đề này</span>
                            </div>
                        </label>
                        <div id="new-deck-input-wrap" class="new-deck-input-wrap" style="display: none;">
                            <input type="text" id="new-deck-title-input" class="new-deck-input" placeholder="Nhập tên bộ bài học mới (VD: Từ vựng Bài 10, Từ vựng Toeic, K-Pop...)" autocomplete="off">
                        </div>
                    </div>
                </div>

                <!-- Footer Actions -->
                <div class="deck-selector-footer">
                    <button type="button" id="deck-btn-cancel" class="deck-btn-cancel">Hủy</button>
                    <button type="button" id="deck-btn-confirm" class="deck-btn-confirm">
                        <i class="fa-solid fa-cloud-arrow-up"></i> Xác nhận lưu
                    </button>
                </div>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
        this.bindEvents();
    }

    bindEvents() {
        const modal = document.getElementById('deck-selector-modal');
        const closeBtn = document.getElementById('deck-selector-close');
        const cancelBtn = document.getElementById('deck-btn-cancel');
        const confirmBtn = document.getElementById('deck-btn-confirm');
        const radioNew = document.getElementById('radio-new-deck');
        const newDeckInputWrap = document.getElementById('new-deck-input-wrap');
        const newDeckInput = document.getElementById('new-deck-title-input');

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.close();
            });
        }

        if (closeBtn) closeBtn.addEventListener('click', () => this.close());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.close());

        if (radioNew) {
            radioNew.addEventListener('change', () => {
                if (radioNew.checked) {
                    newDeckInputWrap.style.display = 'block';
                    setTimeout(() => newDeckInput && newDeckInput.focus(), 80);
                }
            });
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.confirmSave());
        }
    }

    async open({ word, meaning, phonetic, pos, example, exampleTrans, wordFamily, lang, onSave }) {
        this.mount();

        this.currentWordObj = {
            id: 'word_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            word: word,
            meaning: meaning,
            phonetic: phonetic || '',
            pos: pos || 'noun',
            example: example || '',
            exampleTrans: exampleTrans || '',
            wordFamily: wordFamily || {},
            status: 'new',
            createdAt: new Date().toISOString()
        };

        this.currentLang = lang || 'en';
        this.onSaveCallback = onSave || null;

        // Render preview header
        const wordEl = document.getElementById('deck-prev-word');
        const phonEl = document.getElementById('deck-prev-phonetic');
        const posEl = document.getElementById('deck-prev-pos');
        const meanEl = document.getElementById('deck-prev-meaning');
        const langTag = document.getElementById('deck-lang-tag');

        if (wordEl) wordEl.textContent = word;
        if (phonEl) phonEl.textContent = phonetic || '';
        if (posEl) posEl.textContent = pos || 'Từ vựng';
        if (meanEl) meanEl.textContent = meaning;

        const langMap = { en: 'Tiếng Anh 🇬🇧', ko: 'Tiếng Hàn 🇰🇷', ja: 'Tiếng Nhật 🇯🇵', zh: 'Tiếng Trung 🇨🇳' };
        if (langTag) langTag.textContent = langMap[this.currentLang] || 'Đa ngôn ngữ';

        // Reset radio new
        const newDeckInputWrap = document.getElementById('new-deck-input-wrap');
        const radioNew = document.getElementById('radio-new-deck');
        if (newDeckInputWrap) newDeckInputWrap.style.display = 'none';
        if (radioNew) radioNew.checked = false;

        // Show modal
        const modal = document.getElementById('deck-selector-modal');
        if (modal) modal.classList.add('active');
        this.isOpen = true;

        // Load decks for this language
        await this.loadDecks();
    }

    close() {
        const modal = document.getElementById('deck-selector-modal');
        if (modal) modal.classList.remove('active');
        this.isOpen = false;
    }

    async loadDecks() {
        const listContainer = document.getElementById('deck-selector-list');
        if (!listContainer) return;

        listContainer.innerHTML = `
            <div class="deck-loading-skeleton">
                <i class="fa-solid fa-spinner fa-spin"></i> Đang tải danh sách bài học...
            </div>
        `;

        const lang = this.currentLang;
        let decks = [];

        // 1. Lấy từ LocalStorage
        if (window.studyStorage) {
            decks = window.studyStorage.getDecks(lang) || [];
        }

        // 2. Lấy thêm từ Cloud Supabase nếu có
        if (window.studyCloud && typeof window.studyCloud.getUserDecks === 'function') {
            try {
                const cloudDecks = await window.studyCloud.getUserDecks(lang);
                if (cloudDecks && cloudDecks.length > 0) {
                    cloudDecks.forEach(cd => {
                        if (!decks.some(d => d.id === cd.id)) {
                            decks.push(cd);
                        }
                    });
                }
            } catch (e) {
                console.warn('[DeckSelector] Cloud decks load error:', e);
            }
        }

        if (decks.length === 0) {
            listContainer.innerHTML = `
                <div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 0.9rem;">
                    Chưa có bộ bài học nào cho ngôn ngữ này. Hãy chọn "Tạo bộ bài học mới" ở dưới để bắt đầu nhé!
                </div>
            `;
            const radioNew = document.getElementById('radio-new-deck');
            const newDeckInputWrap = document.getElementById('new-deck-input-wrap');
            if (radioNew) radioNew.checked = true;
            if (newDeckInputWrap) newDeckInputWrap.style.display = 'block';
            return;
        }

        // Kiểm tra xem trang hiện tại có đang mở VocabSheetApp không
        const currentActiveDeckId = (window.sheetApp && window.sheetApp.currentDeck) ? window.sheetApp.currentDeck.id : null;

        let html = '';
        decks.forEach((deck, idx) => {
            const isCurrent = currentActiveDeckId === deck.id;
            const isDefaultChecked = isCurrent || idx === 0;
            const wordCount = (deck.words && deck.words.length) || 0;

            html += `
                <label class="deck-option-card ${isCurrent ? 'is-current' : ''}">
                    <input type="radio" name="target_deck" value="${deck.id}" ${isDefaultChecked ? 'checked' : ''} onchange="window.deckSelector.onRadioChange()">
                    <div class="deck-card-info">
                        <div class="deck-card-top-row">
                            <span class="deck-card-title">${deck.title}</span>
                            ${isCurrent ? '<span class="deck-badge-active">Đang mở</span>' : ''}
                        </div>
                        <div class="deck-card-meta">
                            <span><i class="fa-solid fa-list-check"></i> ${wordCount} từ vựng</span>
                            ${deck.author ? `<span>• bởi ${deck.author}</span>` : ''}
                        </div>
                    </div>
                </label>
            `;
        });

        listContainer.innerHTML = html;
    }

    onRadioChange() {
        const newDeckInputWrap = document.getElementById('new-deck-input-wrap');
        const radioNew = document.getElementById('radio-new-deck');
        if (newDeckInputWrap && radioNew) {
            newDeckInputWrap.style.display = radioNew.checked ? 'block' : 'none';
        }
    }

    async confirmSave() {
        if (!this.currentWordObj) return;

        const confirmBtn = document.getElementById('deck-btn-confirm');
        const selectedRadio = document.querySelector('input[name="target_deck"]:checked');

        if (!selectedRadio) {
            alert('Vui lòng chọn một bộ bài học hoặc tạo bài mới!');
            return;
        }

        const lang = this.currentLang;
        let decks = (window.studyStorage && window.studyStorage.getDecks(lang)) || [];
        let targetDeck = null;

        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';
        }

        try {
            if (selectedRadio.value === '__NEW__') {
                // Tạo bộ bài mới
                const titleInput = document.getElementById('new-deck-title-input');
                const title = (titleInput && titleInput.value.trim()) || `Sổ từ vựng mới (${lang.toUpperCase()})`;

                targetDeck = {
                    id: `${lang}_deck_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    lang: lang,
                    title: title,
                    description: 'Tạo từ AISA AI & Học qua Bài hát',
                    author: (window.studyCloud && window.studyCloud.getUserName()) || 'Học viên MHEnt',
                    words: [this.currentWordObj],
                    updatedAt: new Date().toISOString()
                };

                decks.unshift(targetDeck);
            } else {
                // Thêm vào bộ bài đã có
                const deckId = selectedRadio.value;
                targetDeck = decks.find(d => d.id === deckId);

                if (!targetDeck && window.studyCloud) {
                    // Thử lấy từ Cloud nếu chưa có trong LocalStorage
                    targetDeck = await window.studyCloud.getDeck(deckId);
                    if (targetDeck) decks.unshift(targetDeck);
                }

                if (!targetDeck) {
                    throw new Error('Không tìm thấy bộ bài học đã chọn');
                }

                if (!targetDeck.words) targetDeck.words = [];

                // Kiểm tra từ đã có chưa
                const exists = targetDeck.words.some(w => (w.word || '').toLowerCase() === (this.currentWordObj.word || '').toLowerCase());
                if (!exists) {
                    targetDeck.words.unshift(this.currentWordObj);
                }
                targetDeck.updatedAt = new Date().toISOString();
            }

            // 1. Lưu vào LocalStorage
            if (window.studyStorage) {
                window.studyStorage.saveDecks(decks, lang);
            }

            // 2. Đồng bộ lên Supabase Cloud (bảng study_decks trên ctzkgchjheirxwejctvl)
            if (window.studyCloud && typeof window.studyCloud.saveDeck === 'function') {
                await window.studyCloud.saveDeck(targetDeck);
            }

            // 3. Nếu đang mở VocabSheetApp đúng bài này -> Cập nhật live table
            const sheet = window.sheetApp || window.vocabApp;
            if (sheet && sheet.currentDeck && sheet.currentDeck.id === targetDeck.id) {
                sheet.currentDeck = targetDeck;
                sheet.renderAll();
            }

            // 4. Callback
            if (this.onSaveCallback) {
                this.onSaveCallback(targetDeck);
            }

            if (typeof showToast === 'function') {
                showToast(`Đã lưu "${this.currentWordObj.word}" vào "${targetDeck.title}"!`, 'success');
            } else {
                alert(`Đã lưu từ vựng "${this.currentWordObj.word}" vào bộ bài "${targetDeck.title}" thành công!`);
            }

            this.close();

        } catch (err) {
            console.error('[DeckSelector] Save error:', err);
            alert(`Lỗi khi lưu từ: ${err.message}`);
        } finally {
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Xác nhận lưu';
            }
        }
    }
}

// Khởi tạo Singleton
window.deckSelector = new StudyDeckSelector();
