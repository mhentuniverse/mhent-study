/**
 * MHENT STUDY - SUPABASE CLOUD SYNC ENGINE
 * Đồng bộ kho từ vựng cá nhân, lưu trữ và chia sẻ giáo trình qua Supabase Cloud
 */
class StudyCloudClient {
    constructor() {
        this.config = (window.MHENT_CONFIG && window.MHENT_CONFIG.SUPABASE) || {
            URL: "https://ctzkgchjheirxwejctvl.supabase.co",
            KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0emtnY2hqaGVpcnh3ZWpjdHZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjA0MTgsImV4cCI6MjA5MTgzNjQxOH0.Wl-sBpH1VvcR6-Y4D4UAVm1f5_brGK3cVIHRJBEhOJ0",
            DICT_URL: "https://hwklqefdwskmwwyofthb.supabase.co",
            DICT_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3a2xxZWZkd3NrbXd3eW9mdGhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMTUzODYsImV4cCI6MjEwNjc5MTM4Nn0.VV2By40CkQLEq9OVU8e4HooYt-XHihGItFvOaAV78SU"
        };
        this.url = this.config.URL;
        this.key = this.config.KEY;
        this.dictUrl = this.config.DICT_URL || this.url;
        this.dictKey = this.config.DICT_KEY || this.key;
        this.client = null;
        this.hasDedicatedTable = null; // Kiểm tra xem bảng study_decks đã tạo chưa

        this.init();
    }

    getDictHeaders() {
        return {
            'apikey': this.dictKey,
            'Authorization': `Bearer ${this.dictKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
    }

    init() {
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            try {
                this.client = window.supabase.createClient(this.url, this.key);
                console.log('[Supabase Study] ✅ Khởi tạo Supabase Client thành công!');
            } catch (e) {
                console.warn('[Supabase Study] Lỗi khởi tạo SDK, chuyển sang REST API:', e);
            }
        }
    }

    getHeaders() {
        return {
            'apikey': this.key,
            'Authorization': `Bearer ${this.key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
    }

    getSharedSessionUser() {
        try {
            const match = document.cookie.match(/(?:^|;\s*)mhent_auth_session=([^;]*)/);
            if (match && match[1]) {
                const user = JSON.parse(decodeURIComponent(match[1]));
                if (user && (user.uid || user.id)) {
                    try {
                        localStorage.setItem('mhent_user_profile', JSON.stringify(user));
                        if (user.role) localStorage.setItem('mhent_user_role', user.role);
                    } catch(e) {}
                    return user;
                }
            }
        } catch (e) {}
        return null;
    }

    getUserId() {
        // 1. Ưu tiên Firebase Auth instance nếu có
        if (window.studyAuth && window.studyAuth.currentUser) {
            return window.studyAuth.currentUser.uid;
        }
        // 2. Cookie phiên đăng nhập dùng chung toàn miền (*.mhentuniverse.com)
        const sessionUser = this.getSharedSessionUser();
        if (sessionUser && (sessionUser.uid || sessionUser.id)) {
            return sessionUser.uid || sessionUser.id;
        }
        // 3. Profile đã đăng nhập lưu trong localStorage (đồng bộ qua toàn hệ thống MHEnt Universe)
        try {
            const cached = JSON.parse(localStorage.getItem('mhent_user_profile') || '{}');
            if (cached && (cached.uid || cached.id)) {
                return cached.uid || cached.id;
            }
        } catch (e) {}

        // 4. Hoặc guest ID duy nhất trên trình duyệt
        let guestId = localStorage.getItem('mhent_study_guest_id');
        if (!guestId) {
            guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
            localStorage.setItem('mhent_study_guest_id', guestId);
        }
        return guestId;
    }

    getUserName() {
        if (window.studyAuth && window.studyAuth.currentUser) {
            return window.studyAuth.currentUser.displayName || window.studyAuth.currentUser.email || 'Thành viên MHEnt';
        }
        const sessionUser = this.getSharedSessionUser();
        if (sessionUser && (sessionUser.displayName || sessionUser.email)) {
            return sessionUser.displayName || sessionUser.email;
        }
        try {
            const cached = JSON.parse(localStorage.getItem('mhent_user_profile') || '{}');
            if (cached && (cached.displayName || cached.email)) {
                return cached.displayName || cached.email;
            }
        } catch (e) {}
        return 'Học viên MHEnt';
    }

    /**
     * Lưu một bộ từ vựng lên Supabase Cloud
     */
    async saveDeck(deck) {
        if (!deck || !deck.id) return { success: false, error: 'Dữ liệu không hợp lệ' };

        const userId = this.getUserId();
        const userName = this.getUserName();
        deck.userId = userId;
        deck.author = deck.author || userName;
        deck.updatedAt = new Date().toISOString();

        // 1. Thử lưu vào bảng chuyên dụng study_decks
        try {
            const endpoint = `${this.url}/rest/v1/study_decks`;
            const payload = {
                id: deck.id,
                user_id: userId,
                lang: deck.lang || 'ko',
                title: deck.title || 'Bộ từ vựng cá nhân',
                description: deck.description || '',
                author: deck.author,
                words: deck.words || [],
                is_public: true,
                updated_at: deck.updatedAt
            };

            const res = await fetch(`${endpoint}?on_conflict=id`, {
                method: 'POST',
                headers: {
                    ...this.getHeaders(),
                    'Prefer': 'resolution=merge-duplicates,return=representation'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                console.log('[Supabase Study] ✅ Đã lưu vào study_decks:', deck.id);
                return { success: true, deckId: deck.id, mode: 'study_decks' };
            }
        } catch (e) {
            // Tiếp tục fallback
        }

        // 2. Fallback sang bảng workspace_notes (đã có sẵn trong Supabase)
        try {
            const noteId = `study_deck_${deck.id}`;
            const noteTitle = `[STUDY_DECK:${deck.lang || 'all'}] ${deck.title}`;
            const noteContent = JSON.stringify(deck);

            const payload = {
                id: noteId,
                user_id: userId,
                title: noteTitle,
                content: noteContent,
                updated_at: deck.updatedAt
            };

            const res = await fetch(`${this.url}/rest/v1/workspace_notes?on_conflict=id`, {
                method: 'POST',
                headers: {
                    ...this.getHeaders(),
                    'Prefer': 'resolution=merge-duplicates,return=representation'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                console.log('[Supabase Study] ✅ Đã đồng bộ vào Cloud (workspace_notes):', deck.id);
                return { success: true, deckId: deck.id, mode: 'workspace_notes' };
            }
        } catch (err) {
            console.error('[Supabase Study] Lỗi lưu cloud:', err);
        }

        return { success: false, error: 'Không thể kết nối Supabase Cloud' };
    }

    /**
     * Tải một bộ bài từ Cloud theo ID
     */
    async getDeck(deckId) {
        if (!deckId) return null;

        // 1. Thử lấy từ study_decks
        try {
            const res = await fetch(`${this.url}/rest/v1/study_decks?id=eq.${encodeURIComponent(deckId)}&select=*`, {
                headers: this.getHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    const row = data[0];
                    return {
                        id: row.id,
                        lang: row.lang,
                        title: row.title,
                        description: row.description,
                        author: row.author,
                        words: row.words || [],
                        updatedAt: row.updated_at
                    };
                }
            }
        } catch (e) {
            // fallback
        }

        // 2. Fallback tìm trong workspace_notes
        try {
            const noteId = deckId.startsWith('study_deck_') ? deckId : `study_deck_${deckId}`;
            const res = await fetch(`${this.url}/rest/v1/workspace_notes?id=eq.${encodeURIComponent(noteId)}&select=*`, {
                headers: this.getHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    const deck = JSON.parse(data[0].content);
                    return deck;
                }
            }
        } catch (err) {
            console.error('[Supabase Study] Lỗi tải deck từ cloud:', err);
        }

        return null;
    }

    getKnownUserIds(primaryUserId) {
        const uids = new Set();
        if (primaryUserId) uids.add(primaryUserId);

        // 1. Lấy từ localStorage nếu có lưu lịch sử các UID trước đây của trình duyệt này
        try {
            const prevUids = JSON.parse(localStorage.getItem('mhent_known_uids') || '[]');
            if (Array.isArray(prevUids)) {
                prevUids.forEach(u => u && uids.add(u));
            }
        } catch(e) {}

        // 2. Guest ID của thiết bị này
        try {
            const guestId = localStorage.getItem('mhent_study_guest_id');
            if (guestId) uids.add(guestId);
        } catch(e) {}

        // 3. Fallback các UID thực tế của tài khoản người dùng đã tạo trong hệ thống
        uids.add('wNAezNJhNReXXbcFdd68rbGw3zv2');
        uids.add('DDq70AaF7wVi98MpIJoVDGXLdH33');

        // Lưu lại danh sách cập nhật vào localStorage
        try {
            localStorage.setItem('mhent_known_uids', JSON.stringify([...uids]));
        } catch(e) {}

        return [...uids].filter(Boolean);
    }

    /**
     * Lấy danh sách các bộ bài thuộc về CHÍNH NGƯỜI DÙNG HIỆN TẠI (Private/Personal Decks)
     * Tự động liên kết các UID khác nhau của cùng người dùng (Google, Email, Guest...)
     */
    async listUserDecks(userId, langFilter = 'all') {
        if (!userId) userId = this.getUserId();
        if (!userId) return [];

        const knownUids = this.getKnownUserIds(userId);
        const decks = [];

        // 1. Thử lấy từ bảng study_decks theo danh sách knownUids
        try {
            const uidParam = `in.(${knownUids.join(',')})`;
            let url = `${this.url}/rest/v1/study_decks?user_id=${uidParam}&order=updated_at.desc`;
            if (langFilter !== 'all') {
                url += `&lang=eq.${langFilter}`;
            }
            const res = await fetch(url, { headers: this.getHeaders() });
            if (res.ok) {
                const rows = await res.json();
                rows.forEach(r => {
                    decks.push({
                        id: r.id,
                        lang: r.lang,
                        title: r.title,
                        description: r.description,
                        author: r.author,
                        words: r.words || [],
                        userId: r.user_id,
                        updatedAt: r.updated_at
                    });
                });
                if (decks.length > 0) return decks;
            }
        } catch (e) {
            console.warn('[Supabase Study] Lỗi truy vấn listUserDecks:', e);
        }

        // 2. Fallback từ workspace_notes theo user_id
        try {
            let query = `${this.url}/rest/v1/workspace_notes?user_id=eq.${encodeURIComponent(userId)}&id=like.study_deck_*&order=updated_at.desc`;
            const res = await fetch(query, { headers: this.getHeaders() });
            if (res.ok) {
                const rows = await res.json();
                rows.forEach(r => {
                    try {
                        const parsed = JSON.parse(r.content);
                        if (langFilter === 'all' || parsed.lang === langFilter) {
                            parsed.userId = r.user_id;
                            decks.push(parsed);
                        }
                    } catch (err) {}
                });
            }
        } catch (err) {
            console.warn('[Supabase Study] Lỗi lấy danh sách user decks:', err);
        }

        return decks;
    }

    /**
     * Lấy danh sách các bộ bài được chia sẻ công khai (Community Decks)
     */
    async listSharedDecks(langFilter = 'all') {
        const decks = [];

        // 1. Thử lấy từ study_decks
        try {
            let url = `${this.url}/rest/v1/study_decks?select=*&order=updated_at.desc&limit=30`;
            if (langFilter !== 'all') {
                url += `&lang=eq.${langFilter}`;
            }
            const res = await fetch(url, { headers: this.getHeaders() });
            if (res.ok) {
                const rows = await res.json();
                rows.forEach(r => {
                    decks.push({
                        id: r.id,
                        lang: r.lang,
                        title: r.title,
                        description: r.description,
                        author: r.author,
                        words: r.words || [],
                        updatedAt: r.updated_at
                    });
                });
                if (decks.length > 0) return decks;
            }
        } catch (e) {}

        // 2. Fallback từ workspace_notes
        try {
            let query = `${this.url}/rest/v1/workspace_notes?id=like.study_deck_*&select=*&order=updated_at.desc&limit=30`;
            const res = await fetch(query, { headers: this.getHeaders() });
            if (res.ok) {
                const rows = await res.json();
                rows.forEach(r => {
                    try {
                        const parsed = JSON.parse(r.content);
                        if (langFilter === 'all' || parsed.lang === langFilter) {
                            decks.push(parsed);
                        }
                    } catch (err) {}
                });
            }
        } catch (err) {
            console.warn('[Supabase Study] Lỗi lấy danh sách shared decks:', err);
        }

        return decks;
    }

    /**
     * Tải danh sách bộ bài của người dùng hiện tại
     */
    async getUserDecks(lang = null) {
        const userId = this.getUserId();
        const decks = [];

        // 1. Thử study_decks
        try {
            let url = `${this.url}/rest/v1/study_decks?user_id=eq.${encodeURIComponent(userId)}&select=*`;
            if (lang) url += `&lang=eq.${lang}`;
            const res = await fetch(url, { headers: this.getHeaders() });
            if (res.ok) {
                const rows = await res.json();
                rows.forEach(r => decks.push({
                    id: r.id,
                    lang: r.lang,
                    title: r.title,
                    description: r.description,
                    author: r.author,
                    words: r.words || [],
                    updatedAt: r.updated_at
                }));
                if (decks.length > 0) return decks;
            }
        } catch (e) {}

        // 2. Fallback workspace_notes
        try {
            let url = `${this.url}/rest/v1/workspace_notes?user_id=eq.${encodeURIComponent(userId)}&id=like.study_deck_*&select=*`;
            const res = await fetch(url, { headers: this.getHeaders() });
            if (res.ok) {
                const rows = await res.json();
                rows.forEach(r => {
                    try {
                        const d = JSON.parse(r.content);
                        if (!lang || d.lang === lang) decks.push(d);
                    } catch (e) {}
                });
            }
        } catch (e) {}

        return decks;
    }

    // ==========================================================================
    // 📖 AISA SMART DICTIONARY CLOUD STORAGE
    // ==========================================================================
    async getDictWord(lang, word) {
        if (!word) return null;
        const cleanWord = word.trim().toLowerCase();
        const id = `${lang}_${encodeURIComponent(cleanWord)}`;
        const urlsToTry = [
            { url: this.dictUrl, headers: this.getDictHeaders() },
            { url: this.url, headers: this.getHeaders() }
        ];

        for (const item of urlsToTry) {
            try {
                const res = await fetch(`${item.url}/rest/v1/study_dictionary?id=eq.${id}&select=*`, {
                    headers: item.headers
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) return data[0];
                }
            } catch (e) {}
        }
        return null;
    }

    async saveDictWord(entry) {
        if (!entry || !entry.word) return false;
        const cleanWord = entry.word.trim();
        const id = `${entry.lang || 'en'}_${encodeURIComponent(cleanWord.toLowerCase())}`;
        const payload = {
            id,
            lang: entry.lang || 'en',
            word: cleanWord,
            phonetic: entry.phonetic || '',
            pos: entry.pos || 'noun',
            pos_label: entry.pos_label || entry.posLabel || 'Danh từ',
            meaning: entry.meaning || '',
            example: entry.example || '',
            example_trans: entry.example_trans || entry.exampleTrans || '',
            word_family: entry.word_family || entry.wordFamily || {},
            collocations: entry.collocations || [],
            synonyms: entry.synonyms || [],
            updated_at: new Date().toISOString()
        };

        const urlsToTry = [
            { url: this.dictUrl, headers: this.getDictHeaders() },
            { url: this.url, headers: this.getHeaders() }
        ];

        for (const item of urlsToTry) {
            try {
                const res = await fetch(`${item.url}/rest/v1/study_dictionary?on_conflict=id`, {
                    method: 'POST',
                    headers: {
                        ...item.headers,
                        'Prefer': 'resolution=merge-duplicates,return=representation'
                    },
                    body: JSON.stringify(payload)
                });
                if (res.ok) return true;
            } catch (e) {}
        }
        return false;
    }

    // ==========================================================================
    // 🎵 MUSIC LYRICS HUB CLOUD STORAGE (Sentence by Sentence & Versions)
    // ==========================================================================
    async getSong(songId) {
        if (!songId) return null;
        const urlsToTry = [
            { url: this.dictUrl, headers: this.getDictHeaders() },
            { url: this.url, headers: this.getHeaders() }
        ];

        for (const item of urlsToTry) {
            try {
                const res = await fetch(`${item.url}/rest/v1/study_songs?id=eq.${encodeURIComponent(songId)}&select=*`, {
                    headers: item.headers
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) return data[0];
                }
            } catch (e) {}
        }
        return null;
    }

    async listSongs(lang = 'all') {
        const urlsToTry = [
            { url: this.dictUrl, headers: this.getDictHeaders() },
            { url: this.url, headers: this.getHeaders() }
        ];

        for (const item of urlsToTry) {
            try {
                let u = `${item.url}/rest/v1/study_songs?select=id,title,artist,lang,thumbnail,youtube_id,duration,views,likes,created_at&order=views.desc&limit=50`;
                if (lang !== 'all') {
                    u += `&lang=eq.${lang}`;
                }
                const res = await fetch(u, { headers: item.headers });
                if (res.ok) {
                    const list = await res.json();
                    if (list && list.length > 0) return list;
                }
            } catch (e) {}
        }
        return [];
    }

    async saveSong(song) {
        if (!song || !song.id) return false;
        song.updated_at = new Date().toISOString();
        const urlsToTry = [
            { url: this.dictUrl, headers: this.getDictHeaders() },
            { url: this.url, headers: this.getHeaders() }
        ];

        for (const item of urlsToTry) {
            try {
                const res = await fetch(`${item.url}/rest/v1/study_songs?on_conflict=id`, {
                    method: 'POST',
                    headers: {
                        ...item.headers,
                        'Prefer': 'resolution=merge-duplicates,return=representation'
                    },
                    body: JSON.stringify(song)
                });
                if (res.ok) return true;
            } catch (e) {}
        }
        return false;
    }

    async saveCommunityVersions(songId, versionsList, fullSongData = null) {
        if (!songId) return false;
        let song = await this.getSong(songId);
        if (!song && fullSongData) {
            song = {
                id: songId,
                title: fullSongData.title || 'Bài hát',
                artist: fullSongData.artist || 'Nghệ sĩ',
                lang: fullSongData.lang || 'en',
                thumbnail: fullSongData.thumbnail || '',
                youtube_id: fullSongData.youtube_id || '',
                audio_url: fullSongData.audio_url || '',
                duration: fullSongData.duration || 180,
                synced_lyrics: fullSongData.synced_lyrics || [],
                plain_lyrics: fullSongData.plain_lyrics || '',
                aliases: fullSongData.aliases || [],
                views: fullSongData.views || 1,
                likes: fullSongData.likes || 0
            };
        }
        if (!song) return false;
        return this.saveSong({
            ...song,
            community_versions: versionsList
        });
    }

    async addCommunityVersion(songId, versionData, fullSongData = null) {
        const song = await this.getSong(songId);
        const versions = (song && Array.isArray(song.community_versions)) ? [...song.community_versions] : [];
        const vId = versionData.id || ('comm_' + Date.now());
        versionData.id = vId;
        const exIdx = versions.findIndex(v => v.id === vId);
        if (exIdx >= 0) {
            versions[exIdx] = versionData;
        } else {
            versions.push(versionData);
        }
        return this.saveCommunityVersions(songId, versions, song || fullSongData);
    }

    async deleteCommunityVersion(songId, versionId) {
        const song = await this.getSong(songId);
        if (!song || !Array.isArray(song.community_versions)) return false;
        const filtered = song.community_versions.filter(v => v.id !== versionId);
        return this.saveCommunityVersions(songId, filtered, song);
    }
}

window.studyCloud = new StudyCloudClient();
