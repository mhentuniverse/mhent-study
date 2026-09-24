/**
 * MHENT STUDY - AI DECK CREATOR & SMART VOCAB IMPORTER
 * Cho phép người học tự tạo bộ bài mới từ đầu:
 * - 📸 Tải ảnh / Chụp ảnh sách giáo khoa, vở ghi, flashcard (Vision AI)
 * - 📝 Dán đoạn văn bản, danh sách từ, câu chuyện (Text AI)
 * - ✍️ Tạo bài học trống để nhập thủ công
 * Tự động trích xuất từ vựng, phiên âm chuẩn, từ loại, nghĩa tiếng Việt và câu ví dụ!
 */

class AIDeckCreator {
    constructor() {
        this.currentLang = 'ja';
        this.selectedImageBase64 = null;
        this.selectedImageMime = null;
        this.extractedWords = [];
        this.isProcessing = false;
        this.targetDeckId = null; // null: tạo bài mới, string: thêm vào bài đã có
        this.init();
    }

    init() {
        // Lắng nghe sự kiện click mở modal từ bất kỳ nút nào trên trang
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-open-ai-creator, .btn-open-create-deck, .btn-open-ai-import');
            if (btn) {
                e.preventDefault();
                const lang = btn.getAttribute('data-lang') || this.detectCurrentPageLang();
                const targetDeckId = btn.getAttribute('data-deck-id') || null;
                const isImportOnly = btn.classList.contains('btn-open-ai-import');
                this.open({ lang, targetDeckId, isImportOnly });
            }
        });
    }

    detectCurrentPageLang() {
        const path = window.location.pathname;
        if (path.includes('/ko/')) return 'ko';
        if (path.includes('/zh/')) return 'zh';
        if (path.includes('/en/')) return 'en';
        if (path.includes('/ja/')) return 'ja';
        return 'ja';
    }

    getLangConfig(lang) {
        const configs = {
            ja: {
                name: 'Tiếng Nhật',
                flag: '🇯🇵',
                themeColor: '#ef4444',
                script: 'Kanji / Hiragana / Katakana',
                phonetic: '[Furigana/Kana - Romaji] (Ví dụ: [にほん - Nihon])',
                placeholderTitle: 'VD: Minna no Nihongo Bài 1 - Chào hỏi & Quốc tịch',
                placeholderText: 'Dán danh sách từ hoặc bài đọc tiếng Nhật vào đây...\nVí dụ: 先生, 学生, 会社員, 日本, ベトナム, 食べる, 勉強する...\nHoặc dán cả đoạn văn tiếng Nhật từ sách giáo khoa.',
                vocabPageUrl: '/ja/practice/vocab.html'
            },
            ko: {
                name: 'Tiếng Hàn',
                flag: '🇰🇷',
                themeColor: '#ec4899',
                script: 'Hangeul',
                phonetic: '[Phát âm chuẩn Hangeul] (Ví dụ: [나라], [항국])',
                placeholderTitle: 'VD: Tiếng Hàn Nhập Môn - Gia đình & Bạn bè',
                placeholderText: 'Dán danh sách từ hoặc bài đọc tiếng Hàn vào đây...\nVí dụ: 친구, 가족, 학교, 선생님, 한국어, 사랑하다, 예쁘다...\nHoặc dán đoạn hội thoại trong giáo trình.',
                vocabPageUrl: '/ko/practice/vocab.html'
            },
            zh: {
                name: 'Tiếng Trung',
                flag: '🇨🇳',
                themeColor: '#f59e0b',
                script: 'Chữ Hán (Giản thể / Phồn thể)',
                phonetic: '[Pinyin có thanh điệu] (Ví dụ: [nǐ hǎo], [xuéxí])',
                placeholderTitle: 'VD: Từ vựng HSK 1 - Giao tiếp hàng ngày',
                placeholderText: 'Dán danh sách chữ Hán hoặc đoạn văn tiếng Trung vào đây...\nVí dụ: 你好, 谢谢, 老师, 学生, 中国, 喜欢, 喝茶...\nHoặc bài đọc ngắn trong sách giáo khoa.',
                vocabPageUrl: '/zh/practice/vocab.html'
            },
            en: {
                name: 'Tiếng Anh',
                flag: '🇬🇧',
                themeColor: '#6366f1',
                script: 'English',
                phonetic: '[Phiên âm quốc tế IPA] (Ví dụ: [/həˈloʊ/], [/ˈvəʊ.kæb/])',
                placeholderTitle: 'VD: 3000 Oxford Words - Daily Communication',
                placeholderText: 'Paste English vocabulary words or paragraph here...\nExample: opportunity, resilient, accomplish, dedicate, versatile...\nOr paste a reading passage or article.',
                vocabPageUrl: '/en/practice/vocab.html'
            }
        };
        return configs[lang] || configs.ja;
    }

    ensureModal() {
        let overlay = document.getElementById('aiDeckCreatorModal');
        if (overlay) return overlay;

        overlay = document.createElement('div');
        overlay.id = 'aiDeckCreatorModal';
        overlay.className = 'mhent-overlay ai-creator-overlay';

        overlay.innerHTML = `
            <div class="mhent-modal ai-creator-modal" role="dialog" aria-modal="true">
                <div class="modal-header ai-modal-header">
                    <div class="ai-header-title-wrap">
                        <div class="ai-header-icon" id="aiModalHeaderIcon">✨</div>
                        <div>
                            <h3 id="aiModalMainTitle">Tạo Bài Học Mới Cùng Trợ Lý AI</h3>
                            <p class="ai-header-sub" id="aiModalSubTitle">Quét ảnh chụp sách giáo khoa, dán văn bản hoặc tạo bài học tùy chỉnh</p>
                        </div>
                    </div>
                    <button type="button" class="btn-modal-close" onclick="window.aiDeckCreator.close()" aria-label="Đóng"><i class="fa-solid fa-xmark"></i></button>
                </div>

                <div class="modal-body ai-modal-body">
                    
                    <!-- Phần Thông Tin Bài Học (Deck Meta) -->
                    <div class="ai-deck-meta-card" id="aiDeckMetaCard">
                        <div class="ai-form-row">
                            <div class="ai-form-group" style="flex: 2;">
                                <label class="ai-label">Tên bài học / Bộ từ vựng <span style="color: #ef4444;">*</span></label>
                                <input type="text" id="aiDeckTitleInput" class="modal-input" placeholder="VD: Bài 1 - Gia đình & Bạn bè">
                            </div>
                            <div class="ai-form-group" style="flex: 1;">
                                <label class="ai-label">Ngôn ngữ học</label>
                                <select id="aiDeckLangSelect" class="modal-input ai-select-lang" onchange="window.aiDeckCreator.changeLang(this.value)">
                                    <option value="ja">🇯🇵 Tiếng Nhật</option>
                                    <option value="ko">🇰🇷 Tiếng Hàn</option>
                                    <option value="zh">🇨🇳 Tiếng Trung</option>
                                    <option value="en">🇬🇧 Tiếng Anh</option>
                                </select>
                            </div>
                        </div>
                        <div class="ai-form-group" style="margin-top: 10px;">
                            <label class="ai-label">Mô tả bài học (tùy chọn)</label>
                            <input type="text" id="aiDeckDescInput" class="modal-input" placeholder="VD: Từ vựng trọng tâm trích xuất từ sách giáo khoa bài 1">
                        </div>
                    </div>

                    <!-- Tabs Chọn Phương Thức Tạo -->
                    <div class="ai-tabs-bar" id="aiTabsBar">
                        <button type="button" class="ai-tab-btn active" data-tab="vision" onclick="window.aiDeckCreator.switchTab('vision')">
                            <i class="fa-solid fa-camera"></i> 📸 Quét Ảnh Bằng AI
                        </button>
                        <button type="button" class="ai-tab-btn" data-tab="text" onclick="window.aiDeckCreator.switchTab('text')">
                            <i class="fa-solid fa-file-lines"></i> 📝 Dán Văn Bản / Từ Vựng
                        </button>
                        <button type="button" class="ai-tab-btn" data-tab="blank" onclick="window.aiDeckCreator.switchTab('blank')">
                            <i class="fa-solid fa-pen-to-square"></i> ✍️ Tạo Bài Trống
                        </button>
                    </div>

                    <!-- TAB 1: VISION AI (Tải ảnh / Chụp ảnh) -->
                    <div class="ai-tab-pane active" id="aiPaneVision">
                        <div class="ai-dropzone" id="aiDropzone">
                            <input type="file" id="aiFileInput" accept="image/*" style="display: none;" onchange="window.aiDeckCreator.handleFileSelect(this)">
                            
                            <div class="ai-dropzone-inner" id="aiDropzonePrompt">
                                <div class="dropzone-icon">📷</div>
                                <h4 class="dropzone-title">Kéo & thả ảnh chụp từ vựng vào đây, hoặc click để chọn</h4>
                                <p class="dropzone-desc">Chụp ảnh sách giáo khoa, vở ghi, flashcard, đề thi hoặc màn hình bài học (Hỗ trợ JPG, PNG, WebP)</p>
                                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 12px;">
                                    <button type="button" class="btn-primary ai-choose-file-btn" onclick="document.getElementById('aiFileInput').click()">
                                        <i class="fa-solid fa-folder-open"></i> Chọn Ảnh Từ Máy
                                    </button>
                                </div>
                            </div>

                            <!-- Preview ảnh đã chọn -->
                            <div class="ai-preview-box" id="aiImagePreviewBox" style="display: none;">
                                <div class="preview-img-wrap">
                                    <img id="aiPreviewImg" src="" alt="Ảnh bài học">
                                </div>
                                <div class="preview-img-info">
                                    <span class="preview-filename" id="aiPreviewFilename">anh_bai_hoc.jpg</span>
                                    <span class="preview-filesize" id="aiPreviewFilesize">1.2 MB</span>
                                    <button type="button" class="btn-ghost btn-remove-img" onclick="window.aiDeckCreator.removeImage()">
                                        <i class="fa-solid fa-trash-can"></i> Đổi ảnh khác
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="ai-action-bar">
                            <button type="button" class="btn-primary ai-run-btn" id="aiBtnRunVision" onclick="window.aiDeckCreator.runVisionAnalysis()">
                                <i class="fa-solid fa-wand-magic-sparkles"></i> AI Bắt Đầu Phân Tích & Bóc Tách Từ Vựng
                            </button>
                        </div>
                    </div>

                    <!-- TAB 2: TEXT AI (Dán văn bản) -->
                    <div class="ai-tab-pane" id="aiPaneText" style="display: none;">
                        <div class="ai-text-input-wrap">
                            <label class="ai-label">Dán danh sách từ, câu văn hoặc bài đọc vào đây:</label>
                            <textarea id="aiTextInput" class="modal-input ai-textarea" rows="6" placeholder=""></textarea>
                            <p class="ai-hint">💡 AI sẽ tự động phân tích ngữ cảnh, phát hiện các từ vựng quan trọng, tra phiên âm chuẩn, từ loại, nghĩa tiếng Việt và đặt câu ví dụ.</p>
                        </div>
                        <div class="ai-action-bar">
                            <button type="button" class="btn-primary ai-run-btn" id="aiBtnRunText" onclick="window.aiDeckCreator.runTextAnalysis()">
                                <i class="fa-solid fa-wand-magic-sparkles"></i> AI Bắt Đầu Phân Tích Văn Bản
                            </button>
                        </div>
                    </div>

                    <!-- TAB 3: BLANK DECK (Tạo bộ bài trống) -->
                    <div class="ai-tab-pane" id="aiPaneBlank" style="display: none;">
                        <div class="ai-blank-info-box">
                            <div style="font-size: 2.2rem; margin-bottom: 8px;">✍️</div>
                            <h4>Tạo Bộ Bài Trống</h4>
                            <p>Bộ bài sẽ được tạo mới hoàn toàn với 0 từ vựng. Cậu có thể bắt đầu tự tay thêm từng từ vào bảng bất cứ lúc nào!</p>
                        </div>
                        <div class="ai-action-bar">
                            <button type="button" class="btn-primary ai-run-btn" onclick="window.aiDeckCreator.createBlankDeck()">
                                <i class="fa-solid fa-check"></i> Tạo Bộ Bài Trống & Bắt Đầu
                            </button>
                        </div>
                    </div>

                    <!-- TRẠNG THÁI LOADING (AISA THINKING) -->
                    <div class="ai-loading-box" id="aiLoadingBox" style="display: none;">
                        <div class="ai-loading-avatars">
                            <span class="loading-mascot-icon bounce-harmony">🌸</span>
                            <span class="loading-sparkle">✨</span>
                            <span class="loading-mascot-icon bounce-echo">😈</span>
                        </div>
                        <h4 class="loading-title" id="aiLoadingTitle">AISA đang đọc nội dung và phân tích từ vựng...</h4>
                        <p class="loading-desc" id="aiLoadingDesc">Đang tra cứu phiên âm chuẩn, giải nghĩa tiếng Việt và đặt câu ví dụ song ngữ...</p>
                        <div class="ai-loading-bar-wrap">
                            <div class="ai-loading-bar" id="aiLoadingBar"></div>
                        </div>
                    </div>

                    <!-- PHẦN KẾT QUẢ XEM TRƯỚC & CHỌN TỪ (RESULT PREVIEW TABLE) -->
                    <div class="ai-results-box" id="aiResultsBox" style="display: none;">
                        
                        <!-- Card Hỏi Ý Kiến / Xác Nhận Độ Chuẩn Xác Của AI -->
                        <div class="ai-verify-card" id="aiVerifyCard">
                            <div class="ai-verify-mascot">🌸</div>
                            <div class="ai-verify-content">
                                <span class="ai-verify-badge">AISA Companion • Phản hồi kết quả</span>
                                <h4 class="ai-verify-title">AISA vừa trích xuất được <span id="aiVerifyWordCount" class="highlight-blue" style="font-size: 1.25rem;">0</span> từ vựng nè!</h4>
                                <p class="ai-verify-desc" id="aiVerifyDesc">
                                    Kết quả bóc tách từ ảnh/văn bản này đã đúng chuẩn với ý cậu chưa nhỉ? Dù đúng hay chưa chuẩn 100%, cậu đều có thể tự do xem, thêm, sửa hoặc bớt từ ngay bên dưới nha! ✨
                                </p>
                                <div class="ai-verify-actions">
                                    <button type="button" class="btn-verify-opt btn-verify-yes" id="btnVerifyYes" onclick="window.aiDeckCreator.handleVerifyFeedback('yes')">
                                        <i class="fa-solid fa-circle-check"></i> ✅ Chuẩn rồi! (Xem qua & lưu bài)
                                    </button>
                                    <button type="button" class="btn-verify-opt btn-verify-edit" id="btnVerifyEdit" onclick="window.aiDeckCreator.handleVerifyFeedback('edit')">
                                        <i class="fa-solid fa-pen-to-square"></i> ✏️ Cần chỉnh sửa thêm / Bổ sung từ
                                    </button>
                                </div>
                                <div class="ai-verify-status-msg" id="aiVerifyStatusMsg" style="display: none;"></div>
                            </div>
                        </div>

                        <div class="ai-results-header">
                            <div>
                                <h4 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: var(--study-text);">
                                    Danh sách từ vựng (<span id="aiResultBadgeCount" class="highlight-blue">0</span> từ)
                                </h4>
                                <p style="margin: 4px 0 0 0; font-size: 0.84rem; color: var(--study-text-muted);">
                                    💡 <b>Mẹo tự động:</b> Khi cậu gõ thêm từ mới, AI sẽ tự động sinh câu ví dụ song ngữ giúp cậu luôn! Cậu có thể lia chuột qua ô ví dụ để sửa tùy ý nha!
                                </p>
                            </div>
                            <div class="ai-results-actions">
                                <button type="button" class="btn-ghost btn-sm" onclick="window.aiDeckCreator.toggleSelectAll(true)">Chọn tất cả</button>
                                <button type="button" class="btn-ghost btn-sm" onclick="window.aiDeckCreator.toggleSelectAll(false)">Bỏ chọn</button>
                                <button type="button" class="btn-ghost btn-sm" onclick="window.aiDeckCreator.addNewRowManual()">+ Thêm dòng</button>
                            </div>
                        </div>

                        <div class="ai-table-scroll">
                            <table class="ai-preview-table">
                                <thead>
                                    <tr>
                                        <th style="width: 36px; text-align: center;"><input type="checkbox" id="aiCheckAll" checked onchange="window.aiDeckCreator.toggleSelectAll(this.checked)"></th>
                                        <th style="min-width: 120px;">Từ vựng gốc</th>
                                        <th style="min-width: 120px;">Phiên âm</th>
                                        <th style="min-width: 90px;">Loại từ</th>
                                        <th style="min-width: 140px;">Nghĩa tiếng Việt</th>
                                        <th style="min-width: 160px;">Câu ví dụ</th>
                                        <th style="min-width: 150px;">Dịch ví dụ</th>
                                        <th style="width: 44px; text-align: center;">Xóa</th>
                                    </tr>
                                </thead>
                                <tbody id="aiPreviewTbody">
                                    <!-- Dynamic rows -->
                                </tbody>
                            </table>
                        </div>

                        <div class="ai-confirm-bar">
                            <button type="button" class="btn-ghost" onclick="window.aiDeckCreator.backToInput()">
                                <i class="fa-solid fa-arrow-left"></i> Quét lại
                            </button>
                            <button type="button" class="btn-primary" id="aiBtnConfirmSave" onclick="window.aiDeckCreator.confirmAndSave()" style="padding: 12px 24px; font-size: 15px;">
                                <i class="fa-solid fa-floppy-disk"></i> <span id="aiBtnConfirmText">Lưu Bài Học & Vào Luyện Ngay →</span>
                            </button>
                        </div>
                    </div>

                    <!-- Cài đặt khóa API ẩn (Tùy chọn) -->
                    <details class="ai-key-accordion">
                        <summary><i class="fa-solid fa-key"></i> Cài đặt khóa AI cá nhân (Tùy chọn)</summary>
                        <div class="ai-key-form">
                            <p style="font-size: 12.5px; color: var(--study-text-muted); margin-bottom: 8px;">
                                Để AI phân tích hình ảnh và văn bản ở tốc độ cao nhất, cậu có thể nhập khóa Google AI / Gemini API Key miễn phí của mình vào đây (được lưu an toàn trong trình duyệt của cậu).
                            </p>
                            <div style="display: flex; gap: 8px;">
                                <input type="password" id="aiUserApiKeyInput" class="modal-input" placeholder="Dán API Key cá nhân của cậu tại đây...">
                                <button type="button" class="btn-ghost" onclick="window.aiDeckCreator.saveApiKey()">Lưu khóa</button>
                            </div>
                        </div>
                    </details>

                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Click outside backdrop to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.close();
        });

        // Setup dropzone events
        this.setupDropzone(overlay);

        return overlay;
    }

    setupDropzone(overlay) {
        const dropzone = overlay.querySelector('#aiDropzone');
        if (!dropzone) return;

        ['dragenter', 'dragover'].forEach(name => {
            dropzone.addEventListener(name, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add('drag-active');
            });
        });

        ['dragleave', 'drop'].forEach(name => {
            dropzone.addEventListener(name, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('drag-active');
            });
        });

        dropzone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                this.processFile(files[0]);
            }
        });
    }

    open({ lang = 'ja', targetDeckId = null, isImportOnly = false } = {}) {
        this.currentLang = lang;
        this.targetDeckId = targetDeckId;
        this.selectedImageBase64 = null;
        this.selectedImageMime = null;
        this.extractedWords = [];

        this.ensureModal();

        const overlay = document.getElementById('aiDeckCreatorModal');
        const langConfig = this.getLangConfig(lang);

        // Cập nhật Select ngôn ngữ
        const langSelect = document.getElementById('aiDeckLangSelect');
        if (langSelect) langSelect.value = lang;

        // Cập nhật Placeholders
        const titleInput = document.getElementById('aiDeckTitleInput');
        if (titleInput) {
            titleInput.placeholder = langConfig.placeholderTitle;
            if (!this.targetDeckId) {
                titleInput.value = '';
            } else {
                const currentDeck = window.studyStorage ? window.studyStorage.getDeckById(lang, targetDeckId) : null;
                titleInput.value = currentDeck ? currentDeck.title : '';
            }
        }

        const textInput = document.getElementById('aiTextInput');
        if (textInput) textInput.placeholder = langConfig.placeholderText;

        // Nếu là chế độ thêm vào bài học có sẵn
        const metaCard = document.getElementById('aiDeckMetaCard');
        const mainTitle = document.getElementById('aiModalMainTitle');
        const subTitle = document.getElementById('aiModalSubTitle');
        const headerIcon = document.getElementById('aiModalHeaderIcon');

        if (isImportOnly && this.targetDeckId) {
            if (metaCard) metaCard.style.display = 'none';
            if (mainTitle) mainTitle.textContent = `Nhập Từ Bằng AI Vào Bài Học - ${langConfig.name}`;
            if (subTitle) subTitle.textContent = 'Bổ sung thêm từ vựng mới bằng cách quét ảnh sách giáo khoa hoặc dán văn bản';
            if (headerIcon) headerIcon.textContent = '📸';
        } else {
            if (metaCard) metaCard.style.display = 'block';
            if (mainTitle) mainTitle.textContent = `Tạo Bài Học Mới - ${langConfig.name}`;
            if (subTitle) subTitle.textContent = 'Quét ảnh chụp sách giáo khoa, dán văn bản hoặc tự tạo bộ bài mới theo ý cậu';
            if (headerIcon) headerIcon.textContent = '✨';
        }

        // Tải API key đã lưu nếu có
        const savedKey = localStorage.getItem('mhent_ai_api_key') || (window.MHENT_CONFIG && window.MHENT_CONFIG.GEMINI_API_KEY) || '';
        const keyInput = document.getElementById('aiUserApiKeyInput');
        if (keyInput) keyInput.value = savedKey;

        // Reset trạng thái view
        this.switchTab('vision');
        this.removeImage();
        this.backToInput();

        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    close() {
        const overlay = document.getElementById('aiDeckCreatorModal');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    changeLang(lang) {
        this.currentLang = lang;
        const config = this.getLangConfig(lang);
        const titleInput = document.getElementById('aiDeckTitleInput');
        if (titleInput && !titleInput.value) titleInput.placeholder = config.placeholderTitle;
        const textInput = document.getElementById('aiTextInput');
        if (textInput) textInput.placeholder = config.placeholderText;
    }

    switchTab(tabName) {
        document.querySelectorAll('.ai-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
        });

        document.getElementById('aiPaneVision').style.display = tabName === 'vision' ? 'block' : 'none';
        document.getElementById('aiPaneText').style.display = tabName === 'text' ? 'block' : 'none';
        document.getElementById('aiPaneBlank').style.display = tabName === 'blank' ? 'block' : 'none';
    }

    handleFileSelect(input) {
        if (input.files && input.files[0]) {
            this.processFile(input.files[0]);
        }
    }

    processFile(file) {
        if (!file.type.startsWith('image/')) {
            if (window.studyUI) window.studyUI.showToast('Vui lòng chọn tệp định dạng hình ảnh (JPG, PNG, WebP)!', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            const commaIdx = dataUrl.indexOf(',');
            this.selectedImageBase64 = dataUrl.substring(commaIdx + 1);
            this.selectedImageMime = file.type;

            // Hiển thị preview
            const previewBox = document.getElementById('aiImagePreviewBox');
            const dropPrompt = document.getElementById('aiDropzonePrompt');
            const previewImg = document.getElementById('aiPreviewImg');
            const previewFilename = document.getElementById('aiPreviewFilename');
            const previewFilesize = document.getElementById('aiPreviewFilesize');

            if (previewImg) previewImg.src = dataUrl;
            if (previewFilename) previewFilename.textContent = file.name;
            if (previewFilesize) previewFilesize.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

            if (dropPrompt) dropPrompt.style.display = 'none';
            if (previewBox) previewBox.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    }

    removeImage() {
        this.selectedImageBase64 = null;
        this.selectedImageMime = null;
        const fileInput = document.getElementById('aiFileInput');
        if (fileInput) fileInput.value = '';

        const previewBox = document.getElementById('aiImagePreviewBox');
        const dropPrompt = document.getElementById('aiDropzonePrompt');
        if (previewBox) previewBox.style.display = 'none';
        if (dropPrompt) dropPrompt.style.display = 'block';
    }

    saveApiKey() {
        const keyInput = document.getElementById('aiUserApiKeyInput');
        if (keyInput) {
            const key = keyInput.value.trim();
            localStorage.setItem('mhent_ai_api_key', key);
            if (window.studyUI) window.studyUI.showToast('🔑 Đã lưu khóa AI thành công!', 'success');
        }
    }

    getApiKey() {
        return localStorage.getItem('mhent_ai_api_key') || (window.MHENT_CONFIG && window.MHENT_CONFIG.GEMINI_API_KEY) || '';
    }

    setLoading(loading, title = '', desc = '') {
        this.isProcessing = loading;
        const tabsBar = document.getElementById('aiTabsBar');
        const paneVision = document.getElementById('aiPaneVision');
        const paneText = document.getElementById('aiPaneText');
        const paneBlank = document.getElementById('aiPaneBlank');
        const loadingBox = document.getElementById('aiLoadingBox');
        const resultsBox = document.getElementById('aiResultsBox');

        if (loading) {
            if (tabsBar) tabsBar.style.display = 'none';
            if (paneVision) paneVision.style.display = 'none';
            if (paneText) paneText.style.display = 'none';
            if (paneBlank) paneBlank.style.display = 'none';
            if (resultsBox) resultsBox.style.display = 'none';
            if (loadingBox) {
                loadingBox.style.display = 'block';
                if (title) document.getElementById('aiLoadingTitle').textContent = title;
                if (desc) document.getElementById('aiLoadingDesc').textContent = desc;
            }
        } else {
            if (loadingBox) loadingBox.style.display = 'none';
        }
    }

    async runVisionAnalysis() {
        if (!this.selectedImageBase64) {
            if (window.studyUI) window.studyUI.showToast('Cậu chưa chọn hoặc tải ảnh lên nè!', 'warning');
            return;
        }

        const apiKey = this.getApiKey();
        this.setLoading(true, 'AISA đang đọc hình ảnh & bóc tách chữ...', 'Đang trích xuất từ vựng, phiên âm chuẩn và dịch nghĩa sang tiếng Việt...');

        try {
            if (!apiKey) {
                // Nếu chưa có API Key, hiển thị mẫu thử thông minh hoặc yêu cầu nhập key
                await new Promise(r => setTimeout(r, 1200));
                const demoWords = this.generateFallbackWords(this.currentLang);
                this.displayResults(demoWords);
                if (window.studyUI) window.studyUI.showToast('💡 Đã trích xuất mẫu thử từ vựng. Để quét ảnh thật của cậu, hãy dán API Key ở góc dưới nhé!', 'info');
                return;
            }

            const langConfig = this.getLangConfig(this.currentLang);
            const prompt = `
Bạn là trợ lý AI giáo dục chuyên gia ngôn ngữ của hệ sinh thái MHEnt.
Nhiệm vụ: Phân tích hình ảnh này, nhận diện chữ (OCR) và trích xuất danh sách tất cả các từ vựng ${langConfig.name} (${this.currentLang}) quan trọng xuất hiện trong ảnh.
Nếu ảnh chụp một từ, hãy bóc tách từ đó. Nếu ảnh chụp trang sách hoặc danh sách nhiều từ, hãy trích xuất từng từ vựng.
Với mỗi từ, hãy bổ sung:
- "word": Từ gốc chính xác bằng ${langConfig.script}.
- "phonetic": Phiên âm chuẩn theo định dạng ${langConfig.phonetic}.
- "pos": Loại từ (chọn một trong: "noun", "verb", "adj", "other").
- "posLabel": Nhãn loại từ tiếng Việt ("Danh từ", "Động từ", "Tính từ", hoặc "Khác").
- "meaning": Nghĩa tiếng Việt chính xác, súc tích, dễ hiểu.
- "example": Một câu ví dụ tự nhiên bằng ${langConfig.name} có chứa từ vựng này.
- "exampleTrans": Dịch nghĩa câu ví dụ sang tiếng Việt.

Yêu cầu trả về DUY NHẤT một mảng JSON thuần tuý (JSON array of objects), không kèm mã markdown:
[
  {
    "word": "...",
    "phonetic": "...",
    "pos": "noun",
    "posLabel": "Danh từ",
    "meaning": "...",
    "example": "...",
    "exampleTrans": "..."
  }
]
`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                inlineData: {
                                    mimeType: this.selectedImageMime || 'image/jpeg',
                                    data: this.selectedImageBase64
                                }
                            },
                            { text: prompt }
                        ]
                    }],
                    generationConfig: {
                        responseMimeType: 'application/json',
                        temperature: 0.2
                    }
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || `Lỗi AI HTTP ${response.status}`);
            }

            const data = await response.json();
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
            const parsedWords = this.safeParseJson(textResponse);

            if (!parsedWords || parsedWords.length === 0) {
                throw new Error('AI không tìm thấy từ vựng rõ ràng trong ảnh này. Cậu thử chụp lại rõ nét hơn nhé!');
            }

            this.displayResults(parsedWords);
            if (window.studyUI) {
                window.studyUI.showToast(`✨ Tuyệt vời! AI đã trích xuất được ${parsedWords.length} từ vựng!`, 'success');
                window.studyUI.playDing();
            }
        } catch (error) {
            console.error('[AI Creator] Vision Analysis Error:', error);
            this.setLoading(false);
            this.backToInput();
            if (window.studyUI) window.studyUI.showToast(`⚠️ ${error.message || 'Không thể phân tích ảnh'}`, 'error');
        }
    }

    async runTextAnalysis() {
        const text = document.getElementById('aiTextInput').value.trim();
        if (!text) {
            if (window.studyUI) window.studyUI.showToast('Cậu hãy dán đoạn văn hoặc danh sách từ vào ô nhé!', 'warning');
            return;
        }

        const apiKey = this.getApiKey();
        this.setLoading(true, 'AISA đang phân tích văn bản...', 'Đang trích xuất từ vựng trọng tâm, tra phiên âm và đặt câu ví dụ...');

        try {
            if (!apiKey) {
                // Smart Local Tokenizer Heuristic nếu chưa có API key
                await new Promise(r => setTimeout(r, 600));
                const localParsed = this.heuristicTextParse(text, this.currentLang);
                this.displayResults(localParsed);
                if (window.studyUI) window.studyUI.showToast(`✨ Đã trích xuất ${localParsed.length} từ vựng từ văn bản của cậu!`, 'success');
                return;
            }

            const langConfig = this.getLangConfig(this.currentLang);
            const prompt = `
Bạn là trợ lý AI giáo dục chuyên gia ngôn ngữ của MHEnt.
Nhiệm vụ: Phân tích đoạn văn bản sau, trích xuất tất cả các từ vựng ${langConfig.name} (${this.currentLang}) quan trọng để học tập.
Văn bản đầu vào:
"""
${text}
"""

Với mỗi từ vựng, tạo một đối tượng JSON:
- "word": Từ gốc bằng ${langConfig.script}.
- "phonetic": Phiên âm chuẩn theo định dạng ${langConfig.phonetic}.
- "pos": Loại từ (chọn một trong: "noun", "verb", "adj", "other").
- "posLabel": Nhãn loại từ tiếng Việt ("Danh từ", "Động từ", "Tính từ", hoặc "Khác").
- "meaning": Nghĩa tiếng Việt súc tích, chuẩn xác.
- "example": Câu ví dụ tự nhiên bằng ${langConfig.name}.
- "exampleTrans": Dịch câu ví dụ sang tiếng Việt.

Trả về DUY NHẤT một mảng JSON thuần tuý:
[
  {
    "word": "...",
    "phonetic": "...",
    "pos": "noun",
    "posLabel": "Danh từ",
    "meaning": "...",
    "example": "...",
    "exampleTrans": "..."
  }
]
`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseMimeType: 'application/json',
                        temperature: 0.2
                    }
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || `Lỗi AI HTTP ${response.status}`);
            }

            const data = await response.json();
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
            const parsedWords = this.safeParseJson(textResponse);

            if (!parsedWords || parsedWords.length === 0) {
                throw new Error('AI không tìm thấy từ vựng hợp lệ trong đoạn văn này!');
            }

            this.displayResults(parsedWords);
            if (window.studyUI) {
                window.studyUI.showToast(`✨ Xuất sắc! Đã trích xuất được ${parsedWords.length} từ vựng!`, 'success');
                window.studyUI.playDing();
            }
        } catch (error) {
            console.error('[AI Creator] Text Analysis Error:', error);
            this.setLoading(false);
            this.backToInput();
            if (window.studyUI) window.studyUI.showToast(`⚠️ ${error.message || 'Lỗi xử lý văn bản'}`, 'error');
        }
    }

    createBlankDeck() {
        const titleInput = document.getElementById('aiDeckTitleInput');
        const descInput = document.getElementById('aiDeckDescInput');
        const title = titleInput.value.trim() || `Bài học mới (${this.getLangConfig(this.currentLang).name})`;
        const desc = descInput.value.trim() || 'Bài học tự soạn';

        if (!window.studyStorage) return;

        const newDeck = window.studyStorage.createDeck(this.currentLang, {
            title,
            description: desc,
            words: []
        });

        this.close();
        if (window.studyUI) {
            window.studyUI.showToast(`✨ Đã tạo bài học "${newDeck.title}" thành công!`, 'success');
            window.studyUI.playDing();
        }

        // Chuyển hướng hoặc tải lại
        this.navigateToDeck(this.currentLang, newDeck.id);
    }

    displayResults(words) {
        this.setLoading(false);
        this.extractedWords = words.map((w, idx) => ({
            id: `word_ai_${Date.now()}_${idx}`,
            selected: true,
            word: w.word || '',
            phonetic: w.phonetic || '',
            pos: w.pos || 'noun',
            posLabel: w.posLabel || 'Danh từ',
            meaning: w.meaning || '',
            example: w.example || '',
            exampleTrans: w.exampleTrans || ''
        }));

        const resultsBox = document.getElementById('aiResultsBox');
        const badgeCount = document.getElementById('aiResultBadgeCount');
        const checkAll = document.getElementById('aiCheckAll');

        if (badgeCount) badgeCount.textContent = this.extractedWords.length;
        if (checkAll) checkAll.checked = true;

        // Cập nhật card xác nhận AISA
        const verifyCount = document.getElementById('aiVerifyWordCount');
        if (verifyCount) verifyCount.textContent = this.extractedWords.length;
        const verifyStatusMsg = document.getElementById('aiVerifyStatusMsg');
        if (verifyStatusMsg) verifyStatusMsg.style.display = 'none';

        this.renderResultTable();

        if (resultsBox) resultsBox.style.display = 'block';

        // Cập nhật text nút confirm
        const btnText = document.getElementById('aiBtnConfirmText');
        if (btnText) {
            btnText.textContent = this.targetDeckId
                ? `Thêm ${this.extractedWords.length} Từ Vào Bài Học Này →`
                : `Lưu Bài Học & Vào Luyện Ngay (${this.extractedWords.length} từ) →`;
        }
    }

    handleVerifyFeedback(type) {
        const statusMsg = document.getElementById('aiVerifyStatusMsg');
        if (!statusMsg) return;

        if (type === 'yes') {
            statusMsg.style.display = 'block';
            statusMsg.innerHTML = '🌸 <b>Tuyệt vời quá!</b> Cậu có thể rà soát nhanh bảng từ vựng bên dưới rồi bấm nút <b>"Lưu Bài Học"</b> ở góc dưới để bắt đầu luyện tập ngay nhé!';
            if (window.studyUI) window.studyUI.showToast('✨ Danh sách đã sẵn sàng! Cậu có thể bấm Lưu bài học bất cứ lúc nào.', 'success');

            // Scroll nhẹ tới nút confirm
            const btnSave = document.getElementById('aiBtnConfirmSave');
            if (btnSave) {
                btnSave.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                btnSave.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.6)';
                setTimeout(() => { btnSave.style.boxShadow = ''; }, 1800);
            }
        } else {
            statusMsg.style.display = 'block';
            statusMsg.innerHTML = '🌸 <b>Đã sẵn sàng!</b> Cậu hãy tự do bấm vào các ô bên dưới để sửa từ/nghĩa, xóa bớt dòng thừa hoặc bấm <b>+ Thêm dòng</b> nhé. Khi cậu gõ từ mới, tớ sẽ tự động viết câu ví dụ giúp cậu liền nà! ✨';
            if (window.studyUI) window.studyUI.showToast('✏️ Cậu có thể thoải mái sửa, thêm, bớt từ trên bảng bên dưới nhé!', 'info');

            // Scroll tới bảng chỉnh sửa
            const table = document.querySelector('.ai-table-scroll');
            if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    renderResultTable() {
        const tbody = document.getElementById('aiPreviewTbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.extractedWords.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.id = `aiRow_${index}`;
            tr.innerHTML = `
                <td style="text-align: center;">
                    <input type="checkbox" id="ai-chk-${index}" ${item.selected ? 'checked' : ''} onchange="window.aiDeckCreator.toggleItemCheck(${index}, this.checked)">
                </td>
                <td>
                    <input type="text" class="ai-table-input" id="ai-word-${index}" value="${this.escapeHtml(item.word)}" 
                        placeholder="Nhập từ..."
                        oninput="window.aiDeckCreator.updateItemField(${index}, 'word', this.value)"
                        onchange="window.aiDeckCreator.onWordInputBlurred(${index})">
                </td>
                <td>
                    <input type="text" class="ai-table-input" id="ai-phonetic-${index}" value="${this.escapeHtml(item.phonetic)}" 
                        placeholder="Phiên âm..."
                        oninput="window.aiDeckCreator.updateItemField(${index}, 'phonetic', this.value)">
                </td>
                <td>
                    <select class="ai-table-input" id="ai-pos-${index}" onchange="window.aiDeckCreator.updateItemPos(${index}, this.value)">
                        <option value="noun" ${item.pos === 'noun' ? 'selected' : ''}>Danh từ</option>
                        <option value="verb" ${item.pos === 'verb' ? 'selected' : ''}>Động từ</option>
                        <option value="adj" ${item.pos === 'adj' ? 'selected' : ''}>Tính từ</option>
                        <option value="other" ${item.pos === 'other' ? 'selected' : ''}>Khác</option>
                    </select>
                </td>
                <td>
                    <input type="text" class="ai-table-input" id="ai-meaning-${index}" value="${this.escapeHtml(item.meaning)}" 
                        placeholder="Nghĩa tiếng Việt..."
                        oninput="window.aiDeckCreator.updateItemField(${index}, 'meaning', this.value)">
                </td>
                <td>
                    <div class="ai-input-with-action">
                        <input type="text" class="ai-table-input" id="ai-example-${index}" value="${this.escapeHtml(item.example)}" 
                            placeholder="Câu ví dụ..."
                            title="Cậu có thể lia chuột vào đây để tự sửa câu ví dụ bất cứ lúc nào nhé!"
                            oninput="window.aiDeckCreator.updateItemField(${index}, 'example', this.value)">
                        <button type="button" class="btn-ai-sparkle" id="ai-sparkle-${index}" title="Nhờ AISA viết lại câu ví dụ tự động" onclick="window.aiDeckCreator.autoGenerateWordDetails(${index}, true)">
                            ✨
                        </button>
                    </div>
                </td>
                <td>
                    <input type="text" class="ai-table-input" id="ai-exampleTrans-${index}" value="${this.escapeHtml(item.exampleTrans)}" 
                        placeholder="Dịch câu ví dụ..."
                        title="Dịch nghĩa câu ví dụ sang tiếng Việt"
                        oninput="window.aiDeckCreator.updateItemField(${index}, 'exampleTrans', this.value)">
                </td>
                <td style="text-align: center;">
                    <button type="button" class="btn-del-row" onclick="window.aiDeckCreator.removeRow(${index})" title="Xóa dòng">&times;</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    onWordInputBlurred(index) {
        const item = this.extractedWords[index];
        if (!item) return;
        const word = item.word ? item.word.trim() : '';
        if (!word) return;

        // Nếu câu ví dụ chưa có (người dùng vừa gõ từ mới vào dòng trắng)
        if (!item.example || !item.example.trim()) {
            this.autoGenerateWordDetails(index, false);
        }
    }

    async autoGenerateWordDetails(index, forceRewrite = false) {
        const item = this.extractedWords[index];
        if (!item || !item.word || !item.word.trim()) return;

        const word = item.word.trim();
        const inputExample = document.getElementById(`ai-example-${index}`);
        const inputTrans = document.getElementById(`ai-exampleTrans-${index}`);
        const sparkleBtn = document.getElementById(`ai-sparkle-${index}`);

        if (inputExample) {
            inputExample.classList.add('ai-generating');
            inputExample.placeholder = '✨ AISA đang viết câu ví dụ...';
        }
        if (inputTrans) {
            inputTrans.classList.add('ai-generating');
            inputTrans.placeholder = '✨ Đang dịch ví dụ...';
        }
        if (sparkleBtn) {
            sparkleBtn.innerHTML = '⏳';
            sparkleBtn.disabled = true;
        }

        try {
            const apiKey = this.getApiKey();
            let resultData = null;

            if (apiKey) {
                const langConfig = this.getLangConfig(this.currentLang);
                const prompt = `Từ vựng: "${word}" (${langConfig.name} - mã ngôn ngữ: ${this.currentLang}).
Nhiệm vụ: Hãy tạo thông tin học tập đầy đủ cho từ vựng này:
- "phonetic": Phiên âm chuẩn theo định dạng ${langConfig.phonetic}.
- "pos": Loại từ (chọn một trong: "noun", "verb", "adj", hoặc "other").
- "posLabel": Nhãn tiếng Việt tương ứng ("Danh từ", "Động từ", "Tính từ", hoặc "Khác").
- "meaning": Nghĩa tiếng Việt súc tích, chuẩn xác.
- "example": Một câu ví dụ ngắn gọn, tự nhiên, phổ biến hàng ngày bằng ${langConfig.name} có chứa từ "${word}".
- "exampleTrans": Dịch câu ví dụ sang tiếng Việt.

Yêu cầu trả về DUY NHẤT một JSON object hợp lệ, không bọc markdown:
{
  "phonetic": "...",
  "pos": "noun",
  "posLabel": "Danh từ",
  "meaning": "...",
  "example": "...",
  "exampleTrans": "..."
}`;

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            responseMimeType: 'application/json',
                            temperature: 0.3
                        }
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    resultData = this.safeParseJson(text);
                }
            }

            if (!resultData) {
                // Heuristic smart local generator
                await new Promise(r => setTimeout(r, 250));
                resultData = this.smartLocalWordDetails(word, this.currentLang);
            }

            // Gán dữ liệu vào item model
            item.example = resultData.example || item.example || '';
            item.exampleTrans = resultData.exampleTrans || item.exampleTrans || '';
            if (!item.phonetic || forceRewrite) item.phonetic = resultData.phonetic || item.phonetic;
            if (!item.meaning || forceRewrite) item.meaning = resultData.meaning || item.meaning;
            if (resultData.pos && (!item.pos || item.pos === 'other' || forceRewrite)) {
                item.pos = resultData.pos;
                item.posLabel = resultData.posLabel || 'Khác';
            }

            // Cập nhật DOM trực tiếp để giữ nguyên focus của người dùng
            if (inputExample) {
                inputExample.value = item.example;
                inputExample.classList.remove('ai-generating');
                inputExample.placeholder = 'Câu ví dụ...';
            }
            if (inputTrans) {
                inputTrans.value = item.exampleTrans;
                inputTrans.classList.remove('ai-generating');
                inputTrans.placeholder = 'Dịch câu ví dụ...';
            }
            const inputPhonetic = document.getElementById(`ai-phonetic-${index}`);
            if (inputPhonetic && item.phonetic) inputPhonetic.value = item.phonetic;

            const inputMeaning = document.getElementById(`ai-meaning-${index}`);
            if (inputMeaning && item.meaning) inputMeaning.value = item.meaning;

            const selectPos = document.getElementById(`ai-pos-${index}`);
            if (selectPos && item.pos) selectPos.value = item.pos;

            if (window.studyUI) {
                window.studyUI.showToast(`✨ AISA đã tự động viết ví dụ cho "${word}"! Cậu có thể lia chuột qua ô để sửa nhé.`, 'success');
            }
        } catch (err) {
            console.warn('[AI Creator] Auto-example generation error:', err);
            const fallback = this.smartLocalWordDetails(word, this.currentLang);
            item.example = fallback.example;
            item.exampleTrans = fallback.exampleTrans;
            if (inputExample) {
                inputExample.value = item.example;
                inputExample.classList.remove('ai-generating');
            }
            if (inputTrans) {
                inputTrans.value = item.exampleTrans;
                inputTrans.classList.remove('ai-generating');
            }
        } finally {
            if (sparkleBtn) {
                sparkleBtn.innerHTML = '✨';
                sparkleBtn.disabled = false;
            }
        }
    }

    smartLocalWordDetails(word, lang) {
        let pos = 'noun';
        let posLabel = 'Danh từ';
        let phonetic = `[${word}]`;
        let meaning = `Nghĩa của ${word}`;
        let example = '';
        let exampleTrans = '';

        if (lang === 'ja') {
            if (/[うくぐすつぬぶむる]$/.test(word)) {
                pos = 'verb';
                posLabel = 'Động từ';
                example = `私は毎日${word}ことがあります。`;
                exampleTrans = `Tôi có thói quen ${word} mỗi ngày.`;
            } else if (/い$/.test(word)) {
                pos = 'adj';
                posLabel = 'Tính từ';
                example = `この景色はとても${word}ですね。`;
                exampleTrans = `Khung cảnh này thực sự rất ${word}.`;
            } else {
                example = `これはとても大切な${word}です。`;
                exampleTrans = `Đây là ${word} rất quan trọng.`;
            }
            phonetic = `[${word}]`;
        } else if (lang === 'ko') {
            if (/하다$|다$/.test(word)) {
                pos = 'verb';
                posLabel = 'Động từ';
                example = `저는 매일 친구와 ${word}.`;
                exampleTrans = `Tôi ${word} cùng bạn bè mỗi ngày.`;
            } else {
                example = `이것은 우리가 좋아하는 ${word}입니다.`;
                exampleTrans = `Đây là ${word} mà chúng tôi yêu thích.`;
            }
            phonetic = `[${word}]`;
        } else if (lang === 'zh') {
            example = `我们应该认真学习${word}。`;
            exampleTrans = `Chúng ta nên nghiêm túc học tập ${word}.`;
            phonetic = `[${word}]`;
        } else {
            if (/ly$/.test(word)) {
                pos = 'adj';
                posLabel = 'Tính từ / Trạng từ';
                example = `He spoke ${word} to everyone in the room.`;
                exampleTrans = `Anh ấy đã nói chuyện một cách ${word} với mọi người trong phòng.`;
            } else if (/tion$|ment$|ness$/.test(word)) {
                pos = 'noun';
                posLabel = 'Danh từ';
                example = `The ${word} played a vital role in our project success.`;
                exampleTrans = `${word} này đóng vai trò quan trọng trong thành công của dự án.`;
            } else {
                example = `It is important to remember the word "${word}" in daily communication.`;
                exampleTrans = `Việc ghi nhớ từ "${word}" trong giao tiếp hàng ngày là rất quan trọng.`;
            }
            phonetic = `[/${word.toLowerCase()}/]`;
        }

        return { phonetic, pos, posLabel, meaning, example, exampleTrans };
    }

    toggleItemCheck(index, checked) {
        if (this.extractedWords[index]) {
            this.extractedWords[index].selected = checked;
            this.updateSelectedCountBadge();
        }
    }

    toggleSelectAll(checked) {
        this.extractedWords.forEach(w => w.selected = checked);
        const checkAll = document.getElementById('aiCheckAll');
        if (checkAll) checkAll.checked = checked;
        this.renderResultTable();
        this.updateSelectedCountBadge();
    }

    updateItemField(index, field, value) {
        if (this.extractedWords[index]) {
            this.extractedWords[index][field] = value;
        }
    }

    updateItemPos(index, pos) {
        const labels = { noun: 'Danh từ', verb: 'Động từ', adj: 'Tính từ', other: 'Khác' };
        if (this.extractedWords[index]) {
            this.extractedWords[index].pos = pos;
            this.extractedWords[index].posLabel = labels[pos] || 'Khác';
        }
    }

    removeRow(index) {
        this.extractedWords.splice(index, 1);
        this.renderResultTable();
        this.updateSelectedCountBadge();
    }

    addNewRowManual() {
        const newIdx = this.extractedWords.length;
        this.extractedWords.push({
            id: `word_manual_${Date.now()}`,
            selected: true,
            word: '',
            phonetic: '',
            pos: 'noun',
            posLabel: 'Danh từ',
            meaning: '',
            example: '',
            exampleTrans: ''
        });
        this.renderResultTable();
        this.updateSelectedCountBadge();

        setTimeout(() => {
            const newWordInput = document.getElementById(`ai-word-${newIdx}`);
            if (newWordInput) {
                newWordInput.focus();
                newWordInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 60);

        if (window.studyUI) {
            window.studyUI.showToast('✨ Đã thêm dòng mới! Cậu chỉ cần gõ từ vựng, AISA sẽ tự động viết câu ví dụ giúp cậu nà!', 'info');
        }
    }

    updateSelectedCountBadge() {
        const count = this.extractedWords.filter(w => w.selected).length;
        const badgeCount = document.getElementById('aiResultBadgeCount');
        if (badgeCount) badgeCount.textContent = count;

        const btnText = document.getElementById('aiBtnConfirmText');
        if (btnText) {
            btnText.textContent = this.targetDeckId
                ? `Thêm ${count} Từ Vào Bài Học Này →`
                : `Lưu Bài Học & Vào Luyện Ngay (${count} từ) →`;
        }
    }

    backToInput() {
        const tabsBar = document.getElementById('aiTabsBar');
        const resultsBox = document.getElementById('aiResultsBox');
        if (tabsBar) tabsBar.style.display = 'flex';
        if (resultsBox) resultsBox.style.display = 'none';

        const activeTab = document.querySelector('.ai-tab-btn.active')?.getAttribute('data-tab') || 'vision';
        this.switchTab(activeTab);
    }

    confirmAndSave() {
        const selected = this.extractedWords.filter(w => w.selected && w.word.trim() && w.meaning.trim());

        if (selected.length === 0) {
            if (window.studyUI) window.studyUI.showToast('Vui lòng chọn ít nhất 1 từ vựng có đầy đủ Từ gốc và Nghĩa!', 'warning');
            return;
        }

        const wordsToSave = selected.map(w => ({
            id: w.id || `word_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            word: w.word.trim(),
            phonetic: w.phonetic.trim(),
            pos: w.pos || 'noun',
            posLabel: w.posLabel || 'Danh từ',
            meaning: w.meaning.trim(),
            example: w.example.trim(),
            exampleTrans: w.exampleTrans.trim(),
            typedWord: '',
            reviews: [false, false, false, false],
            isCompleted: false
        }));

        if (!window.studyStorage) return;

        if (this.targetDeckId) {
            // Thêm vào bài hiện có
            window.studyStorage.addWordsToDeck(this.currentLang, this.targetDeckId, wordsToSave);
            this.close();

            if (window.studyUI) {
                window.studyUI.showToast(`✨ Đã thêm thành công ${wordsToSave.length} từ vựng vào bài học!`, 'success');
                window.studyUI.playDing();
            }

            // Nếu đang trong VocabSheetApp thì tải lại trực tiếp
            if (window.sheetApp && window.sheetApp.currentDeck && window.sheetApp.currentDeck.id === this.targetDeckId) {
                window.sheetApp.currentDeck = window.studyStorage.getDeckById(this.currentLang, this.targetDeckId);
                window.sheetApp.renderAll();
            } else {
                this.navigateToDeck(this.currentLang, this.targetDeckId);
            }
        } else {
            // Tạo bài học mới
            const titleInput = document.getElementById('aiDeckTitleInput');
            const descInput = document.getElementById('aiDeckDescInput');
            const langConfig = this.getLangConfig(this.currentLang);

            const title = titleInput.value.trim() || `${langConfig.name} - Bài học mới (${new Date().toLocaleDateString('vi-VN')})`;
            const desc = descInput.value.trim() || `Bộ từ vựng do AI trích xuất gồm ${wordsToSave.length} từ.`;

            const newDeck = window.studyStorage.createDeck(this.currentLang, {
                title,
                description: desc,
                words: wordsToSave
            });

            this.close();

            if (window.studyUI) {
                window.studyUI.showToast(`🎉 Tạo bài học "${newDeck.title}" thành công!`, 'success');
                window.studyUI.playDing();
            }

            this.navigateToDeck(this.currentLang, newDeck.id);
        }
    }

    navigateToDeck(lang, deckId) {
        const config = this.getLangConfig(lang);
        const targetUrl = `${config.vocabPageUrl}?deck=${encodeURIComponent(deckId)}`;

        // Nếu đã ở đúng trang vocab của ngôn ngữ đó, cập nhật state hoặc reload với param
        if (window.location.pathname.endsWith('vocab.html') && this.detectCurrentPageLang() === lang) {
            window.history.pushState({}, '', targetUrl);
            if (window.sheetApp) {
                window.sheetApp.loadDeck();
                window.sheetApp.renderAll();
                if (typeof window.sheetApp.populateDeckSwitcher === 'function') {
                    window.sheetApp.populateDeckSwitcher();
                }
            } else {
                window.location.href = targetUrl;
            }
        } else {
            window.location.href = targetUrl;
        }
    }

    safeParseJson(str) {
        try {
            // Clean markdown blocks if present
            let cleaned = str.trim();
            if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7);
            if (cleaned.startsWith('```')) cleaned = cleaned.substring(3);
            if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3);
            cleaned = cleaned.trim();
            return JSON.parse(cleaned);
        } catch (e) {
            console.warn('[AI Creator] JSON Parse Error:', e, str);
            return null;
        }
    }

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // Heuristic parser khi người dùng dán văn bản nhưng không có API key
    heuristicTextParse(text, lang) {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const results = [];
        const langConfig = this.getLangConfig(lang);

        lines.forEach((line) => {
            // Dạng "word - meaning" hoặc "word : meaning" hoặc "word = meaning"
            const matchDelim = line.match(/^(.+?)\s*[-:=–—]\s*(.+)$/);
            if (matchDelim) {
                const word = matchDelim[1].trim();
                const meaning = matchDelim[2].trim();
                results.push({
                    word,
                    phonetic: `[${word}]`,
                    pos: 'noun',
                    posLabel: 'Danh từ',
                    meaning: meaning,
                    example: '',
                    exampleTrans: ''
                });
            } else {
                // Tách các từ cách nhau bởi dấu phẩy
                const subWords = line.split(/[,;\t]+/).map(w => w.trim()).filter(Boolean);
                subWords.forEach(w => {
                    results.push({
                        word: w,
                        phonetic: `[${w}]`,
                        pos: 'noun',
                        posLabel: 'Danh từ',
                        meaning: `Nghĩa của ${w}`,
                        example: '',
                        exampleTrans: ''
                    });
                });
            }
        });

        return results.slice(0, 50);
    }

    generateFallbackWords(lang) {
        const fallbacks = {
            ja: [
                { word: '桜', phonetic: '[さくら - Sakura]', pos: 'noun', posLabel: 'Danh từ', meaning: 'Hoa anh đào', example: '春に桜が咲きます。', exampleTrans: 'Hoa anh đào nở vào mùa xuân.' },
                { word: '食べる', phonetic: '[たべる - Taberu]', pos: 'verb', posLabel: 'Động từ', meaning: 'Ăn', example: 'ご飯を食べます。', exampleTrans: 'Tôi ăn cơm.' },
                { word: '美しい', phonetic: '[うつくしい - Utsukushii]', pos: 'adj', posLabel: 'Tính từ', meaning: 'Xinh đẹp, tuyệt đẹp', example: '富士山は美しいです。', exampleTrans: 'Núi Phú Sĩ rất đẹp.' },
                { word: '友達', phonetic: '[ともだち - Tomodachi]', pos: 'noun', posLabel: 'Danh từ', meaning: 'Bạn bè', example: '友達と勉強します。', exampleTrans: 'Tôi học bài cùng bạn bè.' }
            ],
            ko: [
                { word: '하늘', phonetic: '[하늘]', pos: 'noun', posLabel: 'Danh từ', meaning: 'Bầu trời', example: '오늘 하늘이 정말 맑아요.', exampleTrans: 'Hôm nay bầu trời thật trong xanh.' },
                { word: '만나다', phonetic: '[만나다]', pos: 'verb', posLabel: 'Động từ', meaning: 'Gặp gỡ', example: '내일 친구를 만나요.', exampleTrans: 'Ngày mai tôi gặp bạn bè.' },
                { word: '행복하다', phonetic: '[행복하다]', pos: 'adj', posLabel: 'Tính từ', meaning: 'Hạnh phúc', example: '지금 너무 행복해요.', exampleTrans: 'Bây giờ tôi rất hạnh phúc.' }
            ],
            zh: [
                { word: '阳光', phonetic: '[yángguāng]', pos: 'noun', posLabel: 'Danh từ', meaning: 'Ánh nắng, ánh mặt trời', example: '早晨的阳光很温暖。', exampleTrans: 'Ánh nắng buổi sớm rất ấm áp.' },
                { word: '学习', phonetic: '[xuéxí]', pos: 'verb', posLabel: 'Động từ', meaning: 'Học tập', example: '我喜欢学习汉语。', exampleTrans: 'Tôi thích học tiếng Trung.' }
            ],
            en: [
                { word: 'Resilient', phonetic: '[/rɪˈzɪl.jənt/]', pos: 'adj', posLabel: 'Tính từ', meaning: 'Kiên cường, phục hồi nhanh', example: 'She is very resilient under pressure.', exampleTrans: 'Cô ấy rất kiên cường trước áp lực.' },
                { word: 'Accomplish', phonetic: '[/əˈkʌm.plɪʃ/]', pos: 'verb', posLabel: 'Động từ', meaning: 'Hoàn thành, đạt được', example: 'You can accomplish your dream.', exampleTrans: 'Bạn có thể đạt được ước mơ của mình.' }
            ]
        };
        return fallbacks[lang] || fallbacks.ja;
    }
}

// Khởi tạo Singleton
window.aiDeckCreator = new AIDeckCreator();
