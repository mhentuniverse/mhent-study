/**
 * MHENT STUDY - AISA SMART AI DICTIONARY ENGINE
 * Hệ thống tra cứu từ điển thông minh đa ngôn ngữ (EN, KO, JA, ZH)
 * Hỗ trợ tự động gợi ý phát âm, Word Family 4 dạng, nghĩa tiếng Việt, ví dụ câu & lưu vào sổ từ vựng
 */

class AisaDictionary {
    constructor() {
        this.currentLang = this.detectCurrentLang();
        this.currentWordData = null;
        this.recentSearches = [];
        this.isOpen = false;

        this.init();
    }

    detectCurrentLang() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('/ko/') || path.includes('korean')) return 'ko';
        if (path.includes('/ja/') || path.includes('japanese')) return 'ja';
        if (path.includes('/zh/') || path.includes('chinese')) return 'zh';
        return 'en';
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.mount());
        } else {
            this.mount();
        }

        // Global shortcut: Ctrl+K or Cmd+K
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                this.toggle();
            } else if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    mount() {
        if (document.getElementById('aisa-dict-modal')) return;

        const modalHtml = `
        <div id="aisa-dict-modal" class="aisa-dict-overlay" role="dialog" aria-modal="true" aria-label="Từ điển AI thông minh">
            <div class="aisa-dict-container">
                <!-- Header -->
                <div class="aisa-dict-header">
                    <div class="aisa-dict-brand">
                        <i class="fa-solid fa-brain-circuit" style="color: #0ea5e9;"></i>
                        <span>AISA Dict</span>
                        <span class="aisa-dict-brand-badge">AI</span>
                    </div>

                    <div class="aisa-dict-search-box">
                        <input type="text" id="aisa-dict-input" class="aisa-dict-input" placeholder="Nhập từ vựng, kanji, nghĩa... (Enter để tra)" autocomplete="off" spellcheck="false">
                        <button id="aisa-dict-search-btn" class="aisa-dict-search-btn" title="Tìm kiếm">
                            <i class="fa-solid fa-magnifying-glass"></i>
                        </button>
                    </div>

                    <select id="aisa-dict-lang" class="aisa-dict-lang-select" title="Chọn ngôn ngữ">
                        <option value="en">🇬🇧 Tiếng Anh</option>
                        <option value="ko">🇰🇷 Tiếng Hàn</option>
                        <option value="ja">🇯🇵 Tiếng Nhật</option>
                        <option value="zh">🇨🇳 Tiếng Trung</option>
                    </select>

                    <button id="aisa-dict-close" class="aisa-dict-close-btn" title="Đóng (Esc)">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <!-- Body -->
                <div class="aisa-dict-body">
                    <!-- Loading state -->
                    <div id="aisa-dict-loading" class="aisa-dict-loading">
                        <div class="aisa-dict-spinner"></div>
                        <p id="aisa-dict-loading-text">AISA AI đang phân tích từ vựng & ngữ pháp...</p>
                    </div>

                    <!-- Welcome / Empty state -->
                    <div id="aisa-dict-welcome" class="aisa-dict-welcome">
                        <div class="aisa-dict-welcome-icon">📖</div>
                        <h4>Tra cứu từ điển AI đa ngữ</h4>
                        <p>Nhập từ vựng bất kỳ bằng tiếng Anh, Hàn, Nhật, Trung hoặc tiếng Việt. AISA sẽ tra cứu phát âm, phiên âm, họ từ (Word Family) và ví dụ trực quan.</p>
                        
                        <div class="dict-section-title" style="justify-content: center; margin-bottom: 10px;">
                            <i class="fa-solid fa-fire" style="color: #f59e0b;"></i> Từ phổ biến nên học:
                        </div>
                        <div class="aisa-dict-hot-words" id="aisa-dict-hot-words">
                            <!-- Injected dynamically -->
                        </div>
                    </div>

                    <!-- Result card -->
                    <div id="aisa-dict-result" class="aisa-dict-result">
                        <!-- Top: Word, Phonetic, POS, Audio -->
                        <div class="dict-result-top">
                            <div class="dict-word-header">
                                <div class="dict-word-title-row">
                                    <h2 id="dict-res-word" class="dict-word-title">Word</h2>
                                    <button id="dict-res-speak" class="dict-speak-btn" title="Phát âm">
                                        <i class="fa-solid fa-volume-high"></i>
                                    </button>
                                </div>
                                <div class="dict-phonetic-row">
                                    <span id="dict-res-phonetic" class="dict-phonetic">/phonetic/</span>
                                    <span id="dict-res-pos" class="dict-pos-tag noun">Danh từ</span>
                                </div>
                            </div>
                        </div>

                        <!-- Meaning -->
                        <div class="dict-meaning-box">
                            <div class="dict-meaning-label">Nghĩa tiếng Việt</div>
                            <div id="dict-res-meaning" class="dict-meaning-text">Giải nghĩa từ vựng</div>
                        </div>

                        <!-- Word Family -->
                        <div id="dict-wf-container" class="dict-wf-section">
                            <div class="dict-section-title">
                                <i class="fa-solid fa-diagram-project" style="color: #6366f1;"></i> Họ từ (Word Family 4 dạng):
                            </div>
                            <div class="dict-wf-grid">
                                <div class="dict-wf-item">
                                    <span class="dict-wf-type">Danh từ (Noun)</span>
                                    <span id="dict-wf-noun" class="dict-wf-val">-</span>
                                </div>
                                <div class="dict-wf-item">
                                    <span class="dict-wf-type">Động từ (Verb)</span>
                                    <span id="dict-wf-verb" class="dict-wf-val">-</span>
                                </div>
                                <div class="dict-wf-item">
                                    <span class="dict-wf-type">Tính từ (Adj)</span>
                                    <span id="dict-wf-adj" class="dict-wf-val">-</span>
                                </div>
                                <div class="dict-wf-item">
                                    <span class="dict-wf-type">Trạng từ (Adv)</span>
                                    <span id="dict-wf-adv" class="dict-wf-val">-</span>
                                </div>
                            </div>
                        </div>

                        <!-- Example sentence -->
                        <div class="dict-example-box">
                            <div class="dict-section-title" style="margin-bottom: 2px;">
                                <i class="fa-solid fa-quote-left" style="color: #10b981;"></i> Câu ví dụ thực tế:
                            </div>
                            <div id="dict-res-example-orig" class="dict-example-orig">Example sentence in target language.</div>
                            <div id="dict-res-example-trans" class="dict-example-trans">Bản dịch tiếng Việt của câu ví dụ.</div>
                        </div>

                        <!-- Footer & Actions -->
                        <div class="dict-result-footer">
                            <div class="dict-source-badge">
                                <i class="fa-solid fa-database"></i>
                                <span id="dict-source-label">Cloud Knowledge Base</span>
                            </div>
                            <button id="dict-btn-save" class="dict-btn-save">
                                <i class="fa-solid fa-bookmark"></i>
                                <span id="dict-save-label">Lưu vào Sổ từ vựng</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.bindEvents();
        this.updateHotWords();
    }

    bindEvents() {
        const modal = document.getElementById('aisa-dict-modal');
        const input = document.getElementById('aisa-dict-input');
        const searchBtn = document.getElementById('aisa-dict-search-btn');
        const langSelect = document.getElementById('aisa-dict-lang');
        const closeBtn = document.getElementById('aisa-dict-close');
        const speakBtn = document.getElementById('dict-res-speak');
        const saveBtn = document.getElementById('dict-btn-save');

        // Set default language dropdown
        if (langSelect) langSelect.value = this.currentLang;

        // Close on backdrop click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.close();
            });
        }

        if (closeBtn) closeBtn.addEventListener('click', () => this.close());

        // Search trigger
        if (searchBtn && input) {
            searchBtn.addEventListener('click', () => this.search(input.value.trim()));
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.search(input.value.trim());
                }
            });
        }

        // Change language
        if (langSelect) {
            langSelect.addEventListener('change', (e) => {
                this.currentLang = e.target.value;
                this.updateHotWords();
                if (input && input.value.trim()) {
                    this.search(input.value.trim());
                }
            });
        }

        // Speech
        if (speakBtn) {
            speakBtn.addEventListener('click', () => {
                if (this.currentWordData && this.currentWordData.word) {
                    this.speakWord(this.currentWordData.word, this.currentLang);
                }
            });
        }

        // Save to Vocab
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveToVocab());
        }

        // Word Family click-to-search
        ['dict-wf-noun', 'dict-wf-verb', 'dict-wf-adj', 'dict-wf-adv'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('click', () => {
                    const text = el.textContent.trim();
                    if (text && text !== '-' && text !== 'N/A') {
                        if (input) input.value = text;
                        this.search(text);
                    }
                });
            }
        });
    }

    open(prefillWord = '') {
        this.mount();
        const modal = document.getElementById('aisa-dict-modal');
        const input = document.getElementById('aisa-dict-input');
        if (!modal) return;

        modal.classList.add('active');
        this.isOpen = true;

        if (input) {
            if (prefillWord) {
                input.value = prefillWord;
                this.search(prefillWord);
            }
            setTimeout(() => input.focus(), 80);
        }
    }

    close() {
        const modal = document.getElementById('aisa-dict-modal');
        if (modal) modal.classList.remove('active');
        this.isOpen = false;
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    updateHotWords() {
        const container = document.getElementById('aisa-dict-hot-words');
        if (!container) return;

        const hotDict = {
            en: ['resilience', 'sustainable', 'serendipity', 'eloquent', 'ephemeral', 'lucid'],
            ko: ['행복', '사랑', '도전', '희망', '인연', '설렘'],
            ja: ['桜', '木漏れ日', '絆', '優しさ', '情熱', '一期一会'],
            zh: ['未来', '希望', '努力', '幸福', '坚持', '温暖']
        };

        const words = hotDict[this.currentLang] || hotDict.en;
        container.innerHTML = words.map(w => `<span class="aisa-hot-pill" onclick="window.aisaDict.search('${w}')">${w}</span>`).join('');
    }

    async search(query) {
        if (!query) return;
        query = query.trim();

        const input = document.getElementById('aisa-dict-input');
        if (input) input.value = query;

        const loading = document.getElementById('aisa-dict-loading');
        const welcome = document.getElementById('aisa-dict-welcome');
        const result = document.getElementById('aisa-dict-result');
        const sourceLabel = document.getElementById('dict-source-label');

        welcome.style.display = 'none';
        result.style.display = 'none';
        loading.style.display = 'flex';

        const lang = this.currentLang;

        try {
            // 1. Kiểm tra cache trong Supabase Cloud Database trước
            if (window.studyCloud && typeof window.studyCloud.getDictWord === 'function') {
                const cloudHit = await window.studyCloud.getDictWord(lang, query);
                if (cloudHit) {
                    console.log('[AISA Dict] ⚡ Tìm thấy trong Supabase Cloud Cache:', query);
                    this.renderResult(cloudHit, 'Supabase Cloud (Đã lưu)');
                    return;
                }
            }

            let entry = null;

            // 2. Tra cứu AISA AI qua Worker API
            try {
                const endpoint = (window.MHENT_CONFIG && window.MHENT_CONFIG.AISA_API_ENDPOINT) || 'https://api.mhentuniverse.com';
                const res = await fetch(`${endpoint}/api/generate-example`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        word: query,
                        lang: lang,
                        deckTitle: 'Từ điển AI'
                    })
                });

                if (res.ok) {
                    const resJson = await res.json();
                    const data = (resJson && resJson.data) ? resJson.data : resJson;
                    if (data && (data.meaning || data.example)) {
                        entry = {
                            lang: lang,
                            word: data.word || query,
                            phonetic: data.phonetic || '',
                            pos: data.pos || 'noun',
                            posLabel: data.posLabel || data.pos || 'Từ vựng',
                            meaning: data.meaning || '',
                            example: data.example || '',
                            exampleTrans: data.exampleTrans || '',
                            wordFamily: data.wordFamily || { noun: '', verb: '', adj: '', adv: '' }
                        };
                    }
                }
            } catch (apiErr) {
                console.warn('[AISA Dict Worker API warning, trying fallback]:', apiErr.message);
            }

            // 3. Nếu Worker API chưa trả về kết quả, kích hoạt Fallback Từ điển Quốc tế
            if (!entry) {
                console.log('[AISA Dict] Đang kích hoạt Fallback Từ điển...');
                entry = await this.fetchFallbackWord(query, lang);
            }

            if (!entry) {
                throw new Error('Không tìm thấy từ vựng');
            }

            this.renderResult(entry, 'AISA Scholar Core');

            // 4. Tự động lưu vào Supabase Cloud để làm giàu cơ sở dữ liệu chung
            if (window.studyCloud && typeof window.studyCloud.saveDictWord === 'function') {
                window.studyCloud.saveDictWord(entry).catch(err => {
                    console.warn('[AISA Dict] Lưu cloud ngầm thất bại (không ảnh hưởng hiển thị):', err);
                });
            }

        } catch (err) {
            console.error('[AISA Dict] Lỗi tra cứu:', err);
            loading.style.display = 'none';
            welcome.style.display = 'block';
            welcome.innerHTML = `
                <div class="aisa-dict-welcome-icon" style="color: #ef4444;">⚠️</div>
                <h4 style="color: #f87171;">Không thể tra cứu "${query}"</h4>
                <p>Vui lòng kiểm tra lại kết nối mạng hoặc thử lại bằng một từ vựng khác.</p>
                <button class="aisa-hot-pill" style="margin-top: 10px;" onclick="window.aisaDict.search('${query}')">
                    <i class="fa-solid fa-rotate-right"></i> Thử lại
                </button>
            `;
        }
    }

    async fetchFallbackWord(query, lang) {
        let entry = null;

        // Fallback 1: Cho tiếng Anh qua Free Dictionary API + MyMemory
        if (lang === 'en') {
            try {
                const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(query)}`);
                if (dictRes.ok) {
                    const dictData = await dictRes.json();
                    if (Array.isArray(dictData) && dictData.length > 0) {
                        const item = dictData[0];
                        const phonetic = item.phonetic || (item.phonetics && item.phonetics.find(p => p.text)?.text) || '';
                        const firstMeaning = item.meanings && item.meanings[0];
                        const pos = firstMeaning ? firstMeaning.partOfSpeech : 'noun';
                        const def = firstMeaning && firstMeaning.definitions[0] ? firstMeaning.definitions[0].definition : '';
                        const example = (firstMeaning && firstMeaning.definitions[0] && firstMeaning.definitions[0].example) || `I love the concept of ${query}.`;

                        let viMeaning = '';
                        try {
                            const trRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(query)}&langpair=en|vi`);
                            if (trRes.ok) {
                                const trJson = await trRes.json();
                                viMeaning = trJson.responseData?.translatedText || '';
                            }
                        } catch (e) {}

                        if (!viMeaning) viMeaning = def;

                        let viExample = '';
                        try {
                            const trEx = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(example)}&langpair=en|vi`);
                            if (trEx.ok) {
                                const trJson = await trEx.json();
                                viExample = trJson.responseData?.translatedText || '';
                            }
                        } catch (e) {}

                        const posLabels = {
                            noun: 'Danh từ',
                            verb: 'Động từ',
                            adjective: 'Tính từ',
                            adj: 'Tính từ',
                            adverb: 'Trạng từ',
                            adv: 'Trạng từ'
                        };

                        entry = {
                            lang: 'en',
                            word: item.word || query,
                            phonetic: phonetic,
                            pos: pos,
                            posLabel: posLabels[pos] || pos,
                            meaning: viMeaning,
                            example: example,
                            exampleTrans: viExample || 'Ví dụ minh họa cho từ vựng này.',
                            wordFamily: {
                                noun: pos === 'noun' ? query : '',
                                verb: pos === 'verb' ? query : '',
                                adj: (pos === 'adjective' || pos === 'adj') ? query : '',
                                adv: (pos === 'adverb' || pos === 'adv') ? query : ''
                            }
                        };
                    }
                }
            } catch (dictErr) {
                console.warn('[AISA Dict fallback err]:', dictErr);
            }
        }

        // Fallback 2: Đa ngữ chung (Hàn, Nhật, Trung, Anh)
        if (!entry) {
            try {
                const trRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(query)}&langpair=${lang}|vi`);
                if (trRes.ok) {
                    const trJson = await trRes.json();
                    const viText = trJson.responseData?.translatedText || '';
                    if (viText && viText.trim().toLowerCase() !== query.toLowerCase()) {
                        entry = {
                            lang: lang,
                            word: query,
                            phonetic: '',
                            pos: 'noun',
                            posLabel: 'Từ vựng',
                            meaning: viText,
                            example: `Từ vựng "${query}" được sử dụng phổ biến trong giao tiếp.`,
                            exampleTrans: `Bản dịch nghĩa: ${viText}`,
                            wordFamily: { noun: query, verb: '', adj: '', adv: '' }
                        };
                    }
                }
            } catch (e) {
                console.warn('[AISA Dict general fallback note]:', e);
            }
        }

        return entry;
    }

    renderResult(data, source = 'AISA AI') {
        const loading = document.getElementById('aisa-dict-loading');
        const welcome = document.getElementById('aisa-dict-welcome');
        const result = document.getElementById('aisa-dict-result');

        loading.style.display = 'none';
        welcome.style.display = 'none';
        result.style.display = 'flex';

        this.currentWordData = data;

        // Render Top
        const wordEl = document.getElementById('dict-res-word');
        const phoneticEl = document.getElementById('dict-res-phonetic');
        const posEl = document.getElementById('dict-res-pos');
        const meaningEl = document.getElementById('dict-res-meaning');
        const exOrigEl = document.getElementById('dict-res-example-orig');
        const exTransEl = document.getElementById('dict-res-example-trans');
        const sourceLabel = document.getElementById('dict-source-label');
        const saveBtn = document.getElementById('dict-btn-save');
        const saveLabel = document.getElementById('dict-save-label');

        wordEl.textContent = data.word;
        phoneticEl.textContent = data.phonetic || `/${data.word}/`;

        // POS
        const posKey = (data.pos || 'noun').toLowerCase();
        posEl.className = `dict-pos-tag ${posKey}`;
        posEl.textContent = data.pos_label || data.posLabel || this.mapPosLabel(posKey);

        // Meaning & Example
        meaningEl.textContent = data.meaning;
        exOrigEl.textContent = data.example || 'Chưa có ví dụ';
        exTransEl.textContent = data.example_trans || data.exampleTrans || '';

        // Source badge
        sourceLabel.textContent = source;

        // Reset Save Button
        saveBtn.className = 'dict-btn-save';
        saveLabel.textContent = 'Lưu vào Sổ từ vựng';

        // Word Family
        const wf = data.word_family || data.wordFamily || {};
        this.renderWfItem('dict-wf-noun', wf.noun);
        this.renderWfItem('dict-wf-verb', wf.verb);
        this.renderWfItem('dict-wf-adj', wf.adj);
        this.renderWfItem('dict-wf-adv', wf.adv);
    }

    renderWfItem(id, val) {
        const el = document.getElementById(id);
        if (!el) return;
        if (val && val.trim() !== '') {
            el.textContent = val;
            el.style.opacity = '1';
            el.style.cursor = 'pointer';
        } else {
            el.textContent = '-';
            el.style.opacity = '0.4';
            el.style.cursor = 'default';
        }
    }

    mapPosLabel(pos) {
        const map = {
            noun: 'Danh từ',
            verb: 'Động từ',
            adj: 'Tính từ',
            adjective: 'Tính từ',
            adv: 'Trạng từ',
            adverb: 'Trạng từ',
            phrase: 'Cụm từ',
            idiom: 'Thành ngữ'
        };
        return map[pos.toLowerCase()] || pos;
    }

    speakWord(word, lang) {
        if (!window.speechSynthesis) return;

        window.speechSynthesis.cancel(); // Dừng câu đang đọc nếu có
        const utterance = new SpeechSynthesisUtterance(word);
        
        const langMap = {
            en: 'en-US',
            ko: 'ko-KR',
            ja: 'ja-JP',
            zh: 'zh-CN'
        };
        utterance.lang = langMap[lang] || 'en-US';
        utterance.rate = 0.9;

        // Tìm voice phù hợp nếu có
        const voices = window.speechSynthesis.getVoices();
        const matchedVoice = voices.find(v => v.lang.startsWith(langMap[lang] || 'en'));
        if (matchedVoice) utterance.voice = matchedVoice;

        window.speechSynthesis.speak(utterance);
    }

    saveToVocab() {
        if (!this.currentWordData) return;

        const data = this.currentWordData;
        const saveBtn = document.getElementById('dict-btn-save');
        const saveLabel = document.getElementById('dict-save-label');

        // 🌟 Bật Popup chọn Sổ từ vựng / Bộ bài học mục tiêu
        if (window.deckSelector) {
            window.deckSelector.open({
                word: data.word,
                meaning: data.meaning,
                phonetic: data.phonetic || '',
                pos: data.pos || 'noun',
                example: data.example || '',
                exampleTrans: data.example_trans || data.exampleTrans || '',
                wordFamily: data.word_family || data.wordFamily || {},
                lang: this.currentLang,
                onSave: (targetDeck) => {
                    if (saveBtn) {
                        saveBtn.classList.add('saved');
                        if (saveLabel) saveLabel.innerHTML = `<i class="fa-solid fa-check"></i> Đã lưu (${targetDeck.title})`;
                    }
                }
            });
            return;
        }

        const wordObj = {
            id: 'dict_' + Date.now(),
            word: data.word,
            meaning: data.meaning,
            phonetic: data.phonetic || '',
            pos: data.pos || 'noun',
            example: data.example || '',
            exampleTrans: data.example_trans || data.exampleTrans || '',
            wordFamily: data.word_family || data.wordFamily || {},
            note: 'Tra từ điển AISA AI',
            status: 'new',
            createdAt: new Date().toISOString()
        };

        // 1. Nếu đang mở trang Vocabulary Sheet (VocabSheetApp)
        const app = window.sheetApp || window.vocabApp;
        if (app && typeof app.addWordDirectly === 'function') {
            app.addWordDirectly(wordObj);
        } else if (window.studyStorage) {
            // 2. Lưu vào StudyStorage
            const lang = this.currentLang;
            let decks = window.studyStorage.getDecks(lang);
            
            // Tìm bộ từ điển mặc định hoặc tạo mới
            let targetDeck = decks.find(d => d.title && d.title.includes('Sổ tay từ điển')) || decks[0];
            if (!targetDeck) {
                targetDeck = {
                    id: `deck_dict_${lang}`,
                    title: `Sổ tay từ điển (${lang.toUpperCase()})`,
                    description: 'Các từ vựng được tra cứu và lưu từ AISA AI Dictionary',
                    lang: lang,
                    words: []
                };
                decks.push(targetDeck);
            }

            if (!targetDeck.words) targetDeck.words = [];
            // Kiểm tra trùng lặp
            const exists = targetDeck.words.some(w => (w.word || '').toLowerCase() === (wordObj.word || '').toLowerCase());
            if (!exists) {
                targetDeck.words.unshift(wordObj);
                window.studyStorage.saveDecks(decks, lang);
            }
        }

        // Cập nhật UI button đã lưu
        if (saveBtn) {
            saveBtn.classList.add('saved');
            if (saveLabel) saveLabel.innerHTML = '<i class="fa-solid fa-check"></i> Đã lưu vào Sổ từ vựng';
        }

        if (typeof showToast === 'function') {
            showToast(`Đã lưu "${data.word}" vào Sổ từ vựng của bạn!`, 'success');
        } else {
            console.log(`[AISA Dict] ✅ Đã lưu "${data.word}" vào Sổ từ vựng.`);
        }
    }
}

// Khởi tạo Singleton
window.aisaDict = new AisaDictionary();
