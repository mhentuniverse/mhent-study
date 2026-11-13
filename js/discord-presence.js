/**
 * MHENT STUDY & UNIVERSE - DISCORD RICH PRESENCE (RPC) BRIDGE
 * Đồng bộ trạng thái học tập, nghe nhạc (Lyrics Hub), xem phim (Cinema) lên Discord Profile.
 * Hỗ trợ cả Desktop App (Electron IPC) và Web Browser (Local Bridge & PreMiD/CustomEvent).
 */

(function (global) {
    'use strict';

    const BRIDGE_HTTP_PORT = 14128;
    const DEFAULT_CLIENT_ID = '1570699759319126037';

    class MHEntDiscordBridge {
        constructor() {
            this.isDesktop = Boolean(window.MHEntDesktop && window.MHEntDesktop.discord);
            this.isBridgeConnected = false;
            this.isEnabled = localStorage.getItem('mhent_discord_rpc_enabled') !== 'off';
            this.customClientId = localStorage.getItem('mhent_discord_client_id') || '';
            this.currentActivity = null;
            this.discordUser = null;
            this.checkInterval = null;
            this.sessionStartTime = Math.floor(Date.now() / 1000);

            this.init();
        }

        async init() {
            if (!this.isEnabled) return;

            if (this.isDesktop) {
                // Trên Desktop Electron: Giao tiếp trực tiếp qua IPC
                try {
                    const status = await window.MHEntDesktop.discord.getStatus();
                    if (status) {
                        this.isBridgeConnected = status.ready;
                        this.discordUser = status.user;
                    }
                } catch (e) {
                    console.warn('[MHEnt Discord] Lỗi lấy status Desktop:', e);
                }
            } else {
                // Trên Web Browser: Khởi động WebSocket thời gian thực siêu tốc 2 chiều
                this.connectWebSocket();
            }

            // Tự động phân tích trang hiện tại để phát tín hiệu Presence phù hợp
            setTimeout(() => {
                this.autoDetectPageContext();
            }, 1000);

            // Gắn widget UI vào trang (nếu là trang có giao diện chính)
            this.injectDiscordUI();

            // Tự động xóa activity khi tắt tab hoặc chuyển trang
            window.addEventListener('beforeunload', () => {
                if (this.ws && this.ws.readyState === 1) {
                    try { this.ws.send(JSON.stringify({ action: 'clearActivity' })); } catch(e){}
                } else if (navigator.sendBeacon) {
                    try {
                        const blob = new Blob([JSON.stringify({ action: 'clearActivity' })], { type: 'application/json' });
                        navigator.sendBeacon(`http://127.0.0.1:${BRIDGE_HTTP_PORT}/api/discord-rpc`, blob);
                    } catch(e){}
                }
            });
        }

        connectWebSocket() {
            if (this.isDesktop) return;
            if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) return;

            try {
                const ws = new WebSocket(`ws://127.0.0.1:${BRIDGE_HTTP_PORT}`);
                this.ws = ws;

                ws.onopen = () => {
                    this.isBridgeConnected = true;
                    this.updateUIPill();
                    if (this.currentActivity) {
                        try { ws.send(JSON.stringify({ action: 'setActivity', activity: this.currentActivity })); } catch(e){}
                    }
                };

                ws.onmessage = (event) => {
                    try {
                        const msg = JSON.parse(event.data);
                        if (msg.type === 'status') {
                            this.isBridgeConnected = Boolean(msg.ready);
                            this.discordUser = msg.user || null;
                            this.updateUIPill();
                        }
                    } catch (e) {}
                };

                ws.onclose = () => {
                    this.isBridgeConnected = false;
                    this.ws = null;
                    this.updateUIPill();
                    setTimeout(() => this.connectWebSocket(), 3000);
                };

                ws.onerror = () => {
                    this.isBridgeConnected = false;
                    this.updateUIPill();
                    this.probeLocalBridge();
                };
            } catch (e) {
                this.probeLocalBridge();
                setTimeout(() => this.connectWebSocket(), 5000);
            }
        }

        async probeLocalBridge() {
            if (this.isDesktop) return;
            try {
                const res = await fetch(`http://127.0.0.1:${BRIDGE_HTTP_PORT}/api/discord-status`, {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-cache'
                });
                if (res.ok) {
                    const data = await res.json();
                    this.isBridgeConnected = Boolean(data.ready);
                    this.discordUser = data.user || null;
                    this.updateUIPill();
                } else {
                    this.isBridgeConnected = false;
                    this.updateUIPill();
                }
            } catch (e) {
                this.isBridgeConnected = false;
                this.updateUIPill();
            }
        }

        /**
         * Gửi Activity cập nhật lên Discord
         */
        async setActivity(activity) {
            if (!this.isEnabled) return false;
            this.currentActivity = activity;

            // 1. Thêm metadata mặc định nếu thiếu
            if (activity && !activity.startTimestamp && !activity.endTimestamp) {
                activity.startTimestamp = this.sessionStartTime;
            }

            // Đảm bảo luôn có nút tương tác chuẩn MHEnt Universe
            if (activity && (!activity.buttons || activity.buttons.length === 0)) {
                activity.buttons = [
                    { label: 'Học cùng tớ ✨', url: window.location.href.startsWith('http') ? window.location.href : 'https://www.mhentuniverse.com' },
                    { label: 'MHEnt Universe 🌌', url: 'https://www.mhentuniverse.com' }
                ];
            }

            // 2. Gửi qua Desktop IPC nếu đang ở Desktop
            if (this.isDesktop && window.MHEntDesktop.discord) {
                try {
                    const ok = await window.MHEntDesktop.discord.setActivity(activity);
                    this.isBridgeConnected = Boolean(ok);
                    this.updateUIPill();
                    return ok;
                } catch (err) {
                    console.warn('[MHEnt Discord IPC Error]:', err);
                    return false;
                }
            }

            // 3. Gửi qua WebSocket Realtime tức thì (Độ trễ 0.001s, không bị Chrome chặn PNA hay preflight)
            if (this.ws && this.ws.readyState === 1) {
                try {
                    this.ws.send(JSON.stringify({ action: 'setActivity', activity }));
                    this.isBridgeConnected = true;
                    this.updateUIPill();
                    return true;
                } catch (e) {}
            }

            // Fallback gửi qua HTTP nếu WebSocket đang kết nối lại
            try {
                const res = await fetch(`http://127.0.0.1:${BRIDGE_HTTP_PORT}/api/discord-rpc`, {
                    method: 'POST',
                    mode: 'cors',
                    cache: 'no-store',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'setActivity', activity })
                });
                if (res.ok) {
                    this.isBridgeConnected = true;
                    this.updateUIPill();
                }
            } catch (err) {
                this.isBridgeConnected = false;
                this.updateUIPill();
            }

            // 4. Phát CustomEvent cho PreMiD Extension hoặc Browser Extension khác
            try {
                window.__MHEntDiscordPresence = activity;
                window.dispatchEvent(new CustomEvent('mhent:discord-presence', { detail: activity }));
            } catch (e) {}

            return true;
        }

        async clearActivity() {
            this.currentActivity = null;
            if (this.isDesktop && window.MHEntDesktop.discord) {
                await window.MHEntDesktop.discord.clearActivity();
            } else {
                try {
                    await fetch(`http://127.0.0.1:${BRIDGE_HTTP_PORT}/api/discord-rpc`, {
                        method: 'POST',
                        mode: 'cors',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'clearActivity' })
                    });
                } catch (e) {}
            }
            this.updateUIPill();
        }

        // =========================================================
        // 🎯 CÁC MẪU ACTIVITY CHUYÊN BIỆT CHO MHENT STUDY
        // =========================================================

        /**
         * 1. Học Sổ Từ Vựng (Vocab Sheet)
         */
        setVocabActivity({ deckTitle, language, currentCount, totalCount, deckId }) {
            const langNames = { en: 'Tiếng Anh 🇬🇧', ja: 'Tiếng Nhật 🇯🇵', ko: 'Tiếng Hàn 🇰🇷', zh: 'Tiếng Trung 🇨🇳' };
            const langName = langNames[language] || 'Ngoại Ngữ';

            const shareUrl = deckId
                ? `${window.location.origin}/${language}/practice/vocab?deck=${encodeURIComponent(deckId)}`
                : window.location.href;

            this.setActivity({
                details: `Sổ Từ Vựng: ${(deckTitle || 'Chuyên đề từ vựng').substring(0, 100)}`,
                state: `Đang làm chủ ${currentCount || 0}/${totalCount || 30} từ • ${langName}`,
                type: 0, // Playing
                startTimestamp: this.sessionStartTime,
                largeImage: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4da.png',
                largeImageText: 'MHEnt. Study Universe',
                smallImage: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2728.png',
                smallImageText: langName,
                buttons: [
                    { label: 'Học bài này cùng tớ 📖', url: shareUrl },
                    { label: 'MHEnt Study 🌌', url: 'https://www.mhentuniverse.com' }
                ]
            });
        }

        /**
         * 2. Luyện Thẻ Ghi Nhớ 3D (Flashcards)
         */
        setFlashcardsActivity({ deckTitle, language, currentIndex, totalCards, deckId }) {
            const langNames = { en: 'Tiếng Anh 🇬🇧', ja: 'Tiếng Nhật 🇯🇵', ko: 'Tiếng Hàn 🇰🇷', zh: 'Tiếng Trung 🇨🇳' };
            const langName = langNames[language] || 'Ngoại Ngữ';

            this.setActivity({
                details: `Luyện Thẻ 3D: ${(deckTitle || 'Bộ Thẻ Ghi Nhớ').substring(0, 100)}`,
                state: `Thẻ ${currentIndex || 1}/${totalCards || 20} • Phản xạ nhanh • ${langName}`,
                type: 0,
                startTimestamp: this.sessionStartTime,
                largeImage: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f0cf.png',
                largeImageText: '3D Interactive Flashcards',
                smallImage: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f525.png',
                smallImageText: 'Streak Hot',
                buttons: [
                    { label: 'Lật thẻ cùng tớ 🎴', url: window.location.href },
                    { label: 'MHEnt Study 🌌', url: 'https://www.mhentuniverse.com' }
                ]
            });
        }

        /**
         * 3. Nghe Nhạc Lyrics Hub (Karaoke Song Ngữ) - Phong cách Spotify / Crunchyroll
         */
        setLyricsActivity({ title, artist, language, currentTime, duration, isPlaying, coverUrl, songId }) {
            const nowSec = Math.floor(Date.now() / 1000);
            const curSec = Math.floor(currentTime || 0);
            const durSec = Math.floor(duration || 0);

            const langMap = { en: 'Tiếng Anh 🇬🇧', ko: 'Tiếng Hàn 🇰🇷', ja: 'Tiếng Nhật 🇯🇵', zh: 'Tiếng Trung 🇨🇳', vi: 'Tiếng Việt 🇻🇳' };
            const langLabel = langMap[language] || 'Lyrics Hub 🎵';

            const activity = {
                details: `${(title || 'Bài Hát').substring(0, 80)}`,
                state: `${(artist || 'Nghệ Sĩ').substring(0, 60)} • ${langLabel}`,
                type: 2, // 2: Listening to
                largeImage: coverUrl && coverUrl.startsWith('http')
                    ? coverUrl
                    : 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3a7.png',
                largeImageText: `${(title || 'MHEnt Study').substring(0, 35)} (${(artist || '').substring(0, 25)})`,
                smallImage: isPlaying
                    ? 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/25b6.png'
                    : 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/23f8.png',
                smallImageText: isPlaying ? 'Đang phát • Lyrics Hub' : 'Tạm dừng • Lyrics Hub',
                buttons: [
                    { label: 'Nghe & Học cùng 🎧', url: songId ? `https://study.mhentuniverse.com/lyrics?song=${encodeURIComponent(songId)}` : 'https://study.mhentuniverse.com/lyrics' },
                    { label: 'MHEnt Universe 🌌', url: 'https://www.mhentuniverse.com' }
                ]
            };

            if (isPlaying && durSec > 0 && curSec < durSec) {
                // Discord sẽ tự động hiển thị thanh tiến độ bài hát (1:01 / 3:45 remaining)
                activity.startTimestamp = nowSec - curSec;
                activity.endTimestamp = nowSec + (durSec - curSec);
            } else {
                activity.startTimestamp = nowSec;
            }

            this.setActivity(activity);
        }

        /**
         * 4. Xem Phim / Video MHEnt Cinema - Phong cách Crunchyroll y hệt ảnh
         */
        setCinemaActivity({ title, episode, currentTime, duration, isPlaying, coverUrl }) {
            const nowSec = Math.floor(Date.now() / 1000);
            const curSec = Math.floor(currentTime || 0);
            const durSec = Math.floor(duration || 0);

            const activity = {
                details: `${(title || 'Phim / Video').substring(0, 100)}`,
                state: `${(episode || 'Đang xem').substring(0, 80)} • MHEnt Cinema`,
                type: 3, // 3: Watching
                largeImage: coverUrl && coverUrl.startsWith('http')
                    ? coverUrl
                    : 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3ac.png',
                largeImageText: 'MHEnt Cinema Universe',
                smallImage: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4fa.png',
                smallImageText: 'Watching Movie',
                buttons: [
                    { label: 'Xem cùng tớ 🍿', url: window.location.href },
                    { label: 'MHEnt Cinema 🎬', url: 'https://cinema.mhentuniverse.com' }
                ]
            };

            if (isPlaying && durSec > 0 && curSec < durSec) {
                activity.startTimestamp = nowSec - curSec;
                activity.endTimestamp = nowSec + (durSec - curSec);
            } else {
                activity.startTimestamp = nowSec;
            }

            this.setActivity(activity);
        }

        /**
         * 5. Minigames & Luyện Phản Xạ
         */
        setQuizActivity({ gameTitle, score, streak, language }) {
            this.setActivity({
                details: `Đấu trường: ${gameTitle || 'Trắc nghiệm tốc độ'}`,
                state: `Điểm: ${score || 0} • Chuỗi ngày: ${streak || 1} 🔥`,
                type: 0,
                startTimestamp: this.sessionStartTime,
                largeImage: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3af.png',
                largeImageText: 'MHEnt Arena Challenge',
                smallImage: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/26a1.png',
                smallImageText: 'Speed Quiz'
            });
        }

        /**
         * Tự động phát hiện ngữ cảnh trang để set activity ban đầu
         */
        autoDetectPageContext() {
            const path = window.location.pathname.toLowerCase();

            // 1. Lyrics Hub
            if (path.includes('lyrics')) {
                // Sẽ được cập nhật khi lyrics-hub.js phát nhạc, đặt trạng thái chờ trước
                this.setActivity({
                    details: 'MHEnt Lyrics Study Hub 🎵',
                    state: 'Đang chọn bài hát yêu thích',
                    type: 2,
                    largeImage: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3a7.png',
                    largeImageText: 'Lyrics Hub'
                });
                this.hookLyricsHub();
                return;
            }

            // 2. Sổ từ vựng
            if (path.includes('vocab')) {
                const lang = path.includes('/ja/') ? 'ja' : path.includes('/ko/') ? 'ko' : path.includes('/zh/') ? 'zh' : 'en';
                this.hookVocabSheet(lang);
                return;
            }

            // 3. Thẻ 3D Flashcards
            if (path.includes('flashcard')) {
                const lang = path.includes('/ja/') ? 'ja' : path.includes('/ko/') ? 'ko' : path.includes('/zh/') ? 'zh' : 'en';
                this.setFlashcardsActivity({
                    deckTitle: 'Luyện Phản Xạ Thẻ 3D',
                    language: lang,
                    currentIndex: 1,
                    totalCards: 25
                });
                return;
            }

            // 4. Trang chủ Study
            this.setActivity({
                details: 'Khám Phá Vũ Trụ Ngôn Ngữ',
                state: 'Tiếng Anh • Nhật • Hàn • Trung',
                type: 0,
                largeImage: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f30c.png',
                largeImageText: 'MHEnt. Study Universe'
            });
        }

        /**
         * Móc nối sự kiện vào Lyrics Hub Player để phát hiện thời gian thực
         */
        hookLyricsHub() {
            let lastTrackKey = '';
            let lastIsPlaying = null;

            const syncFromLyricsApp = () => {
                const app = window.lyricsApp || window.lyricsHub;
                if (!app || !app.currentSong) return;

                const song = app.currentSong;
                const isPlaying = Boolean(app.isPlaying);
                let curTime = 0;
                if (app.useYouTube && app.ytPlayer && typeof app.ytPlayer.getCurrentTime === 'function') {
                    try { curTime = app.ytPlayer.getCurrentTime() || 0; } catch (e) {}
                } else if (app.audioPlayer) {
                    curTime = app.audioPlayer.currentTime || 0;
                }

                let dur = app.duration || (song && song.duration) || 210;
                if (app.useYouTube && app.ytPlayer && typeof app.ytPlayer.getDuration === 'function') {
                    try {
                        const d = app.ytPlayer.getDuration();
                        if (d && d > 0) dur = d;
                    } catch (e) {}
                }

                const trackKey = `${song.id || song.title}_${isPlaying}`;
                // Cập nhật khi đổi bài hoặc đổi trạng thái play/pause
                if (trackKey !== lastTrackKey || isPlaying !== lastIsPlaying) {
                    lastTrackKey = trackKey;
                    lastIsPlaying = isPlaying;
                    this.setLyricsActivity({
                        title: song.title,
                        artist: song.artist,
                        language: song.lang || song.language || 'ja',
                        currentTime: curTime,
                        duration: dur,
                        isPlaying: isPlaying,
                        coverUrl: song.thumbnail || song.cover,
                        songId: song.id
                    });
                }
            };

            // Kiểm tra định kỳ mỗi 1 giây để bắt kịp từng thao tác phát bài
            setInterval(syncFromLyricsApp, 1000);
            setTimeout(syncFromLyricsApp, 500);
            setTimeout(syncFromLyricsApp, 1500);
        }

        /**
         * Móc nối sự kiện vào Sổ Từ Vựng (Vocab Sheet)
         */
        hookVocabSheet(lang) {
            let lastDeckId = '';
            const syncFromSheet = () => {
                const app = window.sheetApp;
                if (!app) return;
                const deck = app.currentDeck;
                const deckId = deck ? (deck.id || deck.title) : '';
                if (deckId !== lastDeckId && deck) {
                    lastDeckId = deckId;
                    this.setVocabActivity({
                        deckTitle: deck.title || deck.id || 'Chuyên đề từ vựng',
                        language: app.lang || lang,
                        currentCount: deck.words ? deck.words.length : 0,
                        totalCount: deck.words ? deck.words.length : 30,
                        deckId: deck.id || ''
                    });
                }
            };
            setInterval(syncFromSheet, 1500);
            setTimeout(syncFromSheet, 600);
        }

        // =========================================================
        // 🎨 GIAO DIỆN NÚT TRẠNG THÁI & MODAL CÀI ĐẶT DISCORD
        // =========================================================

        injectDiscordUI() {
            if (document.getElementById('mhent-discord-indicator')) return;

            // CSS giao diện
            const style = document.createElement('style');
            style.textContent = `
                .discord-indicator-pill {
                    position: fixed;
                    bottom: 24px;
                    left: 24px;
                    z-index: 9998;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(15, 23, 42, 0.82);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(88, 101, 242, 0.4);
                    color: #fff;
                    padding: 7px 14px;
                    border-radius: 9999px;
                    font-size: 12px;
                    font-weight: 700;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
                    cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                    user-select: none;
                }
                .discord-indicator-pill:hover {
                    transform: translateY(-2px) scale(1.03);
                    border-color: #5865F2;
                    box-shadow: 0 10px 28px rgba(88, 101, 242, 0.35);
                }
                .discord-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #64748b;
                    transition: background 0.3s;
                }
                .discord-dot.online {
                    background: #22c55e;
                    box-shadow: 0 0 10px #22c55e;
                }
                .discord-modal-overlay {
                    position: fixed;
                    top: 0; left: 0; width: 100vw; height: 100vh;
                    background: rgba(0, 0, 0, 0.75);
                    backdrop-filter: blur(14px);
                    z-index: 100000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.25s ease;
                }
                .discord-modal-overlay.active {
                    opacity: 1;
                    pointer-events: auto;
                }
                .discord-modal-card {
                    background: #0f172a;
                    border: 1.5px solid rgba(88, 101, 242, 0.4);
                    border-radius: 20px;
                    max-width: 460px;
                    width: 100%;
                    padding: 26px;
                    color: #f8fafc;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.6);
                    position: relative;
                }
                .discord-preview-box {
                    background: #1e1f22;
                    border-radius: 12px;
                    padding: 14px;
                    margin: 16px 0;
                    border: 1px solid rgba(255,255,255,0.08);
                    display: flex;
                    gap: 14px;
                    align-items: center;
                }
                .discord-preview-img {
                    width: 64px;
                    height: 64px;
                    border-radius: 10px;
                    background: #2b2d31;
                    object-fit: cover;
                }
            `;
            document.head.appendChild(style);

            // Nút Pill
            const pill = document.createElement('div');
            pill.id = 'mhent-discord-indicator';
            pill.className = 'discord-indicator-pill';
            pill.innerHTML = `
                <i class="fa-brands fa-discord" style="color: #5865F2; font-size: 15px;"></i>
                <span class="discord-dot" id="discord-status-dot"></span>
                <span id="discord-status-text">Discord Rich Presence</span>
            `;
            pill.addEventListener('click', () => this.openSettingsModal());
            document.body.appendChild(pill);

            this.updateUIPill();
        }

        updateUIPill() {
            const dot = document.getElementById('discord-status-dot');
            const text = document.getElementById('discord-status-text');
            if (!dot || !text) return;

            if (!this.isEnabled) {
                dot.className = 'discord-dot';
                dot.style.background = '#ef4444';
                text.textContent = 'Discord (Đã tắt)';
                return;
            }

            if (this.isBridgeConnected) {
                dot.className = 'discord-dot online';
                const name = this.discordUser ? (this.discordUser.global_name || this.discordUser.username) : '';
                text.textContent = name ? `Discord: ${name}` : 'Discord Đã Kết Nối';
            } else {
                dot.className = 'discord-dot';
                dot.style.background = '#64748b';
                text.textContent = this.isDesktop ? 'Discord Đang Chờ' : 'Discord (Web Bridge)';
            }
        }

        openSettingsModal() {
            let modal = document.getElementById('mhent-discord-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'mhent-discord-modal';
                modal.className = 'discord-modal-overlay';
                document.body.appendChild(modal);
            }

            const act = this.currentActivity || {
                details: 'MHEnt. Study Universe',
                state: 'Học ngoại ngữ & Luyện thẻ 3D',
                largeImage: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f30c.png'
            };

            const userText = this.discordUser
                ? `Đã đăng nhập: <strong>${this.discordUser.global_name || this.discordUser.username}</strong>`
                : (this.isBridgeConnected ? 'Đã kết nối Discord Desktop Client' : 'Chưa phát hiện Discord Desktop');

            modal.innerHTML = `
                <div class="discord-modal-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <i class="fa-brands fa-discord" style="color: #5865F2; font-size: 26px;"></i>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 900;">Discord Rich Presence</h3>
                        </div>
                        <button id="btn-close-discord-modal" style="background: none; border: none; color: #94a3b8; font-size: 20px; cursor: pointer;">&times;</button>
                    </div>

                    <p style="font-size: 13px; color: #94a3b8; margin: 0 0 12px 0;">
                        Tự động hiển thị huy hiệu hoạt động (Playing/Listening/Watching) trên hồ sơ cá nhân Discord khi bạn học bài hoặc nghe nhạc!
                    </p>

                    <div style="background: rgba(88, 101, 242, 0.1); border: 1px solid rgba(88, 101, 242, 0.3); border-radius: 10px; padding: 10px 14px; font-size: 12.5px; display: flex; align-items: center; justify-content: space-between;">
                        <span>Trạng thái: <strong>${this.isBridgeConnected ? '<span style="color:#22c55e;">● Đang phát</span>' : '<span style="color:#f59e0b;">● Đang chờ kết nối</span>'}</strong></span>
                        <span style="font-size: 11.5px; color: #94a3b8;">${userText}</span>
                    </div>

                    <!-- Giả lập thẻ Discord -->
                    <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #94a3b8; margin-top: 14px;">Xem trước trên Discord:</div>
                    <div class="discord-preview-box">
                        <img class="discord-preview-img" src="${act.largeImage || 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4da.png'}" alt="Preview">
                        <div style="overflow: hidden;">
                            <div style="font-weight: 800; font-size: 14px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${act.details || 'MHEnt. Study — Vũ Trụ Ngôn Ngữ'}
                            </div>
                            <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">
                                ${act.state || 'Đang ôn từ vựng & luyện thẻ 3D'}
                            </div>
                            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                                ⏱️ 00:15:30 elapsed • 🇬🇧 🇯🇵 🇰🇷 🇨🇳
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button id="btn-toggle-discord" style="flex: 1; padding: 10px; border-radius: 10px; font-weight: 800; font-size: 13px; border: none; cursor: pointer; background: ${this.isEnabled ? '#ef4444' : '#22c55e'}; color: #fff;">
                            ${this.isEnabled ? 'Tắt Rich Presence' : 'Bật Rich Presence'}
                        </button>
                        <button id="btn-test-discord" style="flex: 1; padding: 10px; border-radius: 10px; font-weight: 800; font-size: 13px; border: none; cursor: pointer; background: #5865F2; color: #fff;">
                            <i class="fa-solid fa-bolt"></i> Test Phát Thử
                        </button>
                    </div>

                    <div style="margin-top: 14px; text-align: center; display: flex; justify-content: center; gap: 16px; flex-wrap: wrap;">
                        <a href="https://accounts.mhentuniverse.com/profile" target="_blank" style="font-size: 11.5px; color: #7983f5; text-decoration: none; font-weight: 700;">
                            <i class="fa-brands fa-discord"></i> Quản lý liên kết MHEnt ID
                        </a>
                        <a href="javascript:void(0)" id="btn-open-custom-client" style="font-size: 11.5px; color: #60a5fa; text-decoration: none;">
                            <i class="fa-solid fa-gear"></i> Tùy chỉnh App ID
                        </a>
                    </div>
                </div>
            `;

            modal.classList.add('active');

            // Listeners
            document.getElementById('btn-close-discord-modal').onclick = () => modal.classList.remove('active');
            modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };

            document.getElementById('btn-toggle-discord').onclick = () => {
                this.isEnabled = !this.isEnabled;
                localStorage.setItem('mhent_discord_rpc_enabled', this.isEnabled ? 'on' : 'off');
                if (!this.isEnabled) {
                    this.clearActivity();
                } else {
                    this.autoDetectPageContext();
                }
                this.openSettingsModal();
            };

            document.getElementById('btn-test-discord').onclick = () => {
                this.setActivity({
                    details: 'Đang trải nghiệm MHEnt Study Universe ✨',
                    state: 'Test kết nối Discord Rich Presence cực mượt!',
                    startTimestamp: Math.floor(Date.now() / 1000),
                    largeImage: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f31f.png',
                    largeImageText: 'MHEnt Universe Test',
                    buttons: [
                        { label: 'Học cùng tớ 🌸', url: 'https://study.mhentuniverse.com' },
                        { label: 'MHEnt Universe 🌌', url: 'https://www.mhentuniverse.com' }
                    ]
                });
                if (typeof window.showToast === 'function') {
                    window.showToast('Discord RPC', 'Đã phát tín hiệu Test lên Discord của cậu!', 'success');
                } else {
                    alert('Đã phát tín hiệu Test lên Discord của cậu! Kiểm tra profile Discord nhé!');
                }
                this.openSettingsModal();
            };

            document.getElementById('btn-open-custom-client').onclick = () => {
                const cur = this.customClientId || DEFAULT_CLIENT_ID;
                const newId = prompt('Nhập Application ID từ Discord Developer Portal (để Discord hiện tên app theo ý bạn):', cur);
                if (newId && newId.trim()) {
                    this.customClientId = newId.trim();
                    localStorage.setItem('mhent_discord_client_id', this.customClientId);
                    if (this.isDesktop && window.MHEntDesktop.discord.setClientId) {
                        window.MHEntDesktop.discord.setClientId(this.customClientId);
                    }
                    alert('Đã cập nhật Client ID: ' + this.customClientId);
                    this.autoDetectPageContext();
                }
            };
        }
    }

    // Khởi tạo Singleton toàn cục
    global.MHEntDiscord = new MHEntDiscordBridge();

})(typeof window !== 'undefined' ? window : global);

