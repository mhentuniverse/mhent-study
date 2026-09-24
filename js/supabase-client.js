/**
 * MHENT STUDY - SUPABASE CLOUD SYNC ENGINE
 * Đồng bộ kho từ vựng cá nhân, lưu trữ và chia sẻ giáo trình qua Supabase Cloud
 */
class StudyCloudClient {
    constructor() {
        this.config = (window.MHENT_CONFIG && window.MHENT_CONFIG.SUPABASE) || {
            URL: "https://ctzkgchjheirxwejctvl.supabase.co",
            KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0emtnY2hqaGVpcnh3ZWpjdHZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjA0MTgsImV4cCI6MjA5MTgzNjQxOH0.Wl-sBpH1VvcR6-Y4D4UAVm1f5_brGK3cVIHRJBEhOJ0"
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
        // Ưu tiên Firebase Auth UID nếu đã đăng nhập
        if (window.studyAuth && window.studyAuth.currentUser) {
            return window.studyAuth.currentUser.uid;
        }
        // Hoặc guest ID duy nhất trên trình duyệt
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
        return 'Học viên Ẩn danh';
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
}

window.studyCloud = new StudyCloudClient();
