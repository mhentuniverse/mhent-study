/**
 * MHENT STUDY - SUPABASE CLOUD SYNC ENGINE
 * Đồng bộ kho từ vựng cá nhân, lưu trữ và chia sẻ giáo trình qua Supabase Cloud
 */
class StudyCloudClient {
    constructor() {
        this.config = (window.MHENT_CONFIG && window.MHENT_CONFIG.SUPABASE) || {
            URL: "https://hwklqefdwskmwwyofthb.supabase.co",
            KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3a2xxZWZkd3NrbXd3eW9mdGhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMTUzODYsImV4cCI6MjEwNjc5MTM4Nn0.VV2By40CkQLEq9OVU8e4HooYt-XHihGItFvOaAV78SU"
        };
        this.url = this.config.URL;
        this.key = this.config.KEY;
        this.client = null;
        this.hasDedicatedTable = null; // Kiểm tra xem bảng study_decks đã tạo chưa

        this.init();
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

    getUserId() {
        // 1. Ưu tiên Firebase Auth instance nếu có
        if (window.studyAuth && window.studyAuth.currentUser) {
            return window.studyAuth.currentUser.uid;
        }
        // 2. Profile đã đăng nhập lưu trong localStorage (đồng bộ qua toàn hệ thống MHEnt Universe)
        try {
            const cached = JSON.parse(localStorage.getItem('mhent_user_profile') || '{}');
            if (cached && (cached.uid || cached.id)) {
                return cached.uid || cached.id;
            }
        } catch (e) {}

        // 3. Hoặc guest ID duy nhất trên trình duyệt
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
        try {
            const res = await fetch(`${this.url}/rest/v1/study_dictionary?id=eq.${id}&select=*`, {
                headers: this.getHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) return data[0];
            }
        } catch (e) {
            console.warn('[StudyCloud] getDictWord error:', e);
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

        try {
            const res = await fetch(`${this.url}/rest/v1/study_dictionary?on_conflict=id`, {
                method: 'POST',
                headers: {
                    ...this.getHeaders(),
                    'Prefer': 'resolution=merge-duplicates,return=representation'
                },
                body: JSON.stringify(payload)
            });
            return res.ok;
        } catch (e) {
            console.warn('[StudyCloud] saveDictWord error:', e);
            return false;
        }
    }

    // ==========================================================================
    // 🎵 MUSIC LYRICS HUB CLOUD STORAGE (Sentence by Sentence & Versions)
    // ==========================================================================
    async getSong(songId) {
        if (!songId) return null;
        try {
            const res = await fetch(`${this.url}/rest/v1/study_songs?id=eq.${encodeURIComponent(songId)}&select=*`, {
                headers: this.getHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) return data[0];
            }
        } catch (e) {
            console.warn('[StudyCloud] getSong error:', e);
        }
        return null;
    }

    async listSongs(lang = 'all') {
        try {
            let url = `${this.url}/rest/v1/study_songs?select=id,title,artist,lang,thumbnail,youtube_id,duration,views,likes,created_at&order=views.desc&limit=50`;
            if (lang !== 'all') {
                url += `&lang=eq.${lang}`;
            }
            const res = await fetch(url, { headers: this.getHeaders() });
            if (res.ok) {
                return await res.json();
            }
        } catch (e) {
            console.warn('[StudyCloud] listSongs error:', e);
        }
        return [];
    }

    async saveSong(song) {
        if (!song || !song.id) return false;
        song.updated_at = new Date().toISOString();
        try {
            const res = await fetch(`${this.url}/rest/v1/study_songs?on_conflict=id`, {
                method: 'POST',
                headers: {
                    ...this.getHeaders(),
                    'Prefer': 'resolution=merge-duplicates,return=representation'
                },
                body: JSON.stringify(song)
            });
            return res.ok;
        } catch (e) {
            console.warn('[StudyCloud] saveSong error:', e);
            return false;
        }
    }

    async addCommunityVersion(songId, versionData) {
        const song = await this.getSong(songId);
        if (!song) return false;
        const versions = Array.isArray(song.community_versions) ? song.community_versions : [];
        versions.push(versionData);
        return this.saveSong({
            ...song,
            community_versions: versions
        });
    }
}

window.studyCloud = new StudyCloudClient();
