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
        this.editingVersionId = null; // ID bản dịch đang chỉnh sửa
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
        this.setupContribVocabHighlighter();
        this.initSyncStudioEvents();

        // Tự động kiểm tra nếu có tham số URL ?song=... (Deep-linking)
        const urlParams = new URLSearchParams(window.location.search);
        const songParam = urlParams.get('song');
        if (songParam) {
            this.loadSongByParam(songParam);
        } else {
            // Mặc định nạp bài hát đầu tiên
            const defaultSong = this.featuredSongs[0];
            if (defaultSong) {
                this.loadSong(defaultSong);
            }
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
                this.closeChangeVideoModal();
                this.closeVersionsDrawer();
                this.closeContribModal();
                this.hideAllPopovers();
            }
        });

        // 12. Backdrop click for Change Video Modal & Versions Drawer
        const changeVideoModal = document.getElementById('change-video-modal');
        if (changeVideoModal) {
            changeVideoModal.addEventListener('click', (e) => {
                if (e.target === changeVideoModal) {
                    this.closeChangeVideoModal();
                }
            });
        }

        const versionsDrawer = document.getElementById('lyrics-versions-drawer');
        if (versionsDrawer) {
            versionsDrawer.addEventListener('click', (e) => {
                if (e.target === versionsDrawer) {
                    this.closeVersionsDrawer();
                }
            });
        }

        // 13. Community Modal bindings
        const contribBtn = document.getElementById('btn-open-contrib');
        const contribClose = document.getElementById('contrib-close');
        const contribForm = document.getElementById('contrib-form');

        if (contribBtn) {
            contribBtn.addEventListener('click', () => {
                this.openContribModal();
            });
        }

        if (contribClose) {
            contribClose.addEventListener('click', () => {
                this.closeContribModal();
            });
        }

        const btnFillCurrent = document.getElementById('btn-contrib-fill-current');
        if (btnFillCurrent) {
            btnFillCurrent.addEventListener('click', () => {
                const lines = this.getActiveLyrics();
                document.querySelectorAll('.contrib-line-trans-input').forEach(input => {
                    const idx = parseInt(input.dataset.index, 10);
                    if (!isNaN(idx) && lines[idx]) {
                        input.value = lines[idx].translation || '';
                    }
                });
                this.showToast('Đã điền lại bản dịch mẫu hiện tại', 'info', 1200);
            });
        }

        const btnClearAll = document.getElementById('btn-contrib-clear-all');
        if (btnClearAll) {
            btnClearAll.addEventListener('click', () => {
                document.querySelectorAll('.contrib-line-trans-input').forEach(input => {
                    input.value = '';
                });
                this.showToast('Đã xóa trắng các câu để bạn tự dịch', 'info', 1200);
            });
        }

        if (contribForm) {
            contribForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitCommunityVersion();
            });
        }

        const btnSyncStudio = document.getElementById('btn-open-sync-studio');
        if (btnSyncStudio) {
            btnSyncStudio.addEventListener('click', () => {
                this.openSyncStudioModal();
            });
        }

        const btnDictation = document.getElementById('btn-toggle-dictation');
        if (btnDictation) {
            btnDictation.addEventListener('click', () => {
                this.toggleDictationMode();
            });
        }

        // 14. Bôi đen văn bản / nhấp đúp từ trong lời bài hát để tra từ điển AI & lưu vào Sổ từ vựng
        this.setupLyricTextSelectionLookup();
    }

    setupLyricTextSelectionLookup() {
        const pill = document.getElementById('lyric-quick-lookup-pill');
        const pillText = document.getElementById('lookup-pill-text');
        const pillSearch = document.getElementById('lookup-pill-btn-search');
        const pillSave = document.getElementById('lookup-pill-btn-save');
        if (!pill) return;

        let currentSelectedWord = '';

        const handleSelection = () => {
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed) {
                pill.style.display = 'none';
                return;
            }

            const rawText = sel.toString().trim();
            if (!rawText || rawText.length > 50) {
                pill.style.display = 'none';
                return;
            }

            // Kiểm tra xem vùng chọn có nằm trong container lời bài hát không
            const anchorNode = sel.anchorNode;
            const container = document.getElementById('lyrics-stream-container') || document.getElementById('lyrics-plain-container');
            if (!container || !container.contains(anchorNode)) {
                pill.style.display = 'none';
                return;
            }

            currentSelectedWord = rawText;
            if (pillText) pillText.textContent = `Tra từ: "${rawText.length > 18 ? rawText.slice(0, 15) + '...' : rawText}"`;

            // Định vị pill ở ngay trên vùng chọn
            try {
                const range = sel.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                const left = rect.left + rect.width / 2;
                const top = Math.max(10, rect.top - 8);

                pill.style.left = `${left}px`;
                pill.style.top = `${top}px`;
                pill.style.display = 'flex';
            } catch (e) {
                pill.style.display = 'none';
            }
        };

        document.addEventListener('mouseup', () => {
            setTimeout(handleSelection, 60);
        });

        document.addEventListener('touchend', () => {
            setTimeout(handleSelection, 100);
        });

        // Ẩn pill khi click ra ngoài
        document.addEventListener('mousedown', (e) => {
            if (pill && !pill.contains(e.target)) {
                pill.style.display = 'none';
            }
        });

        const triggerSearchFromPill = (e) => {
            e.stopPropagation();
            if (!currentSelectedWord) return;
            pill.style.display = 'none';
            const lang = this.currentSong ? this.currentSong.lang : 'en';
            if (window.aisaDict && typeof window.aisaDict.open === 'function') {
                window.aisaDict.open(currentSelectedWord, lang);
            } else {
                this.showToast(`Đang tra cứu từ: "${currentSelectedWord}"...`, 'info');
            }
        };

        if (pillSearch) {
            pillSearch.addEventListener('click', triggerSearchFromPill);
        }
        pill.addEventListener('click', (e) => {
            if (!e.target.closest('#lookup-pill-btn-save')) {
                triggerSearchFromPill(e);
            }
        });

        if (pillSave) {
            pillSave.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!currentSelectedWord) return;
                pill.style.display = 'none';
                this.saveVocabFromLyrics(currentSelectedWord, 'Đang cập nhật nghĩa...', '', 'từ vựng');
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

        // Đồng bộ các bản dịch cộng đồng (Local Cache & Supabase Cloud)
        this.syncCommunityVersionsForSong(song);

        // Cập nhật thông tin bài hát
        const titleEl = document.getElementById('track-title');
        const artistEl = document.getElementById('track-artist');
        const artImg = document.getElementById('track-art-img');
        const langBadge = document.getElementById('track-lang-badge');

        if (titleEl) titleEl.textContent = song.title;
        if (artistEl) artistEl.textContent = song.artist;
        if (artImg) artImg.src = song.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60';

        const langMap = { en: 'Tiếng Anh', ko: 'Tiếng Hàn', ja: 'Tiếng Nhật', zh: 'Tiếng Trung', vi: 'Tiếng Việt' };
        if (langBadge) langBadge.textContent = langMap[song.lang] || 'Đa ngôn ngữ';

        // Tải độ lệch pha đã lưu cho bài hát này (Time Offset)
        this.loadOffsetForSong(song.id);

        // Luôn ưu tiên phát video YouTube làm chế độ mặc định trực quan nhất
        this.mediaMode = 'video';
        this.useYouTube = true;
        const artWrap = document.getElementById('track-art-wrap');
        const ytWrapper = document.getElementById('youtube-player-wrapper');
        const ytFrame = document.getElementById('youtube-player-frame');
        if (artWrap) artWrap.style.display = 'none';
        if (ytWrapper) ytWrapper.style.display = 'block';
        if (ytFrame) ytFrame.style.display = 'block';
        const toggleBtn = document.getElementById('btn-toggle-media');
        if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-solid fa-image"></i> <span>Xem Bìa</span>';

        // Tự động lưu vào danh sách bài hát tùy chỉnh cục bộ nếu có dữ liệu lời
        if (song && song.id && !this.featuredSongs.some(f => f.id === song.id)) {
            this.saveCustomSongToLocal(song);
        }

        // Khởi động YouTube hoặc tự động dò tìm Video MV
        if (song.youtube_id) {
            this.updateAudioEngineUi();
            if (this.isYtReady) {
                this.initYouTubePlayer(song.youtube_id);
            }
        } else {
            this.updateAudioEngineUi();
            this.autoFindYouTubeVideo(song);
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

        // Cập nhật Deep-link URL, Title trình duyệt và SEO Schema.org JSON-LD
        this.updatePageMetaAndUrl(song);

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
                        const ytDur = event.target.getDuration() || 0;
                        if (ytDur > 0) this.duration = ytDur;
                        this.updatePlayerProgress();
                        // Áp dụng tốc độ và âm lượng hiện tại
                        if (typeof event.target.setPlaybackRate === 'function') {
                            event.target.setPlaybackRate(this.playbackRate);
                        }
                        if (typeof event.target.setVolume === 'function') {
                            event.target.setVolume(this.isMuted ? 0 : this.currentVolume * 100);
                        }
                        // Kiểm tra độ lệch thời lượng (Phát hiện video TV Size / Short)
                        this.checkDurationMismatch(ytDur);
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

    async autoFindYouTubeVideo(song) {
        if (!song || song.youtube_id) return;
        try {
            const endpoint = (window.MHENT_CONFIG && window.MHENT_CONFIG.AISA_API_ENDPOINT) || 'https://api.mhentuniverse.com';
            const searchQ = `${song.title} ${song.artist} Full MV`;
            const res = await fetch(`${endpoint}/api/youtube-search?q=${encodeURIComponent(searchQ)}`).then(r => r.json());
            if (res && res.videoId) {
                song.youtube_id = res.videoId;
                if (Array.isArray(res.candidates)) song.yt_candidates = res.candidates;
                this.useYouTube = true;
                this.updateAudioEngineUi();
                if (this.isYtReady) {
                    this.initYouTubePlayer(song.youtube_id);
                }
            }
        } catch (e) {
            console.warn('[Auto Find YouTube Failed]:', e);
        }
    }

    checkDurationMismatch(ytDur) {
        if (!this.currentSong || !Array.isArray(this.currentSong.synced_lyrics) || this.currentSong.synced_lyrics.length === 0) return;
        const lyrics = this.currentSong.synced_lyrics;
        const lastLyric = lyrics[lyrics.length - 1];
        const lastTime = lastLyric ? (lastLyric.startTime || 0) : 0;
        const warnBadge = document.getElementById('tv-size-warning-badge');

        // Nếu lời bài hát kéo dài qua 110s mà video YouTube chỉ dừng ở < (lastTime - 30s) (ví dụ 1:32 TV size vs 3:38 full song)
        if (lastTime > 110 && ytDur > 0 && ytDur < (lastTime - 30)) {
            console.warn(`[Duration Mismatch Detected]: Video YouTube (${ytDur}s) ngắn hơn lời bài hát (${lastTime}s)!`);
            if (warnBadge) {
                warnBadge.style.display = 'inline-flex';
                warnBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>Video TV Size (${this.formatSeconds(ytDur)}) • Bấm đổi bản Full</span>`;
            }
            this.showToast(`⚠️ Video YouTube đang phát là bản TV Size (${this.formatSeconds(ytDur)}), ngắn hơn lời bài hát (${this.formatSeconds(lastTime)}). Bấm nút "Đổi Video" để chuyển sang bản Full!`, 'warning', 6000);
        } else {
            if (warnBadge) warnBadge.style.display = 'none';
        }
    }

    toggleMediaMode() {
        const artWrap = document.getElementById('track-art-wrap');
        const ytWrapper = document.getElementById('youtube-player-wrapper');
        const ytFrame = document.getElementById('youtube-player-frame');
        const btn = document.getElementById('btn-toggle-media');

        if (this.mediaMode === 'video') {
            this.mediaMode = 'art';
            if (artWrap) artWrap.style.display = 'flex';
            if (ytWrapper) ytWrapper.style.display = 'none';
            if (ytFrame) ytFrame.style.display = 'none';
            if (btn) btn.innerHTML = '<i class="fa-brands fa-youtube"></i> <span>Xem MV</span>';
        } else {
            this.mediaMode = 'video';
            if (artWrap) artWrap.style.display = 'none';
            if (ytWrapper) ytWrapper.style.display = 'block';
            if (ytFrame) ytFrame.style.display = 'block';
            if (btn) btn.innerHTML = '<i class="fa-solid fa-image"></i> <span>Xem Bìa</span>';
            if (this.currentSong && this.currentSong.youtube_id && !this.ytPlayer && this.isYtReady) {
                this.initYouTubePlayer(this.currentSong.youtube_id);
            }
        }
    }

    openChangeVideoModal() {
        const modal = document.getElementById('change-video-modal');
        const inputEl = document.getElementById('custom-yt-input');
        if (inputEl) inputEl.value = '';
        if (!modal) return;
        modal.classList.add('active');
        this.renderCandidateVideos();
    }

    closeChangeVideoModal() {
        const modal = document.getElementById('change-video-modal');
        if (modal) modal.classList.remove('active');
    }

    async renderCandidateVideos() {
        const listEl = document.getElementById('change-video-list');
        if (!listEl) return;

        const song = this.currentSong;
        if (!song) {
            listEl.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px;">Chưa chọn bài hát.</p>';
            return;
        }

        let candidates = Array.isArray(song.yt_candidates) ? [...song.yt_candidates] : [];
        if (song.youtube_id && !candidates.includes(song.youtube_id)) {
            candidates.unshift(song.youtube_id);
        }

        if (candidates.length === 0) {
            listEl.innerHTML = `
                <div style="text-align: center; color: #94a3b8; padding: 20px;">
                    <i class="fa-solid fa-spinner fa-spin"></i> Đang tìm kiếm các video Full Version trên YouTube...
                </div>
            `;
            await this.searchYoutubeFullAlternatives();
            return;
        }

        listEl.innerHTML = `
            <div style="text-align: center; color: #94a3b8; padding: 20px;">
                <i class="fa-solid fa-spinner fa-spin"></i> Đang tải thông tin các video...
            </div>
        `;

        // Lấy tiêu đề thực tế từ YouTube oEmbed để hiển thị tên bài chuẩn
        const metaList = await Promise.all(candidates.map(async (vId) => {
            try {
                const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vId}&format=json`);
                if (res.ok) {
                    const data = await res.json();
                    return { vId, title: data.title || `Bản Full • ${vId}`, author: data.author_name || 'YouTube' };
                }
            } catch (e) {}
            return { vId, title: `Bản Full Version / MV • ${vId}`, author: 'YouTube' };
        }));

        listEl.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${metaList.map((item) => {
                    const isCurrent = item.vId === song.youtube_id;
                    return `
                        <div class="song-select-item" style="padding: 10px 14px; ${isCurrent ? 'border-color: #38bdf8; background: rgba(56, 189, 248, 0.08);' : ''}" onclick="window.lyricsApp.changeYouTubeVideo('${item.vId}')">
                            <img src="https://img.youtube.com/vi/${item.vId}/mqdefault.jpg" style="width: 80px; height: 50px; object-fit: cover; border-radius: 8px;" alt="Thumbnail" />
                            <div class="song-item-info" style="flex: 1; min-width: 0;">
                                <div class="song-item-title-row">
                                    <span class="song-item-title" style="font-size: 0.88rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; max-width: 320px;" title="${this.escapeHtml(item.title)}">${this.escapeHtml(item.title)}</span>
                                    ${isCurrent ? '<span class="badge-featured" style="flex-shrink: 0;"><i class="fa-solid fa-check"></i> Đang chọn</span>' : ''}
                                </div>
                                <div class="song-item-artist" style="font-size: 0.78rem; color: #94a3b8;">
                                    <i class="fa-brands fa-youtube" style="color: #ef4444;"></i> ${this.escapeHtml(item.author)} • ID: ${item.vId}
                                </div>
                            </div>
                            <div class="song-item-action" style="flex-shrink: 0;">
                                <button type="button" class="btn-item-pick" style="padding: 6px 12px; font-size: 0.8rem;">
                                    ${isCurrent ? 'Đang phát' : 'Chọn video này'}
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    async searchYoutubeFullAlternatives() {
        if (!this.currentSong) return;
        const listEl = document.getElementById('change-video-list');
        if (listEl) {
            listEl.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Đang tìm thêm các bản Full Version trên YouTube...</div>';
        }

        try {
            const endpoint = (window.MHENT_CONFIG && window.MHENT_CONFIG.AISA_API_ENDPOINT) || 'https://api.mhentuniverse.com';
            const query = `${this.currentSong.title} ${this.currentSong.artist} Full`;
            const res = await fetch(`${endpoint}/api/youtube-search?q=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                if (data && Array.isArray(data.candidates) && data.candidates.length > 0) {
                    this.currentSong.yt_candidates = data.candidates;
                    this.renderCandidateVideos();
                    return;
                }
            }
        } catch (e) {
            console.warn('[Search Alternatives Error]:', e);
        }

        if (listEl) {
            listEl.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px;">Không tìm thấy video gợi ý tự động. Bạn có thể dán link YouTube bất kỳ ở ô phía trên!</p>';
        }
    }

    applyCustomYoutubeUrl() {
        const input = document.getElementById('custom-yt-input');
        if (!input || !input.value.trim()) {
            this.showToast('Vui lòng nhập link hoặc Video ID của YouTube!', 'warning');
            return;
        }

        const raw = input.value.trim();
        let videoId = '';
        const match = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
        if (match) {
            videoId = match[1];
        } else if (/^[\w-]{11}$/.test(raw)) {
            videoId = raw;
        }

        if (!videoId) {
            this.showToast('Link YouTube không hợp lệ. Vui lòng kiểm tra lại!', 'error');
            return;
        }

        this.changeYouTubeVideo(videoId);
    }

    changeYouTubeVideo(videoId) {
        if (!videoId || !this.currentSong) return;
        this.currentSong.youtube_id = videoId;
        this.closeChangeVideoModal();

        const warnBadge = document.getElementById('tv-size-warning-badge');
        if (warnBadge) warnBadge.style.display = 'none';

        if (this.ytPlayer && typeof this.ytPlayer.loadVideoById === 'function') {
            this.ytPlayer.loadVideoById(videoId);
        } else {
            this.initYouTubePlayer(videoId);
        }

        if (this.mediaMode !== 'video') {
            this.toggleMediaMode();
        }

        this.showToast(`✨ Đã chuyển sang video YouTube mới: ${videoId}!`, 'success');

        if (window.studyCloud && typeof window.studyCloud.saveSong === 'function') {
            window.studyCloud.saveSong(this.currentSong).catch(() => {});
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

        const commVersions = Array.isArray(this.currentSong.community_versions) ? this.currentSong.community_versions : [];
        const totalCount = 1 + commVersions.length;

        let currentLabel = 'Bản chuẩn Web/AI';
        if (this.currentVersionIndex >= 0 && commVersions[this.currentVersionIndex]) {
            const cur = commVersions[this.currentVersionIndex];
            currentLabel = cur.title || `Bản dịch của ${cur.author || 'học viên'}`;
        }

        container.innerHTML = `
            <button type="button" class="btn-version-drawer-open" id="btn-version-drawer-open" onclick="window.lyricsApp.openVersionsDrawer()" title="Xem danh sách bản dịch bài hát (Drawer)">
                <i class="fa-solid fa-layer-group" style="color: #38bdf8;"></i>
                <span id="version-current-label">${this.escapeHtml(currentLabel)}</span>
                <span class="version-count-badge" id="version-count-badge">${totalCount} bản</span>
                <i class="fa-solid fa-chevron-down" style="font-size: 0.72rem; opacity: 0.7; margin-left: 2px;"></i>
            </button>
        `;

        this.renderVersionsDrawerList();
    }

    switchVersion(index) {
        this.currentVersionIndex = index;
        this.renderVersionTabs();
        this.renderLyrics();
        if (this.isPlainMode) this.renderPlainLyrics();
        this.closeVersionsDrawer();
    }

    openVersionsDrawer() {
        const drawer = document.getElementById('lyrics-versions-drawer');
        if (!drawer) return;
        drawer.style.display = 'flex';
        requestAnimationFrame(() => {
            drawer.classList.add('active');
        });
        this.renderVersionsDrawerList();
    }

    closeVersionsDrawer() {
        const drawer = document.getElementById('lyrics-versions-drawer');
        if (!drawer) return;
        drawer.classList.remove('active');
        setTimeout(() => {
            if (!drawer.classList.contains('active')) {
                drawer.style.display = 'none';
            }
        }, 280);
    }

    renderVersionsDrawerList() {
        const listContainer = document.getElementById('versions-drawer-list');
        if (!listContainer || !this.currentSong) return;

        const commVersions = Array.isArray(this.currentSong.community_versions) ? this.currentSong.community_versions : [];
        const baseLyrics = this.currentSong.synced_lyrics || [];

        // Đếm số từ vựng gắn thẻ trong bản chuẩn
        let baseVocabCount = 0;
        baseLyrics.forEach(l => {
            if (Array.isArray(l.words)) baseVocabCount += l.words.length;
        });

        let html = `
            <!-- BẢN CHUẨN WEB / AI -->
            <div class="version-card-item ${this.currentVersionIndex === -1 ? 'active' : ''}">
                <div class="version-card-top">
                    <div class="version-card-title-group">
                        <div class="version-card-title">
                            <i class="fa-solid fa-globe" style="color: #38bdf8;"></i> Bản chuẩn Web/AI & Lời đồng bộ
                        </div>
                        <div class="version-card-author">
                            <i class="fa-solid fa-robot"></i> MHEnt AI Engine & LRCLIB
                        </div>
                    </div>
                    <span class="version-card-badge official"><i class="fa-solid fa-shield-halved"></i> Mặc định</span>
                </div>
                <div class="version-card-meta">
                    <span><i class="fa-solid fa-music"></i> ${baseLyrics.length} câu hát</span>
                    ${baseVocabCount > 0 ? `<span><i class="fa-solid fa-book-bookmark" style="color: #a855f7;"></i> ${baseVocabCount} từ vựng</span>` : ''}
                </div>
                <div class="version-card-actions">
                    ${this.currentVersionIndex === -1 ?
                        `<button type="button" class="btn-version-apply is-current"><i class="fa-solid fa-check"></i> Đang áp dụng</button>` :
                        `<button type="button" class="btn-version-apply" onclick="window.lyricsApp.switchVersion(-1)"><i class="fa-solid fa-circle-play"></i> Dùng bản này</button>`
                    }
                </div>
            </div>
        `;

        // CÁC BẢN DỊCH CỘNG ĐỒNG
        if (commVersions.length === 0) {
            html += `
                <div style="text-align: center; padding: 24px 16px; color: #94a3b8; font-size: 0.85rem; border: 1px dashed rgba(255, 255, 255, 0.1); border-radius: 12px; margin-top: 6px;">
                    <i class="fa-regular fa-comments" style="font-size: 1.8rem; margin-bottom: 8px; color: #a855f7; display: block;"></i>
                    Chưa có bản dịch đóng góp nào khác từ cộng đồng.<br>
                    Hãy là người đầu tiên đóng góp bản dịch cho bài hát này!
                </div>
            `;
        } else {
            commVersions.forEach((v, idx) => {
                const vLyrics = v.synced_lyrics || [];
                let vVocabCount = 0;
                vLyrics.forEach(l => {
                    if (Array.isArray(l.words)) vVocabCount += l.words.length;
                });

                const isActive = this.currentVersionIndex === idx;
                const dateStr = this.formatDateShort(v.updatedAt || v.createdAt);
                const canManage = this.canManageCommunityVersion(v);

                html += `
                    <div class="version-card-item ${isActive ? 'active' : ''}">
                        <div class="version-card-top">
                            <div class="version-card-title-group">
                                <div class="version-card-title">
                                    <i class="fa-solid fa-pen-nib" style="color: #10b981;"></i> ${this.escapeHtml(v.title || 'Bản dịch cộng đồng')}
                                </div>
                                <div class="version-card-author">
                                    <i class="fa-solid fa-user-pen"></i> ${this.escapeHtml(v.author || 'Học viên MHEnt')}
                                    ${dateStr ? ` • <span style="opacity: 0.8;">${dateStr}</span>` : ''}
                                </div>
                            </div>
                            <span class="version-card-badge community"><i class="fa-solid fa-users"></i> Đóng góp</span>
                        </div>

                        ${v.note ? `<div class="version-card-note"><i class="fa-solid fa-quote-left" style="opacity: 0.5; margin-right: 4px;"></i>${this.escapeHtml(v.note)}</div>` : ''}

                        <div class="version-card-meta">
                            <span><i class="fa-solid fa-music"></i> ${vLyrics.length} câu hát</span>
                            ${vVocabCount > 0 ? `<span><i class="fa-solid fa-book-bookmark" style="color: #a855f7;"></i> ${vVocabCount} từ vựng</span>` : ''}
                        </div>

                        <div class="version-card-actions">
                            ${isActive ?
                                `<button type="button" class="btn-version-apply is-current"><i class="fa-solid fa-check"></i> Đang áp dụng</button>` :
                                `<button type="button" class="btn-version-apply" onclick="window.lyricsApp.switchVersion(${idx})"><i class="fa-solid fa-circle-play"></i> Dùng bản này</button>`
                            }
                            ${canManage ? `
                                <button type="button" class="btn-version-action-icon edit" onclick="window.lyricsApp.editCommunityVersion('${v.id}')" title="Chỉnh sửa bản dịch của bạn">
                                    <i class="fa-solid fa-pen"></i>
                                </button>
                                <button type="button" class="btn-version-action-icon delete" onclick="window.lyricsApp.deleteCommunityVersion('${v.id}')" title="Xóa bản dịch này">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
        }

        listContainer.innerHTML = html;
    }

    getCurrentUser() {
        let profile = {};
        try {
            profile = JSON.parse(localStorage.getItem('mhent_user_profile') || localStorage.getItem('mhent_user') || '{}');
        } catch (e) {}

        const uid = profile.uid || profile.id || window.currentUserUid || null;
        const email = profile.email || window.currentUserEmail || '';
        const displayName = profile.displayName || profile.name || (email ? email.split('@')[0] : '');
        const role = (profile.role || localStorage.getItem('mhent_user_role') || 'guest').toLowerCase();
        const isAdmin = ['admin', 'superadmin', 'staff', 'teacher', 'manager'].includes(role);

        return { uid, email, displayName, role, isAdmin };
    }

    canManageCommunityVersion(version) {
        if (!version) return false;
        const user = this.getCurrentUser();

        // 1. Quản trị viên (Admin / Superadmin / Staff) luôn có toàn quyền quản trị & xóa
        if (user.isAdmin) return true;

        // 2. So khớp theo UID định danh tài khoản
        if (user.uid && version.authorUid && String(user.uid) === String(version.authorUid)) {
            return true;
        }

        // 3. So khớp theo Email tài khoản
        if (user.email && version.authorEmail && user.email.trim().toLowerCase() === version.authorEmail.trim().toLowerCase()) {
            return true;
        }

        // 4. So khớp theo DisplayName nếu bản dịch chưa lưu UID
        if (user.displayName && version.author) {
            const authorClean = version.author.trim().toLowerCase();
            const userClean = user.displayName.trim().toLowerCase();
            if (authorClean === userClean) return true;
        }

        return false;
    }

    getAllCustomSongs() {
        try {
            const raw = localStorage.getItem('mhent_custom_songs');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {
            console.warn('Lỗi đọc mhent_custom_songs:', e);
        }
        return [];
    }

    saveCustomSongToLocal(song) {
        if (!song || !song.id || !song.title) return;
        try {
            let list = this.getAllCustomSongs();
            const songKey = `${(song.title || '').trim().toLowerCase()}___${(song.artist || '').trim().toLowerCase()}`;
            const idx = list.findIndex(s => s.id === song.id || `${(s.title || '').trim().toLowerCase()}___${(s.artist || '').trim().toLowerCase()}` === songKey);
            if (idx >= 0) {
                list[idx] = { ...list[idx], ...song };
            } else {
                list.unshift(song);
            }
            if (list.length > 100) list = list.slice(0, 100);
            localStorage.setItem('mhent_custom_songs', JSON.stringify(list));
        } catch (e) {
            console.warn('Lỗi lưu mhent_custom_songs:', e);
        }
    }

    getStoredCommunityVersions(songId) {
        if (!songId) return [];
        try {
            const raw = localStorage.getItem(`mhent_lyrics_versions_${songId}`);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {
            console.warn('Lỗi đọc community versions từ localStorage:', e);
        }
        return [];
    }

    saveStoredCommunityVersions(songId, list) {
        if (!songId) return;
        try {
            localStorage.setItem(`mhent_lyrics_versions_${songId}`, JSON.stringify(list || []));
        } catch (e) {
            console.warn('Lỗi lưu community versions vào localStorage:', e);
        }
    }

    syncCommunityVersionsForSong(song) {
        if (!song || !song.id) return;

        // 1. Đọc từ localStorage cục bộ
        const localList = this.getStoredCommunityVersions(song.id);
        const currentList = Array.isArray(song.community_versions) ? song.community_versions : [];

        const map = new Map();
        currentList.forEach(v => {
            if (v && v.id) map.set(v.id, v);
        });
        localList.forEach(v => {
            if (v && v.id) map.set(v.id, v);
        });

        song.community_versions = Array.from(map.values());
        this.saveStoredCommunityVersions(song.id, song.community_versions);

        // 2. Tải ngầm từ Supabase Cloud để đồng bộ các bản dịch mới nhất
        if (window.studyCloud && typeof window.studyCloud.getSong === 'function') {
            window.studyCloud.getSong(song.id).then(cloudSong => {
                if (cloudSong && Array.isArray(cloudSong.community_versions) && this.currentSong && this.currentSong.id === song.id) {
                    let hasNew = false;
                    cloudSong.community_versions.forEach(cv => {
                        if (cv && cv.id && !map.has(cv.id)) {
                            map.set(cv.id, cv);
                            hasNew = true;
                        }
                    });
                    if (hasNew) {
                        this.currentSong.community_versions = Array.from(map.values());
                        this.saveStoredCommunityVersions(song.id, this.currentSong.community_versions);
                        this.renderVersionTabs();
                        this.renderVersionsDrawerList();
                    }
                }
            }).catch(err => console.warn('Sync cloud versions:', err));
        }
    }

    formatDateShort(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '';
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        } catch (e) {
            return '';
        }
    }

    renderLyrics() {
        const container = document.getElementById('lyrics-stream-container');
        if (!container || !this.currentSong) return;

        const lines = this.getActiveLyrics();

        if (lines.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: #94a3b8; padding: 45px 20px;">
                    <i class="fa-solid fa-microphone-lines" style="font-size: 2.4rem; margin-bottom: 14px; color: #a855f7;"></i>
                    <h3 style="color: #f8fafc; font-size: 1.2rem; margin-bottom: 6px;">Bài hát này chưa có lời đồng bộ</h3>
                    <p style="font-size: 0.9rem; max-width: 440px; margin: 0 auto 18px; line-height: 1.5;">
                        Bạn có thể mở Phòng Thu Đồng Bộ Lời để dán lời và gõ phím Space theo nhịp bài hát để tạo bản Karaoke cho cả cộng đồng cùng học!
                    </p>
                    <button type="button" class="btn-sync-tool" onclick="window.lyricsApp.openSyncStudioModal()" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; font-size: 0.95rem; background: linear-gradient(135deg, #a855f7, #6366f1); color: #fff; border: none; border-radius: 12px; cursor: pointer; font-weight: 800; box-shadow: 0 4px 20px rgba(168, 85, 247, 0.4);">
                        <i class="fa-solid fa-microphone-lines"></i> Mở Phòng Thu Đồng Bộ Lời (Musixmatch Lite)
                    </button>
                </div>
            `;
            return;
        }

        let html = '';

        if (this.isDictationMode) {
            html += `
                <div class="dictation-game-header">
                    <div class="dictation-game-title">
                        <i class="fa-solid fa-feather-pointed"></i> <span>Chế Độ Chép Chính Tả (Shadowing)</span>
                    </div>
                    <div class="dictation-game-stats">
                        <span><i class="fa-solid fa-star" style="color: #fbbf24;"></i> Điểm: <b id="dictation-score-num">${this.dictationScore || 0}</b></span>
                        <span><i class="fa-solid fa-fire" style="color: #f97316;"></i> Chuỗi: <b id="dictation-streak-num">🔥 ${this.dictationStreak || 0}</b></span>
                    </div>
                </div>
            `;
        }

        lines.forEach((line, idx) => {
            const timeStr = this.formatSeconds(line.startTime || 0);
            const isCurrentActive = idx === this.activeSentenceIndex;
            let dictationBoxHtml = '';
            let enrichedText = '';

            if (this.isDictationMode && isCurrentActive) {
                const targetWordObj = (Array.isArray(line.words) && line.words.length > 0) ? line.words[0] : null;
                const targetWord = targetWordObj ? targetWordObj.word : '';
                if (targetWord) {
                    const re = new RegExp(this.escapeRegExp(targetWord), 'gi');
                    const rawMasked = line.text.replace(re, '___BLANK_TOKEN___');
                    const parts = rawMasked.split('___BLANK_TOKEN___');
                    enrichedText = parts.map(p => this.formatTextSegment(p)).join('<span class="blank-word-mask">______</span>');
                } else {
                    enrichedText = `<span class="blank-word-mask">______ (Nghe & chép lại câu này) ______</span>`;
                }
                dictationBoxHtml = `
                    <div class="dictation-box" onclick="event.stopPropagation()">
                        <div class="dictation-input-row">
                            <input type="text" id="dictation-input-${idx}" class="dictation-input" placeholder="Nghe và gõ từ khuyết vào đây..." autocomplete="off">
                            <button type="button" class="btn-dictation-submit" onclick="window.lyricsApp.submitDictationAnswer(${idx})">
                                <i class="fa-solid fa-check"></i> Kiểm tra
                            </button>
                            <button type="button" class="btn-dictation-hint" onclick="window.lyricsApp.hintDictationAnswer(${idx})" title="Xem gợi ý">
                                <i class="fa-solid fa-lightbulb"></i>
                            </button>
                            <button type="button" class="btn-dictation-skip" onclick="window.lyricsApp.skipDictationAnswer(${idx})" title="Bỏ qua sang câu sau">
                                <i class="fa-solid fa-forward"></i>
                            </button>
                        </div>
                        <div id="dictation-feedback-${idx}" class="dictation-feedback"></div>
                    </div>
                `;
            } else {
                enrichedText = this.highlightVocabInSentence(line.text, line.words || [], idx);
            }

            html += `
                <div class="lyrics-sentence-row ${isCurrentActive ? 'active' : ''}" id="sentence-row-${idx}" onclick="window.lyricsApp.handleSentenceRowClick(event, ${idx})">
                    <div class="sentence-meta-row">
                        <button type="button" class="sentence-play-btn" onclick="event.stopPropagation(); window.lyricsApp.seekToSentence(${idx})" title="Nghe câu này (${timeStr})">
                            <i class="fa-solid fa-play"></i> <span>${timeStr}</span>
                        </button>
                        <button class="sentence-loop-btn ${this.loopSentenceIndex === idx ? 'active' : ''}" onclick="event.stopPropagation(); window.lyricsApp.toggleSentenceLoop(${idx})" title="Luyện nghe / phát âm câu này">
                            <i class="fa-solid fa-repeat"></i> ${this.loopSentenceIndex === idx ? 'Đang lặp câu' : 'Luyện câu'}
                        </button>
                    </div>

                    <div class="sentence-orig-text">${enrichedText}</div>

                    ${line.phonetic ? `<div class="sentence-phonetic-text">${line.phonetic}</div>` : ''}

                    <div class="sentence-trans-text">${line.translation || ''}</div>

                    ${dictationBoxHtml}
                </div>
            `;
        });

        container.innerHTML = html + this.getVocabSummaryHtml();

        if (this.isDictationMode && this.activeSentenceIndex >= 0) {
            setTimeout(() => {
                const curInput = document.getElementById(`dictation-input-${this.activeSentenceIndex}`);
                if (curInput) {
                    curInput.focus();
                    curInput.onkeydown = (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            this.submitDictationAnswer(this.activeSentenceIndex);
                        }
                    };
                }
            }, 60);
        }
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
            <div class="lyrics-plain-line" onclick="window.lyricsApp.handleSentenceRowClick(event, ${idx})">
                <div style="font-weight: 600;">${this.formatTextSegment(l.text)}</div>
                ${l.phonetic ? `<div style="font-size: 0.88rem; color: #38bdf8; font-family: monospace;">${this.escapeHtml(l.phonetic)}</div>` : ''}
                ${l.translation ? `<div class="lyrics-plain-trans">${this.escapeHtml(l.translation)}</div>` : ''}
            </div>
        `).join('') + this.getVocabSummaryHtml();
    }

    highlightVocabInSentence(sentence, words, sentenceIdx) {
        if (!sentence) return '';
        if (!words || !Array.isArray(words) || words.length === 0) {
            return this.formatTextSegment(sentence);
        }

        // 1. Lọc từ hợp lệ và sắp xếp theo độ dài GIẢM DẦN để ưu tiên cụm từ dài trước
        const validWords = words
            .map((w, origIdx) => ({ ...w, origIdx }))
            .filter(w => w && w.word && typeof w.word === 'string' && w.word.trim().length > 0)
            .sort((a, b) => b.word.length - a.word.length);

        if (validWords.length === 0) return this.formatTextSegment(sentence);

        // 2. Định vị các khoảng ký tự không trùng lặp trên câu gốc (tránh triệt để việc regex replace đè vào HTML tag / attribute)
        const len = sentence.length;
        const occupied = new Uint8Array(len);
        const matches = [];
        const lowerSentence = sentence.toLowerCase();

        const lang = this.currentSong ? this.currentSong.lang : 'ja';

        for (const item of validWords) {
            const candidates = this.getWordMatchCandidates(item, lang);

            for (const cand of candidates) {
                const candLower = cand.toLowerCase();
                let searchStart = 0;
                let foundMatch = false;

                while (searchStart < len) {
                    const matchPos = lowerSentence.indexOf(candLower, searchStart);
                    if (matchPos === -1) break;

                    const matchEnd = matchPos + candLower.length;

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
                        foundMatch = true;
                    }

                    searchStart = matchPos + 1;
                }

                if (foundMatch) break; // Ưu tiên candidate dài nhất đã match
            }
        }

        // 3. Sắp xếp các token tìm thấy theo thứ tự xuất hiện từ trái qua phải
        matches.sort((a, b) => a.start - b.start);

        // 4. Lắp ráp HTML: Đan xen phần text nguyên bản (formatTextSegment) và thẻ chip từ vựng
        let html = '';
        let lastIdx = 0;

        for (const m of matches) {
            if (m.start > lastIdx) {
                html += this.formatTextSegment(sentence.substring(lastIdx, m.start));
            }

            const popoverId = `popover-${sentenceIdx}-${m.origIdx}`;
            const w = m.wordObj;

            html += `<span class="vocab-word-chip" onclick="event.stopPropagation(); window.lyricsApp.togglePopover('${popoverId}')">${this.escapeHtml(m.origText)}<div class="vocab-popover-box" id="${popoverId}" onclick="event.stopPropagation()"><div class="popover-header"><span class="popover-word">${this.escapeHtml(w.word)}</span><span class="popover-pos">${this.escapeHtml(w.pos || 'Từ vựng')}</span></div>${w.phonetic ? `<div class="popover-phonetic">${this.escapeHtml(w.phonetic)}</div>` : ''}<div class="popover-meaning">${this.escapeHtml(w.meaning || '')}</div><div class="popover-actions"><button type="button" class="popover-btn-speak" onclick="window.lyricsApp.handlePopoverSpeak(${sentenceIdx}, ${m.origIdx})" title="Phát âm"><i class="fa-solid fa-volume-high"></i></button><button type="button" class="popover-btn-save" onclick="window.lyricsApp.handlePopoverSave(${sentenceIdx}, ${m.origIdx})"><i class="fa-solid fa-bookmark"></i> Lưu vào Sổ</button></div></div></span>`;

            lastIdx = m.end;
        }

        if (lastIdx < len) {
            html += this.formatTextSegment(sentence.substring(lastIdx));
        }

        return html;
    }

    getWordMatchCandidates(item, lang = 'ja') {
        const candidates = new Set();
        if (!item || !item.word) return [];

        const w = item.word.trim();
        candidates.add(w);

        const kataToHira = (str) => str.replace(/[\u30a1-\u30f6]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
        const hiraToKata = (str) => str.replace(/[\u3041-\u3096]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60));

        if (lang === 'ja') {
            candidates.add(kataToHira(w));
            candidates.add(hiraToKata(w));

            if (item.surface) {
                candidates.add(item.surface.trim());
                candidates.add(kataToHira(item.surface.trim()));
            }

            const jaVariants = {
                '生まれ': ['うまれ', 'うまれる', '生まれる'],
                '生まれる': ['うまれる', '生まれ', 'うまれ'],
                '私たち': ['わたし達', 'わたしたち', '私達'],
                '私達': ['わたし達', '私たち', 'わたしたち'],
                'わたし達': ['私たち', '私達', 'わたしたち'],
                '力': ['チカラ', 'ちから'],
                'チカラ': ['力', 'ちから'],
                '君': ['キミ', 'きみ'],
                'キミ': ['君', 'きみ'],
                '明日': ['あした', 'アシタ', 'あす'],
                '心': ['こころ', 'ココロ'],
                '光': ['ひかり', 'ヒカリ'],
                '世界': ['せかい'],
                '夢': ['ゆめ', 'ユメ'],
                '笑顔': ['えがお'],
                '勇気': ['ゆうき'],
                '涙': ['なみだ'],
                '希望': ['きぼう'],
                'ハーモニー': ['haamanii', 'はーもにー'],
                '胸': ['むね'],
                '熱い': ['アツい', 'あツイ', 'あつい'],
                '重ねて': ['かさねて', 'かさね'],
                '訪れる': ['訪れて', 'おとずれる', 'おとづれて'],
                '取り戻す': ['取り戻し', '取り戻したい', 'とりもどす'],
                '思い': ['オモイ', 'おもい'],
                '声': ['こえ', 'コエ'],
                '立ち上がる': ['たちあがる', '立ちあがり', 'たちあがり'],
                '理由': ['りゆう']
            };

            if (jaVariants[w]) {
                jaVariants[w].forEach(v => {
                    candidates.add(v);
                    candidates.add(kataToHira(v));
                    candidates.add(hiraToKata(v));
                });
            }

            // Verb / Adj stems (bỏ đuôi る, す, む, く, etc. nếu độ dài >= 2)
            if (w.length >= 2 && /[るすくむつぬぶぐうい]/.test(w.slice(-1))) {
                const stem = w.slice(0, -1);
                candidates.add(stem);
                candidates.add(kataToHira(stem));
            }
        }

        return Array.from(candidates).filter(c => c && c.length >= 1).sort((a, b) => b.length - a.length);
    }

    formatTextSegment(text) {
        if (!text) return '';
        const lang = this.currentSong ? this.currentSong.lang : 'en';

        // Đối với tiếng Anh: Tokenize các từ để người học có thể nhấp trực tiếp vào bất kỳ từ nào để tra AISA Dict
        if (lang === 'en') {
            const parts = text.split(/([a-zA-Z0-9]+(?:'[a-zA-Z0-9]+)?)/g);
            return parts.map(part => {
                if (/^[a-zA-Z0-9]+(?:'[a-zA-Z0-9]+)?$/.test(part)) {
                    const escaped = this.escapeHtml(part);
                    return `<span class="word-token" onclick="event.stopPropagation(); window.lyricsApp.handleWordTokenClick('${escaped}', event)" data-word="${escaped}">${escaped}</span>`;
                }
                return this.escapeHtml(part);
            }).join('');
        }

        // Đối với các ngôn ngữ khác (JA, KO, ZH): Giữ nguyên văn bản để người dùng tự do bôi đen / chọn từ không lo bị tua câu
        return this.escapeHtml(text);
    }

    handleWordTokenClick(word, event) {
        if (event) event.stopPropagation();
        if (!word) return;
        const cleanWord = word.replace(/^[^\w\u00C0-\u024F]+|[^\w\u00C0-\u024F]+$/gu, '').trim();
        if (!cleanWord) return;

        const lang = this.currentSong ? this.currentSong.lang : 'en';
        if (window.aisaDict && typeof window.aisaDict.open === 'function') {
            window.aisaDict.open(cleanWord, lang);
        } else {
            this.showToast(`Đang tra từ: ${cleanWord}`, 'info');
        }
    }

    handleSentenceRowClick(event, idx) {
        // 1. Nếu đang có vùng chọn văn bản (người dùng bôi đen câu hoặc từ), tuyệt đối KHÔNG tua bài hát
        const sel = window.getSelection();
        if (sel && sel.toString().trim().length > 0) {
            return;
        }

        // 2. Nếu người dùng nhấp vào các phần tử nội dung văn bản (để đọc, click tra từ, mở popover, bôi đen)
        if (event.target.closest('.sentence-orig-text') || 
            event.target.closest('.sentence-phonetic-text') || 
            event.target.closest('.sentence-trans-text') || 
            event.target.closest('.vocab-word-chip') || 
            event.target.closest('.word-token') || 
            event.target.closest('.lyric-quick-lookup-pill') || 
            event.target.closest('button')) {
            return;
        }

        // 3. Nếu người dùng nhấp vào lề hoặc nền hàng (ngoài vùng chữ), tiến hành tua tới câu đó
        this.seekToSentence(idx);
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

    cleanKanaInRomaji(text) {
        if (!text) return '';
        if (!/[\u3040-\u30ff]/.test(text)) return text;

        const compounds = {
            'きゃ': 'kya', 'きゅ': 'kyu', 'きょ': 'kyo',
            'しゃ': 'sha', 'しゅ': 'shu', 'しょ': 'sho',
            'ちゃ': 'cha', 'ちゅ': 'chu', 'ちょ': 'cho',
            'にゃ': 'nya', 'にゅ': 'nyu', 'にょ': 'nyo',
            'ひゃ': 'hya', 'ひゅ': 'hyu', 'ひょ': 'hyo',
            'みゃ': 'mya', 'みゅ': 'myu', 'みょ': 'myo',
            'りゃ': 'rya', 'りゅ': 'ryu', 'りょ': 'ryo',
            'ぎゃ': 'gya', 'ぎゅ': 'gyu', 'ぎょ': 'gyo',
            'じゃ': 'ja',  'じゅ': 'ju',  'じょ': 'jo',
            'ぢゃ': 'ja',  'ぢゅ': 'ju',  'ぢょ': 'jo',
            'びゃ': 'bya', 'びゅ': 'byu', 'びょ': 'byo',
            'ぴゃ': 'pya', 'ぴゅ': 'pyu', 'ぴょ': 'pyo',
            'キャ': 'kya', 'キュ': 'kyu', 'キョ': 'kyo',
            'シャ': 'sha', 'シュ': 'shu', 'ショ': 'sho',
            'チャ': 'cha', 'チュ': 'chu', 'チョ': 'cho',
            'ニャ': 'nya', 'ニュ': 'nyu', 'ニョ': 'nyo',
            'ヒャ': 'hya', 'ヒュ': 'hyu', 'ヒョ': 'hyo',
            'ミャ': 'mya', 'ミュ': 'myu', 'ミョ': 'myo',
            'リャ': 'rya', 'リュ': 'ryu', 'リョ': 'ryo',
            'ギャ': 'gya', 'ギュ': 'gyu', 'ギョ': 'gyo',
            'ジャ': 'ja',  'ジュ': 'ju',  'ジョ': 'jo',
            'ビャ': 'bya', 'ビュ': 'byu', 'ビョ': 'byo',
            'ピャ': 'pya', 'ピュ': 'pyu', 'ピョ': 'pyo'
        };

        const singles = {
            'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
            'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
            'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
            'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
            'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
            'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
            'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
            'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
            'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
            'わ': 'wa', 'を': 'o', 'ん': 'n',
            'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
            'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
            'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'де': 'de', 'ど': 'do',
            'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
            'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
            'ぁ': 'a', 'ぃ': 'i', 'ぅ': 'u', 'ぇ': 'e', 'ぉ': 'o',
            'ゃ': 'ya', 'ゅ': 'yu', 'ょ': 'yo', 'っ': '',

            'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o',
            'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko',
            'サ': 'sa', 'シ': 'shi', 'ス': 'su', 'セ': 'se', 'ソ': 'so',
            'タ': 'ta', 'チ': 'chi', 'ツ': 'tsu', 'テ': 'te', 'ト': 'to',
            'ナ': 'na', 'ニ': 'ni', 'ヌ': 'nu', 'ネ': 'ne', 'ノ': 'no',
            'ハ': 'ha', 'ヒ': 'hi', 'フ': 'fu', 'ヘ': 'he', 'ホ': 'ho',
            'マ': 'ma', 'ミ': 'mi', 'ム': 'mu', 'メ': 'me', 'モ': 'mo',
            'ヤ': 'ya', 'ユ': 'yu', 'ヨ': 'yo',
            'ラ': 'ra', 'リ': 'ri', 'ル': 'ru', 'レ': 're', 'ロ': 'ro',
            'ワ': 'wa', 'ヲ': 'o', 'ン': 'n',
            'ガ': 'ga', 'ギ': 'gi', 'グ': 'gu', 'ゲ': 'ge', 'ゴ': 'go',
            'ザ': 'za', 'ジ': 'ji', 'ズ': 'zu', 'ゼ': 'ze', 'ゾ': 'zo',
            'ダ': 'da', 'ヂ': 'ji', 'ヅ': 'zu', 'デ': 'de', 'ド': 'do',
            'バ': 'ba', 'ビ': 'bi', 'ブ': 'bu', 'ベ': 'be', 'ボ': 'bo',
            'パ': 'pa', 'ピ': 'pi', 'プ': 'pu', 'ペ': 'pe', 'ポ': 'po',
            'ァ': 'a', 'ィ': 'i', 'ゥ': 'u', 'ェ': 'e', 'ォ': 'o',
            'ャ': 'ya', 'ュ': 'yu', 'ョ': 'yo', 'ッ': '', 'ー': ''
        };

        let res = text;
        for (const [k, v] of Object.entries(compounds)) {
            res = res.split(k).join(' ' + v + ' ');
        }
        for (const [k, v] of Object.entries(singles)) {
            res = res.split(k).join(' ' + v);
        }
        return res.replace(/\s+/g, ' ').trim();
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
            const parentRow = chip ? chip.closest('.lyrics-sentence-row') : null;
            if (parentRow) parentRow.classList.add('has-active-popover');
            el.classList.add('show');
        }
    }

    hideAllPopovers() {
        document.querySelectorAll('.lyrics-sentence-row.has-active-popover').forEach(r => {
            r.classList.remove('has-active-popover');
        });
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

        // Fallback lưu vào LocalStorage qua studyStorage
        if (window.studyStorage && typeof window.studyStorage.getDecks === 'function') {
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
            const exists = targetDeck.words.some(w => w.word.toLowerCase() === word.toLowerCase());
            if (!exists) {
                targetDeck.words.unshift({
                    id: 'lyrics_' + Date.now(),
                    word: word,
                    meaning: meaning,
                    phonetic: phonetic,
                    pos: pos,
                    example: contextSentence,
                    exampleTrans: '',
                    note: `Trích từ bài hát: "${this.currentSong ? this.currentSong.title : 'Lyrics'}"`,
                    status: 'new',
                    createdAt: new Date().toISOString()
                });
                window.studyStorage.saveDecks(decks, lang);
            }
            this.hideAllPopovers();
            this.showToast(`Đã lưu từ vựng "${word}" vào sổ của bạn!`, 'success');
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
        const langNames = { en: 'tiếng Anh', ko: 'tiếng Hàn', ja: 'tiếng Nhật', zh: 'tiếng Trung', vi: 'tiếng Việt' };
        const langName = langNames[lang] || 'tiếng Việt';
        const isVietnameseSong = (lang === 'vi');

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
${isVietnameseSong ? 'LƯU Ý ĐẶC BIỆT: ĐÂY LÀ BÀI HÁT TIẾNG VIỆT -> BẠN HÃY DỊCH CÂU SANG TIẾNG ANH ("translation" là bản dịch thơ mộng, tự nhiên sang tiếng Anh để học viên luyện song ngữ Việt - Anh) VÀ BÓC TÁCH CÁC TỪ VỰNG TIẾNG VIỆT ĐẮT GIÁ, TỪ TƯỢNG HÌNH, THÀNH NGỮ KÈM NGHĨA GIẢI THÍCH SẮC SẢO!' : ''}

BƯỚC 1: XÁC ĐỊNH CỐT TRUYỆN, THỂ LOẠI & SẮC THÁI BÀI HÁT:
- Dựa trên tên bài hát "${song.title}", nghệ sĩ "${song.artist}" và lời bài hát để xác định đúng phong cách:
  + NẾU LÀ BÀI NỔI LOẠN / CHÂM BIẾM / GAI GÓC / CHỬI ĐỜI / ROCK DISS (như Usseewa, Otonablue, rock, rap diss, v.v.):
    * Ngôi xưng: "TAO" - "CHÚNG MÀY / LŨ BAY / CÁC NGƯỜI". Sắc thái đanh thép, gai góc, bất cần, dùng từ ngữ mạnh mẽ.
  + NẾU LÀ BÀI TÌNH YÊU / THỨC TỈNH TRƯỚC SỰ THAO TÚNG / CHIA LY / DA DIẾT (như Puppet, Lemon, unlasting, Until I Found You, Spring Day, ballad, RnB, Pop):
    * Ngôi xưng: "ANH - EM" (hoặc "EM - ANH"), da diết hoặc dứt khoát, cay đắng, thức tỉnh trước sự dối trá nhưng giàu cảm xúc.
  + NẾU LÀ BÀI TỰ SỰ / TRIẾT LÝ / TỰ VẤN CUỘC SỐNG:
    * Ngôi xưng: "TÔI", chiêm nghiệm, chân thành.
- QUY TẮC BẮT BUỘC VỀ NGÔI XƯNG: TOÀN BỘ CÁC CÂU TRONG BÀI PHẢI DÙNG CHUNG MỘT HỆ THỐNG NGÔI XƯNG NHẤT QUÁN. CẤM NHẢY LỘN XỘN.

BƯỚC 2: MẠCH NGHĨA LIÊN TỤC GIỮA CÁC DÒNG (ENJAMBMENT & NARRATIVE CONTINUITY):
- BẮT BUỘC nhìn tổng thể các dòng liền kề để dịch nối mạch ý nghĩa câu chuyện, dùng dấu ba chấm "..." khi một ý chưa hoàn chỉnh.

BƯỚC 3: TÍNH ĐỒNG NHẤT TUYỆT ĐỐI CỦA ĐIỆP KHÚC (CHORUS CONSISTENCY):
- Các câu hát lặp lại ở điệp khúc bắt buộc phải dịch nghĩa giống nhau và bóc tách từ vựng đồng nhất.

BƯỚC 4: QUY TẮC PHIÊN ÂM CHUẨN 100% (STRICT ROMANIZATION):
- Tiếng Nhật: 100% Chữ cái Latinh chuẩn Hepburn.
- Tiếng Hàn: 100% Latinh Romaja chuẩn.
- Tiếng Trung: 100% Pinyin có dấu thanh điệu chuẩn.
- Tiếng Anh, Tiếng Việt: để trống "".

BƯỚC 5: TRÍCH XUẤT TỪ VỰNG CHỌN LỌC PHONG PHÚ (RICH & IMPACTFUL VOCABULARY SELECTION):
- "word": Bóc tách các từ khóa quan trọng, động từ đắt giá, tính từ biểu cảm hoặc thành ngữ/cụm động từ cố định (collocation/idiom/phrasal verb).
- Mỗi câu trích xuất từ 2-4 từ vựng / cụm từ thực sự có giá trị học tập để người học mở rộng vốn từ vựng phong phú (không chỉ chọn 1 từ đơn điệu).
- TUYỆT ĐỐI CẤM bôi đen nguyên cả câu hoặc nửa câu dài vô nghĩa.
- CẤM bóc tách các từ chức năng ngữ pháp quá đơn giản (như "I", "you", "me", "to", "a", "the", "is", "in").
- Đối với tiếng Nhật, tiếng Hàn, tiếng Trung: Hãy bóc tách cả từ gốc (dạng từ điển) và các từ Kanji/Hán tự có ý nghĩa biểu cảm cao trong bài hát.
- "phonetic": Phiên âm 100% Latinh hoặc IPA.
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
                            // Khử triệt để ký tự Kana dở dang bằng bộ chuyển đổi Kana sang Romaji
                            target.phonetic = this.cleanKanaInRomaji(aiItem.phonetic);
                        }
                        if (Array.isArray(aiItem.words) && aiItem.words.length > 0) {
                            target.words = aiItem.words.map(w => ({
                                ...w,
                                phonetic: this.cleanKanaInRomaji(w.phonetic || '')
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
        }, 35);
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
            const prevIdx = this.activeSentenceIndex;
            this.activeSentenceIndex = activeIdx;

            // Nếu đang trong chế độ Luyện Chép, tự động chuyển vòng lặp và dời ô nhập
            if (this.isDictationMode && activeIdx !== prevIdx && activeIdx >= 0) {
                this.loopSentenceIndex = activeIdx;
                this.renderLyrics();
                return;
            }

            // O(1) DOM class toggle: gỡ class active của câu trước
            if (prevIdx >= 0) {
                const prevRow = document.getElementById(`sentence-row-${prevIdx}`);
                if (prevRow) prevRow.classList.remove('active');
            }

            // Gán class active cho câu hiện tại và cuộn mượt mà
            if (activeIdx >= 0) {
                const currentRow = document.getElementById(`sentence-row-${activeIdx}`);
                if (currentRow) {
                    currentRow.classList.add('active');

                    if (this.isAutoScrollEnabled || forceScroll) {
                        const container = document.getElementById('lyrics-stream-container');
                        if (container) {
                            const rowTop = currentRow.offsetTop;
                            const rowHeight = currentRow.offsetHeight;
                            const containerHeight = container.clientHeight;
                            const targetTop = rowTop - (containerHeight / 2) + (rowHeight / 2);
                            container.scrollTo({
                                top: Math.max(0, targetTop),
                                behavior: 'smooth'
                            });
                        }
                    }
                } else {
                    // Fallback an toàn nếu chưa render xong
                    document.querySelectorAll('.lyrics-sentence-row').forEach((row, i) => {
                        row.classList.toggle('active', i === activeIdx);
                    });
                }
            }
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

    getAllSongVocab() {
        if (!this.currentSong) return [];
        const lines = this.getActiveLyrics();
        if (!Array.isArray(lines) || lines.length === 0) return [];
        const map = new Map();
        lines.forEach((line, lineIdx) => {
            if (Array.isArray(line.words)) {
                line.words.forEach(w => {
                    if (!w || !w.word) return;
                    const cleanWord = w.word.trim();
                    if (!cleanWord) return;
                    const key = cleanWord.toLowerCase();
                    if (!map.has(key)) {
                        map.set(key, {
                            word: cleanWord,
                            phonetic: w.phonetic || '',
                            pos: w.pos || 'noun',
                            meaning: w.meaning || '',
                            contextSentence: line.text || '',
                            sentenceIndex: lineIdx
                        });
                    }
                });
            }
        });
        return Array.from(map.values());
    }

    getVocabSummaryHtml() {
        const vocabList = this.getAllSongVocab();
        const navLabel = document.getElementById('vocab-summary-nav-label');
        if (navLabel) {
            navLabel.textContent = `Sổ từ vựng (${vocabList.length})`;
        }

        if (vocabList.length === 0) {
            return `
                <div class="song-vocab-summary-card" id="song-vocab-summary-card">
                    <div class="vocab-summary-header">
                        <div>
                            <div class="vocab-summary-title">
                                <i class="fa-solid fa-graduation-cap"></i> Sổ tay từ vựng & thành ngữ bài hát
                            </div>
                            <div class="vocab-summary-sub">Chưa có từ vựng nào được bóc tách cho bài hát này</div>
                        </div>
                        <button type="button" class="btn-tool-action btn-ai-gradient" onclick="window.lyricsApp.triggerAiAnalysis(true)">
                            <i class="fa-solid fa-wand-magic-sparkles"></i> Phân tích AI để trích xuất từ
                        </button>
                    </div>
                </div>
            `;
        }

        const songTitle = this.currentSong ? this.currentSong.title : 'Bài hát';

        return `
            <div class="song-vocab-summary-card" id="song-vocab-summary-card">
                <div class="vocab-summary-header">
                    <div>
                        <div class="vocab-summary-title">
                            <i class="fa-solid fa-graduation-cap"></i> Sổ tay từ vựng & thành ngữ (${vocabList.length} mục)
                        </div>
                        <div class="vocab-summary-sub">Tổng hợp các từ khóa, cụm từ & thành ngữ quan trọng xuất hiện trong "${this.escapeHtml(songTitle)}"</div>
                    </div>
                    <button type="button" class="btn-save-all-deck" onclick="window.lyricsApp.saveAllVocabToDeck()">
                        <i class="fa-solid fa-folder-plus"></i> Lưu tất cả (${vocabList.length}) vào Sổ từ vựng
                    </button>
                </div>

                <div class="vocab-summary-grid">
                    ${vocabList.map(item => `
                        <div class="vocab-summary-chip-card" onclick="window.lyricsApp.seekToSentence(${item.sentenceIndex})">
                            <div class="chip-card-top">
                                <div class="chip-word-group">
                                    <span class="chip-card-word">${this.escapeHtml(item.word)}</span>
                                    <button type="button" class="chip-card-speak-btn" onclick="event.stopPropagation(); window.lyricsApp.speak('${this.escapeHtml(item.word).replace(/'/g, "\\'")}', '${this.currentSong?.lang || 'en'}')" title="Phát âm">
                                        <i class="fa-solid fa-volume-high"></i>
                                    </button>
                                </div>
                                <span class="chip-card-pos">${this.escapeHtml(item.pos || 'từ vựng')}</span>
                            </div>
                            ${item.phonetic ? `<div class="chip-card-phonetic">${this.escapeHtml(item.phonetic)}</div>` : ''}
                            <div class="chip-card-meaning">${this.escapeHtml(item.meaning)}</div>
                            <div class="chip-card-actions">
                                <button type="button" class="btn-save-single-vocab" onclick="event.stopPropagation(); window.lyricsApp.saveVocabFromLyrics('${this.escapeHtml(item.word).replace(/'/g, "\\'")}', '${this.escapeHtml(item.meaning).replace(/'/g, "\\'")}', '${this.escapeHtml(item.phonetic).replace(/'/g, "\\'")}', '${this.escapeHtml(item.pos)}')">
                                    <i class="fa-solid fa-bookmark"></i> Lưu từ
                                </button>
                                <button type="button" class="btn-goto-sentence" onclick="event.stopPropagation(); window.lyricsApp.seekToSentence(${item.sentenceIndex})">
                                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Xem câu
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    scrollToVocabSummary() {
        const card = document.getElementById('song-vocab-summary-card');
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            this.showToast('Chưa có sổ từ vựng cho bài hát này. Hãy bấm "Phân tích AI"!', 'info');
        }
    }

    saveAllVocabToDeck() {
        const vocabList = this.getAllSongVocab();
        if (vocabList.length === 0) {
            this.showToast('Không có từ vựng nào để lưu.', 'warning');
            return;
        }

        const songTitle = this.currentSong ? this.currentSong.title : 'Bài hát';
        const lang = this.currentSong ? this.currentSong.lang : 'en';

        // 1. Nếu có deckSelector dạng mở nhiều từ (batch):
        if (window.deckSelector && typeof window.deckSelector.openBatch === 'function') {
            window.deckSelector.openBatch({
                cards: vocabList.map(v => ({
                    word: v.word,
                    meaning: v.meaning,
                    phonetic: v.phonetic,
                    pos: v.pos,
                    example: `Trích từ bài hát: "${songTitle}" - Câu: "${v.contextSentence}"`,
                    lang: lang
                })),
                onSave: (deck) => {
                    this.showToast(`Đã lưu ${vocabList.length} từ vào bộ "${deck ? deck.title : 'Từ vựng'}"!`, 'success');
                }
            });
            return;
        }

        // 2. Lưu trực tiếp vào LocalStorage qua studyStorage
        let savedCount = 0;
        if (window.studyStorage && typeof window.studyStorage.getDecks === 'function') {
            let decks = window.studyStorage.getDecks(lang);
            let targetDeck = decks.find(d => d.title && d.title.includes(songTitle)) ||
                             decks.find(d => d.title && d.title.includes('Sổ tay từ vựng qua bài hát'));
            if (!targetDeck) {
                targetDeck = {
                    id: `deck_song_${Date.now()}`,
                    title: `Bài hát: ${songTitle} (${lang.toUpperCase()})`,
                    description: `Sổ từ vựng học qua bài hát "${songTitle}"`,
                    lang: lang,
                    words: []
                };
                decks.push(targetDeck);
            }
            if (!targetDeck.words) targetDeck.words = [];

            vocabList.forEach(v => {
                const exists = targetDeck.words.some(w => w.word.toLowerCase() === v.word.toLowerCase());
                if (!exists) {
                    targetDeck.words.unshift({
                        id: 'lyrics_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                        word: v.word,
                        meaning: v.meaning,
                        phonetic: v.phonetic,
                        pos: v.pos,
                        example: v.contextSentence,
                        exampleTrans: '',
                        note: `Từ bài hát: ${songTitle}`,
                        status: 'new',
                        createdAt: new Date().toISOString()
                    });
                    savedCount++;
                }
            });
            window.studyStorage.saveDecks(decks, lang);
        }

        // 3. Cũng đồng bộ thêm vào studyCloud nếu có
        if (window.studyCloud && typeof window.studyCloud.addVocabCard === 'function') {
            vocabList.forEach(v => {
                window.studyCloud.addVocabCard({
                    word: v.word,
                    meaning: v.meaning,
                    phonetic: v.phonetic,
                    pos: v.pos,
                    lang: lang,
                    example: v.contextSentence
                }).catch(() => {});
            });
        }

        this.showToast(`✨ Đã lưu thành công ${vocabList.length} từ vựng bài hát vào Sổ từ vựng của bạn!`, 'success');
    }

    // =========================================================================
    // 7. TÌM KIẾM BÀI HÁT THÔNG MINH ĐA TẦNG (SMART MULTI-STRATEGY SEARCH)
    // =========================================================================
    removeVietnameseTones(str) {
        if (!str) return '';
        str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
        str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
        str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
        str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
        str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
        str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
        str = str.replace(/đ/g, "d");
        str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
        str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
        str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
        str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
        str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
        str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
        str = str.replace(/Đ/g, "D");
        return str.toLowerCase().trim();
    }

    async searchSong(query) {
        if (!query) return;
        query = query.trim();

        const searchBtn = document.getElementById('lyrics-search-btn');
        if (searchBtn) searchBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tìm...';

        try {
            // 0. Nếu người dùng nhập thẳng URL YouTube hoặc Video ID (11 ký tự):
            const ytMatch = query.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/|^)([a-zA-Z0-9_-]{11})(?:\S*)?$/i);
            if (ytMatch && ytMatch[1] && (query.includes('http') || query.includes('youtu') || query.length === 11)) {
                const vId = ytMatch[1];
                let ytTitle = 'Bài hát YouTube';
                let ytChannel = 'YouTube Music';
                try {
                    const oeRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vId}&format=json`).then(r => r.json());
                    if (oeRes && oeRes.title) {
                        ytTitle = oeRes.title;
                        ytChannel = oeRes.author_name || 'YouTube';
                    }
                } catch (oeErr) {}

                // Làm sạch tiêu đề video để tự động dò lời trên LRCLIB
                const cleanTitle = ytTitle
                    .replace(/\[(?:Vietsub|Pinyin|Official|MV|Lyrics|HD|4K|Audio|Full)[^\]]*\]/gi, '')
                    .replace(/\((?:Vietsub|Pinyin|Official|MV|Lyrics|HD|4K|Audio|Full)[^\)]*\)/gi, '')
                    .replace(/[\-–—|].*$/, '')
                    .trim();

                let fetchedLyrics = [];
                let plainText = '';

                try {
                    const lrcUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitle || ytTitle)}`;
                    const lrcRes = await fetch(lrcUrl).then(r => r.json());
                    if (Array.isArray(lrcRes) && lrcRes.length > 0) {
                        const topHit = lrcRes[0];
                        if (topHit.syncedLyrics) {
                            fetchedLyrics = this.parseLrc(topHit.syncedLyrics);
                            plainText = topHit.plainLyrics || topHit.syncedLyrics;
                        }
                    }
                } catch (lrcErr) {
                    console.warn('[LRCLIB YouTube Auto-Lyrics]', lrcErr);
                }

                const customSong = {
                    id: `yt-${vId}`,
                    title: ytTitle,
                    artist: ytChannel,
                    lang: this.detectLanguage(ytTitle),
                    thumbnail: `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
                    youtube_id: vId,
                    yt_candidates: [vId],
                    audio_url: '',
                    duration: 180,
                    synced_lyrics: fetchedLyrics,
                    plain_lyrics: plainText,
                    views: 1,
                    created_by: 'YouTube Direct',
                    community_versions: []
                };

                this.loadSong(customSong);
                if (fetchedLyrics.length > 0) {
                    this.showToast(`✨ Đã nhận diện bài hát và tự động nạp ${fetchedLyrics.length} câu lời Karaoke!`, 'success', 3500);
                } else {
                    this.showToast(`✨ Đã nạp MV YouTube: "${ytTitle}"! Bạn có thể bấm "Đóng góp bản dịch" để nhập lời nhé!`, 'info', 3500);
                }
                return;
            }

            const candidates = [];
            const qNorm = this.removeVietnameseTones(query);
            const qLower = query.toLowerCase();
            const qClean = query.replace(/[-–—|/]/g, ' ').replace(/\s+/g, ' ').trim();

            // 1. Kiểm tra trong danh sách Featured Songs cục bộ (hỗ trợ tiếng Việt không dấu & Hán Việt)
            this.featuredSongs.forEach(s => {
                const titleNorm = this.removeVietnameseTones(s.title);
                const artistNorm = this.removeVietnameseTones(s.artist);
                const aliases = Array.isArray(s.aliases) ? s.aliases.map(a => this.removeVietnameseTones(a)) : [];
                
                const isMatch = titleNorm.includes(qNorm) || 
                                artistNorm.includes(qNorm) || 
                                aliases.some(a => a.includes(qNorm)) || 
                                s.title.toLowerCase().includes(qLower) || 
                                s.artist.toLowerCase().includes(qLower) || 
                                qLower.includes(s.id);

                if (isMatch) {
                    candidates.push({
                        type: 'featured',
                        rawSong: s,
                        trackName: s.title,
                        artistName: s.artist,
                        albumName: 'Tuyển chọn MHEnt',
                        duration: s.duration,
                        hasSynced: true,
                        thumbnail: s.thumbnail || '',
                        lang: s.lang
                    });
                }
            });

            // 1B. Kiểm tra trong danh sách Custom Songs do học viên/người dùng đã thêm
            const customSongs = this.getAllCustomSongs();
            customSongs.forEach(s => {
                const titleNorm = this.removeVietnameseTones(s.title || '');
                const artistNorm = this.removeVietnameseTones(s.artist || '');
                const aliases = Array.isArray(s.aliases) ? s.aliases.map(a => this.removeVietnameseTones(a)) : [];
                
                const isMatch = titleNorm.includes(qNorm) || 
                                artistNorm.includes(qNorm) || 
                                aliases.some(a => a.includes(qNorm)) || 
                                (s.title && s.title.toLowerCase().includes(qLower)) || 
                                (s.artist && s.artist.toLowerCase().includes(qLower)) || 
                                qLower.includes(s.id);

                if (isMatch && !candidates.some(c => c.rawSong && c.rawSong.id === s.id)) {
                    candidates.push({
                        type: 'custom',
                        rawSong: s,
                        trackName: s.title,
                        artistName: s.artist || 'Nghệ sĩ',
                        albumName: s.created_by ? `Đăng bởi ${s.created_by}` : 'Học viên MHEnt',
                        duration: s.duration || 180,
                        hasSynced: Array.isArray(s.synced_lyrics) && s.synced_lyrics.length > 0,
                        thumbnail: s.thumbnail || (s.youtube_id ? `https://img.youtube.com/vi/${s.youtube_id}/hqdefault.jpg` : ''),
                        lang: s.lang || 'en',
                        badge: 'Học viên đăng'
                    });
                }
            });

            // 1C. Kiểm tra trong Supabase Cloud
            if (window.studyCloud && typeof window.studyCloud.listSongs === 'function') {
                try {
                    const cloudSongs = await window.studyCloud.listSongs();
                    if (Array.isArray(cloudSongs)) {
                        for (const cs of cloudSongs) {
                            const csTitleNorm = this.removeVietnameseTones(cs.title);
                            const csArtistNorm = this.removeVietnameseTones(cs.artist);
                            const csAliases = Array.isArray(cs.aliases) ? cs.aliases.map(a => this.removeVietnameseTones(a)) : [];

                            const isCsMatch = csTitleNorm.includes(qNorm) || 
                                              csArtistNorm.includes(qNorm) || 
                                              csAliases.some(a => a.includes(qNorm)) || 
                                              cs.title.toLowerCase().includes(qLower) || 
                                              cs.artist.toLowerCase().includes(qLower) || 
                                              qLower.includes(cs.id);

                            if (isCsMatch) {
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
                                            thumbnail: fullSong.thumbnail || '',
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

            // 2. Tìm kiếm song song trên Apple Music/iTunes API & LRCLIB API
            const itunesPromise = fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(qClean)}&entity=song&limit=10`)
                .then(r => r.json())
                .catch(() => ({ results: [] }));

            const lrclibQueries = [
                `https://lrclib.net/api/search?q=${encodeURIComponent(qClean)}`
            ];
            if (/[-–—|/]|\s+by\s+/i.test(query)) {
                const parts = query.split(/[-–—|/]|\s+by\s+/i).map(s => s.trim()).filter(Boolean);
                if (parts.length >= 2) {
                    const track = parts[0];
                    const artist = parts[1];
                    lrclibQueries.push(`https://lrclib.net/api/search?track_name=${encodeURIComponent(track)}&artist_name=${encodeURIComponent(artist)}`);
                    lrclibQueries.push(`https://lrclib.net/api/search?q=${encodeURIComponent(track + ' ' + artist)}`);
                }
            }
            const lrclibPromise = Promise.allSettled(lrclibQueries.map(u => fetch(u).then(r => r.json()).catch(() => [])));

            const [itunesRes, lrclibSettled] = await Promise.all([itunesPromise, lrclibPromise]);
            const itunesList = Array.isArray(itunesRes?.results) ? itunesRes.results : [];

            let lrclibRaw = [];
            lrclibSettled.forEach(s => {
                if (s.status === 'fulfilled' && Array.isArray(s.value)) {
                    lrclibRaw.push(...s.value);
                }
            });

            // Nếu iTunes tìm thấy bài hát chính xác, thực hiện truy vấn targeted sang LRCLIB cho 3 bài đầu
            const lrclibTargeted = [];
            if (itunesList.length > 0) {
                const targetedTasks = itunesList.slice(0, 3).map(it => 
                    fetch(`https://lrclib.net/api/search?track_name=${encodeURIComponent(it.trackName)}&artist_name=${encodeURIComponent(it.artistName)}`)
                        .then(r => r.json())
                        .catch(() => [])
                );
                const targetedRes = await Promise.allSettled(targetedTasks);
                targetedRes.forEach(tr => {
                    if (tr.status === 'fulfilled' && Array.isArray(tr.value)) {
                        lrclibTargeted.push(...tr.value);
                    }
                });
            }

            const allLrc = [...lrclibTargeted, ...lrclibRaw];
            const seenKeys = new Set(candidates.map(c => `${c.trackName.toLowerCase()}_${c.artistName.toLowerCase()}`));

            allLrc.forEach(r => {
                if (!r || !r.trackName || !r.artistName) return;
                const key = `${r.trackName.toLowerCase()}_${r.artistName.toLowerCase()}`;
                if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    const itMatch = itunesList.find(it => 
                        it.trackName.toLowerCase() === r.trackName.toLowerCase() ||
                        r.trackName.toLowerCase().includes(it.trackName.toLowerCase()) ||
                        it.trackName.toLowerCase().includes(r.trackName.toLowerCase())
                    );
                    const art = itMatch?.artworkUrl100 ? itMatch.artworkUrl100.replace('100x100bb', '600x600bb') : '';
                    candidates.push({
                        type: 'lrclib',
                        lrclibData: r,
                        trackName: r.trackName,
                        artistName: r.artistName,
                        albumName: r.albumName || itMatch?.collectionName || 'Single / Album',
                        duration: r.duration || 180,
                        hasSynced: !!r.syncedLyrics,
                        thumbnail: art,
                        previewUrl: itMatch?.previewUrl || '',
                        lang: this.detectLanguage(r.trackName + ' ' + (r.syncedLyrics || r.plainLyrics || ''))
                    });
                }
            });

            // Gộp thêm các bài từ iTunes chưa có trên LRCLIB (người dùng vẫn có thể học qua MV/Audio & AISA AI)
            itunesList.forEach(it => {
                const key = `${it.trackName.toLowerCase()}_${it.artistName.toLowerCase()}`;
                if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    candidates.push({
                        type: 'itunes',
                        itunesData: it,
                        trackName: it.trackName,
                        artistName: it.artistName,
                        albumName: it.collectionName || 'Single / Album',
                        duration: Math.round((it.trackTimeMillis || 180000) / 1000),
                        hasSynced: false,
                        thumbnail: it.artworkUrl100 ? it.artworkUrl100.replace('100x100bb', '600x600bb') : '',
                        previewUrl: it.previewUrl || '',
                        lang: this.detectLanguage(it.trackName + ' ' + it.artistName)
                    });
                }
            });

            // Sắp xếp ưu tiên: Tuyển chọn -> Có Synced Lyrics -> Bài khác
            candidates.sort((a, b) => {
                if (a.type === 'featured' && b.type !== 'featured') return -1;
                if (b.type === 'featured' && a.type !== 'featured') return 1;
                if (a.hasSynced && !b.hasSynced) return -1;
                if (!a.hasSynced && b.hasSynced) return 1;
                return 0;
            });

            if (candidates.length === 0) {
                // Tầng dự phòng cao cấp: Tìm kiếm video YouTube qua AISA Worker để người học vẫn có thể học bất kỳ bài hát nào
                try {
                    const endpoint = (window.MHENT_CONFIG && window.MHENT_CONFIG.AISA_API_ENDPOINT) || 'https://api.mhentuniverse.com';
                    const ytRes = await fetch(`${endpoint}/api/youtube-search?q=${encodeURIComponent(query + ' MV Full')}`).then(r => r.json());
                    if (ytRes && Array.isArray(ytRes.candidates) && ytRes.candidates.length > 0) {
                        const topIds = ytRes.candidates.slice(0, 4);
                        for (const yId of topIds) {
                            let yTitle = `Video YouTube: ${query}`;
                            let yAuthor = 'YouTube Music';
                            try {
                                const oe = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${yId}&format=json`).then(r => r.json());
                                if (oe?.title) {
                                    yTitle = oe.title;
                                    yAuthor = oe.author_name || 'YouTube';
                                }
                            } catch (e) {}

                            candidates.push({
                                type: 'youtube',
                                youtubeId: yId,
                                trackName: yTitle,
                                artistName: yAuthor,
                                albumName: 'Bản YouTube MV',
                                duration: 180,
                                hasSynced: false,
                                thumbnail: `https://img.youtube.com/vi/${yId}/hqdefault.jpg`,
                                lang: this.detectLanguage(yTitle)
                            });
                        }
                    }
                } catch (ytErr) {
                    console.warn('[YouTube Search Fallback Error]:', ytErr);
                }
            }

            if (candidates.length === 0) {
                this.showToast(`Không tìm thấy bài hát nào cho từ khóa "${query}". Bạn có thể dán link YouTube của bài hát vào đây để học nhé!`, 'warning');
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

    async openLibraryBrowser() {
        // 1. Tuyển chọn có sẵn (Featured Songs)
        const candidates = this.featuredSongs.map(s => ({
            type: 'featured',
            rawSong: s,
            trackName: s.title,
            artistName: s.artist,
            albumName: 'Tuyển chọn MHEnt',
            duration: s.duration,
            hasSynced: true,
            lang: s.lang,
            thumbnail: s.thumbnail || '',
            badge: 'Tuyển chọn'
        }));

        const addedIds = new Set(this.featuredSongs.map(s => s.id));
        const addedKeys = new Set(this.featuredSongs.map(s => `${(s.title || '').trim().toLowerCase()}___${(s.artist || '').trim().toLowerCase()}`));

        // 2. Toàn bộ bài hát do người dùng thêm/điền lưu trong localStorage (Custom Songs & Sync Studio)
        const customSongs = this.getAllCustomSongs();
        customSongs.forEach(cs => {
            const key = `${(cs.title || '').trim().toLowerCase()}___${(cs.artist || '').trim().toLowerCase()}`;
            if (!addedIds.has(cs.id) && !addedKeys.has(key)) {
                addedIds.add(cs.id);
                addedKeys.add(key);
                candidates.push({
                    type: 'custom',
                    rawSong: cs,
                    trackName: cs.title,
                    artistName: cs.artist || 'Nghệ sĩ',
                    albumName: cs.created_by ? `Đăng bởi ${cs.created_by}` : 'Học viên MHEnt',
                    duration: cs.duration || 180,
                    hasSynced: Array.isArray(cs.synced_lyrics) && cs.synced_lyrics.length > 0,
                    lang: cs.lang || 'en',
                    thumbnail: cs.thumbnail || (cs.youtube_id ? `https://img.youtube.com/vi/${cs.youtube_id}/hqdefault.jpg` : ''),
                    badge: 'Học viên đăng'
                });
            }
        });

        // 3. Nếu bài hiện tại đang mở chưa có trong danh sách, đưa vào luôn
        if (this.currentSong && this.currentSong.title) {
            const curKey = `${(this.currentSong.title || '').trim().toLowerCase()}___${(this.currentSong.artist || '').trim().toLowerCase()}`;
            if (!addedIds.has(this.currentSong.id) && !addedKeys.has(curKey)) {
                addedIds.add(this.currentSong.id);
                addedKeys.add(curKey);
                candidates.unshift({
                    type: 'custom',
                    rawSong: this.currentSong,
                    trackName: this.currentSong.title,
                    artistName: this.currentSong.artist || 'Nghệ sĩ',
                    albumName: 'Bài đang học',
                    duration: this.currentSong.duration || 180,
                    hasSynced: Array.isArray(this.currentSong.synced_lyrics) && this.currentSong.synced_lyrics.length > 0,
                    lang: this.currentSong.lang || 'en',
                    thumbnail: this.currentSong.thumbnail || (this.currentSong.youtube_id ? `https://img.youtube.com/vi/${this.currentSong.youtube_id}/hqdefault.jpg` : ''),
                    badge: 'Đang mở'
                });
            }
        }

        // Mở modal ngay lập tức để người học không phải chờ đợi
        this.openSongSelectModal(candidates, 'Kho Bài Hát Ngoại Ngữ Tuyển Chọn', `Khám phá toàn bộ ${candidates.length} bài hát có sẵn lời karaoke đồng bộ và phân tích từ vựng chuyên sâu`);

        // 4. Tải tiếp toàn bộ bài hát từ máy chủ Supabase Cloud (study_songs)
        if (window.studyCloud && typeof window.studyCloud.listSongs === 'function') {
            try {
                const cloudSongs = await window.studyCloud.listSongs('all');
                if (Array.isArray(cloudSongs) && cloudSongs.length > 0) {
                    let hasNew = false;
                    cloudSongs.forEach(cs => {
                        const key = `${(cs.title || '').trim().toLowerCase()}___${(cs.artist || '').trim().toLowerCase()}`;
                        if (!addedIds.has(cs.id) && !addedKeys.has(key)) {
                            addedIds.add(cs.id);
                            addedKeys.add(key);
                            candidates.push({
                                type: 'cloud',
                                cloudId: cs.id,
                                rawSong: cs,
                                trackName: cs.title,
                                artistName: cs.artist || 'Nghệ sĩ',
                                albumName: cs.created_by ? `Đăng bởi ${cs.created_by}` : 'Cộng đồng MHEnt',
                                duration: cs.duration || 180,
                                hasSynced: true,
                                lang: cs.lang || 'en',
                                thumbnail: cs.thumbnail || (cs.youtube_id ? `https://img.youtube.com/vi/${cs.youtube_id}/hqdefault.jpg` : ''),
                                badge: 'Cộng đồng'
                            });
                            hasNew = true;
                        }
                    });

                    if (hasNew) {
                        const subEl = document.getElementById('song-select-modal-subtitle');
                        if (subEl) subEl.textContent = `Khám phá toàn bộ ${candidates.length} bài hát có sẵn lời karaoke đồng bộ và phân tích từ vựng chuyên sâu`;
                        this.renderSongSelectList();
                    }
                }
            } catch (cloudErr) {
                console.warn('Lỗi tải bài hát cloud:', cloudErr);
            }
        }
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

        const langMap = { en: '🇬🇧 EN', ko: '🇰🇷 KO', ja: '🇯🇵 JA', zh: '🇨🇳 ZH', vi: '🇻🇳 VI' };

        listContainer.innerHTML = filtered.map((item, idx) => {
            const durationStr = this.formatSeconds(item.duration);
            const isFeatured = item.type === 'featured';

            return `
                <div class="song-select-item" onclick="window.lyricsApp.selectCandidateByIndex(${idx})">
                    <div class="song-item-cover-wrap">
                        ${item.thumbnail ? 
                            `<img src="${this.escapeHtml(item.thumbnail)}" class="song-item-cover-img" alt="Cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                             <i class="fa-solid fa-music song-item-cover-icon" style="display: none;"></i>` :
                            `<i class="fa-solid fa-music song-item-cover-icon"></i>`
                        }
                        <span class="song-item-lang-pill">${langMap[item.lang] || '🌐 ALL'}</span>
                    </div>

                    <div class="song-item-info">
                        <div class="song-item-title-row">
                            <span class="song-item-title">${this.escapeHtml(item.trackName)}</span>
                            ${isFeatured ? 
                                '<span class="badge-featured"><i class="fa-solid fa-star"></i> Tuyển chọn</span>' : 
                                (item.badge ? `<span class="badge-featured" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2)); color: #34d399; border-color: rgba(52, 211, 153, 0.4);"><i class="fa-solid fa-users"></i> ${this.escapeHtml(item.badge)}</span>` : '')
                            }
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

        if (candidate.type === 'custom' && candidate.rawSong) {
            this.loadSong(candidate.rawSong);
            this.showToast(`Đang tải bài hát: ${candidate.trackName}`, 'success');
            return;
        }

        if (candidate.type === 'cloud') {
            this.showToast(`Đang tải bài hát từ máy chủ: ${candidate.trackName}...`, 'info', 2000);
            let fullSong = null;
            if (window.studyCloud && typeof window.studyCloud.getSong === 'function') {
                try {
                    fullSong = await window.studyCloud.getSong(candidate.cloudId || candidate.rawSong?.id);
                } catch (e) {
                    console.warn('Lỗi lấy bài hát chi tiết từ cloud:', e);
                }
            }
            if (fullSong) {
                this.saveCustomSongToLocal(fullSong);
                this.loadSong(fullSong);
                this.showToast(`Đã tải bài hát: ${fullSong.title}`, 'success');
            } else if (candidate.rawSong) {
                this.loadSong(candidate.rawSong);
            }
            return;
        }

        if (candidate.type === 'youtube') {
            const newSong = {
                id: `yt-${candidate.youtubeId}`,
                title: candidate.trackName,
                artist: candidate.artistName,
                lang: candidate.lang || 'en',
                youtube_id: candidate.youtubeId,
                yt_candidates: [candidate.youtubeId],
                audio_url: '',
                thumbnail: candidate.thumbnail,
                duration: 180,
                synced_lyrics: [],
                plain_lyrics: '',
                views: 1,
                created_by: 'YouTube Direct',
                community_versions: []
            };
            this.loadSong(newSong);
            this.showToast(`✨ Đã nạp video: "${newSong.title}". Hãy bấm nút "Phân tích AI" hoặc thêm lời để học nhé!`, 'success');
            return;
        }

        let item = candidate.lrclibData;
        if (!item && candidate.type === 'itunes') {
            const it = candidate.itunesData;
            // Thử tra cứu nhanh LRCLIB một lần nữa với tên chuẩn iTunes
            try {
                const getRes = await fetch(`https://lrclib.net/api/get?track_name=${encodeURIComponent(it.trackName)}&artist_name=${encodeURIComponent(it.artistName)}`);
                if (getRes.ok) {
                    item = await getRes.json();
                }
            } catch (e) {}

            if (!item) {
                item = {
                    trackName: it.trackName,
                    artistName: it.artistName,
                    duration: Math.round((it.trackTimeMillis || 180000) / 1000),
                    plainLyrics: '',
                    syncedLyrics: ''
                };
            }
        }
        if (!item) return;

        this.showToast(`Đang bóc tách lời bài hát & tìm video MV: ${item.trackName}...`, 'info', 3000);

        try {
            const parsedLyrics = this.parseLrc(item.syncedLyrics || item.plainLyrics || '');
            const detectedLang = candidate.lang || this.detectLanguage(item.trackName + ' ' + (item.syncedLyrics || ''));

            // Tự động tìm kiếm video YouTube ID cho bài hát này qua AISA API Worker
            let foundYtId = '';
            let ytCandidates = [];
            try {
                const endpoint = (window.MHENT_CONFIG && window.MHENT_CONFIG.AISA_API_ENDPOINT) || 'https://api.mhentuniverse.com';
                // Chiến lược tìm kiếm Full Version: nếu bài hát dài > 90s, thêm "Full" vào từ khóa để tránh vướng phải MV cắt ngắn / TV Size
                const searchQ = (item.duration && item.duration > 90) ? 
                    `${item.trackName} ${item.artistName} Full` : 
                    `${item.trackName} ${item.artistName}`;

                const ytRes = await fetch(`${endpoint}/api/youtube-search?q=${encodeURIComponent(searchQ)}`);
                if (ytRes.ok) {
                    const ytData = await ytRes.json();
                    if (ytData && ytData.videoId) {
                        foundYtId = ytData.videoId;
                        ytCandidates = ytData.candidates || [];
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
                yt_candidates: ytCandidates,
                audio_url: candidate.previewUrl || '',
                thumbnail: candidate.thumbnail || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=60',
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
        if (!lrcText || typeof lrcText !== 'string') return [];
        const lines = lrcText.split('\n');
        const result = [];
        
        // Flexible timestamp regex: matches [mm:ss], [m:ss.xx], [mm:ss:xx], [mm:ss.xxx], [mm:s.xx]
        const tagRegex = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

        lines.forEach((rawLine) => {
            const line = rawLine.trim();
            if (!line || /^\[(ti|ar|al|by|offset|length|re|ve):/i.test(line)) return;

            const timestamps = [];
            let match;
            tagRegex.lastIndex = 0;

            while ((match = tagRegex.exec(line)) !== null) {
                const min = parseInt(match[1], 10);
                const sec = parseInt(match[2], 10);
                const msRaw = match[3] || '0';
                const ms = parseFloat('0.' + msRaw);
                timestamps.push(parseFloat((min * 60 + sec + ms).toFixed(3)));
            }

            // Extract text by stripping all timestamp tags
            const text = line.replace(/\[\d{1,2}:\d{1,2}(?:[.:]\d{1,3})?\]/g, '').trim();

            if (timestamps.length > 0 && text) {
                timestamps.forEach(t => {
                    result.push({
                        startTime: t,
                        endTime: 0,
                        text: text,
                        phonetic: '',
                        translation: text,
                        words: []
                    });
                });
            }
        });

        // Nếu là plain text không có mốc thời gian, không được bỏ rơi lời bài hát!
        if (result.length === 0) {
            const textLines = lines
                .map(l => l.replace(/^\[.*?\]/, '').trim())
                .filter(l => l.length > 0 && !/^\[(ti|ar|al|by|offset|length|re|ve):/i.test(l));

            const totalDur = (this.currentSong && this.currentSong.duration) || 180;
            const step = Math.max(3, parseFloat((totalDur / (textLines.length + 1)).toFixed(2)));

            textLines.forEach((tl, idx) => {
                result.push({
                    startTime: parseFloat((idx * step).toFixed(2)),
                    endTime: parseFloat(((idx + 1) * step).toFixed(2)),
                    text: tl,
                    phonetic: '',
                    translation: tl,
                    words: []
                });
            });
        }

        // Sắp xếp tuần tự theo startTime
        result.sort((a, b) => a.startTime - b.startTime);

        // Gán ID và endTime liên tục
        result.forEach((item, idx) => {
            item.id = idx + 1;
            item.endTime = (idx < result.length - 1) ? result[idx + 1].startTime : item.startTime + 4.5;
        });

        return result;
    }

    detectLanguage(text) {
        if (/[\uac00-\ud7a3]/.test(text)) return 'ko'; // Hangeul
        if (/[\u3040-\u30ff]/.test(text)) return 'ja'; // Kana / Japanese
        if (/[\u4e00-\u9fa5]/.test(text)) return 'zh'; // Chinese
        if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text)) return 'vi'; // Tiếng Việt
        return 'en';
    }

    // =========================================================================
    // 8. ĐÓNG GÓP BẢN DỊCH CỘNG ĐỒNG (COMMUNITY CONTRIBUTIONS)
    // =========================================================================
    // 8. ĐÓNG GÓP BẢN DỊCH & THẺ TỪ VỰNG CỘNG ĐỒNG (COMMUNITY CONTRIBUTIONS & VOCAB)
    // =========================================================================
    openContribModal(versionToEdit = null) {
        if (!this.currentSong) return;
        const modal = document.getElementById('contrib-modal');
        if (!modal) return;

        this.editingVersionId = versionToEdit ? versionToEdit.id : null;

        const modalTitle = document.getElementById('contrib-modal-title');
        const submitBtn = document.getElementById('btn-contrib-submit');
        const authorInput = document.getElementById('contrib-author');
        const titleInput = document.getElementById('contrib-title');
        const noteInput = document.getElementById('contrib-note');
        const container = document.getElementById('contrib-lines-container');
        const countBadge = document.getElementById('contrib-line-count-badge');

        // Tự động nhận diện danh tính người dùng từ hệ thống Auth
        let userDisplayName = '';
        try {
            const savedProfile = JSON.parse(localStorage.getItem('mhent_user_profile') || localStorage.getItem('mhent_user') || '{}');
            userDisplayName = savedProfile.displayName || savedProfile.name || '';
        } catch (e) {}

        if (versionToEdit) {
            if (modalTitle) {
                modalTitle.innerHTML = `<i class="fa-solid fa-pen-nib" style="color: #38bdf8;"></i> Chỉnh Sửa Bản Dịch: "${this.escapeHtml(versionToEdit.title || '')}"`;
            }
            if (submitBtn) {
                submitBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Lưu Thay Đổi Bản Dịch`;
            }
            if (authorInput) authorInput.value = versionToEdit.author || userDisplayName || 'Học viên MHEnt';
            if (titleInput) titleInput.value = versionToEdit.title || '';
            if (noteInput) noteInput.value = versionToEdit.note || '';

            const sourceLines = (Array.isArray(versionToEdit.synced_lyrics) && versionToEdit.synced_lyrics.length > 0)
                ? versionToEdit.synced_lyrics
                : this.getActiveLyrics();
            this.contribLyrics = JSON.parse(JSON.stringify(sourceLines));
        } else {
            if (modalTitle) {
                modalTitle.innerHTML = `<i class="fa-solid fa-pen-nib" style="color: #10b981;"></i> Đóng Góp Phiên Bản Lời Dịch Mới`;
            }
            if (submitBtn) {
                submitBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Lưu & Xuất bản lên Supabase Cloud`;
            }
            if (authorInput) authorInput.value = userDisplayName || 'Học viên MHEnt';
            if (titleInput) titleInput.value = userDisplayName ? `Bản dịch của ${userDisplayName}` : 'Bản dịch mới';
            if (noteInput) noteInput.value = '';

            const baseLines = this.currentSong.synced_lyrics || this.getActiveLyrics();
            this.contribLyrics = JSON.parse(JSON.stringify(baseLines));
        }

        this.contribLyrics.forEach(l => {
            if (!Array.isArray(l.words)) l.words = [];
        });

        if (countBadge) countBadge.textContent = `${this.contribLyrics.length} câu`;

        if (container) {
            container.innerHTML = this.contribLyrics.map((line, idx) => {
                const timeStr = this.formatSeconds(line.startTime || 0);
                return `
                    <div class="contrib-line-edit-item" data-index="${idx}">
                        <div class="contrib-line-meta">
                            <span class="contrib-line-time"><i class="fa-solid fa-clock"></i> ${timeStr}</span>
                            <span class="contrib-line-idx">Câu ${idx + 1}</span>
                        </div>
                        <div class="contrib-line-orig" data-index="${idx}" title="Bôi đen một từ trong câu này để tạo thẻ từ vựng">${this.escapeHtml(line.text)}</div>
                        ${line.phonetic ? `<div class="contrib-line-phonetic">${this.escapeHtml(line.phonetic)}</div>` : ''}
                        <div class="contrib-line-input-wrap">
                            <input type="text" class="contrib-line-trans-input" data-index="${idx}" value="${this.escapeHtml(line.translation || '')}" placeholder="Nhập bản dịch tiếng Việt cho câu này..." spellcheck="false">
                        </div>
                        <div class="contrib-line-words-section">
                            <div class="contrib-line-words-header">
                                <span class="contrib-words-title"><i class="fa-solid fa-highlighter" style="color: #f59e0b;"></i> Thẻ từ vựng câu này:</span>
                                <button type="button" class="btn-add-word-manual" data-index="${idx}" title="Thêm từ vựng thủ công vào câu này">
                                    <i class="fa-solid fa-plus"></i> Thêm từ
                                </button>
                            </div>
                            <div class="contrib-words-chips-list" id="contrib-words-list-${idx}">
                                <!-- Dynamic chips -->
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // Render word chips và gắn listener cho từng câu
            this.contribLyrics.forEach((_, idx) => {
                this.renderContribLineWords(idx);
            });

            container.querySelectorAll('.btn-add-word-manual').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.dataset.index, 10);
                    if (!isNaN(idx)) {
                        this.openContribVocabDialog(idx, '');
                    }
                });
            });
        }

        // Đóng drawer nếu đang mở
        this.closeVersionsDrawer();

        modal.classList.add('active');
        setTimeout(() => {
            if (titleInput) titleInput.focus();
        }, 150);
    }

    closeContribModal() {
        const modal = document.getElementById('contrib-modal');
        if (modal) modal.classList.remove('active');
        this.editingVersionId = null;
    }

    renderContribLineWords(lineIdx) {
        const container = document.getElementById(`contrib-words-list-${lineIdx}`);
        if (!container || !this.contribLyrics || !this.contribLyrics[lineIdx]) return;

        const words = Array.isArray(this.contribLyrics[lineIdx].words) ? this.contribLyrics[lineIdx].words : [];
        if (words.length === 0) {
            container.innerHTML = `<span class="contrib-words-empty-hint">Chưa có thẻ từ vựng. Bôi đen chữ câu trên hoặc bấm "+ Thêm từ" để gắn thẻ!</span>`;
            return;
        }

        container.innerHTML = words.map((w, wIdx) => `
            <span class="contrib-word-chip" data-line-idx="${lineIdx}" data-word-idx="${wIdx}">
                <span class="chip-w">${this.escapeHtml(w.word)}</span>
                <span class="chip-m">(${this.escapeHtml(w.meaning || '')})</span>
                <button type="button" class="chip-del" data-line-idx="${lineIdx}" data-word-idx="${wIdx}" title="Xóa thẻ">&times;</button>
            </span>
        `).join('');

        container.querySelectorAll('.chip-del').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const lIdx = parseInt(btn.dataset.lineIdx, 10);
                const wIdx = parseInt(btn.dataset.wordIdx, 10);
                if (!isNaN(lIdx) && !isNaN(wIdx) && this.contribLyrics[lIdx] && Array.isArray(this.contribLyrics[lIdx].words)) {
                    this.contribLyrics[lIdx].words.splice(wIdx, 1);
                    this.renderContribLineWords(lIdx);
                    this.showToast('Đã gỡ thẻ từ vựng khỏi câu', 'info', 1200);
                }
            });
        });
    }

    openContribVocabDialog(lineIdx, initialWord = '') {
        const dialog = document.getElementById('contrib-vocab-dialog');
        if (!dialog || lineIdx < 0) return;

        this.activeContribTargetLineIdx = lineIdx;

        const wordInput = document.getElementById('vocab-dialog-word');
        const meaningInput = document.getElementById('vocab-dialog-meaning');
        const phoneticInput = document.getElementById('vocab-dialog-phonetic');
        const posSelect = document.getElementById('vocab-dialog-pos');

        if (wordInput) wordInput.value = initialWord;
        if (meaningInput) meaningInput.value = '';
        if (phoneticInput) phoneticInput.value = '';
        if (posSelect) posSelect.value = 'noun';

        dialog.style.display = 'flex';
        setTimeout(() => {
            if (initialWord && meaningInput) {
                meaningInput.focus();
            } else if (wordInput) {
                wordInput.focus();
            }
        }, 50);
    }

    setupContribVocabHighlighter() {
        const pill = document.getElementById('contrib-selection-tag-pill');
        const pillWord = document.getElementById('contrib-pill-word');
        const dialog = document.getElementById('contrib-vocab-dialog');
        const closeBtn = document.getElementById('btn-vocab-dialog-close');
        const cancelBtn = document.getElementById('btn-vocab-dialog-cancel');
        const saveBtn = document.getElementById('btn-vocab-dialog-save');
        const aiAutofillBtn = document.getElementById('btn-vocab-ai-autofill');
        const linesContainer = document.getElementById('contrib-lines-container');

        if (!dialog) return;

        let selectedWord = '';
        let targetLineIdx = -1;

        const checkSelection = () => {
            if (!pill) return;
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed) {
                pill.style.display = 'none';
                return;
            }

            const rawText = sel.toString().trim();
            if (!rawText || rawText.length > 50) {
                pill.style.display = 'none';
                return;
            }

            const anchorNode = sel.anchorNode;
            const itemEl = anchorNode && anchorNode.nodeType ? anchorNode.parentElement?.closest('.contrib-line-edit-item') : null;
            if (!itemEl || !linesContainer || !linesContainer.contains(itemEl)) {
                pill.style.display = 'none';
                return;
            }

            const idx = parseInt(itemEl.dataset.index, 10);
            if (isNaN(idx)) {
                pill.style.display = 'none';
                return;
            }

            selectedWord = rawText;
            targetLineIdx = idx;
            if (pillWord) pillWord.textContent = rawText.length > 15 ? rawText.slice(0, 12) + '...' : rawText;

            try {
                const range = sel.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                pill.style.left = `${rect.left + rect.width / 2}px`;
                pill.style.top = `${Math.max(10, rect.top - 8)}px`;
                pill.style.display = 'flex';
            } catch (e) {
                pill.style.display = 'none';
            }
        };

        if (linesContainer) {
            linesContainer.addEventListener('mouseup', checkSelection);
            linesContainer.addEventListener('keyup', checkSelection);
        }
        document.addEventListener('selectionchange', () => {
            const modal = document.getElementById('contrib-modal');
            if (modal && modal.classList.contains('active')) {
                checkSelection();
            } else if (pill) {
                pill.style.display = 'none';
            }
        });

        if (pill) {
            pill.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                pill.style.display = 'none';
                this.openContribVocabDialog(targetLineIdx, selectedWord);
            });
        }

        const closeDialog = () => {
            dialog.style.display = 'none';
        };
        if (closeBtn) closeBtn.addEventListener('click', closeDialog);
        if (cancelBtn) cancelBtn.addEventListener('click', closeDialog);

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const wordInput = document.getElementById('vocab-dialog-word');
                const meaningInput = document.getElementById('vocab-dialog-meaning');
                const phoneticInput = document.getElementById('vocab-dialog-phonetic');
                const posSelect = document.getElementById('vocab-dialog-pos');

                const word = (wordInput?.value || '').trim();
                const meaning = (meaningInput?.value || '').trim();
                const phonetic = (phoneticInput?.value || '').trim();
                const pos = posSelect?.value || 'noun';

                if (!word || !meaning) {
                    this.showToast('Vui lòng nhập từ vựng và nghĩa tiếng Việt!', 'warning');
                    return;
                }

                if (this.activeContribTargetLineIdx >= 0 && this.contribLyrics && this.contribLyrics[this.activeContribTargetLineIdx]) {
                    const line = this.contribLyrics[this.activeContribTargetLineIdx];
                    if (!Array.isArray(line.words)) line.words = [];
                    const existingIdx = line.words.findIndex(w => w.word.toLowerCase() === word.toLowerCase());
                    if (existingIdx >= 0) {
                        line.words[existingIdx] = { word, meaning, phonetic, pos };
                    } else {
                        line.words.push({ word, meaning, phonetic, pos });
                    }

                    this.renderContribLineWords(this.activeContribTargetLineIdx);
                    this.showToast(`✨ Đã thêm thẻ từ "${word}" vào câu ${this.activeContribTargetLineIdx + 1}!`, 'success', 2000);
                    closeDialog();
                }
            });
        }

        if (aiAutofillBtn) {
            aiAutofillBtn.addEventListener('click', async () => {
                const wordInput = document.getElementById('vocab-dialog-word');
                const word = (wordInput?.value || '').trim();
                if (!word) {
                    this.showToast('Vui lòng nhập từ gốc trước khi nhờ AI tra cứu!', 'warning');
                    return;
                }

                aiAutofillBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tra...';
                aiAutofillBtn.disabled = true;

                try {
                    const lineText = (this.activeContribTargetLineIdx >= 0 && this.contribLyrics && this.contribLyrics[this.activeContribTargetLineIdx]) ? this.contribLyrics[this.activeContribTargetLineIdx].text : '';
                    const lang = this.currentSong ? this.currentSong.lang : 'en';

                    let result = null;

                    // Chiến lược 1: AISA Cloudflare Worker API (/api/generate-example)
                    try {
                        const endpoint = (window.MHENT_CONFIG && window.MHENT_CONFIG.AISA_API_ENDPOINT) || 'https://api.mhentuniverse.com';
                        const res = await fetch(`${endpoint}/api/generate-example`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                word: word,
                                lang: lang,
                                deckTitle: this.currentSong?.title || 'Lyrics Study',
                                sentence: lineText
                            })
                        });
                        if (res.ok) {
                            const json = await res.json();
                            const data = (json && json.data) ? json.data : json;
                            if (data && data.meaning && data.meaning.trim() && data.meaning.trim().toLowerCase() !== word.toLowerCase()) {
                                result = {
                                    meaning: data.meaning.trim(),
                                    phonetic: (data.phonetic || '').trim(),
                                    pos: (data.pos || 'noun').trim()
                                };
                            }
                        }
                    } catch (eWorker) {
                        console.warn('[AI Tra Nhanh Worker Error]:', eWorker);
                    }

                    // Chiến lược 2: Gọi trực tiếp Gemini API nếu có key
                    if (!result) {
                        const apiKey = (window.MHENT_CONFIG && window.MHENT_CONFIG.GEMINI_API_KEY) || localStorage.getItem('mhent_ai_api_key');
                        if (apiKey) {
                            try {
                                const prompt = `Bạn là chuyên gia ngôn ngữ học. Hãy phân tích từ vựng "${word}" trong câu hát "${lineText}" (ngôn ngữ: ${lang}).
Nhiệm vụ: Trả về DUY NHẤT một chuỗi JSON hợp lệ (không bọc markdown):
{"meaning": "nghĩa tiếng Việt chính xác trong ngữ cảnh này", "phonetic": "phiên âm chuẩn (IPA cho tiếng Anh, Furigana/Romaji cho tiếng Nhật, Pinyin cho tiếng Trung)", "pos": "noun|verb|adj|adv|phrase"}`;

                                const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        contents: [{ parts: [{ text: prompt }] }],
                                        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
                                    })
                                });
                                if (geminiRes.ok) {
                                    const gemData = await geminiRes.json();
                                    const raw = gemData.candidates?.[0]?.content?.parts?.[0]?.text;
                                    if (raw) {
                                        const parsed = JSON.parse(raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim());
                                        if (parsed && parsed.meaning && parsed.meaning.trim().toLowerCase() !== word.toLowerCase()) {
                                            result = {
                                                meaning: parsed.meaning.trim(),
                                                phonetic: (parsed.phonetic || '').trim(),
                                                pos: (parsed.pos || 'noun').trim()
                                            };
                                        }
                                    }
                                }
                            } catch (eGem) {
                                console.warn('[AI Tra Nhanh Gemini Error]:', eGem);
                            }
                        }
                    }

                    // Chiến lược 3: Google Translate GTX Fallback
                    if (!result) {
                        try {
                            const gtxRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${lang}&tl=vi&dt=t&q=${encodeURIComponent(word)}`);
                            if (gtxRes.ok) {
                                const gtxData = await gtxRes.json();
                                if (gtxData && gtxData[0] && Array.isArray(gtxData[0])) {
                                    const trans = gtxData[0].map(item => item[0]).filter(Boolean).join('').trim();
                                    if (trans && trans.toLowerCase() !== word.toLowerCase()) {
                                        result = {
                                            meaning: trans,
                                            phonetic: '',
                                            pos: 'noun'
                                        };
                                    }
                                }
                            }
                        } catch (eGtx) {
                            console.warn('[AI Tra Nhanh GTX Error]:', eGtx);
                        }
                    }

                    // Chiến lược 4: Kiểm tra Supabase study_dictionary
                    if (!result && window.studyCloud && typeof window.studyCloud.lookupWord === 'function') {
                        try {
                            const dictRes = await window.studyCloud.lookupWord(lang, word);
                            if (dictRes && (dictRes.meaning || dictRes.translation)) {
                                result = {
                                    meaning: dictRes.meaning || dictRes.translation,
                                    phonetic: dictRes.phonetic || '',
                                    pos: dictRes.pos || 'noun'
                                };
                            }
                        } catch (eDict) {}
                    }

                    // CẬP NHẬT KẾT QUẢ VÀO MODAL
                    if (result && result.meaning) {
                        const meaningInput = document.getElementById('vocab-dialog-meaning');
                        const phoneticInput = document.getElementById('vocab-dialog-phonetic');
                        const posSelect = document.getElementById('vocab-dialog-pos');

                        if (meaningInput) {
                            meaningInput.value = result.meaning;
                        }
                        if (phoneticInput && result.phonetic) {
                            phoneticInput.value = result.phonetic.replace(/[\[\]]/g, '');
                        }
                        if (posSelect) {
                            let normalizedPos = 'noun';
                            const p = (result.pos || '').toLowerCase();
                            if (p.includes('verb') && !p.includes('phrasal')) normalizedPos = 'verb';
                            else if (p.includes('adj')) normalizedPos = 'adj';
                            else if (p.includes('adv')) normalizedPos = 'adv';
                            else if (p.includes('phrase') || p.includes('collocation') || p.includes('idiom')) normalizedPos = 'phrase';
                            else if (p.includes('particle') || p.includes('gramm')) normalizedPos = 'particle';
                            posSelect.value = normalizedPos;
                        }
                        this.showToast(`✨ Đã tra xong: "${result.meaning}"`, 'success', 2500);
                    } else {
                        this.showToast('Không thể tự động tìm nghĩa cho từ này, bạn hãy tự gõ nghĩa nhé!', 'warning', 3000);
                    }
                } catch (e) {
                    console.error('[AI Tra Nhanh Fatal]', e);
                    this.showToast('Không thể kết nối AI, bạn hãy tự gõ nghĩa nhé!', 'warning');
                } finally {
                    aiAutofillBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> AI Tra Nhanh';
                    aiAutofillBtn.disabled = false;
                }
            });
        }
    }

    async submitCommunityVersion() {
        if (!this.currentSong) return;

        const currentUser = this.getCurrentUser();
        let defaultAuthor = currentUser.displayName || 'Học viên MHEnt';

        const authorName = (document.getElementById('contrib-author')?.value || defaultAuthor).trim();
        const versionTitle = (document.getElementById('contrib-title')?.value || 'Bản dịch mới').trim();
        const note = (document.getElementById('contrib-note')?.value || '').trim();

        // Đồng bộ các ô bản dịch tiếng Việt vào this.contribLyrics
        const inputs = document.querySelectorAll('.contrib-line-trans-input');
        inputs.forEach(input => {
            const idx = parseInt(input.dataset.index, 10);
            if (!isNaN(idx) && this.contribLyrics && this.contribLyrics[idx]) {
                this.contribLyrics[idx].translation = input.value.trim();
            }
        });

        if (!Array.isArray(this.currentSong.community_versions)) {
            this.currentSong.community_versions = [];
        }

        let targetIndex = -1;
        let isEdit = false;

        if (this.editingVersionId) {
            // Chế độ chỉnh sửa phiên bản đã có
            const exIdx = this.currentSong.community_versions.findIndex(v => v.id === this.editingVersionId);
            if (exIdx >= 0) {
                const targetVer = this.currentSong.community_versions[exIdx];
                if (!this.canManageCommunityVersion(targetVer)) {
                    this.showToast('Bạn không có quyền chỉnh sửa bản dịch này!', 'warning', 4500);
                    return;
                }
                isEdit = true;
                this.currentSong.community_versions[exIdx] = {
                    ...targetVer,
                    author: authorName,
                    authorUid: targetVer.authorUid || currentUser.uid,
                    authorEmail: targetVer.authorEmail || currentUser.email,
                    title: versionTitle,
                    note: note,
                    synced_lyrics: this.contribLyrics,
                    updatedAt: new Date().toISOString()
                };
                targetIndex = exIdx;
            }
        }

        if (!isEdit) {
            // Chế độ thêm phiên bản mới
            const versionData = {
                id: 'comm_' + Date.now(),
                author: authorName,
                authorUid: currentUser.uid || null,
                authorEmail: currentUser.email || null,
                title: versionTitle,
                note: note,
                synced_lyrics: this.contribLyrics,
                likes: 0,
                createdAt: new Date().toISOString()
            };
            this.currentSong.community_versions.push(versionData);
            targetIndex = this.currentSong.community_versions.length - 1;
        }

        // 1. Lưu ngay vào localStorage để không bao giờ bị mất khi F5 / tải lại
        this.saveStoredCommunityVersions(this.currentSong.id, this.currentSong.community_versions);

        // 2. Lưu đồng bộ lên Supabase Cloud
        if (window.studyCloud && typeof window.studyCloud.saveCommunityVersions === 'function') {
            try {
                await window.studyCloud.saveCommunityVersions(this.currentSong.id, this.currentSong.community_versions, this.currentSong);
            } catch (e) {
                console.warn('Lỗi lưu Supabase Cloud:', e);
            }
        }

        this.closeContribModal();

        // Kích hoạt ngay phiên bản vừa lưu/sửa
        if (targetIndex >= 0) {
            this.switchVersion(targetIndex);
        } else {
            this.renderVersionTabs();
        }

        this.showToast(isEdit ? 'Đã cập nhật bản dịch thành công!' : 'Đã xuất bản bản dịch mới của bạn thành công!', 'success');
    }

    editCommunityVersion(versionId) {
        if (!this.currentSong || !Array.isArray(this.currentSong.community_versions)) return;
        const versionToEdit = this.currentSong.community_versions.find(v => v.id === versionId);
        if (!versionToEdit) {
            this.showToast('Không tìm thấy bản dịch để chỉnh sửa!', 'error');
            return;
        }
        if (!this.canManageCommunityVersion(versionToEdit)) {
            this.showToast('Bạn không có quyền chỉnh sửa bản dịch của người khác!', 'warning', 4500);
            return;
        }
        this.openContribModal(versionToEdit);
    }

    async deleteCommunityVersion(versionId) {
        if (!this.currentSong || !Array.isArray(this.currentSong.community_versions)) return;
        const versionIdx = this.currentSong.community_versions.findIndex(v => v.id === versionId);
        if (versionIdx < 0) return;

        const versionToDelete = this.currentSong.community_versions[versionIdx];
        if (!this.canManageCommunityVersion(versionToDelete)) {
            this.showToast('Bạn không có quyền xóa bản dịch này. Chỉ người đóng góp hoặc Quản trị viên mới có thể xóa!', 'warning', 4500);
            return;
        }

        const versionTitle = versionToDelete.title || 'Bản dịch này';
        const performDelete = async () => {
            // Xóa khỏi danh sách hiện tại
            this.currentSong.community_versions.splice(versionIdx, 1);

            // Lưu cập nhật vào localStorage
            this.saveStoredCommunityVersions(this.currentSong.id, this.currentSong.community_versions);

            // Xóa trên Supabase Cloud
            if (window.studyCloud && typeof window.studyCloud.deleteCommunityVersion === 'function') {
                try {
                    await window.studyCloud.deleteCommunityVersion(this.currentSong.id, versionId);
                } catch (e) {
                    console.warn('Lỗi xóa trên Supabase Cloud:', e);
                }
            }

            // Điều chỉnh currentVersionIndex nếu bản vừa xóa đang được chọn
            if (this.currentVersionIndex === versionIdx) {
                this.currentVersionIndex = -1; // Quay về bản chuẩn Web/AI
                this.renderLyrics();
                if (this.isPlainMode) this.renderPlainLyrics();
            } else if (this.currentVersionIndex > versionIdx) {
                this.currentVersionIndex--;
            }

            this.renderVersionTabs();
            this.renderVersionsDrawerList();
            this.showToast(`Đã xóa bản dịch "${versionTitle}" thành công!`, 'success');
        };

        if (typeof window.showConfirmPopup === 'function') {
            window.showConfirmPopup('Xóa bản dịch', `Bạn có chắc chắn muốn xóa bản dịch "${versionTitle}" không? Hành động này không thể hoàn tác.`, performDelete);
            return;
        } else if (!confirm(`Bạn có chắc chắn muốn xóa bản dịch "${versionTitle}" không? Hành động này không thể hoàn tác.`)) {
            return;
        }
        await performDelete();
    }

    // =========================================================================
    // 8B. SEO SCHEMA.ORG JSON-LD & DEEP-LINK URL MANAGER
    // =========================================================================
    updatePageMetaAndUrl(song) {
        if (!song) return;

        // 1. Cập nhật Title trang
        const titleStr = `${song.title} - ${song.artist} | Lời Bài Hát & Dịch Nghĩa | MHEnt. Study`;
        document.title = titleStr;

        // 2. Cập nhật URL tham số mà không reload trang (Deep Link)
        try {
            const currentParams = new URLSearchParams(window.location.search);
            if (currentParams.get('song') !== song.id) {
                currentParams.set('song', song.id);
                const newRelativePath = `${window.location.pathname}?${currentParams.toString()}`;
                window.history.replaceState({ songId: song.id }, titleStr, newRelativePath);
            }
        } catch (e) {}

        // 3. Cập nhật Meta Description cho SEO & Social Sharing
        const metaDesc = document.querySelector('meta[name="description"]');
        const lyricsPreview = (song.plain_lyrics || (song.synced_lyrics || []).map(l => l.text).join(' ')).slice(0, 160);
        const descContent = `Lời bài hát ${song.title} (${song.artist}) kèm phụ đề karaoke từng câu, dịch nghĩa tiếng Việt và bóc tách từ vựng học ngoại ngữ. "${lyricsPreview}..."`;
        if (metaDesc) metaDesc.setAttribute('content', descContent);

        // 4. Bơm dữ liệu cấu trúc Schema.org JSON-LD (MusicRecording + MusicLyrics)
        this.injectSchemaOrgJsonLd(song);
    }

    injectSchemaOrgJsonLd(song) {
        try {
            let scriptTag = document.getElementById('schema-music-jsonld');
            if (!scriptTag) {
                scriptTag = document.createElement('script');
                scriptTag.id = 'schema-music-jsonld';
                scriptTag.type = 'application/ld+json';
                document.head.appendChild(scriptTag);
            }

            const plainText = song.plain_lyrics || (song.synced_lyrics || []).map(l => l.text).join('\n');
            const schemaData = {
                "@context": "https://schema.org",
                "@type": "MusicRecording",
                "name": song.title,
                "byArtist": {
                    "@type": "MusicGroup",
                    "name": song.artist
                },
                "image": song.thumbnail || 'https://study.mhentuniverse.com/assets/study-logo.png',
                "inLanguage": song.lang || "en",
                "lyrics": {
                    "@type": "MusicLyrics",
                    "text": plainText
                }
            };
            scriptTag.textContent = JSON.stringify(schemaData, null, 2);

            // Cập nhật container crawlable HTML tĩnh cho Googlebot
            const crawlableEl = document.getElementById('seo-crawlable-lyrics');
            if (crawlableEl) {
                crawlableEl.textContent = `${song.title} - ${song.artist}\n${plainText}`;
            }
        } catch (e) {
            console.warn('[SEO] Không thể gắn Schema JSON-LD:', e);
        }
    }

    getCurrentMediaTime() {
        if (this.useYouTube && this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
            try {
                return this.ytPlayer.getCurrentTime() || 0;
            } catch (e) {}
        }
        if (this.audioPlayer) {
            return this.audioPlayer.currentTime || 0;
        }
        return this.currentTime || 0;
    }

    seekToSeconds(sec) {
        sec = Math.max(0, sec);
        if (this.useYouTube && this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
            try {
                this.ytPlayer.seekTo(sec, true);
                if (typeof this.ytPlayer.playVideo === 'function') this.ytPlayer.playVideo();
            } catch (e) {}
        } else if (this.audioPlayer) {
            this.audioPlayer.currentTime = sec;
            this.audioPlayer.play();
        }
    }

    // =========================================================================
    // 8C. PHÒNG THU ĐỒNG BỘ LỜI BÀI HÁT (MUSIXMATCH PRO STUDIO - TIMING SYNC ENGINE)
    // =========================================================================
    getCurrentMediaDuration() {
        if (this.useYouTube && this.ytPlayer && typeof this.ytPlayer.getDuration === 'function') {
            try {
                const d = this.ytPlayer.getDuration();
                if (d && d > 0) return d;
            } catch (e) {}
        }
        if (this.audioPlayer && this.audioPlayer.duration && !isNaN(this.audioPlayer.duration) && this.audioPlayer.duration > 0) {
            return this.audioPlayer.duration;
        }
        if (this.duration && this.duration > 0) return this.duration;
        if (this.currentSong && this.currentSong.duration && this.currentSong.duration > 0) return this.currentSong.duration;
        return 180;
    }

    formatMxmTime(sec) {
        if (sec === undefined || sec === null || isNaN(sec) || sec <= 0) return '--:--.--';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        const cs = Math.floor((sec % 1) * 100);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
    }

    openSyncStudioModal() {
        const modal = document.getElementById('sync-studio-modal');
        if (!modal) return;

        this.syncStudioLines = [];
        this.syncStudioIndex = 0;
        this.syncStudioTicker = null;
        this.activeMxmTab = 'sync';
        this.isDraggingMxmSlider = false;

        const thumbEl = document.getElementById('sync-studio-thumb');
        const titleEl = document.getElementById('sync-studio-track-title');
        const artistEl = document.getElementById('sync-studio-track-artist');

        const titleInput = document.getElementById('sync-input-title');
        const artistInput = document.getElementById('sync-input-artist');
        const langInput = document.getElementById('sync-input-lang');
        const plainInput = document.getElementById('sync-plain-lyrics-input');

        if (this.currentSong) {
            if (thumbEl) thumbEl.src = this.currentSong.thumbnail || 'https://img.youtube.com/vi/OlZK4BPps_g/hqdefault.jpg';
            if (titleEl) titleEl.textContent = this.currentSong.title || 'Bài hát';
            if (artistEl) artistEl.textContent = this.currentSong.artist || 'Nghệ sĩ';

            if (titleInput) titleInput.value = this.currentSong.title || '';
            if (artistInput) artistInput.value = this.currentSong.artist || '';
            if (langInput && this.currentSong.lang) langInput.value = this.currentSong.lang;

            if (Array.isArray(this.currentSong.synced_lyrics) && this.currentSong.synced_lyrics.length > 0) {
                this.syncStudioLines = this.currentSong.synced_lyrics.map((l, i) => ({
                    id: l.id || i + 1,
                    text: l.text || '',
                    startTime: parseFloat((l.startTime || 0).toFixed(2)),
                    endTime: parseFloat((l.endTime || 0).toFixed(2)),
                    translation: l.translation || '',
                    phonetic: l.phonetic || '',
                    words: Array.isArray(l.words) ? l.words : []
                }));
            } else {
                const raw = this.currentSong.plain_lyrics || '';
                const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
                this.syncStudioLines = lines.map((text, i) => ({
                    id: i + 1,
                    text: text,
                    startTime: 0,
                    endTime: 0,
                    translation: '',
                    phonetic: '',
                    words: []
                }));
            }

            if (plainInput) {
                plainInput.value = this.syncStudioLines.map(l => l.text).join('\n');
                const countBadge = document.getElementById('sync-plain-line-count');
                if (countBadge) countBadge.textContent = `${this.syncStudioLines.length} câu`;
            }
        } else {
            if (titleEl) titleEl.textContent = 'Bài hát mới';
            if (artistEl) artistEl.textContent = 'Phòng thu lời';
        }

        modal.classList.add('active');

        if (this.syncStudioLines.length > 0) {
            this.switchMxmStudioTab('sync');
        } else {
            this.switchMxmStudioTab('transcript');
        }

        this.startSyncStudioTicker();
    }

    closeSyncStudioModal() {
        const modal = document.getElementById('sync-studio-modal');
        if (modal) modal.classList.remove('active');
        this.stopSyncStudioTicker();
    }

    switchMxmStudioTab(tabName) {
        this.activeMxmTab = tabName;

        document.querySelectorAll('.mxm-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        const viewSync = document.getElementById('mxm-view-sync');
        const viewTranscript = document.getElementById('mxm-view-transcript');
        const viewTranslate = document.getElementById('mxm-view-translate');

        if (viewSync) viewSync.style.display = tabName === 'sync' ? 'flex' : 'none';
        if (viewTranscript) viewTranscript.style.display = tabName === 'transcript' ? 'flex' : 'none';
        if (viewTranslate) viewTranslate.style.display = tabName === 'translate' ? 'flex' : 'none';

        if (tabName === 'sync') {
            this.renderMxmSyncLines();
            this.scrollActiveMxmLineIntoView();
        } else if (tabName === 'translate') {
            this.renderSyncStudioReviewLines();
        }
    }

    renderMxmSyncLines() {
        const listEl = document.getElementById('mxm-lines-list');
        if (!listEl) return;

        const total = this.syncStudioLines.length;

        const curIndexEl = document.getElementById('sync-current-index-display');
        const totalLinesEl = document.getElementById('sync-total-lines-display');
        if (curIndexEl) curIndexEl.textContent = total > 0 ? Math.min(this.syncStudioIndex + 1, total) : 0;
        if (totalLinesEl) totalLinesEl.textContent = total;

        if (total === 0) {
            listEl.innerHTML = `
                <div style="text-align: center; color: #94a3b8; padding: 40px 20px;">
                    <p style="margin-bottom: 12px; font-size: 1rem;">Chưa có lời bài hát nào để căn nhịp.</p>
                    <button type="button" class="dict-btn-save" onclick="window.lyricsApp.switchMxmStudioTab('transcript')">
                        <i class="fa-solid fa-file-pen"></i> Chuyển sang tab Transcript để dán lời
                    </button>
                </div>
            `;
            return;
        }

        listEl.innerHTML = this.syncStudioLines.map((line, idx) => {
            const isActive = (idx === this.syncStudioIndex);
            const isSynced = (line.startTime > 0);
            const timeStr = this.formatMxmTime(line.startTime);

            return `
                <div class="mxm-line-row ${isActive ? 'active' : ''} ${isSynced ? 'synced' : ''}" data-index="${idx}" id="mxm-line-row-${idx}">
                    <button type="button" class="mxm-btn-line-delete" data-index="${idx}" title="Xóa mốc giây câu này">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                    <div class="mxm-stepper-wrap">
                        <button type="button" class="mxm-step-btn" data-action="minus-large" data-index="${idx}" title="Lùi 0.5 giây">&laquo;</button>
                        <button type="button" class="mxm-step-btn" data-action="minus-small" data-index="${idx}" title="Lùi 0.1 giây">&lsaquo;</button>
                        <span class="mxm-line-time-badge ${isSynced ? 'has-time' : ''}" data-index="${idx}">${timeStr}</span>
                        <button type="button" class="mxm-step-btn" data-action="plus-small" data-index="${idx}" title="Tăng 0.1 giây">&rsaquo;</button>
                        <button type="button" class="mxm-step-btn" data-action="plus-large" data-index="${idx}" title="Tăng 0.5 giây">&raquo;</button>
                    </div>
                    <button type="button" class="mxm-btn-line-play" data-index="${idx}" title="Nghe câu này">
                        <i class="fa-solid fa-play"></i>
                    </button>
                    <div class="mxm-line-text-wrap" data-index="${idx}">
                        <span class="mxm-line-text">${this.escapeHtml(line.text)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    scrollActiveMxmLineIntoView() {
        const row = document.getElementById(`mxm-line-row-${this.syncStudioIndex}`);
        const container = document.getElementById('mxm-lines-container');
        if (row && container) {
            const rowTop = row.offsetTop;
            const containerHeight = container.clientHeight;
            const targetScroll = rowTop - (containerHeight / 2) + (row.clientHeight / 2);
            container.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
        }
    }

    startSyncStudioTicker() {
        this.stopSyncStudioTicker();
        this.syncStudioTicker = setInterval(() => {
            const cur = this.getCurrentMediaTime();
            const dur = this.getCurrentMediaDuration();

            const curTimeEl = document.getElementById('mxm-current-time-display');
            const totalTimeEl = document.getElementById('mxm-total-time-display');
            const slider = document.getElementById('mxm-progress-slider');
            const fill = document.getElementById('mxm-progress-fill');
            const playBtn = document.getElementById('mxm-btn-play-toggle');

            if (curTimeEl) curTimeEl.textContent = this.formatSeconds(cur);
            if (totalTimeEl) totalTimeEl.textContent = this.formatSeconds(dur);

            if (!this.isDraggingMxmSlider && slider && fill) {
                const pct = dur > 0 ? Math.min(100, Math.max(0, (cur / dur) * 100)) : 0;
                slider.value = pct;
                fill.style.width = `${pct}%`;
            }

            if (playBtn) {
                playBtn.innerHTML = this.isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
                playBtn.title = this.isPlaying ? 'Tạm dừng' : 'Phát nhạc';
            }

            // Đánh dấu câu đang cất giọng theo dòng thời gian thực
            if (this.activeMxmTab === 'sync' && Array.isArray(this.syncStudioLines)) {
                for (let i = 0; i < this.syncStudioLines.length; i++) {
                    const l = this.syncStudioLines[i];
                    const row = document.getElementById(`mxm-line-row-${i}`);
                    if (row) {
                        const isSinging = (l.startTime > 0 && cur >= l.startTime && (l.endTime ? cur < l.endTime : cur < l.startTime + 4));
                        row.classList.toggle('playing-now', isSinging);
                    }
                }
            }
        }, 100);
    }

    stopSyncStudioTicker() {
        if (this.syncStudioTicker) {
            clearInterval(this.syncStudioTicker);
            this.syncStudioTicker = null;
        }
    }

    handleSyncStudioTap() {
        if (!Array.isArray(this.syncStudioLines) || this.syncStudioLines.length === 0) return;

        if (this.syncStudioIndex >= this.syncStudioLines.length) {
            this.showToast('🎉 Đã đồng bộ xong toàn bộ câu trong bài hát!', 'success', 3000);
            return;
        }

        const curTime = parseFloat(this.getCurrentMediaTime().toFixed(2));
        const idx = this.syncStudioIndex;
        const curLine = this.syncStudioLines[idx];

        // Gán mốc giây cho câu hiện tại
        curLine.startTime = curTime;

        // Cập nhật endTime cho câu trước
        if (idx > 0) {
            const prev = this.syncStudioLines[idx - 1];
            if (!prev.endTime || prev.endTime <= prev.startTime) {
                prev.endTime = curTime;
            }
        }

        // Tự động phát nếu đang dừng
        if (!this.isPlaying) {
            this.togglePlay();
        }

        // Hiệu ứng pulse sáng rực rỡ trên câu vừa căn
        const row = document.getElementById(`mxm-line-row-${idx}`);
        if (row) {
            row.style.transform = 'scale(1.02)';
            row.style.boxShadow = '0 0 28px rgba(56, 189, 248, 0.7)';
            setTimeout(() => {
                if (row) {
                    row.style.transform = '';
                    row.style.boxShadow = '';
                }
            }, 160);
        }

        this.syncStudioIndex++;

        if (this.syncStudioIndex >= this.syncStudioLines.length) {
            curLine.endTime = curTime + 4;
            this.showToast('🎉 Đã bấm nhịp xong toàn bộ bài hát! Bạn có thể xem bản dịch hoặc bấm Xuất Bản.', 'success', 3500);
        }

        this.renderMxmSyncLines();
        this.scrollActiveMxmLineIntoView();
    }

    renderSyncStudioReviewLines() {
        const container = document.getElementById('sync-review-lines-container');
        if (!container || !Array.isArray(this.syncStudioLines)) return;

        const fromLangEl = document.getElementById('mxm-trans-from-label');
        const songLang = document.getElementById('sync-input-lang')?.value || this.currentSong?.lang || 'ja';
        const langNames = { ja: 'Japanese', zh: 'Chinese', ko: 'Korean', en: 'English' };
        if (fromLangEl) fromLangEl.textContent = langNames[songLang] || 'Original';

        container.innerHTML = this.syncStudioLines.map((line, idx) => `
            <div class="mxm-translate-item">
                <span class="rev-time">${this.formatSeconds(line.startTime)}</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button type="button" class="mxm-btn-line-play" style="width: 28px; height: 28px; font-size: 0.75rem;" onclick="window.lyricsApp.seekToSeconds(${line.startTime}); if (!window.lyricsApp.isPlaying) window.lyricsApp.togglePlay();" title="Nghe câu này">
                        <i class="fa-solid fa-play"></i>
                    </button>
                    <span class="rev-text">${this.escapeHtml(line.text)}</span>
                </div>
                <input type="text" class="rev-trans-input" data-index="${idx}" value="${this.escapeHtml(line.translation || '')}" placeholder="Bản dịch tiếng Việt...">
            </div>
        `).join('');

        container.querySelectorAll('.rev-trans-input').forEach(input => {
            input.addEventListener('input', () => {
                const idx = parseInt(input.dataset.index, 10);
                if (!isNaN(idx) && this.syncStudioLines[idx]) {
                    this.syncStudioLines[idx].translation = input.value.trim();
                }
            });
        });
    }

    initSyncStudioEvents() {
        const modal = document.getElementById('sync-studio-modal');
        const closeBtn = document.getElementById('sync-studio-close');
        const backBtn = document.getElementById('sync-studio-back-btn');
        const plainInput = document.getElementById('sync-plain-lyrics-input');
        const countBadge = document.getElementById('sync-plain-line-count');
        const btnApplyTranscript = document.getElementById('btn-transcript-apply-sync');
        const btnTap = document.getElementById('btn-sync-action-down-sync');
        const btnPrev = document.getElementById('btn-sync-action-up');
        const btnPlayToggle = document.getElementById('mxm-btn-play-toggle');
        const btnRewind = document.getElementById('mxm-btn-rewind-3s');
        const btnForward = document.getElementById('mxm-btn-forward-3s');
        const progressSlider = document.getElementById('mxm-progress-slider');
        const btnRunAi = document.getElementById('btn-sync-run-ai');
        const btnPublish = document.getElementById('btn-sync-publish');
        const linesList = document.getElementById('mxm-lines-list');

        // Tab buttons
        document.querySelectorAll('.mxm-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;
                if (targetTab) this.switchMxmStudioTab(targetTab);
            });
        });

        // Close events
        const doClose = () => this.closeSyncStudioModal();
        if (closeBtn) closeBtn.addEventListener('click', doClose);
        if (backBtn) backBtn.addEventListener('click', doClose);

        // Plain lyrics line count update
        if (plainInput && countBadge) {
            plainInput.addEventListener('input', () => {
                const count = plainInput.value.split('\n').map(l => l.trim()).filter(Boolean).length;
                countBadge.textContent = `${count} câu`;
            });
        }

        // Apply plain lyrics to Time Sync
        if (btnApplyTranscript) {
            btnApplyTranscript.addEventListener('click', () => {
                const rawLyrics = (plainInput?.value || '').trim();
                const lines = rawLyrics.split('\n').map(l => l.trim()).filter(Boolean);
                if (lines.length === 0) {
                    this.showToast('Vui lòng dán lời bài hát vào ô văn bản!', 'warning');
                    return;
                }

                // Giữ lại các mốc giây đã có nếu lời trùng khớp
                const oldMap = new Map();
                (this.syncStudioLines || []).forEach(l => {
                    if (l.startTime > 0) oldMap.set(l.text, l);
                });

                this.syncStudioLines = lines.map((text, i) => {
                    const existing = oldMap.get(text);
                    return {
                        id: i + 1,
                        text: text,
                        startTime: existing ? existing.startTime : 0,
                        endTime: existing ? existing.endTime : 0,
                        translation: existing ? existing.translation : '',
                        phonetic: existing ? existing.phonetic : '',
                        words: existing ? existing.words : []
                    };
                });

                this.syncStudioIndex = 0;
                this.switchMxmStudioTab('sync');
                this.showToast(`✨ Đã nạp ${lines.length} câu vào phòng thu Time Sync!`, 'success');
            });
        }

        // Delegated events on lines list (Play per line, click row, stepper adjust, delete timestamp)
        if (linesList) {
            linesList.addEventListener('click', (e) => {
                // 1. Click Play button on specific line
                const playBtn = e.target.closest('.mxm-btn-line-play');
                if (playBtn) {
                    e.stopPropagation();
                    const idx = parseInt(playBtn.dataset.index, 10);
                    const line = this.syncStudioLines[idx];
                    if (line) {
                        this.syncStudioIndex = idx;
                        const targetTime = line.startTime > 0 ? line.startTime : this.getCurrentMediaTime();
                        this.seekToSeconds(targetTime);
                        if (!this.isPlaying) this.togglePlay();
                        this.renderMxmSyncLines();
                        this.scrollActiveMxmLineIntoView();
                        this.showToast(`▶ Đang phát câu ${idx + 1}: ${this.formatSeconds(targetTime)}`, 'info', 1200);
                    }
                    return;
                }

                // 2. Click stepper button (<<, <, >, >>)
                const stepBtn = e.target.closest('.mxm-step-btn');
                if (stepBtn) {
                    e.stopPropagation();
                    const action = stepBtn.dataset.action;
                    const idx = parseInt(stepBtn.dataset.index, 10);
                    const line = this.syncStudioLines[idx];
                    if (line) {
                        if (line.startTime <= 0) {
                            line.startTime = parseFloat(this.getCurrentMediaTime().toFixed(2));
                        }
                        if (action === 'minus-large') line.startTime = Math.max(0, parseFloat((line.startTime - 0.5).toFixed(2)));
                        if (action === 'minus-small') line.startTime = Math.max(0, parseFloat((line.startTime - 0.1).toFixed(2)));
                        if (action === 'plus-small') line.startTime = parseFloat((line.startTime + 0.1).toFixed(2));
                        if (action === 'plus-large') line.startTime = parseFloat((line.startTime + 0.5).toFixed(2));

                        if (idx > 0 && this.syncStudioLines[idx - 1]) {
                            this.syncStudioLines[idx - 1].endTime = line.startTime;
                        }

                        this.renderMxmSyncLines();
                    }
                    return;
                }

                // 3. Click delete / reset timestamp button
                const delBtn = e.target.closest('.mxm-btn-line-delete');
                if (delBtn) {
                    e.stopPropagation();
                    const idx = parseInt(delBtn.dataset.index, 10);
                    if (this.syncStudioLines[idx]) {
                        this.syncStudioLines[idx].startTime = 0;
                        this.syncStudioLines[idx].endTime = 0;
                        this.renderMxmSyncLines();
                    }
                    return;
                }

                // 4. Click row / text to select as current syncing sentence
                const row = e.target.closest('.mxm-line-row');
                if (row) {
                    const idx = parseInt(row.dataset.index, 10);
                    if (!isNaN(idx)) {
                        this.syncStudioIndex = idx;
                        this.renderMxmSyncLines();
                        this.scrollActiveMxmLineIntoView();
                    }
                }
            });
        }

        // Tap action / Down / Space
        if (btnTap) btnTap.addEventListener('click', () => this.handleSyncStudioTap());

        // Up action
        if (btnPrev) {
            btnPrev.addEventListener('click', () => {
                this.syncStudioIndex = Math.max(0, this.syncStudioIndex - 1);
                this.renderMxmSyncLines();
                this.scrollActiveMxmLineIntoView();
            });
        }

        // Global Keyboard shortcuts in Studio modal
        window.addEventListener('keydown', (e) => {
            if (modal && modal.classList.contains('active')) {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

                if (e.code === 'Space') {
                    e.preventDefault();
                    if (this.activeMxmTab === 'sync') {
                        this.handleSyncStudioTap();
                    } else {
                        this.togglePlay();
                    }
                } else if (e.code === 'ArrowDown' && this.activeMxmTab === 'sync') {
                    e.preventDefault();
                    this.handleSyncStudioTap();
                } else if (e.code === 'ArrowUp' && this.activeMxmTab === 'sync') {
                    e.preventDefault();
                    this.syncStudioIndex = Math.max(0, this.syncStudioIndex - 1);
                    this.renderMxmSyncLines();
                    this.scrollActiveMxmLineIntoView();
                } else if (e.code === 'ArrowLeft') {
                    e.preventDefault();
                    this.seekToSeconds(Math.max(0, this.getCurrentMediaTime() - 3));
                } else if (e.code === 'ArrowRight') {
                    e.preventDefault();
                    this.seekToSeconds(this.getCurrentMediaTime() + 3);
                }
            }
        });

        // Bottom Scrubber Slider
        if (progressSlider) {
            progressSlider.addEventListener('input', (e) => {
                this.isDraggingMxmSlider = true;
                const dur = this.getCurrentMediaDuration();
                const previewSec = (parseFloat(e.target.value) / 100) * dur;
                const curTimeEl = document.getElementById('mxm-current-time-display');
                const fillEl = document.getElementById('mxm-progress-fill');
                if (curTimeEl) curTimeEl.textContent = this.formatSeconds(previewSec);
                if (fillEl) fillEl.style.width = `${e.target.value}%`;
            });

            progressSlider.addEventListener('change', (e) => {
                this.isDraggingMxmSlider = false;
                const dur = this.getCurrentMediaDuration();
                const targetSec = (parseFloat(e.target.value) / 100) * dur;
                this.seekToSeconds(targetSec);
            });
        }

        // Transport controls
        if (btnPlayToggle) btnPlayToggle.addEventListener('click', () => this.togglePlay());
        if (btnRewind) btnRewind.addEventListener('click', () => this.seekToSeconds(Math.max(0, this.getCurrentMediaTime() - 3)));
        if (btnForward) btnForward.addEventListener('click', () => this.seekToSeconds(this.getCurrentMediaTime() + 3));

        // Gemini AI auto-translation
        if (btnRunAi) {
            btnRunAi.addEventListener('click', async () => {
                if (!Array.isArray(this.syncStudioLines) || this.syncStudioLines.length === 0) {
                    this.showToast('Chưa có danh sách câu để AI dịch!', 'warning');
                    return;
                }

                btnRunAi.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gemini AI đang phân tích toàn bài...';
                btnRunAi.disabled = true;

                try {
                    const lang = document.getElementById('sync-input-lang')?.value || this.currentSong?.lang || 'ja';
                    const sampleTexts = this.syncStudioLines.map(l => l.text).join('\n');

                    if (window.MHENT_CONFIG && window.MHENT_CONFIG.GEMINI_API_KEY) {
                        const prompt = `Bạn là trợ lý học ngoại ngữ chuyên nghiệp. Hãy dịch các câu sau sang tiếng Việt chuẩn xác và tự nhiên theo ngữ cảnh bài hát:\nNgôn ngữ gốc: ${lang}\nNội dung các câu:\n${sampleTexts}\n\nTrả về mảng JSON đúng thứ tự: [{"translation": "...", "phonetic": "..."}]`;
                        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${window.MHENT_CONFIG.GEMINI_API_KEY}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: prompt }] }],
                                generationConfig: { responseMimeType: 'application/json' }
                            })
                        }).then(r => r.json());

                        const textJson = res.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (textJson) {
                            const parsed = JSON.parse(textJson);
                            if (Array.isArray(parsed)) {
                                parsed.forEach((item, i) => {
                                    if (this.syncStudioLines[i]) {
                                        this.syncStudioLines[i].translation = item.translation || '';
                                        this.syncStudioLines[i].phonetic = item.phonetic || '';
                                    }
                                });
                            }
                        }
                    }

                    this.renderSyncStudioReviewLines();
                    this.showToast('✨ Gemini AI đã dịch nghĩa toàn bài thành công!', 'success', 3000);
                } catch (e) {
                    console.warn('[AI Sync Studio Analysis]', e);
                    this.showToast('Lỗi AI, bạn có thể tự nhập bản dịch nhé!', 'warning');
                } finally {
                    btnRunAi.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> AI Bóc Tách Từ Vựng & Dịch Toàn Bộ (Gemini)';
                    btnRunAi.disabled = false;
                }
            });
        }

        // Publish to MHEnt Study
        if (btnPublish) {
            btnPublish.addEventListener('click', async () => {
                if (!Array.isArray(this.syncStudioLines) || this.syncStudioLines.length === 0) {
                    this.showToast('Vui lòng thêm lời bài hát trước khi xuất bản!', 'warning');
                    return;
                }

                const title = (document.getElementById('sync-input-title')?.value || this.currentSong?.title || 'Bài hát mới').trim();
                const artist = (document.getElementById('sync-input-artist')?.value || this.currentSong?.artist || 'Nghệ sĩ').trim();
                const lang = document.getElementById('sync-input-lang')?.value || this.currentSong?.lang || 'ja';

                let defaultAuthor = 'Học viên MHEnt';
                try {
                    const savedProfile = JSON.parse(localStorage.getItem('mhent_user_profile') || localStorage.getItem('mhent_user') || '{}');
                    if (savedProfile.displayName || savedProfile.name) defaultAuthor = savedProfile.displayName || savedProfile.name;
                } catch (e) {}

                const songId = this.currentSong?.id || ('synced_' + Date.now());
                const newSong = {
                    id: songId,
                    title: title,
                    artist: artist,
                    lang: lang,
                    thumbnail: this.currentSong ? this.currentSong.thumbnail : 'https://img.youtube.com/vi/OlZK4BPps_g/hqdefault.jpg',
                    youtube_id: this.currentSong ? this.currentSong.youtube_id : '',
                    audio_url: this.currentSong ? this.currentSong.audio_url : '',
                    duration: Math.ceil(this.syncStudioLines[this.syncStudioLines.length - 1]?.endTime || this.getCurrentMediaDuration() || 180),
                    synced_lyrics: this.syncStudioLines,
                    plain_lyrics: this.syncStudioLines.map(l => l.text).join('\n'),
                    views: this.currentSong?.views || 1,
                    likes: this.currentSong?.likes || 0,
                    created_by: defaultAuthor,
                    community_versions: this.currentSong?.community_versions || []
                };

                // Lưu vào danh sách custom songs cục bộ để hiển thị ngay trong kho bài hát
                this.saveCustomSongToLocal(newSong);

                if (window.studyCloud && typeof window.studyCloud.saveSong === 'function') {
                    await window.studyCloud.saveSong(newSong);
                }

                this.closeSyncStudioModal();
                this.loadSong(newSong);
                this.showToast(`🎉 Xuất bản bài hát "${title}" thành công! Lời Karaoke đã sẵn sàng.`, 'success', 4000);
            });
        }
    }

    // =========================================================================
    // 8D. MINIGAME: CHÉP CHÍNH TẢ & SHADOWING (DICTATION MODE)
    // =========================================================================
    toggleDictationMode() {
        this.isDictationMode = !this.isDictationMode;

        const btn = document.getElementById('btn-toggle-dictation');
        const label = document.getElementById('dictation-mode-label');

        if (btn) btn.classList.toggle('active', this.isDictationMode);
        if (label) label.textContent = this.isDictationMode ? 'Thoát Chép' : 'Luyện chép';

        if (this.isDictationMode) {
            this.loopSentenceIndex = this.activeSentenceIndex >= 0 ? this.activeSentenceIndex : 0;
            this.updateLoopBtnUi();
            this.seekToSentence(this.loopSentenceIndex);
            this.showToast('✍️ Đã bật Chế độ Luyện Chép Chính Tả! Câu hát sẽ lặp lại liên tục để bạn nghe và điền từ.', 'info', 3500);
        } else {
            this.loopSentenceIndex = -1;
            this.updateLoopBtnUi();
            this.showToast('Đã trở về Chế độ Karaoke bình thường.', 'info', 1500);
        }

        this.renderLyrics();
    }

    submitDictationAnswer(idx) {
        const input = document.getElementById(`dictation-input-${idx}`);
        const feedback = document.getElementById(`dictation-feedback-${idx}`);
        if (!input || !this.currentSong) return;

        const val = input.value.trim().toLowerCase();
        const lines = this.getActiveLyrics();
        const line = lines[idx];
        if (!line) return;

        const targetWordObj = (Array.isArray(line.words) && line.words.length > 0) ? line.words[0] : null;
        const targetWord = (targetWordObj ? targetWordObj.word : line.text).trim().toLowerCase();

        // Kiểm tra độ khớp
        let isMatched = false;
        if (val) {
            if (targetWordObj) {
                isMatched = (val === targetWord || this.removeVietnameseTones(val) === this.removeVietnameseTones(targetWord));
            } else {
                const cleanLineText = line.text.trim().toLowerCase();
                isMatched = (val === cleanLineText || this.removeVietnameseTones(val) === this.removeVietnameseTones(cleanLineText));
            }
        }

        if (isMatched) {
            this.dictationScore = (this.dictationScore || 0) + 10;
            this.dictationStreak = (this.dictationStreak || 0) + 1;

            if (feedback) {
                feedback.className = 'dictation-feedback correct';
                feedback.innerHTML = `<i class="fa-solid fa-circle-check"></i> Chính xác! Tuyệt vời (+10 Điểm ✨)`;
            }

            this.showToast(`🎉 Chính xác! (+10 XP) - Chuỗi: 🔥 ${this.dictationStreak} câu`, 'success', 2000);

            const scoreEl = document.getElementById('dictation-score-num');
            const streakEl = document.getElementById('dictation-streak-num');
            if (scoreEl) scoreEl.textContent = this.dictationScore;
            if (streakEl) streakEl.innerHTML = `🔥 ${this.dictationStreak}`;

            setTimeout(() => {
                const nextIdx = (idx + 1) < lines.length ? (idx + 1) : 0;
                this.loopSentenceIndex = nextIdx;
                this.seekToSentence(nextIdx);
                this.renderLyrics();
            }, 1000);
        } else {
            this.dictationStreak = 0;
            const streakEl = document.getElementById('dictation-streak-num');
            if (streakEl) streakEl.innerHTML = `🔥 0`;

            if (feedback) {
                feedback.className = 'dictation-feedback incorrect';
                feedback.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Chưa đúng rồi! Nghe lại nhé (Gợi ý: từ có ${targetWord.length} ký tự).`;
            }

            this.seekToSentence(idx);
            input.focus();
        }
    }

    hintDictationAnswer(idx) {
        const lines = this.getActiveLyrics();
        const line = lines[idx];
        const feedback = document.getElementById(`dictation-feedback-${idx}`);
        if (!line || !feedback) return;

        const targetWordObj = (Array.isArray(line.words) && line.words.length > 0) ? line.words[0] : null;
        const targetWord = targetWordObj ? targetWordObj.word : line.text;
        const phonetic = targetWordObj ? targetWordObj.phonetic : line.phonetic;

        feedback.className = 'dictation-feedback';
        feedback.innerHTML = `<i class="fa-solid fa-lightbulb" style="color: #fbbf24;"></i> Gợi ý: Bắt đầu bằng chữ "<b>${targetWord.slice(0, 2)}...</b>" ${phonetic ? `(Phiên âm: ${phonetic})` : ''}`;
    }

    skipDictationAnswer(idx) {
        const lines = this.getActiveLyrics();
        const nextIdx = (idx + 1) < lines.length ? (idx + 1) : 0;
        this.loopSentenceIndex = nextIdx;
        this.seekToSentence(nextIdx);
        this.renderLyrics();
        this.showToast('Đã bỏ qua sang câu tiếp theo', 'info', 1000);
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
                      "id": "puppet-john-michael-howell",
                      "title": "Puppet",
                      "artist": "John Michael Howell",
                      "aliases": ["Con Rối", "Con Roi", "Puppet", "John Michael Howell"],
                      "lang": "en",
                      "thumbnail": "https://img.youtube.com/vi/BgmW6uIzjmY/hqdefault.jpg",
                      "youtube_id": "BgmW6uIzjmY",
                      "audio_url": "",
                      "duration": 135,
                      "synced_lyrics": [
                                {
                                          "id": 1,
                                          "text": "Baby, did you pull my strings so you could play me?",
                                          "words": [
                                                    {
                                                              "pos": "phrase",
                                                              "word": "pull my strings",
                                                              "meaning": "giật dây (thao túng, sai khiến người khác)",
                                                              "phonetic": "pʊl maɪ strɪŋz"
                                                    },
                                                    {
                                                              "pos": "verb",
                                                              "word": "play",
                                                              "meaning": "đùa giỡn, thao túng tình cảm",
                                                              "phonetic": "pleɪ"
                                                    }
                                          ],
                                          "endTime": 8.79,
                                          "phonetic": "",
                                          "startTime": 3.79,
                                          "translation": "Cưng ơi, em giật dây anh cốt chỉ để đùa giỡn anh sao?"
                                },
                                {
                                          "id": 2,
                                          "text": "Strummin' on my heart just to betray me",
                                          "words": [
                                                    {
                                                              "pos": "verb",
                                                              "word": "strummin'",
                                                              "meaning": "khảy đàn, gảy (ở đây chỉ việc làm rung động trái tim)",
                                                              "phonetic": "ˈstrʌmɪn"
                                                    },
                                                    {
                                                              "pos": "verb",
                                                              "word": "betray",
                                                              "meaning": "phản bội",
                                                              "phonetic": "bɪˈtreɪ"
                                                    }
                                          ],
                                          "endTime": 12.04,
                                          "phonetic": "",
                                          "startTime": 8.94,
                                          "translation": "Em khảy những phím đàn trong tim anh chỉ để phản bội anh"
                                },
                                {
                                          "id": 3,
                                          "text": "Had me crazy over you",
                                          "words": [
                                                    {
                                                              "pos": "adj",
                                                              "word": "crazy",
                                                              "meaning": "phát cuồng, mê muội",
                                                              "phonetic": "ˈkreɪzi"
                                                    }
                                          ],
                                          "endTime": 16.99,
                                          "phonetic": "",
                                          "startTime": 12.04,
                                          "translation": "Khiến anh say đắm đến phát cuồng vì em"
                                },
                                {
                                          "id": 4,
                                          "text": "Feels like I'm stuck inside your show",
                                          "words": [
                                                    {
                                                              "pos": "adj",
                                                              "word": "stuck",
                                                              "meaning": "mắc kẹt",
                                                              "phonetic": "stʌk"
                                                    },
                                                    {
                                                              "pos": "noun",
                                                              "word": "show",
                                                              "meaning": "vở kịch, trò diễn",
                                                              "phonetic": "ʃoʊ"
                                                    }
                                          ],
                                          "endTime": 20.29,
                                          "phonetic": "",
                                          "startTime": 16.99,
                                          "translation": "Tựa như anh đang mắc kẹt trong vở kịch của em"
                                },
                                {
                                          "id": 5,
                                          "text": "It's true",
                                          "words": [
                                                    {
                                                              "pos": "adj",
                                                              "word": "true",
                                                              "meaning": "đúng sự thật",
                                                              "phonetic": "truː"
                                                    }
                                          ],
                                          "endTime": 22.26,
                                          "phonetic": "",
                                          "startTime": 20.29,
                                          "translation": "Sự thật là vậy"
                                },
                                {
                                          "id": 6,
                                          "text": "You got me wrapped around your finger",
                                          "words": [
                                                    {
                                                              "pos": "phrase",
                                                              "word": "wrapped around your finger",
                                                              "meaning": "quấn quanh ngón tay (dễ dàng thao túng, sai khiến)",
                                                              "phonetic": "ræpt əˈraʊnd jʊər ˈfɪŋɡər"
                                                    }
                                          ],
                                          "endTime": 26.34,
                                          "phonetic": "",
                                          "startTime": 22.26,
                                          "translation": "Em đã thuần hóa và sai khiến anh trong lòng bàn tay"
                                },
                                {
                                          "id": 7,
                                          "text": "Acting like a fool",
                                          "words": [
                                                    {
                                                              "pos": "verb",
                                                              "word": "acting",
                                                              "meaning": "cư xử, hành động",
                                                              "phonetic": "ˈæktɪŋ"
                                                    },
                                                    {
                                                              "pos": "noun",
                                                              "word": "fool",
                                                              "meaning": "kẻ khờ, kẻ ngốc",
                                                              "phonetic": "fuːl"
                                                    }
                                          ],
                                          "endTime": 27.92,
                                          "phonetic": "",
                                          "startTime": 26.34,
                                          "translation": "Để rồi cư xử như một kẻ khờ"
                                },
                                {
                                          "id": 8,
                                          "text": "Must've been the strings you pulled",
                                          "words": [
                                                    {
                                                              "pos": "noun",
                                                              "word": "strings",
                                                              "meaning": "sây dây con rối",
                                                              "phonetic": "strɪŋz"
                                                    }
                                          ],
                                          "endTime": 31.23,
                                          "phonetic": "",
                                          "startTime": 27.92,
                                          "translation": "Tất cả là do những sợi dây mà em đã giật"
                                },
                                {
                                          "id": 9,
                                          "text": "Now it's clear, that I can see the truth",
                                          "words": [
                                                    {
                                                              "pos": "adj",
                                                              "word": "clear",
                                                              "meaning": "rõ ràng",
                                                              "phonetic": "klɪr"
                                                    },
                                                    {
                                                              "pos": "noun",
                                                              "word": "truth",
                                                              "meaning": "sự thật",
                                                              "phonetic": "truːθ"
                                                    }
                                          ],
                                          "endTime": 34.86,
                                          "phonetic": "",
                                          "startTime": 31.23,
                                          "translation": "Giờ đây mọi thứ đã rõ ràng, và anh đã nhìn thấy sự thật"
                                },
                                {
                                          "id": 10,
                                          "text": "I was just a puppet to you",
                                          "words": [
                                                    {
                                                              "pos": "noun",
                                                              "word": "puppet",
                                                              "meaning": "con rối",
                                                              "phonetic": "ˈpʌpɪt"
                                                    }
                                          ],
                                          "endTime": 39.05,
                                          "phonetic": "",
                                          "startTime": 34.86,
                                          "translation": "Rằng anh mãi chỉ là một con rối trong mắt em"
                                },
                                {
                                          "id": 11,
                                          "text": "Darling, I'm done",
                                          "words": [
                                                    {
                                                              "pos": "noun",
                                                              "word": "darling",
                                                              "meaning": "em yêu, người ơi",
                                                              "phonetic": "ˈdɑːrlɪŋ"
                                                    },
                                                    {
                                                              "pos": "adj",
                                                              "word": "done",
                                                              "meaning": "chịu đựng đủ rồi, chấm dứt",
                                                              "phonetic": "dʌn"
                                                    }
                                          ],
                                          "endTime": 40.86,
                                          "phonetic": "",
                                          "startTime": 39.05,
                                          "translation": "Em à, anh đã quá mệt mỏi rồi..."
                                },
                                {
                                          "id": 12,
                                          "text": "Playing along",
                                          "words": [
                                                    {
                                                              "pos": "phrase",
                                                              "word": "playing along",
                                                              "meaning": "hùa theo, giả vờ đồng tình",
                                                              "phonetic": "ˈpleɪɪŋ əˈlɔːŋ"
                                                    }
                                          ],
                                          "endTime": 42.61,
                                          "phonetic": "",
                                          "startTime": 40.86,
                                          "translation": "...khi cứ phải hùa theo trò chơi dối trá của em"
                                },
                                {
                                          "id": 13,
                                          "text": "It's time to cut me loose",
                                          "words": [
                                                    {
                                                              "pos": "phrase",
                                                              "word": "cut loose",
                                                              "meaning": "buông bỏ, cắt đứt ràng buộc",
                                                              "phonetic": "kʌt luːs"
                                                    }
                                          ],
                                          "endTime": 44.47,
                                          "phonetic": "",
                                          "startTime": 42.61,
                                          "translation": "Đã đến lúc em phải buông tha và cắt đứt sợi dây của anh rồi"
                                },
                                {
                                          "id": 14,
                                          "text": "Got me wrapped around your finger",
                                          "words": [
                                                    {
                                                              "pos": "verb",
                                                              "word": "wrapped",
                                                              "meaning": "quấn quanh, bị kiểm soát",
                                                              "phonetic": "ræpt"
                                                    }
                                          ],
                                          "endTime": 47,
                                          "phonetic": "",
                                          "startTime": 44.47,
                                          "translation": "Em từng nắm bắt anh hoàn toàn trong lòng bàn tay"
                                },
                                {
                                          "id": 15,
                                          "text": "Acting like a fool",
                                          "words": [
                                                    {
                                                              "pos": "noun",
                                                              "word": "fool",
                                                              "meaning": "kẻ khờ khạo",
                                                              "phonetic": "fuːl"
                                                    }
                                          ],
                                          "endTime": 48.79,
                                          "phonetic": "",
                                          "startTime": 47,
                                          "translation": "Và biến anh thành kẻ ngốc"
                                },
                                {
                                          "id": 16,
                                          "text": "But girl, I ain't no puppet, no puppet, no puppet for you",
                                          "words": [
                                                    {
                                                              "pos": "phrase",
                                                              "word": "ain't no",
                                                              "meaning": "không phải là (phủ định nhấn mạnh)",
                                                              "phonetic": "eɪnˈt noʊ"
                                                    },
                                                    {
                                                              "pos": "noun",
                                                              "word": "puppet",
                                                              "meaning": "con rối",
                                                              "phonetic": "ˈpʌpɪt"
                                                    }
                                          ],
                                          "endTime": 53.79,
                                          "phonetic": "",
                                          "startTime": 48.79,
                                          "translation": "Nhưng cô gái à, anh không phải là con rối, không phải con rối, không bao giờ là con rối của em nữa đâu!"
                                },
                                {
                                          "id": 17,
                                          "text": "Can you blame me?",
                                          "words": [
                                                    {
                                                              "pos": "verb",
                                                              "word": "blame",
                                                              "meaning": "đổ lỗi, trách cứ",
                                                              "phonetic": "bleɪm"
                                                    }
                                          ],
                                          "endTime": 57.39,
                                          "phonetic": "",
                                          "startTime": 55.27,
                                          "translation": "Em có thể trách anh được sao?"
                                },
                                {
                                          "id": 18,
                                          "text": "The way you had me tricked was so amazing",
                                          "words": [
                                                    {
                                                              "pos": "verb",
                                                              "word": "tricked",
                                                              "meaning": "bị lừa gạt",
                                                              "phonetic": "trɪkt"
                                                    },
                                                    {
                                                              "pos": "adj",
                                                              "word": "amazing",
                                                              "meaning": "tuyệt vời, kinh ngạc",
                                                              "phonetic": "əˈmeɪzɪŋ"
                                                    }
                                          ],
                                          "endTime": 60.97,
                                          "phonetic": "",
                                          "startTime": 57.39,
                                          "translation": "Cách mà em lừa gạt anh thật quá ư tinh vi"
                                },
                                {
                                          "id": 19,
                                          "text": "But fire in your eyes was awfully blazing",
                                          "words": [
                                                    {
                                                              "pos": "noun",
                                                              "word": "fire",
                                                              "meaning": "ngọn lửa (sự nguy hiểm/cuốn hút)",
                                                              "phonetic": "ˈfaɪər"
                                                    },
                                                    {
                                                              "pos": "adj",
                                                              "word": "blazing",
                                                              "meaning": "bùng cháy dữ dội",
                                                              "phonetic": "ˈbleɪzɪŋ"
                                                    }
                                          ],
                                          "endTime": 64.02,
                                          "phonetic": "",
                                          "startTime": 60.97,
                                          "translation": "Nhưng ngọn lửa trong đôi mắt em lại bùng cháy dữ dội"
                                },
                                {
                                          "id": 20,
                                          "text": "Had me gazing, lost in you",
                                          "words": [
                                                    {
                                                              "pos": "verb",
                                                              "word": "gazing",
                                                              "meaning": "nhìn chăm chú, ngẩn ngơ",
                                                              "phonetic": "ˈɡeɪzɪŋ"
                                                    },
                                                    {
                                                              "pos": "adj",
                                                              "word": "lost",
                                                              "meaning": "lạc lối",
                                                              "phonetic": "lɒst"
                                                    }
                                          ],
                                          "endTime": 69.02,
                                          "phonetic": "",
                                          "startTime": 64.02,
                                          "translation": "Khiến anh ngẩn ngơ nhìn ngắm và lạc lối vào em"
                                },
                                {
                                          "id": 21,
                                          "text": "Feels like I'm stuck inside your show",
                                          "words": [
                                                    {
                                                              "pos": "adj",
                                                              "word": "stuck",
                                                              "meaning": "mắc kẹt",
                                                              "phonetic": "stʌk"
                                                    }
                                          ],
                                          "endTime": 72.38,
                                          "phonetic": "",
                                          "startTime": 69.12,
                                          "translation": "Tựa như anh đang mắc kẹt trong vở kịch của em"
                                },
                                {
                                          "id": 22,
                                          "text": "It's true",
                                          "words": [
                                                    {
                                                              "pos": "adj",
                                                              "word": "true",
                                                              "meaning": "sự thật",
                                                              "phonetic": "truː"
                                                    }
                                          ],
                                          "endTime": 74.66,
                                          "phonetic": "",
                                          "startTime": 72.38,
                                          "translation": "Đó là sự thật"
                                },
                                {
                                          "id": 23,
                                          "text": "You got me wrapped around your finger",
                                          "words": [
                                                    {
                                                              "pos": "phrase",
                                                              "word": "wrapped around your finger",
                                                              "meaning": "quấn quanh ngón tay",
                                                              "phonetic": "ræpt əˈraʊnd jʊər ˈfɪŋɡər"
                                                    }
                                          ],
                                          "endTime": 78.25,
                                          "phonetic": "",
                                          "startTime": 74.66,
                                          "translation": "Em đã thuần hóa và sai khiến anh trong lòng bàn tay"
                                },
                                {
                                          "id": 24,
                                          "text": "Acting like a fool",
                                          "words": [
                                                    {
                                                              "pos": "noun",
                                                              "word": "fool",
                                                              "meaning": "kẻ khờ",
                                                              "phonetic": "fuːl"
                                                    }
                                          ],
                                          "endTime": 80.06,
                                          "phonetic": "",
                                          "startTime": 78.25,
                                          "translation": "Để rồi cư xử như một kẻ khờ"
                                },
                                {
                                          "id": 25,
                                          "text": "Must've been the strings you pulled",
                                          "words": [
                                                    {
                                                              "pos": "noun",
                                                              "word": "strings",
                                                              "meaning": "dây con rối",
                                                              "phonetic": "strɪŋz"
                                                    }
                                          ],
                                          "endTime": 83.52,
                                          "phonetic": "",
                                          "startTime": 80.06,
                                          "translation": "Tất cả là do những sợi dây mà em đã giật"
                                },
                                {
                                          "id": 26,
                                          "text": "Now it's clear, that I can see the truth",
                                          "words": [
                                                    {
                                                              "pos": "adj",
                                                              "word": "clear",
                                                              "meaning": "rõ ràng",
                                                              "phonetic": "klɪr"
                                                    }
                                          ],
                                          "endTime": 86.97,
                                          "phonetic": "",
                                          "startTime": 83.52,
                                          "translation": "Giờ đây mọi thứ đã rõ ràng, và anh đã nhìn thấy sự thật"
                                },
                                {
                                          "id": 27,
                                          "text": "I was just a puppet to you",
                                          "words": [
                                                    {
                                                              "pos": "noun",
                                                              "word": "puppet",
                                                              "meaning": "con rối",
                                                              "phonetic": "ˈpʌpɪt"
                                                    }
                                          ],
                                          "endTime": 91.29,
                                          "phonetic": "",
                                          "startTime": 86.97,
                                          "translation": "Rằng anh mãi chỉ là một con rối trong mắt em"
                                },
                                {
                                          "id": 28,
                                          "text": "Darling I'm done",
                                          "words": [
                                                    {
                                                              "pos": "adj",
                                                              "word": "done",
                                                              "meaning": "chấm dứt",
                                                              "phonetic": "dʌn"
                                                    }
                                          ],
                                          "endTime": 93.07,
                                          "phonetic": "",
                                          "startTime": 91.29,
                                          "translation": "Em à, anh đã quá mệt mỏi rồi..."
                                },
                                {
                                          "id": 29,
                                          "text": "Playing along",
                                          "words": [
                                                    {
                                                              "pos": "phrase",
                                                              "word": "playing along",
                                                              "meaning": "hùa theo",
                                                              "phonetic": "ˈpleɪɪŋ əˈlɔːŋ"
                                                    }
                                          ],
                                          "endTime": 94.85,
                                          "phonetic": "",
                                          "startTime": 93.07,
                                          "translation": "...khi cứ phải hùa theo trò chơi dối trá của em"
                                },
                                {
                                          "id": 30,
                                          "text": "It's time to cut me loose",
                                          "words": [
                                                    {
                                                              "pos": "phrase",
                                                              "word": "cut loose",
                                                              "meaning": "cắt đứt ràng buộc",
                                                              "phonetic": "kʌt luːs"
                                                    }
                                          ],
                                          "endTime": 96.73,
                                          "phonetic": "",
                                          "startTime": 94.85,
                                          "translation": "Đã đến lúc em phải buông tha và cắt đứt sợi dây của anh rồi"
                                },
                                {
                                          "id": 31,
                                          "text": "Got me wrapped around your finger",
                                          "words": [
                                                    {
                                                              "pos": "verb",
                                                              "word": "wrapped",
                                                              "meaning": "bị kiểm soát",
                                                              "phonetic": "ræpt"
                                                    }
                                          ],
                                          "endTime": 99.25,
                                          "phonetic": "",
                                          "startTime": 96.73,
                                          "translation": "Em từng nắm bắt anh hoàn toàn trong lòng bàn tay"
                                },
                                {
                                          "id": 32,
                                          "text": "Acting like a fool",
                                          "words": [
                                                    {
                                                              "pos": "noun",
                                                              "word": "fool",
                                                              "meaning": "kẻ ngốc",
                                                              "phonetic": "fuːl"
                                                    }
                                          ],
                                          "endTime": 100.91,
                                          "phonetic": "",
                                          "startTime": 99.25,
                                          "translation": "Và biến anh thành kẻ ngốc"
                                },
                                {
                                          "id": 33,
                                          "text": "But girl, I ain't no puppet, no puppet, no puppet for you",
                                          "words": [
                                                    {
                                                              "pos": "noun",
                                                              "word": "puppet",
                                                              "meaning": "con rối",
                                                              "phonetic": "ˈpʌpɪt"
                                                    }
                                          ],
                                          "endTime": 105.91,
                                          "phonetic": "",
                                          "startTime": 100.91,
                                          "translation": "Nhưng cô gái à, anh không phải là con rối, không phải con rối, không bao giờ là con rối của em nữa đâu!"
                                },
                                {
                                          "id": 34,
                                          "text": "Darling I'm done",
                                          "words": [
                                                    {
                                                              "pos": "noun",
                                                              "word": "darling",
                                                              "meaning": "em yêu",
                                                              "phonetic": "ˈdɑːrlɪŋ"
                                                    }
                                          ],
                                          "endTime": 120.84,
                                          "phonetic": "",
                                          "startTime": 119.18,
                                          "translation": "Em à, anh đã quá mệt mỏi rồi..."
                                },
                                {
                                          "id": 35,
                                          "text": "Playing along",
                                          "words": [
                                                    {
                                                              "pos": "phrase",
                                                              "word": "playing along",
                                                              "meaning": "hùa theo",
                                                              "phonetic": "ˈpleɪɪŋ əˈlɔːŋ"
                                                    }
                                          ],
                                          "endTime": 122.7,
                                          "phonetic": "",
                                          "startTime": 120.84,
                                          "translation": "...khi cứ phải hùa theo trò chơi dối trá của em"
                                },
                                {
                                          "id": 36,
                                          "text": "It's time to cut me loose",
                                          "words": [
                                                    {
                                                              "pos": "phrase",
                                                              "word": "cut loose",
                                                              "meaning": "buông bỏ",
                                                              "phonetic": "kʌt luːs"
                                                    }
                                          ],
                                          "endTime": 124.43,
                                          "phonetic": "",
                                          "startTime": 122.7,
                                          "translation": "Đã đến lúc em phải buông tha và cắt đứt sợi dây của anh rồi"
                                },
                                {
                                          "id": 37,
                                          "text": "Got me wrapped around your finger",
                                          "words": [
                                                    {
                                                              "pos": "phrase",
                                                              "word": "wrapped around your finger",
                                                              "meaning": "thao túng hoàn toàn",
                                                              "phonetic": "ræpt əˈraʊnd jʊər ˈfɪŋɡər"
                                                    }
                                          ],
                                          "endTime": 127.09,
                                          "phonetic": "",
                                          "startTime": 124.43,
                                          "translation": "Em từng nắm bắt anh hoàn toàn trong lòng bàn tay"
                                },
                                {
                                          "id": 38,
                                          "text": "Acting like a fool",
                                          "words": [
                                                    {
                                                              "pos": "noun",
                                                              "word": "fool",
                                                              "meaning": "kẻ khờ",
                                                              "phonetic": "fuːl"
                                                    }
                                          ],
                                          "endTime": 128.71,
                                          "phonetic": "",
                                          "startTime": 127.09,
                                          "translation": "Và biến anh thành kẻ ngốc"
                                },
                                {
                                          "id": 39,
                                          "text": "But girl, I ain't no puppet, no puppet, no puppet for you",
                                          "words": [
                                                    {
                                                              "pos": "noun",
                                                              "word": "puppet",
                                                              "meaning": "con rối",
                                                              "phonetic": "ˈpʌpɪt"
                                                    }
                                          ],
                                          "endTime": 132.71,
                                          "phonetic": "",
                                          "startTime": 128.71,
                                          "translation": "Nhưng cô gái à, anh không phải là con rối, không phải con rối, không bao giờ là con rối của em nữa đâu!"
                                }
                      ],
                      "plain_lyrics": "Baby, did you pull my strings so you could play me?\nStrummin' on my heart just to betray me\nHad me crazy over you\n\nFeels like I'm stuck inside your show\nIt's true\n\nYou got me wrapped around your finger\nActing like a fool\nMust've been the strings you pulled\nNow it's clear, that I can see the truth\nI was just a puppet to you\n\nDarling, I'm done\nPlaying along\nIt's time to cut me loose\nGot me wrapped around your finger\nActing like a fool\nBut girl, I ain't no puppet, no puppet, no puppet for you\n\nCan you blame me?\nThe way you had me tricked was so amazing\nBut fire in your eyes was awfully blazing\nHad me gazing, lost in you\n\nFeels like I'm stuck inside your show\nIt's true\n\nYou got me wrapped around your finger\nActing like a fool\nMust've been the strings you pulled\nNow it's clear, that I can see the truth\nI was just a puppet to you\n\nDarling I'm done\nPlaying along\nIt's time to cut me loose\nGot me wrapped around your finger\nActing like a fool\nBut girl, I ain't no puppet, no puppet, no puppet for you\n\nDarling I'm done\nPlaying along\nIt's time to cut me loose\nGot me wrapped around your finger\nActing like a fool\nBut girl, I ain't no puppet, no puppet, no puppet for you",
                      "views": 1,
                      "likes": 0,
                      "official_version": {},
                      "community_versions": [],
                      "created_by": "AISA AI Verified"
            },
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
            },
            {
          "id": "a-thousand-years-jvke-john-michael-howell",
          "title": "A Thousand Years",
          "artist": "John Michael Howell, JVKE & ZVC",
          "aliases": ["Một Ngàn Năm", "Nghìn Năm", "Mot Ngan Nam", "Nghin Nam", "A Thousand Years", "JVKE", "John Michael Howell"],
          "lang": "en",
          "thumbnail": "https://img.youtube.com/vi/5ptdEemGjrQ/hqdefault.jpg",
          "youtube_id": "5ptdEemGjrQ",
          "audio_url": "",
          "duration": 180,
          "synced_lyrics": [
                    {
                              "id": 1,
                              "text": "I was a kid looking for love, full of hope inside",
                              "words": [
                                        {
                                                  "pos": "noun phrase",
                                                  "word": "hope inside",
                                                  "meaning": "niềm hy vọng bên trong tâm hồn",
                                                  "phonetic": "hoʊp ˈɪnsaɪd"
                                        }
                              ],
                              "endTime": 12.47,
                              "phonetic": "",
                              "startTime": 8.58,
                              "translation": "Anh từng là một đứa trẻ tìm kiếm tình yêu, trong tim tràn ngập hy vọng."
                    },
                    {
                              "id": 2,
                              "text": "But time was never kind to me, my heart grew cold as ice",
                              "words": [
                                        {
                                                  "pos": "adjective phrase",
                                                  "word": "cold as ice",
                                                  "meaning": "lạnh giá như băng",
                                                  "phonetic": "koʊld əz aɪs"
                                        }
                              ],
                              "endTime": 16.83,
                              "phonetic": "",
                              "startTime": 12.47,
                              "translation": "Nhưng thời gian chẳng bao giờ dịu dàng với anh, trái tim anh đã lạnh giá tựa băng."
                    },
                    {
                              "id": 3,
                              "text": "All out of luck thought I was stuck alone for all my life",
                              "words": [
                                        {
                                                  "pos": "adjective phrase",
                                                  "word": "stuck alone",
                                                  "meaning": "kẹt lại trong sự cô đơn",
                                                  "phonetic": "stʌk əˈloʊn"
                                        }
                              ],
                              "endTime": 20.8,
                              "phonetic": "",
                              "startTime": 16.83,
                              "translation": "Cạn kiệt vận may, anh cứ ngỡ mình sẽ mãi cô độc suốt cuộc đời."
                    },
                    {
                              "id": 4,
                              "text": "But I was proven wrong the moment I looked in your eyes",
                              "words": [
                                        {
                                                  "pos": "verb phrase",
                                                  "word": "proven wrong",
                                                  "meaning": "chứng minh là đã sai",
                                                  "phonetic": "ˈpruvən rɔŋ"
                                        }
                              ],
                              "endTime": 24.93,
                              "phonetic": "",
                              "startTime": 20.8,
                              "translation": "Nhưng anh đã hoàn toàn lầm tưởng vào khoảnh khắc anh nhìn vào đôi mắt em."
                    },
                    {
                              "id": 5,
                              "text": "It's true, until I'm in the grave, darlin', I'll love you for a thousand years",
                              "words": [
                                        {
                                                  "pos": "prepositional phrase",
                                                  "word": "in the grave",
                                                  "meaning": "nằm xuống mồ, khi chết đi",
                                                  "phonetic": "ɪn ðə greɪv"
                                        }
                              ],
                              "endTime": 34.7,
                              "phonetic": "",
                              "startTime": 24.93,
                              "translation": "Thật đấy, cho đến khi anh nằm xuống mồ sâu, em yêu ơi, anh vẫn sẽ yêu em suốt ngàn năm."
                    },
                    {
                              "id": 6,
                              "text": "Dear, time is nothing when I'm here with you, ohh",
                              "words": [
                                        {
                                                  "pos": "clause",
                                                  "word": "time is nothing",
                                                  "meaning": "thời gian không có nghĩa lý gì",
                                                  "phonetic": "taɪm ɪz ˈnʌθɪŋ"
                                        }
                              ],
                              "endTime": 41.02,
                              "phonetic": "",
                              "startTime": 34.7,
                              "translation": "Em ơi, thời gian chẳng là gì khi anh được ở bên em, ồ."
                    },
                    {
                              "id": 7,
                              "text": "All my fears, tears, those memories they disappear with you, ohh",
                              "words": [
                                        {
                                                  "pos": "verb",
                                                  "word": "disappear",
                                                  "meaning": "tan biến, biến mất",
                                                  "phonetic": "ˌdɪsəˈpɪr"
                                        }
                              ],
                              "endTime": 49.33,
                              "phonetic": "",
                              "startTime": 41.02,
                              "translation": "Mọi nỗi sợ, giọt nước mắt và những ký ức ấy đều tan biến cùng em, ồ."
                    },
                    {
                              "id": 8,
                              "text": "'Til I turn into dust, I'll carry this love, my dear, for a thousand years",
                              "words": [
                                        {
                                                  "pos": "verb phrase",
                                                  "word": "turn into dust",
                                                  "meaning": "hóa thành cát bụi",
                                                  "phonetic": "tɜrn ˈɪntu dʌst"
                                        }
                              ],
                              "endTime": 66.95,
                              "phonetic": "",
                              "startTime": 49.33,
                              "translation": "Cho đến khi anh hóa thành cát bụi, anh vẫn sẽ mang theo tình yêu này, em yêu ơi, suốt ngàn năm."
                    },
                    {
                              "id": 9,
                              "text": "Saw very soon something will bloom like a lotus flower",
                              "words": [
                                        {
                                                  "pos": "noun phrase",
                                                  "word": "lotus flower",
                                                  "meaning": "đóa hoa sen",
                                                  "phonetic": "ˈloʊtəs ˈflaʊər"
                                        }
                              ],
                              "endTime": 71.14,
                              "phonetic": "",
                              "startTime": 66.95,
                              "translation": "Anh sớm nhận ra điều gì đó sẽ nở rộ tựa đóa hoa sen."
                    },
                    {
                              "id": 10,
                              "text": "The bluest moon will soon be sun and turn to golden hour",
                              "words": [
                                        {
                                                  "pos": "noun phrase",
                                                  "word": "golden hour",
                                                  "meaning": "giờ vàng, khoảnh khắc đẹp nhất",
                                                  "phonetic": "ˈgoʊldən ˈaʊər"
                                        }
                              ],
                              "endTime": 75.51,
                              "phonetic": "",
                              "startTime": 71.14,
                              "translation": "Ánh trăng xanh thẳm rồi sẽ chuyển hóa thành mặt trời và bước vào khoảnh khắc hoàng kim."
                    },
                    {
                              "id": 11,
                              "text": "Hours and days lost in your gaze, losing track of time",
                              "words": [
                                        {
                                                  "pos": "verb phrase",
                                                  "word": "losing track of time",
                                                  "meaning": "mất khái niệm về thời gian",
                                                  "phonetic": "ˈluzɪŋ træk ʌv taɪm"
                                        }
                              ],
                              "endTime": 79.76,
                              "phonetic": "",
                              "startTime": 75.51,
                              "translation": "Hàng giờ rồi hàng ngày lạc trôi trong ánh mắt em, quên đi cả thời gian."
                    },
                    {
                              "id": 12,
                              "text": "Learning how to slow it down appreciate our lives",
                              "words": [
                                        {
                                                  "pos": "verb phrase",
                                                  "word": "slow it down",
                                                  "meaning": "làm chậm lại, sống chậm",
                                                  "phonetic": "sloʊ ɪt daʊn"
                                        }
                              ],
                              "endTime": 83.58,
                              "phonetic": "",
                              "startTime": 79.76,
                              "translation": "Học cách sống chậm lại để trân trọng cuộc đời chúng ta."
                    },
                    {
                              "id": 13,
                              "text": "Just know until I'm in the grave darlin', I'll love you for a thousand years",
                              "words": [
                                        {
                                                  "pos": "phrase",
                                                  "word": "just know",
                                                  "meaning": "hãy biết rằng, hãy hiểu cho",
                                                  "phonetic": "ʤʌst noʊ"
                                        }
                              ],
                              "endTime": 93.16,
                              "phonetic": "",
                              "startTime": 83.58,
                              "translation": "Hãy biết rằng cho đến khi anh nằm xuống mồ sâu, em yêu ơi, anh vẫn sẽ yêu em suốt ngàn năm."
                    },
                    {
                              "id": 14,
                              "text": "Dear, time is nothing when I'm here with you, ohh",
                              "words": [
                                        {
                                                  "pos": "clause",
                                                  "word": "time is nothing",
                                                  "meaning": "thời gian không có nghĩa lý gì",
                                                  "phonetic": "taɪm ɪz ˈnʌθɪŋ"
                                        }
                              ],
                              "endTime": 99.69,
                              "phonetic": "",
                              "startTime": 93.16,
                              "translation": "Em ơi, thời gian chẳng là gì khi anh được ở bên em, ồ."
                    },
                    {
                              "id": 15,
                              "text": "All my fears, tears, those memories they disappear with you, ohh",
                              "words": [
                                        {
                                                  "pos": "verb",
                                                  "word": "disappear",
                                                  "meaning": "tan biến, biến mất",
                                                  "phonetic": "ˌdɪsəˈpɪr"
                                        }
                              ],
                              "endTime": 107.97,
                              "phonetic": "",
                              "startTime": 99.69,
                              "translation": "Mọi nỗi sợ, giọt nước mắt và những ký ức ấy đều tan biến cùng em, ồ."
                    },
                    {
                              "id": 16,
                              "text": "'Til I turn into dust I'll carry this love, my dear, for a thousand years",
                              "words": [
                                        {
                                                  "pos": "verb phrase",
                                                  "word": "turn into dust",
                                                  "meaning": "hóa thành cát bụi",
                                                  "phonetic": "tɜrn ˈɪntu dʌst"
                                        }
                              ],
                              "endTime": 125.85,
                              "phonetic": "",
                              "startTime": 107.97,
                              "translation": "Cho đến khi anh hóa thành cát bụi, anh vẫn sẽ mang theo tình yêu này, em yêu ơi, suốt ngàn năm."
                    },
                    {
                              "id": 17,
                              "text": "Set it all on fire, let it burn up brighter",
                              "words": [
                                        {
                                                  "pos": "verb phrase",
                                                  "word": "set on fire",
                                                  "meaning": "thắp lửa, đốt cháy",
                                                  "phonetic": "sɛt ɒn ˈfaɪər"
                                        }
                              ],
                              "endTime": 129.99,
                              "phonetic": "",
                              "startTime": 125.85,
                              "translation": "Thắp bùng lên tất cả, hãy để ngọn lửa cháy rực rỡ hơn."
                    },
                    {
                              "id": 18,
                              "text": "Love is a flame, it's dancing away to David playing on a lyre",
                              "words": [
                                        {
                                                  "pos": "verb phrase",
                                                  "word": "dancing away",
                                                  "meaning": "nhảy múa say sưa",
                                                  "phonetic": "ˈdɑnsɪŋ əˈweɪ"
                                        }
                              ],
                              "endTime": 134.04,
                              "phonetic": "",
                              "startTime": 129.99,
                              "translation": "Tình yêu là ngọn lửa, đang nhảy múa theo tiếng đàn lia của David."
                    },
                    {
                              "id": 19,
                              "text": "Set it all on fire, let the smoke go higher",
                              "words": [
                                        {
                                                  "pos": "clause",
                                                  "word": "smoke go higher",
                                                  "meaning": "làn khói bay cao",
                                                  "phonetic": "smoʊk goʊ ˈhaɪər"
                                        }
                              ],
                              "endTime": 138.13,
                              "phonetic": "",
                              "startTime": 134.04,
                              "translation": "Thắp bùng lên tất cả, hãy để làn khói bay cao hơn nữa."
                    },
                    {
                              "id": 20,
                              "text": "'Cause darlin', I'll love you for a thousand years",
                              "words": [
                                        {
                                                  "pos": "noun phrase",
                                                  "word": "a thousand years",
                                                  "meaning": "khoảng thời gian ngàn năm",
                                                  "phonetic": "ə ˈθaʊzənd jɪrz"
                                        }
                              ],
                              "endTime": 143.32,
                              "phonetic": "",
                              "startTime": 138.13,
                              "translation": "Vì em yêu ơi, anh sẽ yêu em suốt ngàn năm."
                    },
                    {
                              "id": 21,
                              "text": "Dear, time is nothing when I'm here with you, ohh",
                              "words": [
                                        {
                                                  "pos": "clause",
                                                  "word": "time is nothing",
                                                  "meaning": "thời gian không có nghĩa lý gì",
                                                  "phonetic": "taɪm ɪz ˈnʌθɪŋ"
                                        }
                              ],
                              "endTime": 149.88,
                              "phonetic": "",
                              "startTime": 143.32,
                              "translation": "Em ơi, thời gian chẳng là gì khi anh được ở bên em, ồ."
                    },
                    {
                              "id": 22,
                              "text": "All my fears, tears, those memories they disappear with you, ohh",
                              "words": [
                                        {
                                                  "pos": "verb",
                                                  "word": "disappear",
                                                  "meaning": "tan biến, biến mất",
                                                  "phonetic": "ˌdɪsəˈpɪr"
                                        }
                              ],
                              "endTime": 158.17,
                              "phonetic": "",
                              "startTime": 149.88,
                              "translation": "Mọi nỗi sợ, giọt nước mắt và những ký ức ấy đều tan biến cùng em, ồ."
                    },
                    {
                              "id": 23,
                              "text": "'Til the air leaves my lungs with each breath, I'll hold you near",
                              "words": [
                                        {
                                                  "pos": "verb phrase",
                                                  "word": "hold you near",
                                                  "meaning": "ôm ấp, giữ bên cạnh",
                                                  "phonetic": "hoʊld ju nɪr"
                                        }
                              ],
                              "endTime": 166.54,
                              "phonetic": "",
                              "startTime": 158.17,
                              "translation": "Cho đến khi hơi thở cuối cùng rời khỏi lồng ngực, anh vẫn sẽ ôm chặt lấy em."
                    },
                    {
                              "id": 24,
                              "text": "'Til I turn into dust, I'll carry this love, my dear, for a thousand years",
                              "words": [
                                        {
                                                  "pos": "verb phrase",
                                                  "word": "carry this love",
                                                  "meaning": "ôm ấp và gìn giữ tình yêu",
                                                  "phonetic": "ˈkæri ðɪs lʌv"
                                        }
                              ],
                              "endTime": 171.04,
                              "phonetic": "",
                              "startTime": 166.54,
                              "translation": "Cho đến khi anh hóa thành cát bụi, anh vẫn sẽ mang theo tình yêu này, em yêu ơi, suốt ngàn năm."
                    }
          ]
},
            {
          "id": "awakening-harmony-cure-zukyoon-kiss",
          "title": "Awakening Harmony",
          "artist": "キュアズキューン (南條愛乃) & キュアキッス (花井美春)",
          "aliases": ["Tỉnh Thức Hòa Ca", "Hòa Ca Thức Tỉnh", "Bừng Sáng", "Awakening Harmony", "Cure Zukyoon", "Cure Kiss", "Tinh Thuc Hoa Ca", "Hoa Ca Thuc Tinh", "Bung Sang", "Precure", "Pretty Cure", "キミとアイドルプリキュア"],
          "lang": "ja",
          "thumbnail": "https://img.youtube.com/vi/OlZK4BPps_g/hqdefault.jpg",
          "youtube_id": "OlZK4BPps_g",
          "audio_url": "",
          "duration": 218,
          "synced_lyrics": [
                    {
                              "id": 1,
                              "text": "暗闇のまんなか 真っ直ぐな眼差しで",
                              "words": [
                                        {
                                                  "pos": "noun",
                                                  "word": "暗闇",
                                                  "meaning": "bóng tối",
                                                  "phonetic": "kurayami"
                                        },
                                        {
                                                  "pos": "noun",
                                                  "word": "眼差し",
                                                  "meaning": "ánh mắt",
                                                  "phonetic": "manazashi"
                                        }
                              ],
                              "endTime": 23.17,
                              "phonetic": "Kurayami no mannaka massugu na manazashi de",
                              "startTime": 17.35,
                              "translation": "Giữa chốn tối tăm mịt mờ, với ánh nhìn thẳng tắp và kiên định"
                    },
                    {
                              "id": 2,
                              "text": "立ち上がる姿 ちゃんと見ていたよ",
                              "words": [
                                        {
                                                  "pos": "verb",
                                                  "word": "立ち上がる",
                                                  "meaning": "đứng dậy",
                                                  "phonetic": "tachiagaru"
                                        },
                                        {
                                                  "pos": "noun",
                                                  "word": "姿",
                                                  "meaning": "dáng hình",
                                                  "phonetic": "sugata"
                                        }
                              ],
                              "endTime": 28.53,
                              "phonetic": "Tachiagaru sugata chanto miteita yo",
                              "startTime": 23.17,
                              "translation": "Tôi vẫn luôn dõi theo dáng hình kiên cường đứng dậy ấy"
                    },
                    {
                              "id": 3,
                              "text": "閉じ込められそうな 心を奮い立たせ",
                              "words": [
                                        {
                                                  "pos": "noun",
                                                  "word": "心",
                                                  "meaning": "trái tim",
                                                  "phonetic": "kokoro"
                                        },
                                        {
                                                  "pos": "verb",
                                                  "word": "奮い立たせ",
                                                  "meaning": "vực dậy",
                                                  "phonetic": "furuitatase"
                                        }
                              ],
                              "endTime": 34.31,
                              "phonetic": "Tojikomerare sou na kokoro o furuitatase",
                              "startTime": 28.53,
                              "translation": "Hãy thắp lên và vực dậy trái tim tưởng chừng như đang bị giam cầm"
                    },
                    {
                              "id": 4,
                              "text": "おさまりきらない 輝きを放ち",
                              "words": [
                                        {
                                                  "pos": "noun",
                                                  "word": "輝き",
                                                  "meaning": "ánh sáng",
                                                  "phonetic": "kagayaki"
                                        },
                                        {
                                                  "pos": "verb",
                                                  "word": "放ち",
                                                  "meaning": "tỏa ra",
                                                  "phonetic": "hanachi"
                                        }
                              ],
                              "endTime": 39.02,
                              "phonetic": "Osamrikiranai kagayaki o hanachi",
                              "startTime": 34.31,
                              "translation": "Tỏa ra thứ ánh sáng rực rỡ chẳng thể nào kìm nén thêm nữa"
                    },
                    {
                              "id": 5,
                              "text": "射抜かれた胸のおく 焼きついた目映さは",
                              "words": [
                                        {
                                                  "pos": "noun",
                                                  "word": "胸",
                                                  "meaning": "lồng ngực",
                                                  "phonetic": "mune"
                                        },
                                        {
                                                  "pos": "noun",
                                                  "word": "目映さ",
                                                  "meaning": "sự chói lọi",
                                                  "phonetic": "mabayusa"
                                        }
                              ],
                              "endTime": 44.74,
                              "phonetic": "Inukareta mune no oku yakitsuita mabayusa wa",
                              "startTime": 39.02,
                              "translation": "Vẻ rực rỡ đã khắc sâu vào tận đáy lồng ngực vừa bị xuyên thấu ấy"
                    },
                    {
                              "id": 6,
                              "text": "それだけでもう理由になる 待っていて",
                              "words": [
                                        {
                                                  "pos": "noun",
                                                  "word": "理由",
                                                  "meaning": "lý do",
                                                  "phonetic": "riyuu"
                                        },
                                        {
                                                  "pos": "verb",
                                                  "word": "待って",
                                                  "meaning": "chờ đợi",
                                                  "phonetic": "matte"
                                        }
                              ],
                              "endTime": 50.47,
                              "phonetic": "Sore dake mou riyuu ni naru matte ite",
                              "startTime": 44.74,
                              "translation": "Chỉ thế thôi cũng đủ thành lý do rồi, hãy chờ tôi nhé"
                    },
                    {
                              "id": 7,
                              "text": "取り戻したい 光の世界",
                              "words": [
                                        {
                                                  "pos": "verb",
                                                  "word": "取り戻す",
                                                  "meaning": "lấy lại",
                                                  "phonetic": "torimodosu"
                                        },
                                        {
                                                  "pos": "noun",
                                                  "word": "光",
                                                  "meaning": "ánh sáng",
                                                  "phonetic": "hikari"
                                        }
                              ],
                              "endTime": 56.03,
                              "phonetic": "Torimodoshitai hikari no sekai",
                              "startTime": 50.47,
                              "translation": "Chúng ta muốn lấy lại thế giới tràn ngập ánh sáng"
                    },
                    {
                              "id": 8,
                              "text": "その笑顔 勇気 涙 夢 希望の兆し",
                              "words": [
                                        {
                                                  "pos": "noun",
                                                  "word": "笑顔",
                                                  "meaning": "nụ cười",
                                                  "phonetic": "egao"
                                        },
                                        {
                                                  "pos": "noun",
                                                  "word": "希望",
                                                  "meaning": "hy vọng",
                                                  "phonetic": "kibou"
                                        }
                              ],
                              "endTime": 61.63,
                              "phonetic": "Sono egao yuuki namida yume kibou no kizashi",
                              "startTime": 56.03,
                              "translation": "Nụ cười, lòng dũng cảm, giọt nước mắt, ước mơ và điềm báo hy vọng của bạn"
                    },
                    {
                              "id": 9,
                              "text": "キミと明日を 願うチカラで",
                              "words": [
                                        {
                                                  "pos": "pronoun",
                                                  "word": "キミ",
                                                  "meaning": "bạn, cậu (君)",
                                                  "phonetic": "kimi"
                                        },
                                        {
                                                  "pos": "noun",
                                                  "word": "明日",
                                                  "meaning": "ngày mai",
                                                  "phonetic": "ashita"
                                        },
                                        {
                                                  "pos": "noun",
                                                  "word": "チカラ",
                                                  "meaning": "sức mạnh (力)",
                                                  "phonetic": "chikara"
                                        }
                              ],
                              "endTime": 67.03,
                              "phonetic": "Kimi to ashita o negau chikara de",
                              "startTime": 61.63,
                              "translation": "Bằng sức mạnh ước nguyện về một ngày mai cùng bạn"
                    },
                    {
                              "id": 10,
                              "text": "うまれる わたし達のハーモニー",
                              "words": [
                                        {
                                                  "pos": "verb",
                                                  "word": "うまれる",
                                                  "meaning": "sinh ra, chào đời (生まれる)",
                                                  "phonetic": "umareru"
                                        },
                                        {
                                                  "pos": "pronoun",
                                                  "word": "わたし達",
                                                  "meaning": "chúng ta, chúng mình (私たち)",
                                                  "phonetic": "watashitachi"
                                        },
                                        {
                                                  "pos": "noun",
                                                  "word": "ハーモニー",
                                                  "meaning": "giai điệu hòa ca, hòa âm",
                                                  "phonetic": "haamanii"
                                        }
                              ],
                              "endTime": 73.02,
                              "phonetic": "Umareru watashitachi no haamanii",
                              "startTime": 67.03,
                              "translation": "Giai điệu hòa ca của chúng ta được sinh ra"
                    },
                    {
                              "id": 11,
                              "text": "響け",
                              "words": [
                                        {
                                                  "pos": "verb",
                                                  "word": "響け",
                                                  "meaning": "vang vọng",
                                                  "phonetic": "hibike"
                                        }
                              ],
                              "endTime": 84.97,
                              "phonetic": "Hibike",
                              "startTime": 73.02,
                              "translation": "Hãy vang lên thật xa!"
                    },
                    {
                              "id": 12,
                              "text": "それでも暗闇は 訪れてしまうもの",
                              "words": [
                                        {
                                                  "pos": "noun",
                                                  "word": "暗闇",
                                                  "meaning": "bóng tối",
                                                  "phonetic": "kurayami"
                                        },
                                        {
                                                  "pos": "verb",
                                                  "word": "訪れる",
                                                  "meaning": "ghé đến",
                                                  "phonetic": "otozureru"
                                        }
                              ],
                              "endTime": 90.83,
                              "phonetic": "Soredemo kurayami wa otozurete shimau mono",
                              "startTime": 84.97,
                              "translation": "Dẫu vậy, đôi khi bóng tối vẫn cứ bất chợt kéo đến"
                    },
                    {
                              "id": 13,
                              "text": "惑わされないで キミはキミだから",
                              "words": [
                                        {
                                                  "pos": "verb",
                                                  "word": "惑わされない",
                                                  "meaning": "bị mê hoặc/lung lay",
                                                  "phonetic": "madowasarenai"
                                        },
                                        {
                                                  "pos": "pronoun",
                                                  "word": "キミ",
                                                  "meaning": "bạn",
                                                  "phonetic": "kimi"
                                        }
                              ],
                              "endTime": 96.53,
                              "phonetic": "Madowasarenai de kimi wa kimi dakara",
                              "startTime": 90.83,
                              "translation": "Đừng để bản thân bị lung lay, bởi vì bạn mãi là chính bạn"
                    },
                    {
                              "id": 14,
                              "text": "渡しあえた日々が ハートを輝かせる",
                              "words": [
                                        {
                                                  "pos": "noun",
                                                  "word": "日々",
                                                  "meaning": "ngày tháng",
                                                  "phonetic": "hibi"
                                        },
                                        {
                                                  "pos": "verb",
                                                  "word": "輝かせる",
                                                  "meaning": "làm cho tỏa sáng",
                                                  "phonetic": "kagayakaseru"
                                        }
                              ],
                              "endTime": 101.94,
                              "phonetic": "Watashiaeta hibi ga haato o kagayakaseru",
                              "startTime": 96.53,
                              "translation": "Những ngày tháng sẻ chia cùng nhau thắp sáng trái tim này"
                    },
                    {
                              "id": 15,
                              "text": "ひとりじゃないこと 気づかせてくれる",
                              "words": [
                                        {
                                                  "pos": "adjective",
                                                  "word": "ひとり",
                                                  "meaning": "một mình",
                                                  "phonetic": "hitori"
                                        },
                                        {
                                                  "pos": "verb",
                                                  "word": "気づかせ",
                                                  "meaning": "làm cho nhận ra",
                                                  "phonetic": "kizukase"
                                        }
                              ],
                              "endTime": 106.88,
                              "phonetic": "Hitori ja nai koto kizukasete kureru",
                              "startTime": 101.94,
                              "translation": "Đã cho tôi nhận ra rằng chúng ta không hề cô độc"
                    },
                    {
                              "id": 16,
                              "text": "抱えきれないほどの「ありがとう」のかわりに",
                              "words": [
                                        {
                                                  "pos": "verb",
                                                  "word": "抱えきれない",
                                                  "meaning": "không ôm hết",
                                                  "phonetic": "kaka kirenai"
                                        },
                                        {
                                                  "pos": "interjection",
                                                  "word": "ありがとう",
                                                  "meaning": "cảm ơn",
                                                  "phonetic": "arigatou"
                                        }
                              ],
                              "endTime": 112.55,
                              "phonetic": "Kaka kirenai hodo no \"arigatou\" no kawari ni",
                              "startTime": 106.88,
                              "translation": "Thay cho ngàn lời \"cảm ơn\" mà tôi chứa chan chẳng thể ôm hết"
                    },
                    {
                              "id": 17,
                              "text": "鍵をかけてひとつになる 受け止めて",
                              "words": [
                                        {
                                                  "pos": "noun",
                                                  "word": "鍵",
                                                  "meaning": "chìa khóa",
                                                  "phonetic": "kagi"
                                        },
                                        {
                                                  "pos": "verb",
                                                  "word": "受け止めて",
                                                  "meaning": "đón nhận",
                                                  "phonetic": "uketomete"
                                        }
                              ],
                              "endTime": 118.09,
                              "phonetic": "Kagi o kakete hitotsu ni naru uketomete",
                              "startTime": 112.55,
                              "translation": "Khóa chặt lại để hòa làm một, xin hãy đón nhận lấy nhé"
                    },
                    {
                              "id": 18,
                              "text": "取り戻すんだ 光の未来",
                              "words": [
                                        {
                                                  "pos": "verb",
                                                  "word": "取り戻す",
                                                  "meaning": "lấy lại",
                                                  "phonetic": "torimodosu"
                                        },
                                        {
                                                  "pos": "noun",
                                                  "word": "未来",
                                                  "meaning": "tương lai",
                                                  "phonetic": "mirai"
                                        }
                              ],
                              "endTime": 123.75,
                              "phonetic": "Torimodosunda hikari no mirai",
                              "startTime": 118.09,
                              "translation": "Chúng ta nhất định sẽ lấy lại tương lai ngập tràn ánh sáng"
                    },
                    {
                              "id": 19,
                              "text": "今アツい オモイ 繋ぐ 声 叶えに行くよ",
                              "words": [
                                        {
                                                  "pos": "adjective",
                                                  "word": "熱い",
                                                  "meaning": "nhiệt huyết",
                                                  "phonetic": "atsui"
                                        },
                                        {
                                                  "pos": "noun",
                                                  "word": "声",
                                                  "meaning": "tiếng nói",
                                                  "phonetic": "koe"
                                        }
                              ],
                              "endTime": 129.4,
                              "phonetic": "Ima atsui omoi tsunagu koe kanae ni iku yo",
                              "startTime": 123.75,
                              "translation": "Giờ đây, tiếng gọi kết nối những xúc cảm nhiệt huyết sẽ đi thực hiện điều ước"
                    },
                    {
                              "id": 20,
                              "text": "キミと一緒に 願える奇跡",
                              "words": [
                                        {
                                                  "pos": "noun",
                                                  "word": "一緒",
                                                  "meaning": "cùng nhau",
                                                  "phonetic": "issho"
                                        },
                                        {
                                                  "pos": "noun",
                                                  "word": "奇跡",
                                                  "meaning": "phép màu",
                                                  "phonetic": "kiseki"
                                        }
                              ],
                              "endTime": 134.77,
                              "phonetic": "Kimi to issho ni negaeru kiseki",
                              "startTime": 129.4,
                              "translation": "Phép màu mà tôi được ước nguyện cùng với bạn"
                    },
                    {
                              "id": 21,
                              "text": "かさねて 広がっていくハーモニー",
                              "words": [
                                        {
                                                  "pos": "verb",
                                                  "word": "かさねて",
                                                  "meaning": "chồng lên/hòa quyện (重ねて)",
                                                  "phonetic": "kasanete"
                                        },
                                        {
                                                  "pos": "verb",
                                                  "word": "広がって",
                                                  "meaning": "lan rộng (広がる)",
                                                  "phonetic": "hirogatte"
                                        },
                                        {
                                                  "pos": "noun",
                                                  "word": "ハーモニー",
                                                  "meaning": "giai điệu hòa ca, hòa âm",
                                                  "phonetic": "haamanii"
                                        }
                              ],
                              "endTime": 164.09,
                              "phonetic": "Kasanete hirogatte iku haamanii",
                              "startTime": 134.77,
                              "translation": "Giai điệu hòa ca cứ thế chồng chất và lan tỏa rộng lớn"
                    },
                    {
                              "id": 22,
                              "text": "目覚める時が来たね ホントの自分になる",
                              "words": [
                                        {
                                                  "pos": "verb",
                                                  "word": "目覚める",
                                                  "meaning": "thức tỉnh",
                                                  "phonetic": "mezameru"
                                        },
                                        {
                                                  "pos": "pronoun",
                                                  "word": "自分",
                                                  "meaning": "bản thân",
                                                  "phonetic": "jibun"
                                        }
                              ],
                              "endTime": 169.79,
                              "phonetic": "Mezameru toki ga kita ne honto no jibun ni naru",
                              "startTime": 164.09,
                              "translation": "Thời khắc thức tỉnh đã đến rồi, chúng ta trở thành chính mình thật sự"
                    },
                    {
                              "id": 23,
                              "text": "満ちる運命",
                              "words": [
                                        {
                                                  "pos": "verb",
                                                  "word": "満ちる",
                                                  "meaning": "tràn đầy",
                                                  "phonetic": "michiru"
                                        },
                                        {
                                                  "pos": "noun",
                                                  "word": "運命",
                                                  "meaning": "định mệnh",
                                                  "phonetic": "unmei"
                                        }
                              ],
                              "endTime": 174.6,
                              "phonetic": "Michiru unmei",
                              "startTime": 169.79,
                              "translation": "Định mệnh đang dần trọn vẹn và viên mãn"
                    },
                    {
                              "id": 24,
                              "text": "取り戻したい 光の世界",
                              "words": [
                                        {
                                                  "pos": "verb",
                                                  "word": "取り戻す",
                                                  "meaning": "lấy lại",
                                                  "phonetic": "torimodosu"
                                        },
                                        {
                                                  "pos": "noun",
                                                  "word": "光",
                                                  "meaning": "ánh sáng",
                                                  "phonetic": "hikari"
                                        }
                              ],
                              "endTime": 180.14,
                              "phonetic": "Torimodoshitai hikari no sekai",
                              "startTime": 174.6,
                              "translation": "Chúng ta muốn lấy lại thế giới tràn ngập ánh sáng"
                    },
                    {
                              "id": 25,
                              "text": "その笑顔 勇気 涙 夢 希望の兆し",
                              "words": [
                                        {
                                                  "pos": "noun",
                                                  "word": "笑顔",
                                                  "meaning": "nụ cười",
                                                  "phonetic": "egao"
                                        },
                                        {
                                                  "pos": "noun",
                                                  "word": "希望",
                                                  "meaning": "hy vọng",
                                                  "phonetic": "kibou"
                                        }
                              ],
                              "endTime": 185.97,
                              "phonetic": "Sono egao yuuki namida yume kibou no kizashi",
                              "startTime": 180.14,
                              "translation": "Nụ cười, lòng dũng cảm, giọt nước mắt, ước mơ và điềm báo hy vọng của bạn"
                    },
                    {
                              "id": 26,
                              "text": "キミと明日を 願うチカラで",
                              "words": [
                                        {
                                                  "pos": "pronoun",
                                                  "word": "キミ",
                                                  "meaning": "bạn, cậu (君)",
                                                  "phonetic": "kimi"
                                        },
                                        {
                                                  "pos": "noun",
                                                  "word": "明日",
                                                  "meaning": "ngày mai",
                                                  "phonetic": "ashita"
                                        },
                                        {
                                                  "pos": "noun",
                                                  "word": "チカラ",
                                                  "meaning": "sức mạnh (力)",
                                                  "phonetic": "chikara"
                                        }
                              ],
                              "endTime": 191.07,
                              "phonetic": "Kimi to ashita o negau chikara de",
                              "startTime": 185.97,
                              "translation": "Bằng sức mạnh ước nguyện về một ngày mai cùng bạn"
                    },
                    {
                              "id": 27,
                              "text": "うまれる わたし達のハーモニー",
                              "words": [
                                        {
                                                  "pos": "verb",
                                                  "word": "うまれる",
                                                  "meaning": "sinh ra, chào đời (生まれる)",
                                                  "phonetic": "umareru"
                                        },
                                        {
                                                  "pos": "pronoun",
                                                  "word": "わたし達",
                                                  "meaning": "chúng ta, chúng mình (私たち)",
                                                  "phonetic": "watashitachi"
                                        },
                                        {
                                                  "pos": "noun",
                                                  "word": "ハーモニー",
                                                  "meaning": "giai điệu hòa ca, hòa âm",
                                                  "phonetic": "haamanii"
                                        }
                              ],
                              "endTime": 197.17,
                              "phonetic": "Umareru watashitachi no haamanii",
                              "startTime": 191.07,
                              "translation": "Giai điệu hòa ca của chúng ta được sinh ra"
                    },
                    {
                              "id": 28,
                              "text": "響け",
                              "words": [
                                        {
                                                  "pos": "verb",
                                                  "word": "響け",
                                                  "meaning": "vang vọng",
                                                  "phonetic": "hibike"
                                        }
                              ],
                              "endTime": 201.67,
                              "phonetic": "Hibike",
                              "startTime": 197.17,
                              "translation": "Hãy vang lên thật xa!"
                    }
          ]
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

        grid.innerHTML = filtered.map(s => {
            const ytBackup = s.youtube_id ? `https://img.youtube.com/vi/${s.youtube_id}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60';
            const imgSrc = s.thumbnail || ytBackup;
            return `
            <div class="song-card" onclick="window.lyricsApp.loadSongById('${s.id}')">
                <div class="song-card-img-wrap">
                    <img src="${imgSrc}" onerror="this.onerror=null; this.src='${ytBackup}';" alt="${this.escapeHtml(s.title)}" class="song-card-img">
                    <span class="song-card-lang-tag">${langLabels[s.lang] || 'Học tiếng'}</span>
                </div>
                <div class="song-card-title">${this.escapeHtml(s.title)}</div>
                <div class="song-card-artist">${this.escapeHtml(s.artist)}</div>
            </div>
            `;
        }).join('');
    }

    async loadSongById(id) {
        if (!id) return false;
        const song = this.featuredSongs.find(s => s.id === id);
        if (song) {
            this.loadSong(song);
            if (window.innerWidth <= 768) {
                const ws = document.querySelector('.lyrics-workspace');
                if (ws) ws.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            return true;
        }
        if (window.studyCloud && typeof window.studyCloud.getSong === 'function') {
            try {
                const cloudSong = await window.studyCloud.getSong(id);
                if (cloudSong) {
                    this.loadSong(cloudSong);
                    if (window.innerWidth <= 768) {
                        const ws = document.querySelector('.lyrics-workspace');
                        if (ws) ws.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                    return true;
                }
            } catch (e) {}
        }
        return false;
    }

    async loadSongByParam(param) {
        if (!param) return;
        const pTrim = decodeURIComponent(param).trim();
        const pLower = pTrim.toLowerCase();
        const pClean = pLower.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();

        // 1. Kiểm tra chính xác theo ID hoặc Slug trong featuredSongs
        let match = this.featuredSongs.find(s => 
            s.id.toLowerCase() === pLower ||
            s.id.toLowerCase().replace(/[-_]/g, ' ') === pClean ||
            s.title.toLowerCase() === pLower ||
            s.title.toLowerCase() === pClean
        );

        // 2. Kiểm tra theo aliases (Hán Việt, Việt dịch, Romaji, Pinyin...)
        if (!match) {
            match = this.featuredSongs.find(s => {
                const titleNorm = this.removeVietnameseTones(s.title);
                const qNorm = this.removeVietnameseTones(pClean);
                const hasAlias = Array.isArray(s.aliases) && s.aliases.some(a => {
                    const aNorm = this.removeVietnameseTones(a);
                    return aNorm === qNorm || aNorm.includes(qNorm) || qNorm.includes(aNorm);
                });
                return hasAlias || titleNorm === qNorm || pLower.includes(s.id.toLowerCase()) || s.id.toLowerCase().includes(pLower);
            });
        }

        if (match) {
            this.loadSong(match);
            return;
        }

        // 2B. Kiểm tra trong danh sách Custom Songs do học viên/người dùng đã thêm
        const customSongs = this.getAllCustomSongs();
        let matchCustom = customSongs.find(s => 
            s.id.toLowerCase() === pLower ||
            s.id.toLowerCase().replace(/[-_]/g, ' ') === pClean ||
            s.title.toLowerCase() === pLower ||
            s.title.toLowerCase() === pClean
        );
        if (matchCustom) {
            this.loadSong(matchCustom);
            return;
        }

        // 3. Kiểm tra trên Supabase Cloud (study_songs)
        if (window.studyCloud && typeof window.studyCloud.getSong === 'function') {
            try {
                const cloudSong = await window.studyCloud.getSong(pTrim);
                if (cloudSong) {
                    this.loadSong(cloudSong);
                    return;
                }
            } catch (e) {}
        }

        // 4. Nếu là link YouTube hoặc Video ID (11 ký tự)
        const ytMatch = pTrim.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/|^)([a-zA-Z0-9_-]{11})(?:\S*)?$/i);
        if (ytMatch && ytMatch[1] && (pTrim.includes('http') || pTrim.includes('youtu') || pTrim.length === 11 || pTrim.startsWith('yt-'))) {
            await this.searchSong(ytMatch[1]);
            return;
        }

        // 5. Nếu không khớp trực tiếp bài hát cụ thể nào trong kho -> lúc đó mới mở tìm kiếm
        await this.searchSong(pClean);
    }
}

// Khởi tạo Singleton
window.lyricsApp = new LyricsHubApp();
