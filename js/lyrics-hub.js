/**
 * MHENT STUDY - MUSIC LYRICS STUDY HUB ENGINE
 * Trình phát nhạc đồng bộ lời bài hát từng câu (Sentence-by-Sentence Karaoke)
 * Tự động tìm kiếm LRCLIB, phân tích từ vựng bằng AISA AI & lưu trữ vào Supabase Database
 */

class LyricsHubApp {
    constructor() {
        this.currentSong = null;
        this.currentVersionIndex = -1; // -1: Official, 0..n: Community
        this.activeSentenceIndex = -1;
        this.loopSentenceIndex = -1;
        this.audioPlayer = new Audio();
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 0;
        this.activeLang = 'all';

        // Danh sách bài hát mẫu chất lượng cao sẵn sàng học tập ngay lập tức
        this.featuredSongs = this.initFeaturedSongs();

        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.bindDomEvents();
        this.renderShowcaseCards();

        // Mặc định nạp bài hát đầu tiên
        const defaultSong = this.featuredSongs[0];
        if (defaultSong) {
            this.loadSong(defaultSong);
        }

        // Tự động kiểm tra nếu có tham số URL ?song=...
        const urlParams = new URLSearchParams(window.location.search);
        const songParam = urlParams.get('song');
        if (songParam) {
            this.searchSong(songParam);
        }
    }

    bindDomEvents() {
        // Search Form
        const form = document.getElementById('lyrics-search-form');
        const input = document.getElementById('lyrics-search-input');
        if (form && input) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const q = input.value.trim();
                if (q) this.searchSong(q);
            });
        }

        // Language Filter Pills
        document.querySelectorAll('.lang-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('.lang-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.activeLang = pill.getAttribute('data-lang') || 'all';
                this.renderShowcaseCards();
            });
        });

        // Player Controls
        const playBtn = document.getElementById('btn-player-play');
        const progressBar = document.getElementById('playback-progress');
        const speedSelect = document.getElementById('playback-speed');

        if (playBtn) {
            playBtn.addEventListener('click', () => this.togglePlay());
        }

        // Audio Timeupdate
        this.audioPlayer.addEventListener('timeupdate', () => {
            this.currentTime = this.audioPlayer.currentTime;
            this.updatePlayerProgress();
            this.syncActiveSentence(this.currentTime);

            // Kiểm tra Sentence Loop
            if (this.loopSentenceIndex >= 0 && this.currentSong && this.currentSong.synced_lyrics) {
                const currentLine = this.currentSong.synced_lyrics[this.loopSentenceIndex];
                if (currentLine && this.currentTime >= (currentLine.endTime || (currentLine.startTime + 4))) {
                    this.seekTo(currentLine.startTime);
                }
            }
        });

        this.audioPlayer.addEventListener('loadedmetadata', () => {
            this.duration = this.audioPlayer.duration || 180;
            this.updatePlayerProgress();
        });

        this.audioPlayer.addEventListener('ended', () => {
            this.isPlaying = false;
            this.updatePlayBtnUi();
        });

        if (progressBar) {
            progressBar.addEventListener('input', (e) => {
                const time = parseFloat(e.target.value);
                this.seekTo(time);
            });
        }

        if (speedSelect) {
            speedSelect.addEventListener('change', (e) => {
                this.audioPlayer.playbackRate = parseFloat(e.target.value) || 1.0;
            });
        }

        // Close Popover on Outside Click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.vocab-word-chip') && !e.target.closest('.vocab-popover-box')) {
                this.hideAllPopovers();
            }
        });

        // Community Modal bindings
        const contribBtn = document.getElementById('btn-open-contrib');
        const contribModal = document.getElementById('contrib-modal');
        const contribClose = document.getElementById('contrib-close');
        const contribForm = document.getElementById('contrib-form');

        if (contribBtn && contribModal) {
            contribBtn.addEventListener('click', () => {
                contribModal.classList.add('active');
            });
        }

        if (contribClose && contribModal) {
            contribClose.addEventListener('click', () => {
                contribModal.classList.remove('active');
            });
        }

        if (contribForm) {
            contribForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitCommunityVersion();
            });
        }
    }

    // =========================================================================
    // 1. TẢI VÀ HIỂN THỊ BÀI HÁT (LOAD & RENDER)
    // =========================================================================
    loadSong(song) {
        if (!song) return;
        this.currentSong = song;
        this.currentVersionIndex = -1;
        this.activeSentenceIndex = -1;
        this.loopSentenceIndex = -1;

        // Cập nhật thông tin bài hát
        const titleEl = document.getElementById('track-title');
        const artistEl = document.getElementById('track-artist');
        const artImg = document.getElementById('track-art-img');
        const langBadge = document.getElementById('track-lang-badge');

        if (titleEl) titleEl.textContent = song.title;
        if (artistEl) artistEl.textContent = song.artist;
        if (artImg) artImg.src = song.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60';
        
        const langMap = { en: 'Tiếng Anh', ko: 'Tiếng Hàn', ja: 'Tiếng Nhật', zh: 'Tiếng Trung' };
        if (langBadge) langBadge.textContent = langMap[song.lang] || 'Đa ngôn ngữ';

        // Tải audio nếu có
        if (song.audio_url) {
            this.audioPlayer.src = song.audio_url;
            this.audioPlayer.load();
        } else {
            // Sử dụng audio demo hoặc synth
            this.audioPlayer.src = 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3';
            this.audioPlayer.load();
        }

        // Render Version Tabs
        this.renderVersionTabs();

        // Render Lyrics
        this.renderLyrics();
    }

    renderVersionTabs() {
        const container = document.getElementById('version-tabs-wrap');
        if (!container || !this.currentSong) return;

        let html = `
            <button class="version-tab ${this.currentVersionIndex === -1 ? 'active' : ''}" onclick="window.lyricsApp.switchVersion(-1)">
                <i class="fa-solid fa-globe"></i> Bản chuẩn Web/AI
            </button>
        `;

        const commVersions = this.currentSong.community_versions || [];
        commVersions.forEach((v, idx) => {
            html += `
                <button class="version-tab ${this.currentVersionIndex === idx ? 'active' : ''}" onclick="window.lyricsApp.switchVersion(${idx})">
                    <i class="fa-solid fa-user-check"></i> ${v.author || 'User'} (${v.title || 'Bản dịch'})
                </button>
            `;
        });

        container.innerHTML = html;
    }

    switchVersion(index) {
        this.currentVersionIndex = index;
        this.renderVersionTabs();
        this.renderLyrics();
    }

    renderLyrics() {
        const container = document.getElementById('lyrics-stream-container');
        if (!container || !this.currentSong) return;

        let lines = this.currentSong.synced_lyrics || [];

        // Nếu đang chọn bản cộng đồng
        if (this.currentVersionIndex >= 0 && this.currentSong.community_versions) {
            const comm = this.currentSong.community_versions[this.currentVersionIndex];
            if (comm && comm.synced_lyrics) {
                lines = comm.synced_lyrics;
            }
        }

        if (lines.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: #94a3b8; padding: 40px;">
                    <i class="fa-solid fa-music" style="font-size: 2rem; margin-bottom: 12px; opacity: 0.5;"></i>
                    <p>Chưa có lời đồng bộ cho bài hát này.</p>
                </div>
            `;
            return;
        }

        let html = '';
        lines.forEach((line, idx) => {
            const timeStr = this.formatSeconds(line.startTime || 0);
            
            // Xử lý làm nổi bật từ vựng có chú thích
            const enrichedText = this.highlightVocabInSentence(line.text, line.words || [], idx);

            html += `
                <div class="lyrics-sentence-row" id="sentence-row-${idx}" onclick="window.lyricsApp.seekTo(${line.startTime || 0})">
                    <div class="sentence-meta-row">
                        <span class="sentence-time-badge">${timeStr}</span>
                        <button class="sentence-loop-btn" onclick="event.stopPropagation(); window.lyricsApp.toggleSentenceLoop(${idx})" title="Luyện nghe / phát âm câu này">
                            <i class="fa-solid fa-repeat"></i> ${this.loopSentenceIndex === idx ? 'Đang lặp' : 'Luyện câu'}
                        </button>
                    </div>

                    <div class="sentence-orig-text">${enrichedText}</div>

                    ${line.phonetic ? `<div class="sentence-phonetic-text">${line.phonetic}</div>` : ''}

                    <div class="sentence-trans-text">${line.translation || ''}</div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    highlightVocabInSentence(sentence, words, sentenceIdx) {
        if (!words || words.length === 0) return sentence;

        let result = sentence;
        words.forEach((w, wIdx) => {
            if (!w.word) return;
            const regex = new RegExp(`(${this.escapeRegExp(w.word)})`, 'gi');
            const popoverId = `popover-${sentenceIdx}-${wIdx}`;

            const wordSpan = `
                <span class="vocab-word-chip" onclick="event.stopPropagation(); window.lyricsApp.togglePopover('${popoverId}')">
                    $1
                    <div class="vocab-popover-box" id="${popoverId}" onclick="event.stopPropagation()">
                        <div class="popover-header">
                            <span class="popover-word">${w.word}</span>
                            <span class="popover-pos">${w.pos || 'Từ vựng'}</span>
                        </div>
                        ${w.phonetic ? `<div class="popover-phonetic">${w.phonetic}</div>` : ''}
                        <div class="popover-meaning">${w.meaning || ''}</div>
                        <div class="popover-actions">
                            <button class="popover-btn-speak" onclick="window.lyricsApp.speak('${w.word}', '${this.currentSong ? this.currentSong.lang : 'en'}')" title="Phát âm">
                                <i class="fa-solid fa-volume-high"></i>
                            </button>
                            <button class="popover-btn-save" onclick="window.lyricsApp.saveVocabFromLyrics('${w.word}', '${w.meaning}', '${w.phonetic || ''}', '${w.pos || 'noun'}')">
                                <i class="fa-solid fa-bookmark"></i> Lưu vào Sổ
                            </button>
                        </div>
                    </div>
                </span>
            `;

            result = result.replace(regex, wordSpan);
        });

        return result;
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    togglePopover(popoverId) {
        const el = document.getElementById(popoverId);
        if (!el) return;
        const isShown = el.classList.contains('show');
        this.hideAllPopovers();
        if (!isShown) {
            el.classList.add('show');
        }
    }

    hideAllPopovers() {
        document.querySelectorAll('.vocab-popover-box').forEach(el => el.classList.remove('show'));
    }

    // =========================================================================
    // 2. ĐỒNG BỘ KARAOKE TỪNG CÂU & ĐIỀU KHIỂN PLAYBACK
    // =========================================================================
    togglePlay() {
        if (this.isPlaying) {
            this.audioPlayer.pause();
            this.isPlaying = false;
        } else {
            this.audioPlayer.play().catch(e => {
                console.warn('[Audio Play Warning]:', e);
            });
            this.isPlaying = true;
        }
        this.updatePlayBtnUi();
    }

    updatePlayBtnUi() {
        const btn = document.getElementById('btn-player-play');
        if (btn) {
            btn.innerHTML = this.isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
        }
    }

    seekTo(seconds) {
        this.audioPlayer.currentTime = seconds;
        this.currentTime = seconds;
        this.updatePlayerProgress();
        this.syncActiveSentence(seconds, true);

        if (!this.isPlaying) {
            this.togglePlay();
        }
    }

    toggleSentenceLoop(idx) {
        if (this.loopSentenceIndex === idx) {
            this.loopSentenceIndex = -1;
        } else {
            this.loopSentenceIndex = idx;
            const lines = this.currentSong.synced_lyrics || [];
            if (lines[idx]) {
                this.seekTo(lines[idx].startTime);
            }
        }
        this.renderLyrics();
    }

    syncActiveSentence(time, forceScroll = false) {
        if (!this.currentSong || !this.currentSong.synced_lyrics) return;
        const lines = this.currentSong.synced_lyrics;

        let activeIdx = -1;
        for (let i = 0; i < lines.length; i++) {
            const start = lines[i].startTime || 0;
            const end = lines[i].endTime || (lines[i + 1] ? lines[i + 1].startTime : start + 6);
            if (time >= start && time < end) {
                activeIdx = i;
                break;
            }
        }

        if (activeIdx !== this.activeSentenceIndex || forceScroll) {
            this.activeSentenceIndex = activeIdx;

            // Cập nhật active class
            document.querySelectorAll('.lyrics-sentence-row').forEach((row, i) => {
                if (i === activeIdx) {
                    row.classList.add('active');
                    // Tự động cuộn mượt vào giữa khung nhìn (Apple Music style)
                    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    row.classList.remove('active');
                }
            });
        }
    }

    updatePlayerProgress() {
        const progressBar = document.getElementById('playback-progress');
        const currLabel = document.getElementById('playback-current-time');
        const durLabel = document.getElementById('playback-duration');

        if (progressBar) {
            progressBar.max = this.duration || 180;
            progressBar.value = this.currentTime || 0;
        }

        if (currLabel) currLabel.textContent = this.formatSeconds(this.currentTime);
        if (durLabel) durLabel.textContent = this.formatSeconds(this.duration);
    }

    formatSeconds(sec) {
        if (isNaN(sec)) return '00:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }

    speak(text, lang) {
        if (window.aisaDict && typeof window.aisaDict.speakWord === 'function') {
            window.aisaDict.speakWord(text, lang);
        } else if (window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
        }
    }

    saveVocabFromLyrics(word, meaning, phonetic, pos) {
        const entry = {
            id: 'lyrics_' + Date.now(),
            word: word,
            meaning: meaning,
            phonetic: phonetic,
            pos: pos,
            example: `Trích từ lời bài hát: "${this.currentSong ? this.currentSong.title : 'Lyrics'}"`,
            exampleTrans: '',
            note: 'Học qua bài hát MHEnt Study',
            status: 'new',
            createdAt: new Date().toISOString()
        };

        const app = window.sheetApp || window.vocabApp;
        if (app && typeof app.addWordDirectly === 'function') {
            app.addWordDirectly(entry);
        } else if (window.studyStorage) {
            const lang = this.currentSong ? this.currentSong.lang : 'en';
            let decks = window.studyStorage.getDecks(lang);
            let targetDeck = decks.find(d => d.title && d.title.includes('Sổ tay từ vựng qua bài hát')) || decks[0];
            if (!targetDeck) {
                targetDeck = {
                    id: `deck_lyrics_${lang}`,
                    title: `Sổ tay từ vựng qua bài hát (${lang.toUpperCase()})`,
                    description: 'Từ vựng hay được bóc tách từ các bài hát',
                    lang: lang,
                    words: []
                };
                decks.push(targetDeck);
            }
            if (!targetDeck.words) targetDeck.words = [];
            targetDeck.words.unshift(entry);
            window.studyStorage.saveDecks(decks, lang);
        }

        this.hideAllPopovers();
        if (typeof showToast === 'function') {
            showToast(`Đã lưu "${word}" vào Sổ từ vựng!`, 'success');
        } else {
            alert(`Đã lưu từ vựng "${word}" vào sổ của bạn!`);
        }
    }

    // =========================================================================
    // 3. TÌM KIẾM BÀI HÁT TỰ ĐỘNG (SUPABASE -> LRCLIB -> AISA AI -> SUPABASE)
    // =========================================================================
    async searchSong(query) {
        if (!query) return;
        query = query.trim();

        const searchBtn = document.getElementById('lyrics-search-btn');
        if (searchBtn) searchBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tìm...';

        try {
            // Bước 1: Kiểm tra Supabase Cloud Database trước
            if (window.studyCloud && typeof window.studyCloud.getSong === 'function') {
                const songId = query.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                const cloudSong = await window.studyCloud.getSong(songId);
                if (cloudSong) {
                    console.log('[Lyrics Hub] ⚡ Tìm thấy bài hát trong Supabase Cloud:', cloudSong.title);
                    this.loadSong(cloudSong);
                    if (searchBtn) searchBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Tìm kiếm';
                    return;
                }
            }

            // Bước 2: Tự động tìm kiếm lời bài hát có timestamps trên LRCLIB (Hoàn toàn CORS-friendly)
            const lrclibUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
            const res = await fetch(lrclibUrl);
            if (!res.ok) throw new Error('Không thể kết nối kho lời bài hát');

            const results = await res.json();
            if (!results || results.length === 0) {
                alert(`Không tìm thấy bài hát "${query}". Hãy thử tìm kiếm bằng tên tiếng Anh/Hàn/Nhật chuẩn xác hơn!`);
                if (searchBtn) searchBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Tìm kiếm';
                return;
            }

            // Lấy kết quả đầu tiên có syncedLyrics
            const bestHit = results.find(r => r.syncedLyrics) || results[0];
            const parsedLyrics = this.parseLrc(bestHit.syncedLyrics || bestHit.plainLyrics || '');

            // Nhận diện ngôn ngữ sơ bộ
            const detectedLang = this.detectLanguage(bestHit.trackName + ' ' + (bestHit.syncedLyrics || ''));

            // Bước 3: Gửi các câu cho AISA AI để bóc tách từ vựng & dịch tiếng Việt
            const endpoint = (window.MHENT_CONFIG && window.MHENT_CONFIG.AISA_API_ENDPOINT) || 'https://api.mhentuniverse.com';
            let enrichedLyrics = parsedLyrics;

            try {
                const analyzeRes = await fetch(`${endpoint}/api/analyze-lyrics`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lines: parsedLyrics.slice(0, 40), // Phân tích 40 câu đầu tiên tiêu biểu
                        lang: detectedLang,
                        title: bestHit.trackName,
                        artist: bestHit.artistName
                    })
                });

                if (analyzeRes.ok) {
                    const analyzeData = await analyzeRes.json();
                    if (analyzeData && Array.isArray(analyzeData.data)) {
                        enrichedLyrics = analyzeData.data;
                    }
                }
            } catch (aiErr) {
                console.warn('[Lyrics Hub] AISA AI phân tích nâng cao lỗi (sử dụng bản gốc):', aiErr);
            }

            // Tạo đối tượng bài hát chuẩn hóa
            const newSong = {
                id: (bestHit.trackName + '-' + bestHit.artistName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                title: bestHit.trackName,
                artist: bestHit.artistName,
                lang: detectedLang,
                thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=60',
                duration: bestHit.duration || 180,
                synced_lyrics: enrichedLyrics,
                plain_lyrics: bestHit.plainLyrics || '',
                views: 1,
                created_by: 'AISA AI Autosearch',
                community_versions: []
            };

            // Bước 4: Lưu vào Supabase Cloud để bài hát tồn tại vĩnh viễn cho tất cả người dùng
            if (window.studyCloud && typeof window.studyCloud.saveSong === 'function') {
                window.studyCloud.saveSong(newSong).catch(e => console.warn('Lưu Supabase ngầm:', e));
            }

            // Tải bài hát vào giao diện
            this.loadSong(newSong);

        } catch (err) {
            console.error('[Lyrics Hub] Lỗi tìm kiếm:', err);
            alert(`Lỗi tìm kiếm: ${err.message}`);
        } finally {
            if (searchBtn) searchBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Tìm kiếm';
        }
    }

    parseLrc(lrcText) {
        if (!lrcText) return [];
        const lines = lrcText.split('\n');
        const result = [];
        const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

        lines.forEach((line, idx) => {
            const match = line.match(timeRegex);
            if (match) {
                const min = parseInt(match[1], 10);
                const sec = parseInt(match[2], 10);
                const ms = parseFloat('0.' + match[3]);
                const startTime = min * 60 + sec + ms;
                const text = match[4].trim();

                if (text) {
                    result.push({
                        id: idx + 1,
                        startTime: startTime,
                        endTime: 0,
                        text: text,
                        phonetic: '',
                        translation: text,
                        words: []
                    });
                }
            }
        });

        // Tính endTime cho từng câu
        for (let i = 0; i < result.length; i++) {
            if (i < result.length - 1) {
                result[i].endTime = result[i + 1].startTime;
            } else {
                result[i].endTime = result[i].startTime + 5;
            }
        }

        return result;
    }

    detectLanguage(text) {
        if (/[\uac00-\ud7a3]/.test(text)) return 'ko'; // Hangeul
        if (/[\u3040-\u30ff]/.test(text)) return 'ja'; // Kana / Japanese
        if (/[\u4e00-\u9fa5]/.test(text)) return 'zh'; // Chinese
        return 'en';
    }

    // =========================================================================
    // 4. ĐÓNG GÓP BẢN DỊCH CỘNG ĐỒNG (COMMUNITY CONTRIBUTIONS)
    // =========================================================================
    async submitCommunityVersion() {
        if (!this.currentSong) return;

        const authorName = (document.getElementById('contrib-author').value || 'Học viên MHEnt').trim();
        const versionTitle = (document.getElementById('contrib-title').value || 'Bản dịch mới').trim();
        const note = (document.getElementById('contrib-note').value || '').trim();

        // Tạo bản copy lời bài hát có thể tinh chỉnh
        const baseLyrics = JSON.parse(JSON.stringify(this.currentSong.synced_lyrics || []));

        const versionData = {
            id: 'comm_' + Date.now(),
            author: authorName,
            title: versionTitle,
            note: note,
            synced_lyrics: baseLyrics,
            likes: 0,
            createdAt: new Date().toISOString()
        };

        if (window.studyCloud && typeof window.studyCloud.addCommunityVersion === 'function') {
            await window.studyCloud.addCommunityVersion(this.currentSong.id, versionData);
        }

        if (!this.currentSong.community_versions) this.currentSong.community_versions = [];
        this.currentSong.community_versions.push(versionData);

        // Đóng modal & chọn phiên bản vừa tạo
        const modal = document.getElementById('contrib-modal');
        if (modal) modal.classList.remove('active');

        this.switchVersion(this.currentSong.community_versions.length - 1);

        if (typeof showToast === 'function') {
            showToast('Đã lưu đóng góp bản dịch của bạn lên Supabase Cloud!', 'success');
        } else {
            alert('Đã thêm đóng góp bản dịch thành công!');
        }
    }

    // =========================================================================
    // 5. DANH SÁCH BÀI HÁT MẪU ĐƯỢC TUYỂN CHỌN (SHOWCASE)
    // =========================================================================
    initFeaturedSongs() {
        return [
            {
                id: 'until-i-found-you-stephen-sanchez',
                title: 'Until I Found You',
                artist: 'Stephen Sanchez',
                lang: 'en',
                thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60',
                audio_url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
                synced_lyrics: [
                    {
                        id: 1, startTime: 10.3, endTime: 17.4,
                        text: "Georgia, wrap me up in all your-",
                        phonetic: "",
                        translation: "Georgia ơi, hãy ôm trọn lấy anh trong vòng tay của em...",
                        words: [
                            { word: "wrap", phonetic: "/ræp/", pos: "verb", meaning: "ôm chặt, bao bọc, quấn lấy" }
                        ]
                    },
                    {
                        id: 2, startTime: 17.5, endTime: 22.8,
                        text: "I want you in my arms",
                        phonetic: "",
                        translation: "Anh chỉ muốn có em trong vòng tay này",
                        words: [
                            { word: "arms", phonetic: "/ɑːmz/", pos: "noun", meaning: "vòng tay, cánh tay" }
                        ]
                    },
                    {
                        id: 3, startTime: 22.9, endTime: 27.5,
                        text: "Oh, let me hold you",
                        phonetic: "",
                        translation: "Ôi, hãy để anh được ôm chặt lấy em",
                        words: [
                            { word: "hold", phonetic: "/həʊld/", pos: "verb", meaning: "nắm giữ, ôm chặt" }
                        ]
                    },
                    {
                        id: 4, startTime: 27.6, endTime: 33.5,
                        text: "I'll never let you go again like I did",
                        phonetic: "",
                        translation: "Anh sẽ không bao giờ để lạc mất em như trước đây nữa",
                        words: [
                            { word: "never", phonetic: "/ˈnev.ər/", pos: "adv", meaning: "không bao giờ" }
                        ]
                    },
                    {
                        id: 5, startTime: 33.6, endTime: 40.0,
                        text: "I used to say I would never fall in love until I found you",
                        phonetic: "",
                        translation: "Anh từng nói mình sẽ chẳng bao giờ yêu ai, cho tới khi tìm thấy em",
                        words: [
                            { word: "fall in love", phonetic: "/fɔːl ɪn lʌv/", pos: "phrase", meaning: "phải lòng, rơi vào lưới tình" },
                            { word: "found", phonetic: "/faʊnd/", pos: "verb", meaning: "tìm thấy (quá khứ của find)" }
                        ]
                    }
                ],
                community_versions: [
                    {
                        id: 'comm_1',
                        author: 'Sakura Yurika',
                        title: 'Bản dịch thơ văn cảm xúc',
                        note: 'Bản dịch mềm mại hơn để hát theo phong cách acoustic',
                        synced_lyrics: [
                            {
                                id: 1, startTime: 10.3, endTime: 17.4,
                                text: "Georgia, wrap me up in all your-",
                                phonetic: "",
                                translation: "Georgia hỡi, xin sưởi ấm tim anh bằng hơi ấm của nàng...",
                                words: [{ word: "wrap", phonetic: "/ræp/", pos: "verb", meaning: "bao bọc" }]
                            },
                            {
                                id: 2, startTime: 17.5, endTime: 22.8,
                                text: "I want you in my arms",
                                phonetic: "",
                                translation: "Khát khao một đời chỉ mong ôm nàng vào lòng",
                                words: [{ word: "arms", phonetic: "/ɑːmz/", pos: "noun", meaning: "vòng tay" }]
                            },
                            {
                                id: 3, startTime: 22.9, endTime: 27.5,
                                text: "Oh, let me hold you",
                                phonetic: "",
                                translation: "Để anh giữ chặt bóng hình em không rời",
                                words: [{ word: "hold", phonetic: "/həʊld/", pos: "verb", meaning: "giữ chặt" }]
                            },
                            {
                                id: 4, startTime: 27.6, endTime: 33.5,
                                text: "I'll never let you go again like I did",
                                phonetic: "",
                                translation: "Sẽ chẳng bao giờ để vuột mất em thêm một lần nào nữa",
                                words: [{ word: "never", phonetic: "/ˈnev.ər/", pos: "adv", meaning: "không bao giờ" }]
                            },
                            {
                                id: 5, startTime: 33.6, endTime: 40.0,
                                text: "I used to say I would never fall in love until I found you",
                                phonetic: "",
                                translation: "Từng nghĩ trọn kiếp này tim sẽ băng giá... cho tới ngày gặp được em.",
                                words: [{ word: "found", phonetic: "/faʊnd/", pos: "verb", meaning: "tìm thấy" }]
                            }
                        ]
                    }
                ]
            },
            {
                id: 'spring-day-bts',
                title: 'Spring Day (봄날)',
                artist: 'BTS (방탄소년단)',
                lang: 'ko',
                thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=60',
                audio_url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
                synced_lyrics: [
                    {
                        id: 1, startTime: 12.0, endTime: 18.0,
                        text: "보고 싶다 이렇게 말하니까 더 보고 싶다",
                        phonetic: "Bogo sipda ireoke malhanikka deo bogo sipda",
                        translation: "Anh nhớ em... Thốt ra lời này lại càng làm nỗi nhớ cồn cào hơn",
                        words: [
                            { word: "보고 싶다", phonetic: "bogo sipda", pos: "verb", meaning: "nhớ, muốn gặp" }
                        ]
                    },
                    {
                        id: 2, startTime: 18.1, endTime: 25.0,
                        text: "너희 사진을 보고 있어도 보고 싶다",
                        phonetic: "Neohui sajineul bogo isseodo bogo sipda",
                        translation: "Dẫu đang ngắm nhìn bức ảnh của các cậu, lòng vẫn không thôi nhung nhớ",
                        words: [
                            { word: "사진", phonetic: "sajin", pos: "noun", meaning: "bức ảnh, hình ảnh" }
                        ]
                    },
                    {
                        id: 3, startTime: 25.1, endTime: 32.0,
                        text: "너무 야속한 시간 나는 우리가 밉다",
                        phonetic: "Neomu yasokhan sigan naneun uriga mibda",
                        translation: "Thời gian thật tàn nhẫn vô tình, giờ đây anh oán trách chính hai ta",
                        words: [
                            { word: "시간", phonetic: "sigan", pos: "noun", meaning: "thời gian" },
                            { word: "밉다", phonetic: "mibda", pos: "adj", meaning: "đáng ghét, oán giận" }
                        ]
                    },
                    {
                        id: 4, startTime: 32.1, endTime: 40.0,
                        text: "눈꽃이 떨어져요 또 조금씩 멀어져요",
                        phonetic: "Nunkkochi tteoreojyeoyo tto jogeumssik meoreojyeoyo",
                        translation: "Những bông hoa tuyết đang rơi rụng... và em lại thêm một chút cách xa",
                        words: [
                            { word: "눈꽃", phonetic: "nunkkot", pos: "noun", meaning: "hoa tuyết, bông tuyết" },
                            { word: "떨어져요", phonetic: "tteoreojyeoyo", pos: "verb", meaning: "rơi xuống" }
                        ]
                    }
                ],
                community_versions: []
            },
            {
                id: 'lemon-kenshi-yonezu',
                title: 'Lemon (レモン)',
                artist: 'Kenshi Yonezu (米津玄師)',
                lang: 'ja',
                thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=60',
                audio_url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
                synced_lyrics: [
                    {
                        id: 1, startTime: 14.0, endTime: 22.0,
                        text: "夢ならばどれほどよかったでしょう",
                        phonetic: "Yume naraba dore hodo yokatta deshou",
                        translation: "Nếu tất cả những điều này chỉ là một giấc mơ thì tốt biết bao...",
                        words: [
                            { word: "夢", phonetic: "yume", pos: "noun", meaning: "giấc mơ, giấc chiêm bao" }
                        ]
                    },
                    {
                        id: 2, startTime: 22.1, endTime: 29.5,
                        text: "未だにあなたのことを夢にみる",
                        phonetic: "Imadani anata no koto wo yume ni miru",
                        translation: "Cho đến tận hôm nay, hình bóng của người vẫn xuất hiện trong cơn mơ",
                        words: [
                            { word: "あなた", phonetic: "anata", pos: "noun", meaning: "bạn, người ấy, anh/em" }
                        ]
                    },
                    {
                        id: 3, startTime: 29.6, endTime: 37.0,
                        text: "忘れた物を取りに帰るように",
                        phonetic: "Wasureta mono wo tori ni kaeru you ni",
                        translation: "Tựa như quay trở về tìm lại món đồ vô tình bỏ quên",
                        words: [
                            { word: "忘れた", phonetic: "wasureta", pos: "verb", meaning: "đã quên" }
                        ]
                    },
                    {
                        id: 4, startTime: 37.1, endTime: 45.0,
                        text: "古びた思い出の埃を払う",
                        phonetic: "Furubita omoide no hokori wo harau",
                        translation: "Phủi đi lớp bụi thời gian bám trên những ký ức xưa cũ",
                        words: [
                            { word: "思い出", phonetic: "omoide", pos: "noun", meaning: "ký ức, kỷ niệm" }
                        ]
                    }
                ],
                community_versions: []
            },
            {
                id: 'qing-hua-ci-jay-chou',
                title: '青花瓷 (Blue and White Porcelain)',
                artist: 'Jay Chou (周杰伦)',
                lang: 'zh',
                thumbnail: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop&q=60',
                audio_url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
                synced_lyrics: [
                    {
                        id: 1, startTime: 12.0, endTime: 18.0,
                        text: "素胚勾勒出青花笔锋浓转淡",
                        phonetic: "Sù pēi gōulè chū qīnghuā bǐfēng nóng zhuǎn dàn",
                        translation: "Nét bút lông phác thảo họa tiết thanh hoa trên lớp gốm mộc, từ đậm chuyển sang nhạt...",
                        words: [
                            { word: "青花", phonetic: "qīnghuā", pos: "noun", meaning: "gốm hoa lam, sứ men lam" }
                        ]
                    },
                    {
                        id: 2, startTime: 18.1, endTime: 24.5,
                        text: "瓶身描绘的牡丹一如你初妆",
                        phonetic: "Píng shēn miáohuì de mǔdān yīrú nǐ chū zhuāng",
                        translation: "Đóa hoa mẫu đơn vẽ trên thân bình kiều diễm tựa như dung nhan nàng thuở mới điểm trang",
                        words: [
                            { word: "牡丹", phonetic: "mǔdān", pos: "noun", meaning: "hoa mẫu đơn" }
                        ]
                    },
                    {
                        id: 3, startTime: 24.6, endTime: 32.0,
                        text: "天青色等烟雨 而我在等你",
                        phonetic: "Tiānqīng sè děng yānyǔ ér wǒ zài děng nǐ",
                        translation: "Sắc trời lam đợi chờ cơn mưa khói... và ta đang đợi chờ nàng",
                        words: [
                            { word: "天青色", phonetic: "tiānqīng sè", pos: "noun", meaning: "sắc trời xanh lam (màu men gốm quý)" },
                            { word: "等你", phonetic: "děng nǐ", pos: "phrase", meaning: "chờ đợi người" }
                        ]
                    }
                ],
                community_versions: []
            }
        ];
    }

    renderShowcaseCards() {
        const grid = document.getElementById('songs-grid');
        if (!grid) return;

        let filtered = this.featuredSongs;
        if (this.activeLang !== 'all') {
            filtered = this.featuredSongs.filter(s => s.lang === this.activeLang);
        }

        const langLabels = { en: 'Tiếng Anh', ko: 'Tiếng Hàn', ja: 'Tiếng Nhật', zh: 'Tiếng Trung' };

        grid.innerHTML = filtered.map(s => `
            <div class="song-card" onclick="window.lyricsApp.loadSongById('${s.id}')">
                <div class="song-card-img-wrap">
                    <img src="${s.thumbnail}" alt="${s.title}" class="song-card-img">
                    <span class="song-card-lang-tag">${langLabels[s.lang] || 'Học tiếng'}</span>
                </div>
                <div class="song-card-title">${s.title}</div>
                <div class="song-card-artist">${s.artist}</div>
            </div>
        `).join('');
    }

    loadSongById(id) {
        const song = this.featuredSongs.find(s => s.id === id);
        if (song) {
            this.loadSong(song);
            window.scrollTo({ top: 300, behavior: 'smooth' });
        }
    }
}

// Khởi tạo Singleton
window.lyricsApp = new LyricsHubApp();
