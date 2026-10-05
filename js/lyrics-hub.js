/**
 * MHENT STUDY - MUSIC LYRICS STUDY HUB ENGINE
 * Trình phát nhạc đồng bộ lời bài hát từng câu (Sentence-by-Sentence Karaoke)
 * Tự động tìm kiếm LRCLIB, phân tích từ vựng bằng AISA AI & lưu trữ vào Supabase Database
 * Hỗ trợ bù trừ lệch pha MV YouTube vs Spotify Audio (Time Offset Sync Calibrator)
 * Giao diện Glassmorphism độc quyền, không dùng bất kỳ UI mặc định nào của trình duyệt
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

        // Media display & YouTube Engine
        this.mediaMode = 'video'; // 'video' hoặc 'art'
        this.ytPlayer = null;
        this.isYtReady = false;
        this.useYouTube = true; // true: YouTube MV, false: Studio/Spotify Audio
        this.syncTimer = null;

        // Custom UI states (No native browser controls)
        this.playbackRate = 1.0;
        this.currentVolume = 1.0;
        this.isMuted = false;
        this.timeOffset = 0.0; // Bù trừ độ lệch intro video (giây)

        // Modal Search & Song Picker states
        this.modalCandidates = [];
        this.modalFilter = 'all';
        this.modalSearchQuery = '';

        // Danh sách bài hát mẫu chất lượng cao sẵn sàng học tập ngay lập tức
        this.featuredSongs = this.initFeaturedSongs();

        this.init();
        this.initYouTubeApi();
    }

    // =========================================================================
    // 0. KHỞI TẠO VÀ SỰ KIỆN GIAO DIỆN (LIFECYCLE & DOM EVENTS)
    // =========================================================================
    initYouTubeApi() {
        if (window.YT && window.YT.Player) {
            this.isYtReady = true;
        } else {
            const oldReady = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                if (typeof oldReady === 'function') oldReady();
                this.isYtReady = true;
                if (this.currentSong && this.currentSong.youtube_id) {
                    this.initYouTubePlayer(this.currentSong.youtube_id);
                }
            };
        }
    }

    init() {
        // Expose global toast helper
        window.showToast = (msg, type) => this.showToast(msg, type);

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
        // 1. Search Form & Browse Button
        const form = document.getElementById('lyrics-search-form');
        const input = document.getElementById('lyrics-search-input');
        const browseBtn = document.getElementById('btn-browse-songs');

        if (form && input) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const q = input.value.trim();
                if (q) this.searchSong(q);
            });
        }

        if (browseBtn) {
            browseBtn.addEventListener('click', () => {
                this.openLibraryBrowser();
            });
        }

        // 2. Language Filter Pills (Showcase Header)
        document.querySelectorAll('.lang-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('.lang-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.activeLang = pill.getAttribute('data-lang') || 'all';
                this.renderShowcaseCards();
            });
        });

        // 3. Player Controls
        const playBtn = document.getElementById('btn-player-play');
        const progressBar = document.getElementById('playback-progress');
        const toggleMediaBtn = document.getElementById('btn-toggle-media');

        if (playBtn) {
            playBtn.addEventListener('click', () => this.togglePlay());
        }

        if (toggleMediaBtn) {
            toggleMediaBtn.addEventListener('click', () => this.toggleMediaMode());
        }

        // 4. Audio Engine Switcher (YouTube MV vs Studio Audio)
        const engineYt = document.getElementById('btn-engine-yt');
        const engineAudio = document.getElementById('btn-engine-audio');

        if (engineYt) {
            engineYt.addEventListener('click', () => this.switchAudioEngine('yt'));
        }
        if (engineAudio) {
            engineAudio.addEventListener('click', () => this.switchAudioEngine('audio'));
        }

        // 5. Custom Glassmorphic Speed Dropdown
        this.setupSpeedDropdown();

        // 6. Custom Volume Control & Mute
        this.setupVolumeControl();

        // 7. Audio Timeupdate (Studio mode fallback)
        this.audioPlayer.addEventListener('timeupdate', () => {
            if (!this.useYouTube) {
                this.currentTime = this.audioPlayer.currentTime;
                this.updatePlayerProgress();
                this.syncActiveSentence(this.currentTime);
                this.checkSentenceLoop();
            }
        });

        this.audioPlayer.addEventListener('loadedmetadata', () => {
            if (!this.useYouTube) {
                this.duration = this.audioPlayer.duration || 180;
                this.updatePlayerProgress();
            }
        });

        this.audioPlayer.addEventListener('ended', () => {
            this.isPlaying = false;
            this.updatePlayBtnUi();
        });

        // 8. Progress Slider Drag
        if (progressBar) {
            progressBar.addEventListener('input', (e) => {
                const time = parseFloat(e.target.value);
                this.seekTo(time);
            });
        }

        // 9. Song Selection Modal Events
        this.setupSongSelectModalEvents();

        // 10. Close Popovers & Menus on Outside Click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.vocab-word-chip') && !e.target.closest('.vocab-popover-box')) {
                this.hideAllPopovers();
            }
            if (!e.target.closest('#custom-speed-dropdown')) {
                const dd = document.getElementById('custom-speed-dropdown');
                if (dd) dd.classList.remove('open');
            }
        });

        // 11. Escape Key Handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSongSelectModal();
                const contribModal = document.getElementById('contrib-modal');
                if (contribModal) contribModal.classList.remove('active');
                this.hideAllPopovers();
            }
        });

        // 12. Community Modal bindings
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

        // Tải độ lệch pha đã lưu cho bài hát này (Time Offset)
        this.loadOffsetForSong(song.id);

        // Khởi động YouTube hoặc Studio Audio
        if (song.youtube_id) {
            this.useYouTube = true;
            this.updateAudioEngineUi();
            if (this.isYtReady) {
                this.initYouTubePlayer(song.youtube_id);
            }
        } else {
            this.useYouTube = false;
            this.updateAudioEngineUi();
        }

        // Tải audio fallback
        const safeAudio = song.audio_url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
        this.audioPlayer.src = safeAudio;
        this.audioPlayer.load();

        // Render Version Tabs & Lyrics
        this.renderVersionTabs();
        this.renderLyrics();

        // Reset nút Loop
        this.updateLoopBtnUi();
    }

    initYouTubePlayer(youtubeId) {
        if (!window.YT || !window.YT.Player) return;
        const frameContainer = document.getElementById('youtube-player-frame');
        if (!frameContainer) return;

        if (this.ytPlayer && typeof this.ytPlayer.loadVideoById === 'function') {
            this.ytPlayer.cueVideoById(youtubeId);
            return;
        }

        try {
            this.ytPlayer = new YT.Player('youtube-player-frame', {
                height: '100%',
                width: '100%',
                videoId: youtubeId,
                playerVars: {
                    autoplay: 0,
                    controls: 1,
                    modestbranding: 1,
                    rel: 0,
                    playsinline: 1
                },
                events: {
                    onReady: (event) => {
                        this.duration = event.target.getDuration() || 180;
                        this.updatePlayerProgress();
                        // Áp dụng tốc độ và âm lượng hiện tại
                        if (typeof event.target.setPlaybackRate === 'function') {
                            event.target.setPlaybackRate(this.playbackRate);
                        }
                        if (typeof event.target.setVolume === 'function') {
                            event.target.setVolume(this.isMuted ? 0 : this.currentVolume * 100);
                        }
                    },
                    onStateChange: (event) => {
                        if (event.data === YT.PlayerState.PLAYING) {
                            this.isPlaying = true;
                            this.updatePlayBtnUi();
                            this.startPlaybackTracker();
                        } else if (event.data === YT.PlayerState.PAUSED) {
                            this.isPlaying = false;
                            this.updatePlayBtnUi();
                            this.stopPlaybackTracker();
                        } else if (event.data === YT.PlayerState.ENDED) {
                            this.isPlaying = false;
                            this.updatePlayBtnUi();
                            this.stopPlaybackTracker();
                        }
                    }
                }
            });
        } catch (err) {
            console.warn('[YouTube Player Init Error]:', err);
        }
    }

    toggleMediaMode() {
        const artWrap = document.getElementById('track-art-wrap');
        const ytFrame = document.getElementById('youtube-player-frame');
        const btn = document.getElementById('btn-toggle-media');

        if (this.mediaMode === 'video') {
            this.mediaMode = 'art';
            if (artWrap) artWrap.style.display = 'flex';
            if (ytFrame) ytFrame.style.display = 'none';
            if (btn) btn.innerHTML = '<i class="fa-brands fa-youtube"></i> <span>Xem MV</span>';
        } else {
            this.mediaMode = 'video';
            if (artWrap) artWrap.style.display = 'none';
            if (ytFrame) ytFrame.style.display = 'block';
            if (btn) btn.innerHTML = '<i class="fa-solid fa-image"></i> <span>Xem Bìa</span>';
            if (this.currentSong && this.currentSong.youtube_id && !this.ytPlayer && this.isYtReady) {
                this.initYouTubePlayer(this.currentSong.youtube_id);
            }
        }
    }

    // =========================================================================
    // 2. AUDIO ENGINE SWITCHER (YOUTUBE MV VS STUDIO/SPOTIFY AUDIO)
    // =========================================================================
    switchAudioEngine(engine) {
        if (engine === 'yt') {
            if (!this.currentSong || !this.currentSong.youtube_id) {
                this.showToast('Bài hát này chưa có MV YouTube khả dụng.', 'warning');
                return;
            }
            if (!this.useYouTube) {
                const wasPlaying = this.isPlaying;
                this.audioPlayer.pause();
                this.useYouTube = true;
                this.updateAudioEngineUi();
                if (this.mediaMode !== 'video') this.toggleMediaMode();

                if (wasPlaying && this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
                    this.ytPlayer.seekTo(Math.max(0, this.currentTime - this.timeOffset), true);
                    this.ytPlayer.playVideo();
                }
                this.showToast('Đã chuyển sang chế độ MV YouTube', 'info');
            }
        } else {
            // Chuyển sang Studio Audio
            if (this.useYouTube) {
                const wasPlaying = this.isPlaying;
                if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
                    this.ytPlayer.pauseVideo();
                }
                this.useYouTube = false;
                this.updateAudioEngineUi();

                if (wasPlaying) {
                    this.audioPlayer.currentTime = this.currentTime;
                    this.audioPlayer.play().catch(e => console.warn(e));
                }
                this.showToast('Đã chuyển sang âm thanh Studio (Không có intro video)', 'info');
            }
        }
    }

    updateAudioEngineUi() {
        const btnYt = document.getElementById('btn-engine-yt');
        const btnAudio = document.getElementById('btn-engine-audio');

        if (btnYt) {
            btnYt.classList.toggle('active', this.useYouTube);
        }
        if (btnAudio) {
            btnAudio.classList.toggle('active', !this.useYouTube);
        }
    }

    // =========================================================================
    // 3. TIME OFFSET SYNC CALIBRATOR (BÙ TRỪ LỆCH PHA LỜI VỚI INTRO VIDEO)
    // =========================================================================
    loadOffsetForSong(songId) {
        if (!songId) {
            this.timeOffset = 0.0;
            this.updateOffsetUi();
            return;
        }

        const saved = localStorage.getItem(`mhent_lyrics_offset_${songId}`);
        if (saved !== null) {
            this.timeOffset = parseFloat(saved) || 0.0;
        } else {
            this.timeOffset = 0.0;
        }
        this.updateOffsetUi();
    }

    adjustOffset(delta) {
        this.timeOffset = Math.round((this.timeOffset + delta) * 10) / 10;
        // Giới hạn trong khoảng hợp lý [-60s, +60s]
        this.timeOffset = Math.max(-60, Math.min(60, this.timeOffset));

        if (this.currentSong && this.currentSong.id) {
            localStorage.setItem(`mhent_lyrics_offset_${this.currentSong.id}`, this.timeOffset.toString());
        }

        this.updateOffsetUi();
        // Lập tức đồng bộ lại câu lời theo thời gian hiện tại có offset mới
        this.syncActiveSentence(this.currentTime, true);

        const sign = this.timeOffset > 0 ? '+' : '';
        this.showToast(`Lệch pha lời: ${sign}${this.timeOffset.toFixed(1)}s`, 'info', 1200);
    }

    resetOffset() {
        this.timeOffset = 0.0;
        if (this.currentSong && this.currentSong.id) {
            localStorage.removeItem(`mhent_lyrics_offset_${this.currentSong.id}`);
        }
        this.updateOffsetUi();
        this.syncActiveSentence(this.currentTime, true);
        this.showToast('Đã đặt lại độ lệch pha về 0.0s', 'info', 1200);
    }

    updateOffsetUi() {
        const badge = document.getElementById('calibrator-val-badge');
        if (!badge) return;

        const sign = this.timeOffset > 0 ? '+' : '';
        badge.textContent = `${sign}${this.timeOffset.toFixed(1)}s`;

        if (this.timeOffset !== 0) {
            badge.style.color = '#38bdf8';
            badge.style.borderColor = 'rgba(56, 189, 248, 0.4)';
            badge.style.background = 'rgba(56, 189, 248, 0.15)';
        } else {
            badge.style.color = '#94a3b8';
            badge.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            badge.style.background = 'rgba(255, 255, 255, 0.05)';
        }
    }

    // =========================================================================
    // 4. CUSTOM GLASSMORPHIC SPEED SELECTOR & VOLUME SLIDER
    // =========================================================================
    setupSpeedDropdown() {
        const trigger = document.getElementById('btn-speed-trigger');
        const dropdown = document.getElementById('custom-speed-dropdown');
        const menu = document.getElementById('custom-speed-menu');

        if (trigger && dropdown) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('open');
            });
        }

        if (menu) {
            menu.querySelectorAll('.speed-opt').forEach(opt => {
                opt.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const speed = parseFloat(opt.getAttribute('data-speed')) || 1.0;
                    this.setPlaybackSpeed(speed);
                    if (dropdown) dropdown.classList.remove('open');
                });
            });
        }
    }

    setPlaybackSpeed(speed) {
        this.playbackRate = speed;

        // Áp dụng cho HTML5 Audio
        this.audioPlayer.playbackRate = speed;

        // Áp dụng cho YouTube Player
        if (this.ytPlayer && typeof this.ytPlayer.setPlaybackRate === 'function') {
            try {
                this.ytPlayer.setPlaybackRate(speed);
            } catch (e) {
                console.warn('Set YouTube playback rate:', e);
            }
        }

        // Cập nhật nhãn hiển thị trên trigger
        const label = document.getElementById('speed-label-display');
        if (label) label.textContent = `${speed}x`;

        // Cập nhật trạng thái active trong menu
        document.querySelectorAll('.speed-opt').forEach(opt => {
            const optSpeed = parseFloat(opt.getAttribute('data-speed'));
            opt.classList.toggle('active', optSpeed === speed);
        });

        this.showToast(`Tốc độ phát: ${speed}x`, 'info', 1200);
    }

    setupVolumeControl() {
        const muteBtn = document.getElementById('btn-volume-mute');
        const slider = document.getElementById('volume-slider');

        if (slider) {
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.setVolume(val);
            });
        }

        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                if (this.isMuted) {
                    this.setVolume(this.currentVolume > 0 ? this.currentVolume : 0.8);
                } else {
                    this.setVolume(0);
                }
            });
        }
    }

    setVolume(val) {
        val = Math.max(0, Math.min(1, val));
        this.isMuted = (val === 0);
        if (val > 0) this.currentVolume = val;

        // HTML5 Audio
        this.audioPlayer.volume = val;

        // YouTube Player
        if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
            try {
                this.ytPlayer.setVolume(val * 100);
                if (this.isMuted) {
                    this.ytPlayer.mute();
                } else {
                    this.ytPlayer.unMute();
                }
            } catch (e) {}
        }

        // Slider UI
        const slider = document.getElementById('volume-slider');
        if (slider) slider.value = val;

        // Mute button icon
        const muteBtn = document.getElementById('btn-volume-mute');
        if (muteBtn) {
            if (val === 0) {
                muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark" style="color: #ef4444;"></i>';
                muteBtn.classList.add('muted');
            } else if (val < 0.5) {
                muteBtn.innerHTML = '<i class="fa-solid fa-volume-low"></i>';
                muteBtn.classList.remove('muted');
            } else {
                muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                muteBtn.classList.remove('muted');
            }
        }
    }

    // =========================================================================
    // 5. HIỂN THỊ LỜI BÀI HÁT & POPUP TỪ VỰNG TƯƠNG TÁC
    // =========================================================================
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
            const enrichedText = this.highlightVocabInSentence(line.text, line.words || [], idx);

            html += `
                <div class="lyrics-sentence-row" id="sentence-row-${idx}" onclick="window.lyricsApp.seekToSentence(${idx})">
                    <div class="sentence-meta-row">
                        <span class="sentence-time-badge">${timeStr}</span>
                        <button class="sentence-loop-btn ${this.loopSentenceIndex === idx ? 'active' : ''}" onclick="event.stopPropagation(); window.lyricsApp.toggleSentenceLoop(${idx})" title="Luyện nghe / phát âm câu này">
                            <i class="fa-solid fa-repeat"></i> ${this.loopSentenceIndex === idx ? 'Đang lặp câu' : 'Luyện câu'}
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
            const chip = el.closest('.vocab-word-chip');
            const container = document.getElementById('lyrics-stream-container');
            if (chip && container) {
                const chipRect = chip.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                if (chipRect.top - containerRect.top < 180) {
                    el.classList.add('popover-down');
                } else {
                    el.classList.remove('popover-down');
                }
            }
            el.classList.add('show');
        }
    }

    hideAllPopovers() {
        document.querySelectorAll('.vocab-popover-box').forEach(el => el.classList.remove('show'));
    }

    // =========================================================================
    // 6. ĐỒNG BỘ KARAOKE TỪNG CÂU & PLAYBACK ENGINE
    // =========================================================================
    togglePlay() {
        if (this.isPlaying) {
            if (this.useYouTube && this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
                this.ytPlayer.pauseVideo();
            } else {
                this.audioPlayer.pause();
            }
            this.isPlaying = false;
            this.stopPlaybackTracker();
        } else {
            if (this.useYouTube && this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
                this.ytPlayer.playVideo();
                this.isPlaying = true;
                this.startPlaybackTracker();
            } else {
                this.audioPlayer.play().then(() => {
                    this.isPlaying = true;
                    this.startPlaybackTracker();
                    this.updatePlayBtnUi();
                }).catch(e => {
                    console.warn('[Audio Play Warning]:', e);
                    if (this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
                        this.useYouTube = true;
                        this.updateAudioEngineUi();
                        this.ytPlayer.playVideo();
                        this.isPlaying = true;
                        this.startPlaybackTracker();
                    }
                });
            }
        }
        this.updatePlayBtnUi();
    }

    startPlaybackTracker() {
        this.stopPlaybackTracker();
        this.syncTimer = setInterval(() => {
            if (this.useYouTube && this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
                try {
                    this.currentTime = this.ytPlayer.getCurrentTime() || 0;
                    const dur = this.ytPlayer.getDuration();
                    if (dur && dur > 0) this.duration = dur;
                } catch (e) {}
            } else {
                this.currentTime = this.audioPlayer.currentTime || 0;
                if (this.audioPlayer.duration) this.duration = this.audioPlayer.duration;
            }

            this.updatePlayerProgress();
            this.syncActiveSentence(this.currentTime);
            this.checkSentenceLoop();
        }, 150);
    }

    stopPlaybackTracker() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    }

    updatePlayBtnUi() {
        const btn = document.getElementById('btn-player-play');
        if (btn) {
            btn.innerHTML = this.isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
        }
    }

    seekTo(seconds) {
        this.currentTime = seconds;
        if (this.useYouTube && this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
            this.ytPlayer.seekTo(seconds, true);
        } else {
            this.audioPlayer.currentTime = seconds;
        }
        this.updatePlayerProgress();
        this.syncActiveSentence(seconds, true);

        if (!this.isPlaying) {
            this.togglePlay();
        }
    }

    seekToSentence(sentenceIdx) {
        const lines = this.getActiveLyrics();
        if (!lines || !lines[sentenceIdx]) return;

        const line = lines[sentenceIdx];
        const lyricsTime = line.startTime || 0;

        // Bù trừ theo Time Offset khi nhảy tới thời điểm của player
        const playerTime = Math.max(0, lyricsTime - this.timeOffset);
        this.seekTo(playerTime);
    }

    getActiveLyrics() {
        if (!this.currentSong) return [];
        if (this.currentVersionIndex >= 0 && this.currentSong.community_versions) {
            const comm = this.currentSong.community_versions[this.currentVersionIndex];
            if (comm && comm.synced_lyrics) return comm.synced_lyrics;
        }
        return this.currentSong.synced_lyrics || [];
    }

    toggleSentenceLoop(idx) {
        if (this.loopSentenceIndex === idx) {
            this.loopSentenceIndex = -1;
            this.showToast('Đã tắt lặp câu', 'info', 1200);
        } else {
            this.loopSentenceIndex = idx;
            this.seekToSentence(idx);
            this.showToast(`Đang lặp câu ${idx + 1}`, 'info', 1500);
        }
        this.updateLoopBtnUi();
        this.renderLyrics();
    }

    toggleCurrentSentenceLoop() {
        if (this.loopSentenceIndex >= 0) {
            this.toggleSentenceLoop(this.loopSentenceIndex);
        } else if (this.activeSentenceIndex >= 0) {
            this.toggleSentenceLoop(this.activeSentenceIndex);
        } else {
            this.toggleSentenceLoop(0);
        }
    }

    updateLoopBtnUi() {
        const btn = document.getElementById('btn-loop-global');
        if (!btn) return;

        if (this.loopSentenceIndex >= 0) {
            btn.classList.add('active');
            btn.style.color = '#10b981';
            btn.style.borderColor = 'rgba(16, 185, 129, 0.4)';
            btn.style.background = 'rgba(16, 185, 129, 0.15)';
        } else {
            btn.classList.remove('active');
            btn.style.color = '#94a3b8';
            btn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            btn.style.background = 'rgba(255, 255, 255, 0.05)';
        }
    }

    checkSentenceLoop() {
        if (this.loopSentenceIndex < 0 || !this.currentSong) return;
        const lines = this.getActiveLyrics();
        const currentLine = lines[this.loopSentenceIndex];
        if (!currentLine) return;

        const effectiveTime = this.currentTime + this.timeOffset;
        const endTime = currentLine.endTime || (currentLine.startTime + 4.5);

        if (effectiveTime >= endTime) {
            this.seekToSentence(this.loopSentenceIndex);
        }
    }

    syncActiveSentence(time, forceScroll = false) {
        const lines = this.getActiveLyrics();
        if (!lines || lines.length === 0) return;

        // Tính thời gian hiệu dụng sau khi bù trừ độ lệch intro video
        const effectiveTime = time + this.timeOffset;

        let activeIdx = -1;
        for (let i = 0; i < lines.length; i++) {
            const start = lines[i].startTime || 0;
            const end = lines[i].endTime || (lines[i + 1] ? lines[i + 1].startTime : start + 6);
            if (effectiveTime >= start && effectiveTime < end) {
                activeIdx = i;
                break;
            }
        }

        if (activeIdx !== this.activeSentenceIndex || forceScroll) {
            this.activeSentenceIndex = activeIdx;

            // Cập nhật class active và cuộn mượt (Apple Music style)
            document.querySelectorAll('.lyrics-sentence-row').forEach((row, i) => {
                if (i === activeIdx) {
                    row.classList.add('active');
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
        if (window.deckSelector) {
            window.deckSelector.open({
                word: word,
                meaning: meaning,
                phonetic: phonetic || '',
                pos: pos || 'noun',
                example: `Trích từ bài hát: "${this.currentSong ? this.currentSong.title : 'Lyrics'}"`,
                lang: this.currentSong ? this.currentSong.lang : 'en',
                onSave: (deck) => {
                    this.hideAllPopovers();
                    this.showToast(`Đã lưu "${word}" vào ${deck.title}!`, 'success');
                }
            });
            return;
        }

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
        this.showToast(`Đã lưu từ vựng "${word}" vào sổ của bạn!`, 'success');
    }

    // =========================================================================
    // 7. TÌM KIẾM BÀI HÁT & MODAL CHỌN BÀI HÁT (SELECTION MODAL)
    // =========================================================================
    async searchSong(query) {
        if (!query) return;
        query = query.trim();

        const searchBtn = document.getElementById('lyrics-search-btn');
        if (searchBtn) searchBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tìm...';

        try {
            const candidates = [];

            // 1. Kiểm tra trong danh sách Featured Songs cục bộ
            const qLower = query.toLowerCase();
            this.featuredSongs.forEach(s => {
                if (s.title.toLowerCase().includes(qLower) || s.artist.toLowerCase().includes(qLower)) {
                    candidates.push({
                        type: 'featured',
                        rawSong: s,
                        trackName: s.title,
                        artistName: s.artist,
                        albumName: 'Tuyển chọn MHEnt',
                        duration: s.duration,
                        hasSynced: true,
                        lang: s.lang
                    });
                }
            });

            // 2. Tìm kiếm trên LRCLIB API
            const lrclibUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
            const res = await fetch(lrclibUrl);
            if (res.ok) {
                const results = await res.json();
                if (Array.isArray(results)) {
                    results.forEach(r => {
                        // Tránh trùng lặp với featured
                        const isDup = candidates.some(c => 
                            c.trackName.toLowerCase() === r.trackName.toLowerCase() && 
                            c.artistName.toLowerCase() === r.artistName.toLowerCase()
                        );
                        if (!isDup) {
                            candidates.push({
                                type: 'lrclib',
                                lrclibData: r,
                                trackName: r.trackName,
                                artistName: r.artistName,
                                albumName: r.albumName || 'Single / Album',
                                duration: r.duration || 180,
                                hasSynced: !!r.syncedLyrics,
                                lang: this.detectLanguage(r.trackName + ' ' + (r.syncedLyrics || r.plainLyrics || ''))
                            });
                        }
                    });
                }
            }

            if (candidates.length === 0) {
                this.showToast(`Không tìm thấy bài hát nào cho từ khóa "${query}". Hãy thử gõ tên chuẩn tiếng Anh/Hàn/Nhật!`, 'warning');
                return;
            }

            // Mở Song Selection Modal để người dùng tự do lựa chọn phiên bản mong muốn
            this.openSongSelectModal(candidates, `Kết quả tìm kiếm cho "${query}"`, `Tìm thấy ${candidates.length} kết quả phù hợp. Hãy chọn bài hát bạn muốn học:`);

        } catch (err) {
            console.error('[Lyrics Hub] Lỗi tìm kiếm:', err);
            this.showToast(`Lỗi tìm kiếm: ${err.message}`, 'error');
        } finally {
            if (searchBtn) searchBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Tìm kiếm';
        }
    }

    openLibraryBrowser() {
        const candidates = this.featuredSongs.map(s => ({
            type: 'featured',
            rawSong: s,
            trackName: s.title,
            artistName: s.artist,
            albumName: 'Kho bài hát MHEnt',
            duration: s.duration,
            hasSynced: true,
            lang: s.lang
        }));

        this.openSongSelectModal(candidates, 'Kho Bài Hát Ngoại Ngữ Tuyển Chọn', 'Lựa chọn bài hát yêu thích có sẵn lời karaoke đồng bộ và phân tích từ vựng chuyên sâu');
    }

    openSongSelectModal(candidates, title, subtitle) {
        this.modalCandidates = candidates || [];
        this.modalFilter = 'all';
        this.modalSearchQuery = '';

        const modal = document.getElementById('song-select-modal');
        const titleEl = document.getElementById('song-select-modal-title');
        const subEl = document.getElementById('song-select-modal-subtitle');
        const searchInput = document.getElementById('song-select-search-input');

        if (titleEl && title) titleEl.textContent = title;
        if (subEl && subtitle) subEl.textContent = subtitle;
        if (searchInput) searchInput.value = '';

        // Reset filter pills
        document.querySelectorAll('.song-modal-pill').forEach(p => {
            p.classList.toggle('active', p.getAttribute('data-filter') === 'all');
        });

        this.renderSongSelectList();

        if (modal) modal.classList.add('active');
    }

    closeSongSelectModal() {
        const modal = document.getElementById('song-select-modal');
        if (modal) modal.classList.remove('active');
    }

    setupSongSelectModalEvents() {
        const closeBtn = document.getElementById('song-select-close');
        const modal = document.getElementById('song-select-modal');
        const searchInput = document.getElementById('song-select-search-input');
        const pillsWrap = document.getElementById('song-select-pills');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeSongSelectModal());
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeSongSelectModal();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.modalSearchQuery = e.target.value.toLowerCase().trim();
                this.renderSongSelectList();
            });
        }

        if (pillsWrap) {
            pillsWrap.querySelectorAll('.song-modal-pill').forEach(pill => {
                pill.addEventListener('click', () => {
                    pillsWrap.querySelectorAll('.song-modal-pill').forEach(p => p.classList.remove('active'));
                    pill.classList.add('active');
                    this.modalFilter = pill.getAttribute('data-filter') || 'all';
                    this.renderSongSelectList();
                });
            });
        }
    }

    renderSongSelectList() {
        const listContainer = document.getElementById('song-select-list');
        if (!listContainer) return;

        let filtered = this.modalCandidates;

        // Lọc theo text search
        if (this.modalSearchQuery) {
            filtered = filtered.filter(item => 
                item.trackName.toLowerCase().includes(this.modalSearchQuery) ||
                item.artistName.toLowerCase().includes(this.modalSearchQuery) ||
                item.albumName.toLowerCase().includes(this.modalSearchQuery)
            );
        }

        // Lọc theo filter pills
        if (this.modalFilter === 'synced') {
            filtered = filtered.filter(item => item.hasSynced);
        } else if (this.modalFilter !== 'all') {
            filtered = filtered.filter(item => item.lang === this.modalFilter);
        }

        if (filtered.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; color: #94a3b8; padding: 40px;">
                    <i class="fa-solid fa-compact-disc fa-spin" style="font-size: 2rem; margin-bottom: 12px; opacity: 0.5;"></i>
                    <p>Không có bài hát nào khớp với bộ lọc hiện tại.</p>
                </div>
            `;
            return;
        }

        const langMap = { en: '🇬🇧 EN', ko: '🇰🇷 KO', ja: '🇯🇵 JA', zh: '🇨🇳 ZH' };

        listContainer.innerHTML = filtered.map((item, idx) => {
            const durationStr = this.formatSeconds(item.duration);
            const isFeatured = item.type === 'featured';

            return `
                <div class="song-select-item" onclick="window.lyricsApp.selectCandidateByIndex(${idx})">
                    <div class="song-item-cover-wrap">
                        <i class="fa-solid fa-music song-item-cover-icon"></i>
                        <span class="song-item-lang-pill">${langMap[item.lang] || '🌐 ALL'}</span>
                    </div>

                    <div class="song-item-info">
                        <div class="song-item-title-row">
                            <span class="song-item-title">${this.escapeHtml(item.trackName)}</span>
                            ${isFeatured ? '<span class="badge-featured"><i class="fa-solid fa-star"></i> Tuyển chọn</span>' : ''}
                        </div>
                        <div class="song-item-artist">
                            <i class="fa-solid fa-microphone"></i> ${this.escapeHtml(item.artistName)}
                        </div>
                        <div class="song-item-meta">
                            <span><i class="fa-solid fa-record-vinyl"></i> ${this.escapeHtml(item.albumName)}</span>
                            <span><i class="fa-solid fa-clock"></i> ${durationStr}</span>
                        </div>
                    </div>

                    <div class="song-item-action">
                        ${item.hasSynced ? 
                            '<span class="badge-karaoke"><i class="fa-solid fa-bolt"></i> Có Karaoke</span>' : 
                            '<span class="badge-plain"><i class="fa-solid fa-align-left"></i> Lời thường</span>'}
                        <button type="button" class="btn-item-pick">
                            <i class="fa-solid fa-play"></i> Học ngay
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    async selectCandidateByIndex(idx) {
        // Lấy danh sách đang lọc
        let filtered = this.modalCandidates;
        if (this.modalSearchQuery) {
            filtered = filtered.filter(item => 
                item.trackName.toLowerCase().includes(this.modalSearchQuery) ||
                item.artistName.toLowerCase().includes(this.modalSearchQuery) ||
                item.albumName.toLowerCase().includes(this.modalSearchQuery)
            );
        }
        if (this.modalFilter === 'synced') {
            filtered = filtered.filter(item => item.hasSynced);
        } else if (this.modalFilter !== 'all') {
            filtered = filtered.filter(item => item.lang === this.modalFilter);
        }

        const candidate = filtered[idx];
        if (!candidate) return;

        this.closeSongSelectModal();

        if (candidate.type === 'featured' && candidate.rawSong) {
            this.loadSong(candidate.rawSong);
            this.showToast(`Đang tải bài hát: ${candidate.trackName}`, 'success');
            return;
        }

        // Xử lý bài hát từ LRCLIB
        const item = candidate.lrclibData;
        if (!item) return;

        this.showToast(`Đang bóc tách lời bài hát & phân tích từ vựng: ${item.trackName}...`, 'info', 3000);

        try {
            const parsedLyrics = this.parseLrc(item.syncedLyrics || item.plainLyrics || '');
            const detectedLang = candidate.lang || this.detectLanguage(item.trackName + ' ' + (item.syncedLyrics || ''));

            // Phân tích từ vựng nâng cao qua AISA AI
            const endpoint = (window.MHENT_CONFIG && window.MHENT_CONFIG.AISA_API_ENDPOINT) || 'https://api.mhentuniverse.com';
            let enrichedLyrics = parsedLyrics;

            try {
                const analyzeRes = await fetch(`${endpoint}/api/analyze-lyrics`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lines: parsedLyrics.slice(0, 40),
                        lang: detectedLang,
                        title: item.trackName,
                        artist: item.artistName
                    })
                });

                if (analyzeRes.ok) {
                    const analyzeData = await analyzeRes.json();
                    if (analyzeData && Array.isArray(analyzeData.data)) {
                        enrichedLyrics = analyzeData.data;
                    }
                }
            } catch (aiErr) {
                console.warn('[Lyrics Hub] AISA AI bóc tách từ vựng ngầm lỗi (dùng bản gốc):', aiErr);
            }

            const newSong = {
                id: (item.trackName + '-' + item.artistName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                title: item.trackName,
                artist: item.artistName,
                lang: detectedLang,
                thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=60',
                duration: item.duration || 180,
                synced_lyrics: enrichedLyrics,
                plain_lyrics: item.plainLyrics || '',
                views: 1,
                created_by: 'AISA AI Autosearch',
                community_versions: []
            };

            // Lưu vào Supabase Cloud để đồng bộ cho toàn bộ học viên
            if (window.studyCloud && typeof window.studyCloud.saveSong === 'function') {
                window.studyCloud.saveSong(newSong).catch(e => console.warn('Lưu Supabase ngầm:', e));
            }

            this.loadSong(newSong);
            this.showToast(`Sẵn sàng học bài hát: ${newSong.title}!`, 'success');

        } catch (err) {
            console.error('[Lyrics Hub] Lỗi nạp bài hát đã chọn:', err);
            this.showToast(`Không thể nạp bài hát: ${err.message}`, 'error');
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
    // 8. ĐÓNG GÓP BẢN DỊCH CỘNG ĐỒNG (COMMUNITY CONTRIBUTIONS)
    // =========================================================================
    async submitCommunityVersion() {
        if (!this.currentSong) return;

        const authorName = (document.getElementById('contrib-author').value || 'Học viên MHEnt').trim();
        const versionTitle = (document.getElementById('contrib-title').value || 'Bản dịch mới').trim();
        const note = (document.getElementById('contrib-note').value || '').trim();

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

        const modal = document.getElementById('contrib-modal');
        if (modal) modal.classList.remove('active');

        this.switchVersion(this.currentSong.community_versions.length - 1);
        this.showToast('Đã lưu đóng góp bản dịch của bạn lên Supabase Cloud!', 'success');
    }

    // =========================================================================
    // 9. TOAST NOTIFICATIONS HỆ THỐNG (NO BROWSER ALERT)
    // =========================================================================
    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('study-toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `study-toast ${type}`;

        const iconMap = {
            success: 'fa-circle-check',
            error: 'fa-circle-exclamation',
            warning: 'fa-triangle-exclamation',
            info: 'fa-circle-info'
        };
        const iconClass = iconMap[type] || 'fa-circle-info';

        toast.innerHTML = `
            <i class="fa-solid ${iconClass}"></i>
            <span class="study-toast-msg">${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 400);
        }, duration);
    }

    // =========================================================================
    // 10. DANH SÁCH BÀI HÁT MẪU ĐƯỢC TUYỂN CHỌN (SHOWCASE)
    // =========================================================================
    initFeaturedSongs() {
        return [
            {
                id: 'until-i-found-you-stephen-sanchez',
                title: 'Until I Found You',
                artist: 'Stephen Sanchez',
                lang: 'en',
                youtube_id: 'GxldQ9eX2wo',
                thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60',
                audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                duration: 176,
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
                youtube_id: 'xEeFrLSkMm8',
                thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=60',
                audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                duration: 274,
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
                youtube_id: 'SX_ViT4Ra7k',
                thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=60',
                audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                duration: 255,
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
                youtube_id: 'Z8Mqw0b9ADs',
                thumbnail: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop&q=60',
                audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                duration: 239,
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
