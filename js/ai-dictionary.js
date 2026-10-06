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
                    <div class="aisa-dict-header-top">
                        <div class="aisa-dict-brand">
                            <div class="aisa-dict-brand-icon">
                                <i class="fa-solid fa-brain-circuit"></i>
                            </div>
                            <div class="aisa-dict-brand-text">
                                <div class="aisa-dict-brand-name">
                                    <span>AISA Smart Dictionary</span>
                                    <span class="aisa-dict-brand-badge">AI 3.5</span>
                                </div>
                                <div class="aisa-dict-brand-tagline">Tra cứu ngữ nghĩa, phát âm & sổ từ vựng ngoại ngữ</div>
                            </div>
                        </div>

                        <button id="aisa-dict-close" class="aisa-dict-close-btn" title="Đóng (Esc)">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <div class="aisa-dict-search-row">
                        <div class="aisa-dict-search-box">
                            <i class="fa-solid fa-magnifying-glass aisa-dict-input-icon"></i>
                            <input type="text" id="aisa-dict-input" class="aisa-dict-input" placeholder="Nhập từ vựng, chữ Hán, thành ngữ... (Enter để tra)" autocomplete="off" spellcheck="false">
                            <button id="aisa-dict-search-btn" class="aisa-dict-search-btn" title="Tra cứu">
                                <span>Tra từ</span>
                            </button>
                        </div>

                        <select id="aisa-dict-lang" class="aisa-dict-lang-select" title="Chọn ngôn ngữ">
                            <option value="en">🇬🇧 Tiếng Anh</option>
                            <option value="ko">🇰🇷 Tiếng Hàn</option>
                            <option value="ja">🇯🇵 Tiếng Nhật</option>
                            <option value="zh">🇨🇳 Tiếng Trung</option>
                        </select>
                    </div>
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

    open(prefillWord = '', targetLang = '') {
        this.mount();
        const modal = document.getElementById('aisa-dict-modal');
        const input = document.getElementById('aisa-dict-input');
        const langSelect = document.getElementById('aisa-dict-lang');
        if (!modal) return;

        if (targetLang && ['en', 'ko', 'ja', 'zh'].includes(targetLang)) {
            this.currentLang = targetLang;
            if (langSelect) langSelect.value = targetLang;
            this.updateHotWords();
        }

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

            // 2. Tra cứu siêu tốc bằng Direct Gemini (giống Study Desk / Vocab Sheet - tốc độ ~1s)
            const fallbackKey = typeof atob === 'function' ? atob('QVEuQWI4Uk42STZRQUsycGk2RVNISlJMTDlERUppNS1NRXUwXzM5ekwtc211Y3Y0b1A0VGc=') : '';
            const apiKey = localStorage.getItem('mhent_ai_api_key') || (window.MHENT_CONFIG && window.MHENT_CONFIG.GEMINI_API_KEY) || fallbackKey;
            if (apiKey) {
                try {
                    const langNames = { ja: 'tiếng Nhật', ko: 'tiếng Hàn', zh: 'tiếng Trung', en: 'tiếng Anh' };
                    const langName = langNames[lang] || 'tiếng Anh';
                    const prompt = `Từ khóa: "${query}" (Từ vựng ${langName}).
Nhiệm vụ: Phân tích thông tin học tập đầy đủ, chuẩn xác và xuất sắc nhất:
- "word": Từ gốc chính xác bằng ${langName}.
- "phonetic": Phiên âm chuẩn (IPA cho tiếng Anh ví dụ /ˈklær.ə.ti/, Furigana/Romaji cho tiếng Nhật, Romaja cho tiếng Hàn, Pinyin có dấu cho tiếng Trung).
- "pos": "noun"|"verb"|"adj"|"adv"|"phrasal_verb"|"collocation"|"other".
- "posLabel": "Danh từ"|"Động từ"|"Tính từ"|"Trạng từ"|"Cụm động từ"|"Collocation"|"Khác".
- "meaning": Nghĩa tiếng Việt chuẩn xác, súc tích, tự nhiên, dễ hiểu.
- "example": 1 câu ví dụ ngắn gọn, sinh động, tự nhiên bằng ${langName} có chứa từ vựng này.
- "exampleTrans": Dịch câu ví dụ sang tiếng Việt.
- "wordFamily": Đối tượng chứa 4 dạng gia đình từ tương ứng (nếu có, không có ghi "-"):
  {"noun": "...", "verb": "...", "adj": "...", "adv": "..."}

Trả về DUY NHẤT một chuỗi JSON hợp lệ (không markdown):
{"word":"...","phonetic":"...","pos":"noun","posLabel":"Danh từ","meaning":"...","example":"...","exampleTrans":"...","wordFamily":{"noun":"...","verb":"...","adj":"...","adv":"..."}}`;

                    const geminiModels = ['gemini-3.5-flash-lite', 'gemini-2.5-flash', 'gemini-flash-lite-latest'];
                    for (const m of geminiModels) {
                        try {
                            const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    contents: [{ parts: [{ text: prompt }] }],
                                    generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
                                })
                            });
                            if (geminiRes.ok) {
                                const gemData = await geminiRes.json();
                                const rawText = gemData.candidates?.[0]?.content?.parts?.[0]?.text;
                                if (rawText) {
                                    const clean = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
                                    const parsed = JSON.parse(clean);
                                    if (parsed && (parsed.meaning || parsed.word)) {
                                        entry = {
                                            lang: lang,
                                            word: parsed.word || query,
                                            phonetic: parsed.phonetic || '',
                                            pos: parsed.pos || 'noun',
                                            posLabel: parsed.posLabel || 'Từ vựng',
                                            meaning: parsed.meaning || '',
                                            example: parsed.example || '',
                                            exampleTrans: parsed.exampleTrans || '',
                                            wordFamily: parsed.wordFamily || { noun: '', verb: '', adj: '', adv: '' }
                                        };
                                        break;
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn(`[Gemini ${m} error]:`, e.message);
                        }
                    }
                } catch (gemErr) {
                    console.warn('[Direct Gemini Error, trying Worker API]:', gemErr);
                }
            }

            // 3. Tra cứu AISA AI qua Worker API nếu Direct Gemini chưa có
            if (!entry) {
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

    async translateToVi(text, fromLang = 'auto') {
        if (!text) return '';
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=vi&dt=t&q=${encodeURIComponent(text)}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data && data[0] && Array.isArray(data[0])) {
                    return data[0].map(item => item[0]).filter(Boolean).join('');
                }
            }
        } catch (e) {
            console.warn('[translateToVi error]:', e);
        }
        return '';
    }

    deriveWordFamily(word, pos) {
        const w = (word || '').toLowerCase().trim();
        const knownFamilies = {
            clarity: { noun: 'clarity / clearness', verb: 'clarify', adj: 'clear', adv: 'clearly' },
            clear: { noun: 'clarity / clearness', verb: 'clarify', adj: 'clear', adv: 'clearly' },
            dream: { noun: 'dream / dreamer', verb: 'dream', adj: 'dreamy', adv: 'dreamily' },
            resilience: { noun: 'resilience / resiliency', verb: '-', adj: 'resilient', adv: 'resiliently' },
            resilient: { noun: 'resilience', verb: '-', adj: 'resilient', adv: 'resiliently' },
            beauty: { noun: 'beauty / beautician', verb: 'beautify', adj: 'beautiful', adv: 'beautifully' },
            beautiful: { noun: 'beauty', verb: 'beautify', adj: 'beautiful', adv: 'beautifully' },
            create: { noun: 'creation / creator', verb: 'create', adj: 'creative', adv: 'creatively' },
            creation: { noun: 'creation / creator', verb: 'create', adj: 'creative', adv: 'creatively' },
            creative: { noun: 'creativity / creation', verb: 'create', adj: 'creative', adv: 'creatively' },
            success: { noun: 'success', verb: 'succeed', adj: 'successful', adv: 'successfully' },
            succeed: { noun: 'success', verb: 'succeed', adj: 'successful', adv: 'successfully' },
            successful: { noun: 'success', verb: 'succeed', adj: 'successful', adv: 'successfully' },
            decide: { noun: 'decision', verb: 'decide', adj: 'decisive', adv: 'decisively' },
            decision: { noun: 'decision', verb: 'decide', adj: 'decisive', adv: 'decisively' },
            peace: { noun: 'peace', verb: 'pacify', adj: 'peaceful', adv: 'peacefully' },
            peaceful: { noun: 'peace', verb: 'pacify', adj: 'peaceful', adv: 'peacefully' },
            hope: { noun: 'hope', verb: 'hope', adj: 'hopeful', adv: 'hopefully' },
            hopeful: { noun: 'hope', verb: 'hope', adj: 'hopeful', adv: 'hopefully' },
            love: { noun: 'love / lover', verb: 'love', adj: 'lovely / loving', adv: 'lovingly' },
            active: { noun: 'activity / action', verb: 'activate', adj: 'active', adv: 'actively' },
            education: { noun: 'education / educator', verb: 'educate', adj: 'educational', adv: 'educationally' },
            happy: { noun: 'happiness', verb: '-', adj: 'happy', adv: 'happily' },
            happiness: { noun: 'happiness', verb: '-', adj: 'happy', adv: 'happily' },
            strong: { noun: 'strength', verb: 'strengthen', adj: 'strong', adv: 'strongly' },
            strength: { noun: 'strength', verb: 'strengthen', adj: 'strong', adv: 'strongly' }
        };

        if (knownFamilies[w]) return knownFamilies[w];

        let noun = pos === 'noun' ? w : '';
        let verb = pos === 'verb' ? w : '';
        let adj = (pos === 'adj' || pos === 'adjective') ? w : '';
        let adv = (pos === 'adv' || pos === 'adverb') ? w : '';

        if (w.endsWith('tion') || w.endsWith('ment') || w.endsWith('ness') || w.endsWith('ity')) {
            noun = w;
            if (!adv) adv = w.replace(/(tion|ment|ness|ity)$/, '') + 'ly';
        } else if (w.endsWith('ly')) {
            adv = w;
            adj = w.replace(/ly$/, '');
        } else if (w.endsWith('ful')) {
            adj = w;
            adv = w + 'ly';
            noun = w.replace(/ful$/, '');
        } else if (w.endsWith('able') || w.endsWith('ible')) {
            adj = w;
            adv = w.replace(/e$/, 'y');
            noun = w.replace(/ble$/, 'bility');
        }

        return {
            noun: noun || (pos === 'noun' ? w : '-'),
            verb: verb || (pos === 'verb' ? w : '-'),
            adj: adj || (pos === 'adj' || pos === 'adjective' ? w : '-'),
            adv: adv || (pos === 'adv' || pos === 'adverb' ? w : '-')
        };
    }

    async fetchFallbackWord(query, lang) {
        let entry = null;

        // Fallback 1: Cho tiếng Anh qua Free Dictionary API + Google Translate GTX
        if (lang === 'en') {
            try {
                let dictItem = null;
                try {
                    const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(query)}`);
                    if (dictRes.ok) {
                        const dictData = await dictRes.json();
                        if (Array.isArray(dictData) && dictData.length > 0) {
                            dictItem = dictData[0];
                        }
                    }
                } catch (e) {
                    console.warn('[DictionaryAPI fetch warning]:', e);
                }

                const phonetic = dictItem?.phonetic || (dictItem?.phonetics && dictItem.phonetics.find(p => p.text)?.text) || `/${query}/`;
                const firstMeaning = dictItem?.meanings && dictItem.meanings[0];
                const pos = firstMeaning ? firstMeaning.partOfSpeech : 'noun';
                const rawDef = firstMeaning && firstMeaning.definitions[0] ? firstMeaning.definitions[0].definition : '';
                const rawExample = (firstMeaning && firstMeaning.definitions[0] && firstMeaning.definitions[0].example) || `He spoke with remarkable ${query}.`;

                // Dịch nghĩa từ vựng và câu ví dụ chuẩn xác bằng Google Translate
                const viWord = await this.translateToVi(query, 'en');
                let viDef = '';
                if (rawDef) {
                    viDef = await this.translateToVi(rawDef, 'en');
                }
                const viEx = await this.translateToVi(rawExample, 'en');

                const posLabels = {
                    noun: 'Danh từ',
                    verb: 'Động từ',
                    adjective: 'Tính từ',
                    adj: 'Tính từ',
                    adverb: 'Trạng từ',
                    adv: 'Trạng từ',
                    preposition: 'Giới từ',
                    conjunction: 'Liên từ'
                };

                const meaningCombined = viWord ? (viDef ? `${viWord} (${viDef})` : viWord) : (viDef || 'Giải nghĩa từ vựng');
                const wordFam = this.deriveWordFamily(query, pos);

                entry = {
                    lang: 'en',
                    word: query,
                    phonetic: phonetic,
                    pos: pos,
                    posLabel: posLabels[pos] || pos,
                    meaning: meaningCombined,
                    example: rawExample,
                    exampleTrans: viEx || 'Ví dụ minh họa cho từ vựng này.',
                    wordFamily: wordFam
                };
            } catch (dictErr) {
                console.warn('[AISA Dict fallback err]:', dictErr);
            }
        }

        // Fallback 2: Đa ngữ chung (Hàn, Nhật, Trung)
        if (!entry) {
            try {
                const viWord = await this.translateToVi(query, lang);
                if (viWord && viWord.trim().toLowerCase() !== query.toLowerCase()) {
                    const sampleSentences = {
                        ko: `"${query}"(은)는 일상 대화에서 자주 사용되는 어휘입니다.`,
                        ja: `「${query}」は日常会話でよく使われる語彙です。`,
                        zh: `“${query}”在日常汉语交流中非常常用。`,
                        en: `The word "${query}" is commonly used in English.`
                    };
                    const origEx = sampleSentences[lang] || `The term "${query}" has important meaning.`;
                    const transEx = await this.translateToVi(origEx, lang);

                    entry = {
                        lang: lang,
                        word: query,
                        phonetic: '',
                        pos: 'noun',
                        posLabel: 'Từ vựng',
                        meaning: viWord,
                        example: origEx,
                        exampleTrans: transEx || `Nghĩa tiếng Việt: ${viWord}`,
                        wordFamily: { noun: query, verb: '-', adj: '-', adv: '-' }
                    };
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
