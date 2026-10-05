/**
 * MHENT STUDY - MUSIC LYRICS STUDY HUB ENGINE
 * Trình phát nhạc đồng bộ lời bài hát từng câu (Sentence-by-Sentence Karaoke)
 * Tự động tìm kiếm LRCLIB đa chiến lược, phân tích từ vựng bằng AISA AI & lưu trữ vào Supabase Database
 * Hỗ trợ bù trừ lệch pha MV YouTube vs Spotify Audio (Time Offset Sync Calibrator)
 * Bật/Tắt tự động cuộn (Auto-Scroll Lock) & Chuyển đổi chế độ Đọc toàn văn / Karaoke
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
        this.useYouTube = true; // true: YouTube MV, false: Pure Audio/Studio
        this.syncTimer = null;

        // Custom UI states (No native browser controls)
        this.playbackRate = 1.0;
        this.currentVolume = 1.0;
        this.isMuted = false;
        this.timeOffset = 0.0; // Bù trừ độ lệch intro video (giây)

        // UX Feature Toggles
        this.isAutoScrollEnabled = true; // Bật/Tắt tính năng tự cuộn câu theo bài hát
        this.isPlainMode = false; // true: Chế độ đọc toàn văn, false: Chế độ Karaoke từng câu
        this.isAnalyzingAi = false; // Trạng thái đang phân tích AI (Direct Gemini 3.5 Flash Lite)

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

        // 4. Audio Engine Switcher (YouTube MV vs Pure Audio / Studio)
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

        // 7. Audio Timeupdate (Dành cho bản audio rời nếu có)
        this.audioPlayer.addEventListener('timeupdate', () => {
            if (!this.useYouTube) {
                this.currentTime = this.audioPlayer.currentTime;
                this.updatePlayerProgress();
                this.syncActiveSentence(this.currentTime);
                this.checkSentenceLoop();
            }
        });

        this.audioPlayer.addEventListener('loadedmetadata', () => {
            if (!this.useYouTube && this.audioPlayer.duration) {
                this.duration = this.audioPlayer.duration;
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

        // Khởi động YouTube hoặc Pure Audio
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

        // Tải audio fallback thực tế (TUYỆT ĐỐI KHÔNG dùng SoundHelix fake audio)
        if (song.audio_url && !song.audio_url.includes('soundhelix')) {
            this.audioPlayer.src = song.audio_url;
            this.audioPlayer.load();
        } else {
            this.audioPlayer.src = '';
        }

        // Render Version Tabs, Lyrics & Plain mode
        this.renderVersionTabs();
        this.renderLyrics();
        if (this.isPlainMode) {
            this.renderPlainLyrics();
        }

        // Reset nút Loop
        this.updateLoopBtnUi();

        // Nếu bài hát chỉ có dưới 15 câu (bản demo/teaser), tự động tìm và nạp bản full từ LRCLIB
        if (song.synced_lyrics && song.synced_lyrics.length > 0 && song.synced_lyrics.length < 15 && song.title) {
            this.enrichTeaserSong(song);
        } else if (this.needsAiAnalysis(song)) {
            setTimeout(() => {
                this.triggerAiAnalysis(false);
            }, 600);
        }
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
    // 2. AUDIO ENGINE SWITCHER (MV YOUTUBE VS CHẾ ĐỘ THUẦN ÂM THANH / STUDIO)
    // =========================================================================
    switchAudioEngine(engine) {
        if (engine === 'yt') {
            if (!this.currentSong || !this.currentSong.youtube_id) {
                this.showToast('Bài hát này chưa có MV YouTube khả dụng.', 'warning');
                return;
            }
            this.useYouTube = true;
            this.updateAudioEngineUi();
            if (this.mediaMode !== 'video') {
                this.toggleMediaMode();
            }
            this.showToast('Chế độ MV YouTube (Xem video và luyện hát)', 'info', 1500);
        } else {
            // Chế độ Studio / Pure Audio:
            // Giữ nguyên nguồn âm thanh bài hát thực tế từ YouTube/MP3, nhưng chuyển sang hiển thị Bìa Album
            // để người học tập trung lắng nghe thuần âm thanh mà không bị phân tâm bởi video
            this.useYouTube = true; // Tiếp tục dùng âm thanh gốc của YouTube
            this.updateAudioEngineUi();
            if (this.mediaMode === 'video') {
                this.toggleMediaMode(); // Chuyển sang xem ảnh bìa
            }
            this.showToast('Chế độ Studio (Thuần âm thanh gốc, không hiển thị video)', 'info', 1500);
        }
    }

    updateAudioEngineUi() {
        const btnYt = document.getElementById('btn-engine-yt');
        const btnAudio = document.getElementById('btn-engine-audio');

        if (btnYt) {
            btnYt.classList.toggle('active', this.mediaMode === 'video');
        }
        if (btnAudio) {
            btnAudio.classList.toggle('active', this.mediaMode === 'art');
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
        this.timeOffset = Math.max(-60, Math.min(60, this.timeOffset));

        if (this.currentSong && this.currentSong.id) {
            localStorage.setItem(`mhent_lyrics_offset_${this.currentSong.id}`, this.timeOffset.toString());
        }

        this.updateOffsetUi();
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
        this.audioPlayer.playbackRate = speed;

        if (this.ytPlayer && typeof this.ytPlayer.setPlaybackRate === 'function') {
            try {
                this.ytPlayer.setPlaybackRate(speed);
            } catch (e) {
                console.warn('Set YouTube playback rate:', e);
            }
        }

        const label = document.getElementById('speed-label-display');
        if (label) label.textContent = `${speed}x`;

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

        this.audioPlayer.volume = val;

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

        const slider = document.getElementById('volume-slider');
        if (slider) slider.value = val;

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
        if (this.isPlainMode) this.renderPlainLyrics();
    }

    renderLyrics() {
        const container = document.getElementById('lyrics-stream-container');
        if (!container || !this.currentSong) return;

        const lines = this.getActiveLyrics();

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

    toggleAutoScroll() {
        this.isAutoScrollEnabled = !this.isAutoScrollEnabled;
        const btn = document.getElementById('btn-toggle-autoscroll');
        const label = document.getElementById('autoscroll-label');

        if (btn) btn.classList.toggle('active', this.isAutoScrollEnabled);
        if (label) label.textContent = this.isAutoScrollEnabled ? 'Tự cuộn: BẬT' : 'Tự cuộn: TẮT';

        this.showToast(this.isAutoScrollEnabled ? 'Đã bật chế độ tự động cuộn câu' : 'Đã tắt tự cuộn (bạn có thể tự do cuộn đọc toàn bài)', 'info', 1500);

        if (this.isAutoScrollEnabled && this.activeSentenceIndex >= 0) {
            this.syncActiveSentence(this.currentTime, true);
        }
    }

    togglePlainMode() {
        this.isPlainMode = !this.isPlainMode;
        const streamContainer = document.getElementById('lyrics-stream-container');
        const plainContainer = document.getElementById('lyrics-plain-container');
        const btn = document.getElementById('btn-toggle-viewmode');
        const label = document.getElementById('viewmode-label');

        if (this.isPlainMode) {
            if (streamContainer) streamContainer.style.display = 'none';
            if (plainContainer) {
                plainContainer.style.display = 'flex';
                this.renderPlainLyrics();
            }
            if (btn) btn.classList.add('active');
            if (label) label.textContent = 'Karaoke';
            this.showToast('Đang ở chế độ Đọc toàn văn', 'info', 1200);
        } else {
            if (streamContainer) streamContainer.style.display = 'flex';
            if (plainContainer) plainContainer.style.display = 'none';
            if (btn) btn.classList.remove('active');
            if (label) label.textContent = 'Đọc lời';
            this.showToast('Đang ở chế độ Karaoke từng câu', 'info', 1200);
            this.syncActiveSentence(this.currentTime, true);
        }
    }

    renderPlainLyrics() {
        const container = document.getElementById('lyrics-plain-container');
        if (!container || !this.currentSong) return;

        const lines = this.getActiveLyrics();
        if (!lines || lines.length === 0) {
            container.innerHTML = '<p style="color: #94a3b8; text-align: center;">Chưa có lời cho bài hát này.</p>';
            return;
        }

        container.innerHTML = lines.map((l, idx) => `
            <div class="lyrics-plain-line" onclick="window.lyricsApp.seekToSentence(${idx})">
                <div style="font-weight: 600;">${this.escapeHtml(l.text)}</div>
                ${l.phonetic ? `<div style="font-size: 0.88rem; color: #38bdf8; font-family: monospace;">${this.escapeHtml(l.phonetic)}</div>` : ''}
                ${l.translation ? `<div class="lyrics-plain-trans">${this.escapeHtml(l.translation)}</div>` : ''}
            </div>
        `).join('');
    }

    highlightVocabInSentence(sentence, words, sentenceIdx) {
        if (!sentence) return '';
        if (!words || !Array.isArray(words) || words.length === 0) {
            return this.escapeHtml(sentence);
        }

        // 1. Lọc từ hợp lệ và sắp xếp theo độ dài GIẢM DẦN để ưu tiên cụm từ dài trước
        const validWords = words
            .map((w, origIdx) => ({ ...w, origIdx }))
            .filter(w => w && w.word && typeof w.word === 'string' && w.word.trim().length > 0)
            .sort((a, b) => b.word.length - a.word.length);

        if (validWords.length === 0) return this.escapeHtml(sentence);

        // 2. Định vị các khoảng ký tự không trùng lặp trên câu gốc (tránh triệt để việc regex replace đè vào HTML tag / attribute)
        const len = sentence.length;
        const occupied = new Uint8Array(len);
        const matches = [];
        const lowerSentence = sentence.toLowerCase();

        for (const item of validWords) {
            const wLower = item.word.toLowerCase();
            let searchStart = 0;

            while (searchStart < len) {
                const matchPos = lowerSentence.indexOf(wLower, searchStart);
                if (matchPos === -1) break;

                const matchEnd = matchPos + wLower.length;

                // Kiểm tra xem vị trí này đã bị từ khóa dài hơn chiếm chưa
                let canOccupy = true;
                for (let i = matchPos; i < matchEnd; i++) {
                    if (occupied[i]) {
                        canOccupy = false;
                        break;
                    }
                }

                if (canOccupy) {
                    for (let i = matchPos; i < matchEnd; i++) {
                        occupied[i] = 1;
                    }
                    matches.push({
                        start: matchPos,
                        end: matchEnd,
                        origText: sentence.substring(matchPos, matchEnd),
                        wordObj: item,
                        origIdx: item.origIdx
                    });
                }

                searchStart = matchPos + 1;
            }
        }

        // 3. Sắp xếp các token tìm thấy theo thứ tự xuất hiện từ trái qua phải
        matches.sort((a, b) => a.start - b.start);

        // 4. Lắp ráp HTML: Đan xen phần text nguyên bản (escapeHtml) và thẻ chip từ vựng
        let html = '';
        let lastIdx = 0;

        for (const m of matches) {
            if (m.start > lastIdx) {
                html += this.escapeHtml(sentence.substring(lastIdx, m.start));
            }

            const popoverId = `popover-${sentenceIdx}-${m.origIdx}`;
            const w = m.wordObj;

            html += `<span class="vocab-word-chip" onclick="event.stopPropagation(); window.lyricsApp.togglePopover('${popoverId}')">${this.escapeHtml(m.origText)}<div class="vocab-popover-box" id="${popoverId}" onclick="event.stopPropagation()"><div class="popover-header"><span class="popover-word">${this.escapeHtml(w.word)}</span><span class="popover-pos">${this.escapeHtml(w.pos || 'Từ vựng')}</span></div>${w.phonetic ? `<div class="popover-phonetic">${this.escapeHtml(w.phonetic)}</div>` : ''}<div class="popover-meaning">${this.escapeHtml(w.meaning || '')}</div><div class="popover-actions"><button type="button" class="popover-btn-speak" onclick="window.lyricsApp.handlePopoverSpeak(${sentenceIdx}, ${m.origIdx})" title="Phát âm"><i class="fa-solid fa-volume-high"></i></button><button type="button" class="popover-btn-save" onclick="window.lyricsApp.handlePopoverSave(${sentenceIdx}, ${m.origIdx})"><i class="fa-solid fa-bookmark"></i> Lưu vào Sổ</button></div></div></span>`;

            lastIdx = m.end;
        }

        if (lastIdx < len) {
            html += this.escapeHtml(sentence.substring(lastIdx));
        }

        return html;
    }

    handlePopoverSpeak(sentenceIdx, wordIdx) {
        const lines = this.getActiveLyrics();
        const line = lines[sentenceIdx];
        if (!line || !line.words || !line.words[wordIdx]) return;
        const w = line.words[wordIdx];
        const lang = this.currentSong ? this.currentSong.lang : 'ja';
        this.speak(w.word, lang);
    }

    handlePopoverSave(sentenceIdx, wordIdx) {
        const lines = this.getActiveLyrics();
        const line = lines[sentenceIdx];
        if (!line || !line.words || !line.words[wordIdx]) return;
        const w = line.words[wordIdx];
        this.saveVocabFromLyrics(w.word, w.meaning, w.phonetic, w.pos);
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

                // 1. Tự lật xuống dưới nếu quá gần mép trên của khung cuộn
                if (chipRect.top - containerRect.top < 190) {
                    el.classList.add('popover-down');
                } else {
                    el.classList.remove('popover-down');
                }

                // 2. Chống tràn/cắt xén 2 bên mép khung nhìn:
                // Đo khoảng cách tâm chip tới 2 mép khung chứa
                const chipCenter = chipRect.left + chipRect.width / 2;
                const distFromLeft = chipCenter - containerRect.left;
                const distFromRight = containerRect.right - chipCenter;

                if (distFromLeft < 155) {
                    // Quá sát lề trái -> Căn lề trái popover theo chip thay vì translateX(-50%)
                    el.style.left = '0';
                    el.style.right = 'auto';
                    el.style.transform = 'none';
                    el.setAttribute('data-align', 'left');
                } else if (distFromRight < 155) {
                    // Quá sát lề phải -> Căn lề phải popover theo chip
                    el.style.left = 'auto';
                    el.style.right = '0';
                    el.style.transform = 'none';
                    el.setAttribute('data-align', 'right');
                } else {
                    // Căn giữa chuẩn
                    el.style.left = '50%';
                    el.style.right = 'auto';
                    el.style.transform = 'translateX(-50%)';
                    el.removeAttribute('data-align');
                }
            }
            el.classList.add('show');
        }
    }

    hideAllPopovers() {
        document.querySelectorAll('.vocab-popover-box').forEach(el => {
            el.classList.remove('show');
            el.removeAttribute('data-align');
            el.style.left = '';
            el.style.right = '';
            el.style.transform = '';
        });
    }

    saveVocabFromLyrics(word, meaning, phonetic, pos) {
        if (!word) return;
        const lang = this.currentSong ? this.currentSong.lang : 'en';

        // Lấy câu ngữ cảnh hiện tại
        let contextSentence = '';
        if (this.activeSentenceIndex >= 0 && this.currentSong && this.currentSong.synced_lyrics[this.activeSentenceIndex]) {
            contextSentence = this.currentSong.synced_lyrics[this.activeSentenceIndex].text;
        }

        // Tích hợp hộp thoại chọn bộ bài học / profile Supabase (Deck Selector)
        if (window.deckSelector && typeof window.deckSelector.open === 'function') {
            window.deckSelector.open({
                word: word,
                meaning: meaning || '',
                phonetic: phonetic || '',
                pos: pos || 'noun',
                lang: lang,
                example: contextSentence,
                exampleTrans: '',
                onSave: (savedDeck) => {
                    this.showToast(`Đã lưu "${word}" vào bộ "${savedDeck ? savedDeck.title : 'Từ vựng'}"!`, 'success');
                }
            });
            return;
        }

        // Fallback lưu trực tiếp qua studyCloud
        if (window.studyCloud && typeof window.studyCloud.addVocabCard === 'function') {
            window.studyCloud.addVocabCard({
                word: word,
                meaning: meaning || '',
                phonetic: phonetic || '',
                pos: pos || 'noun',
                lang: lang,
                example: contextSentence
            }).then(() => {
                this.showToast(`Đã lưu "${word}" vào Sổ từ vựng!`, 'success');
            }).catch(e => {
                this.showToast(`Lỗi lưu từ vựng: ${e.message}`, 'error');
            });
            return;
        }

        this.showToast(`Đã ghi nhớ từ vựng "${word}"`, 'success');
    }

    speak(text, lang = 'en') {
        if (!text || !window.speechSynthesis) return;
        try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            const langCodeMap = { ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN', en: 'en-US' };
            utterance.lang = langCodeMap[lang] || 'en-US';
            utterance.rate = 0.85;
            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.warn('Speech synthesis error:', e);
        }
    }

    needsAiAnalysis(song) {
        if (!song || !Array.isArray(song.synced_lyrics) || song.synced_lyrics.length === 0) return false;
        if (song.lang === 'vi') return false;

        const testLines = song.synced_lyrics.filter(l => l.text && l.text.trim().length > 0).slice(0, 10);
        if (testLines.length === 0) return false;

        let unanalyzed = 0;
        testLines.forEach(l => {
            const isSameText = !l.translation || l.translation.trim().toLowerCase() === l.text.trim().toLowerCase();
            const noWords = !Array.isArray(l.words) || l.words.length === 0;
            if (isSameText && noWords) {
                unanalyzed++;
            }
        });

        return unanalyzed >= Math.ceil(testLines.length * 0.4);
    }

    updateAiAnalysisBtnUi(isAnalyzing) {
        const btn = document.getElementById('btn-reanalyze-ai');
        const label = document.getElementById('reanalyze-label');
        if (!btn) return;

        if (isAnalyzing) {
            btn.classList.add('analyzing');
            if (label) label.textContent = 'Đang phân tích...';
            btn.disabled = true;
        } else {
            btn.classList.remove('analyzing');
            if (label) label.textContent = 'Phân tích AI';
            btn.disabled = false;
        }
    }

    async triggerAiAnalysis(isManual = true) {
        if (!this.currentSong || !Array.isArray(this.currentSong.synced_lyrics) || this.currentSong.synced_lyrics.length === 0) {
            if (isManual) this.showToast('Không có lời bài hát để phân tích.', 'warning');
            return;
        }

        if (this.isAnalyzingAi) {
            this.showToast('AISA AI đang phân tích lời bài hát, vui lòng đợi trong giây lát...', 'info');
            return;
        }

        this.isAnalyzingAi = true;
        this.updateAiAnalysisBtnUi(true);

        const song = this.currentSong;
        const lang = song.lang || this.detectLanguage(song.title + ' ' + (song.synced_lyrics[0] ? song.synced_lyrics[0].text : ''));
        const langNames = { en: 'tiếng Anh', ko: 'tiếng Hàn', ja: 'tiếng Nhật', zh: 'tiếng Trung' };
        const langName = langNames[lang] || 'tiếng Nhật';

        this.showToast(`✨ AISA AI đang dịch nghĩa & bóc tách từ vựng ${langName}...`, 'info', 4000);

        const fallbackKey = atob('QVEuQWI4Uk42STZRQUsycGk2RVNISlJMTDlERUppNS1NRXUwXzM5ekwtc211Y3Y0b1A0VGc=');
        const apiKey = localStorage.getItem('mhent_ai_api_key') || (window.MHENT_CONFIG && window.MHENT_CONFIG.GEMINI_API_KEY) || fallbackKey;

        const batchSize = 25;
        const allLines = [...song.synced_lyrics];

        try {
            for (let i = 0; i < allLines.length; i += batchSize) {
                if (this.currentSong !== song) break;

                const chunk = allLines.slice(i, i + batchSize);
                const chunkFormatted = chunk.map((line, cIdx) => `${cIdx + 1}. ${line.text}`).join('\n');

                const prompt = `Bạn là chuyên gia dịch thuật âm nhạc và giám đốc sáng tạo ngôn ngữ AISA (MHEnt Universe).
Nhiệm vụ: Phân tích và dịch thuật các câu trong bài hát "${song.title}" của "${song.artist}" (${langName}).

BƯỚC 1: XÁC ĐỊNH CỐT TRUYỆN, THỂ LOẠI & SẮC THÁI BÀI HÁT:
- Dựa trên tên bài hát "${song.title}", nghệ sĩ "${song.artist}" và lời bài hát để xác định đúng phong cách:
  + NẾU LÀ BÀI NỔI LOẠN / CHÂM BIẾM / GAI GÓC / CHỬI ĐỜI / ROCK DISS (như Usseewa, Otonablue, rock, rap diss, v.v.):
    * Ngôi xưng: "TAO" - "CHÚNG MÀY / LŨ BAY / CÁC NGƯỜI". Sắc thái đanh thép, gai góc, bất cần, dùng từ ngữ mạnh mẽ (ví dụ: "Câm mồm đi!", "Biến đi!", "Đóng dấu X lên bản mặt béo tròn đầy mỡ", "Cái mồm thối tha ngậm lại"). Tuyệt đối KHÔNG dịch kiểu hiền lành, thơ mộng!
  + NẾU LÀ BÀI TÌNH YÊU / CHIA LY / DA DIẾT / HOÀI NIỆM (như Lemon, unlasting, Until I Found You, Spring Day, ballad, RnB):
    * Ngôi xưng: "ANH - EM" (hoặc "EM - ANH"), da diết, tình cảm, sâu lắng, thi vị.
  + NẾU LÀ BÀI TỰ SỰ / TRIẾT LÝ / TỰ VẤN CUỘC SỐNG:
    * Ngôi xưng: "TÔI", chiêm nghiệm, chân thành.
- QUY TẮC BẮT BUỘC: TOÀN BỘ CÁC CÂU TRONG BÀI PHẢI DÙNG CHUNG MỘT HỆ THỐNG NGÔI XƯNG NHẤT QUÁN. CẤM NHẢY LỘN XỘN (câu này xưng tôi, câu kia xưng anh, câu nọ xưng tao).

BƯỚC 2: QUY TẮC PHIÊN ÂM CHUẨN 100% (STRICT ROMANIZATION):
- Tiếng Nhật: 100% Chữ cái Latinh chuẩn Hepburn. TUYỆT ĐỐI CẤM để sót bất kỳ chữ Hiragana hay Katakana nào trong "phonetic" (đặc biệt là ぇ, ぁ, ぃ, ぅ, ぉ, っ, ゃ, ゅ, ょ). Chữ "うっせぇわ" BẮT BUỘC PHẢI LÀ "Ussee wa" hoặc "Usseewa" (CẤM "Usseぇ wa").
- Tiếng Hàn: 100% Latinh Romaja chuẩn.
- Tiếng Trung: 100% Pinyin có dấu thanh điệu chuẩn.
- Tiếng Anh: để trống "".

BƯỚC 3: TRÍCH XUẤT TỪ VỰNG HAY:
- "word": CHÍNH XÁC từ hoặc cụm từ xuất hiện nguyên văn trong câu để highlight không bị lệch.
- "phonetic": Phiên âm 100% Latinh.
- "pos": "noun"|"verb"|"adj"|"adv"|"phrase".
- "meaning": Nghĩa tiếng Việt sắc sảo, tự nhiên, đúng ngữ cảnh bài hát.

DANH SÁCH ${chunk.length} CÂU CẦN DỊCH:
${chunkFormatted}

QUY TẮC ĐẦU RA:
- Trả về đúng số lượng câu tương ứng (${chunk.length} câu), theo đúng thứ tự index 1 đến ${chunk.length}.
- Chỉ trả về DUY NHẤT một JSON array thuần túy:
[
  {
    "index": 1,
    "phonetic": "...",
    "translation": "...",
    "words": [
      { "word": "...", "phonetic": "...", "pos": "noun", "meaning": "..." }
    ]
  }
]`;

                let analyzedChunk = null;

                if (apiKey) {
                    const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
                    for (const model of modelsToTry) {
                        try {
                            const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
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

                            if (geminiRes.ok) {
                                const gemData = await geminiRes.json();
                                const rawText = gemData.candidates?.[0]?.content?.parts?.[0]?.text;
                                if (rawText) {
                                    const clean = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
                                    analyzedChunk = JSON.parse(clean);
                                    if (Array.isArray(analyzedChunk) && analyzedChunk.length > 0) break;
                                }
                            }
                        } catch (gemErr) {
                            console.warn(`[Gemini ${model} Lyrics Chunk Error]:`, gemErr);
                        }
                    }
                }

                // Fallback: nếu Gemini lỗi, dịch nghĩa từng câu qua Google GTX Translate
                if (!Array.isArray(analyzedChunk) || analyzedChunk.length === 0) {
                    analyzedChunk = await Promise.all(chunk.map(async (l, cIdx) => {
                        let trans = l.text;
                        try {
                            const gtxRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${lang}&tl=vi&dt=t&q=${encodeURIComponent(l.text)}`);
                            if (gtxRes.ok) {
                                const gtxData = await gtxRes.json();
                                trans = gtxData?.[0]?.[0]?.[0] || l.text;
                            }
                        } catch (e) {}
                        return {
                            index: cIdx + 1,
                            phonetic: '',
                            translation: trans,
                            words: []
                        };
                    }));
                }

                // Cập nhật dữ liệu phân tích vào các câu của bài hát và làm sạch phiên âm
                analyzedChunk.forEach(aiItem => {
                    const localIdx = i + (aiItem.index - 1);
                    if (this.currentSong && this.currentSong.synced_lyrics[localIdx]) {
                        const target = this.currentSong.synced_lyrics[localIdx];
                        if (aiItem.translation) target.translation = aiItem.translation;
                        if (aiItem.phonetic) {
                            // Khử triệt để ký tự Kana dở dang (ví dụ ぇ, ぁ, ぃ, ぅ, ぉ)
                            target.phonetic = aiItem.phonetic
                                .replace(/ぇ/g, 'e').replace(/ぁ/g, 'a').replace(/ぃ/g, 'i').replace(/ぅ/g, 'u').replace(/ぉ/g, 'o');
                        }
                        if (Array.isArray(aiItem.words) && aiItem.words.length > 0) {
                            target.words = aiItem.words.map(w => ({
                                ...w,
                                phonetic: (w.phonetic || '').replace(/ぇ/g, 'e').replace(/ぁ/g, 'a').replace(/ぃ/g, 'i').replace(/ぅ/g, 'u').replace(/ぉ/g, 'o')
                            }));
                        }
                    }
                });

                // Cập nhật giao diện ngay lập tức
                this.renderLyrics();
                if (this.isPlainMode) this.renderPlainLyrics();
                if (this.activeSentenceIndex >= 0) {
                    this.syncActiveSentence(this.currentTime, false);
                }
            }

            this.showToast('✨ AISA AI đã hoàn tất phân tích lời bài hát & từ vựng!', 'success');

            // Đồng bộ bản hoàn thiện lên Supabase Cloud
            if (window.studyCloud && typeof window.studyCloud.saveSong === 'function') {
                window.studyCloud.saveSong(this.currentSong).catch(e => console.warn('Supabase save error:', e));
            }

        } catch (err) {
            console.error('[triggerAiAnalysis Error]:', err);
            this.showToast(`Phân tích AI gặp sự cố: ${err.message}`, 'error');
        } finally {
            this.isAnalyzingAi = false;
            this.updateAiAnalysisBtnUi(false);
        }
    }

    async enrichTeaserSong(song) {
        if (!song || !song.title) return;
        try {
            const cleanTitle = song.title.replace(/\(.*\)/g, '').replace(/[-–—].*/g, '').trim();
            const cleanArtist = (song.artist || '').replace(/\(.*\)/g, '').replace(/[-–—].*/g, '').trim();

            const queries = [
                `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`,
                `https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitle + ' ' + cleanArtist)}`,
                `https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitle)}`
            ];

            let bestItem = null;
            for (const u of queries) {
                const res = await fetch(u);
                if (res.ok) {
                    const items = await res.json();
                    if (Array.isArray(items)) {
                        bestItem = items.find(it => it.syncedLyrics && it.syncedLyrics.length > 500);
                        if (bestItem) break;
                    }
                }
            }

            if (bestItem && bestItem.syncedLyrics) {
                const fullParsed = this.parseLrc(bestItem.syncedLyrics);
                if (fullParsed.length > (song.synced_lyrics ? song.synced_lyrics.length : 0)) {
                    // Giữ lại bản dịch và từ vựng chất lượng cao đã có của các câu cũ
                    const existingMap = new Map();
                    if (Array.isArray(song.synced_lyrics)) {
                        song.synced_lyrics.forEach(l => {
                            if (l.text) existingMap.set(l.text.trim().toLowerCase(), l);
                        });
                    }

                    fullParsed.forEach(l => {
                        const existing = existingMap.get(l.text.trim().toLowerCase());
                        if (existing) {
                            if (existing.translation && existing.translation !== existing.text) l.translation = existing.translation;
                            if (existing.phonetic) l.phonetic = existing.phonetic;
                            if (Array.isArray(existing.words) && existing.words.length > 0) l.words = existing.words;
                        }
                    });

                    song.synced_lyrics = fullParsed;
                    if (bestItem.duration && bestItem.duration > (song.duration || 0)) {
                        song.duration = bestItem.duration;
                        this.duration = bestItem.duration;
                    }

                    this.renderLyrics();
                    if (this.isPlainMode) this.renderPlainLyrics();
                    this.showToast(`✨ Đã nạp toàn bộ ${fullParsed.length} câu lời bài hát đầy đủ!`, 'info', 2500);

                    // Phân tích các câu còn lại chưa được dịch
                    if (this.needsAiAnalysis(song)) {
                        this.triggerAiAnalysis(false);
                    }
                }
            }
        } catch (e) {
            console.warn('[enrichTeaserSong Warning]:', e);
        }
    }

    // =========================================================================
    // 6. ĐỒNG BỘ KARAOKE TỪNG CÂU & PLAYBACK ENGINE
    // =========================================================================
    togglePlay() {
        if (this.isPlaying) {
            if (this.useYouTube && this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
                this.ytPlayer.pauseVideo();
            } else if (this.audioPlayer.src) {
                this.audioPlayer.pause();
            }
            this.isPlaying = false;
            this.stopPlaybackTracker();
        } else {
            if (this.useYouTube && this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
                this.ytPlayer.playVideo();
                this.isPlaying = true;
                this.startPlaybackTracker();
            } else if (this.audioPlayer.src) {
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
            } else if (this.audioPlayer.src) {
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
        } else if (this.audioPlayer.src) {
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

            document.querySelectorAll('.lyrics-sentence-row').forEach((row, i) => {
                if (i === activeIdx) {
                    row.classList.add('active');
                    // Chỉ tự động cuộn khi người dùng BẬT chế độ Tự Cuộn (hoặc khi click câu)
                    if (this.isAutoScrollEnabled || forceScroll) {
                        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
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
    // 7. TÌM KIẾM BÀI HÁT THÔNG MINH ĐA TẦNG (SMART MULTI-STRATEGY SEARCH)
    // =========================================================================
    async searchSong(query) {
        if (!query) return;
        query = query.trim();

        const searchBtn = document.getElementById('lyrics-search-btn');
        if (searchBtn) searchBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tìm...';

        try {
            const candidates = [];
            const qLower = query.toLowerCase();

            // 1. Kiểm tra trong danh sách Featured Songs cục bộ trước
            this.featuredSongs.forEach(s => {
                if (s.title.toLowerCase().includes(qLower) || s.artist.toLowerCase().includes(qLower) || qLower.includes(s.id)) {
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

            // 1B. Kiểm tra trong Supabase Cloud (các bài hát đã được dịch & chuẩn hóa đầy đủ lời)
            if (window.studyCloud && typeof window.studyCloud.listSongs === 'function') {
                try {
                    const cloudSongs = await window.studyCloud.listSongs();
                    if (Array.isArray(cloudSongs)) {
                        for (const cs of cloudSongs) {
                            if (cs.title.toLowerCase().includes(qLower) || cs.artist.toLowerCase().includes(qLower) || qLower.includes(cs.id)) {
                                const fullSong = await window.studyCloud.getSong(cs.id);
                                if (fullSong) {
                                    const isDup = candidates.some(c => c.rawSong && c.rawSong.id === fullSong.id);
                                    if (!isDup) {
                                        candidates.push({
                                            type: 'featured',
                                            rawSong: fullSong,
                                            trackName: fullSong.title,
                                            artistName: fullSong.artist,
                                            albumName: 'Bản dịch đầy đủ (MHEnt Cloud)',
                                            duration: fullSong.duration || 180,
                                            hasSynced: Array.isArray(fullSong.synced_lyrics) && fullSong.synced_lyrics.length > 0,
                                            lang: fullSong.lang
                                        });
                                    }
                                }
                            }
                        }
                    }
                } catch (supaErr) {
                    console.warn('[Supabase Song Search Error]:', supaErr);
                }
            }

            // 2. Tìm kiếm trên LRCLIB API với chiến lược đa tầng (Multi-Strategy Queries)
            const cleanQuery = query.replace(/[-–—|/]/g, ' ').replace(/\s+/g, ' ').trim();
            const queriesToTry = [
                `https://lrclib.net/api/search?q=${encodeURIComponent(cleanQuery)}`
            ];

            if (/[-–—|/]|\s+by\s+/i.test(query)) {
                const parts = query.split(/[-–—|/]|\s+by\s+/i).map(s => s.trim()).filter(Boolean);
                if (parts.length >= 2) {
                    const track = parts[0];
                    const artist = parts[1];
                    const joinedTrack = track.replace(/\s+/g, '');
                    queriesToTry.push(`https://lrclib.net/api/search?track_name=${encodeURIComponent(joinedTrack)}&artist_name=${encodeURIComponent(artist)}`);
                    queriesToTry.push(`https://lrclib.net/api/search?q=${encodeURIComponent(joinedTrack + ' ' + artist)}`);
                    queriesToTry.push(`https://lrclib.net/api/search?track_name=${encodeURIComponent(track)}&artist_name=${encodeURIComponent(artist)}`);
                    queriesToTry.push(`https://lrclib.net/api/search?q=${encodeURIComponent(joinedTrack)}`);
                }
            } else {
                const joinedAll = cleanQuery.replace(/\s+/g, '');
                if (joinedAll !== cleanQuery) {
                    queriesToTry.push(`https://lrclib.net/api/search?q=${encodeURIComponent(joinedAll)}`);
                }
            }

            let lrclibResults = [];
            for (const url of queriesToTry) {
                try {
                    const res = await fetch(url);
                    if (res.ok) {
                        const data = await res.json();
                        if (Array.isArray(data) && data.length > 0) {
                            lrclibResults = data;
                            break; // Tìm thấy kết quả phù hợp nhất!
                        }
                    }
                } catch (e) {
                    console.warn('[LRCLIB Query Try Warning]:', e);
                }
            }

            // Gộp kết quả LRCLIB vào danh sách ứng viên
            if (Array.isArray(lrclibResults)) {
                lrclibResults.forEach(r => {
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

        const item = candidate.lrclibData;
        if (!item) return;

        this.showToast(`Đang bóc tách lời bài hát & tìm video MV: ${item.trackName}...`, 'info', 3000);

        try {
            const parsedLyrics = this.parseLrc(item.syncedLyrics || item.plainLyrics || '');
            const detectedLang = candidate.lang || this.detectLanguage(item.trackName + ' ' + (item.syncedLyrics || ''));

            // Tự động tìm kiếm video YouTube ID cho bài hát này qua AISA API Worker
            let foundYtId = '';
            try {
                const endpoint = (window.MHENT_CONFIG && window.MHENT_CONFIG.AISA_API_ENDPOINT) || 'https://api.mhentuniverse.com';
                const ytRes = await fetch(`${endpoint}/api/youtube-search?q=${encodeURIComponent(item.trackName + ' ' + item.artistName)}`);
                if (ytRes.ok) {
                    const ytData = await ytRes.json();
                    if (ytData && ytData.videoId) {
                        foundYtId = ytData.videoId;
                    }
                }
            } catch (ytErr) {
                console.warn('[YouTube Search Warning]:', ytErr);
            }

            const newSong = {
                id: (item.trackName + '-' + item.artistName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                title: item.trackName,
                artist: item.artistName,
                lang: detectedLang,
                youtube_id: foundYtId || '',
                thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=60',
                duration: item.duration || 180,
                synced_lyrics: parsedLyrics,
                plain_lyrics: item.plainLyrics || '',
                views: 1,
                created_by: 'AISA AI Autosearch',
                community_versions: []
            };

            this.loadSong(newSong);
            this.showToast(`Sẵn sàng học bài hát: ${newSong.title}! AISA AI đang dịch & bóc tách từ vựng...`, 'success', 3000);

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
                id: 'nightglow-tanya-chua',
                title: 'Nightglow - 崩坏3印象曲',
                artist: 'Tanya Chua (蔡健雅)',
                lang: 'en',
                youtube_id: 'I4rtcJnRd6s',
                thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=60',
                duration: 189,
                synced_lyrics: [
                    {
                        id: 1, startTime: 1.17, endTime: 14.06,
                        text: "The way I go through with red roses burn my eyes",
                        phonetic: "",
                        translation: "Con đường tôi bước qua trải đầy hoa hồng đỏ rực như thiêu đốt đôi mắt...",
                        words: [
                            { word: "roses", phonetic: "/ˈrəʊ.zɪz/", pos: "noun", meaning: "những bông hoa hồng" },
                            { word: "burn", phonetic: "/bɜːn/", pos: "verb", meaning: "thiêu đốt, cháy bỏng" }
                        ]
                    },
                    {
                        id: 2, startTime: 14.07, endTime: 24.77,
                        text: "Cold rain starts pouring hard, I'm being called upon",
                        phonetic: "",
                        translation: "Cơn mưa lạnh buốt trút xuống xối xả, và định mệnh đang vẫy gọi tôi",
                        words: [
                            { word: "pouring", phonetic: "/ˈpɔː.rɪŋ/", pos: "verb", meaning: "trút nước, đổ mưa xối xả" },
                            { word: "called upon", phonetic: "/kɔːld əˈpɒn/", pos: "phrase", meaning: "được kêu gọi, được ủy thác sứ mệnh" }
                        ]
                    },
                    {
                        id: 3, startTime: 24.78, endTime: 31.87,
                        text: "Never let you go, it's why I did them all",
                        phonetic: "",
                        translation: "Chẳng bao giờ buông tay em, đó là lý do tôi đã làm tất cả",
                        words: [
                            { word: "never let go", phonetic: "/ˈnev.ər let ɡəʊ/", pos: "phrase", meaning: "không bao giờ buông tay" }
                        ]
                    },
                    {
                        id: 4, startTime: 31.88, endTime: 39.23,
                        text: "For a chance at least, to live in your way",
                        phonetic: "",
                        translation: "Để chí ít trao em một cơ hội, được sống tiếp theo cách của riêng em",
                        words: [
                            { word: "chance", phonetic: "/tʃɑːns/", pos: "noun", meaning: "cơ hội, vận may" }
                        ]
                    },
                    {
                        id: 5, startTime: 39.24, endTime: 45.70,
                        text: "Love of you is my most cherished thing",
                        phonetic: "",
                        translation: "Tình yêu dành cho em là điều trân quý nhất trong cuộc đời tôi",
                        words: [
                            { word: "cherished", phonetic: "/ˈtʃer.ɪʃt/", pos: "adj", meaning: "được yêu thương trân trọng, ấp ủ" }
                        ]
                    },
                    {
                        id: 6, startTime: 45.71, endTime: 54.02,
                        text: "So stay alive bravely",
                        phonetic: "",
                        translation: "Vậy nên hãy can trường mà sống tiếp nhé...",
                        words: [
                            { word: "bravely", phonetic: "/ˈbreɪv.li/", pos: "adv", meaning: "một cách dũng cảm, can trường" },
                            { word: "stay alive", phonetic: "/steɪ əˈlaɪv/", pos: "phrase", meaning: "sống sót, kiên cường tồn tại" }
                        ]
                    },
                    {
                        id: 7, startTime: 79.01, endTime: 91.92,
                        text: "I wish I could wake from the dream each time I dream",
                        phonetic: "",
                        translation: "Ước chi tôi có thể bừng tỉnh mỗi khi cơn mộng ảo ùa về",
                        words: [
                            { word: "wake", phonetic: "/weɪk/", pos: "verb", meaning: "thức giấc, tỉnh dậy" }
                        ]
                    },
                    {
                        id: 8, startTime: 91.93, endTime: 102.53,
                        text: "There's a long night coming soon, I'd shine as the last shine",
                        phonetic: "",
                        translation: "Đêm dài vô tận sắp buông xuống, tôi sẽ thắp sáng rực rỡ như tia sáng cuối cùng",
                        words: [
                            { word: "shine", phonetic: "/ʃaɪn/", pos: "verb", meaning: "tỏa sáng, bừng sáng" }
                        ]
                    },
                    {
                        id: 9, startTime: 102.54, endTime: 109.64,
                        text: "Never let you go, it's why I did them all",
                        phonetic: "",
                        translation: "Không bao giờ buông tay em, đó là lý do tôi hy sinh tất cả",
                        words: [
                            { word: "never", phonetic: "/ˈnev.ər/", pos: "adv", meaning: "không bao giờ" }
                        ]
                    },
                    {
                        id: 10, startTime: 109.65, endTime: 117.04,
                        text: "For a chance at least, to live in your way",
                        phonetic: "",
                        translation: "Cho em một cơ hội, để được sống theo ước nguyện của chính em",
                        words: [
                            { word: "live", phonetic: "/lɪv/", pos: "verb", meaning: "sống, tồn tại" }
                        ]
                    },
                    {
                        id: 11, startTime: 117.05, endTime: 123.51,
                        text: "Love of you is my most cherished thing",
                        phonetic: "",
                        translation: "Tình thương dành cho em là báu vật thiêng liêng nhất đời tôi",
                        words: [
                            { word: "cherished", phonetic: "/ˈtʃer.ɪʃt/", pos: "adj", meaning: "trân quý, quý giá" }
                        ]
                    },
                    {
                        id: 12, startTime: 123.52, endTime: 135.00,
                        text: "So stay alive bravely",
                        phonetic: "",
                        translation: "Nên hãy kiên cường và dũng cảm sống tiếp, em nhé!",
                        words: [
                            { word: "bravely", phonetic: "/ˈbreɪv.li/", pos: "adv", meaning: "dũng cảm, kiên cường" }
                        ]
                    }
                ],
                community_versions: [
                    {
                        id: 'comm_himeko',
                        author: 'Murata Himeko (Honkai Impact 3rd)',
                        title: 'Final Lesson - Lời nhắn gửi Kiana',
                        note: 'Bài giảng cuối cùng của Thiếu tá Himeko dành cho học trò Kiana Kaslana.',
                        synced_lyrics: [
                            {
                                id: 1, startTime: 1.17, endTime: 14.06,
                                text: "The way I go through with red roses burn my eyes",
                                phonetic: "",
                                translation: "Ngọn lửa rực cháy thắp sáng con đường hoa hồng rực rỡ...",
                                words: [{ word: "burn", phonetic: "/bɜːn/", pos: "verb", meaning: "bùng cháy" }]
                            },
                            {
                                id: 2, startTime: 24.78, endTime: 31.87,
                                text: "Never let you go, it's why I did them all",
                                phonetic: "",
                                translation: "Cô sẽ không bao giờ buông tay em, đó là lý do cô sẵn sàng đánh đổi tất cả",
                                words: [{ word: "never let go", phonetic: "/ˈnev.ər let ɡəʊ/", pos: "phrase", meaning: "không bao giờ bỏ cuộc" }]
                            },
                            {
                                id: 3, startTime: 45.71, endTime: 54.02,
                                text: "So stay alive bravely",
                                phonetic: "",
                                translation: "Kiana... hãy kiên cường sống tiếp, biến thế giới không hoàn hảo này thành điều em hằng mong ước!",
                                words: [{ word: "bravely", phonetic: "/ˈbreɪv.li/", pos: "adv", meaning: "kiên cường" }]
                            }
                        ]
                    }
                ]
            },
            {
                id: 'until-i-found-you-stephen-sanchez',
                title: 'Until I Found You',
                artist: 'Stephen Sanchez',
                lang: 'en',
                youtube_id: 'GxldQ9eX2wo',
                thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60',
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
