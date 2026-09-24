/**
 * MHENT STUDY - STORAGE & DECK MANAGEMENT ENGINE
 * Quản lý LocalStorage & Đồng bộ Cloud Supabase
 * Xử lý Tạo Deck, Thêm từ, Sao lưu, Clone bộ bài chia sẻ
 */
class StudyStorage {
    constructor() {
        this.PREFIX = 'mhent_study_';
        this.initStreak();
    }

    // Lấy chuỗi học tập (Streak)
    initStreak() {
        const today = new Date().toISOString().slice(0, 10);
        let streakData = this.get('streak_info', { current: 1, lastDate: today });

        if (streakData.lastDate !== today) {
            const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
            if (streakData.lastDate === yesterday) {
                streakData.current += 1;
            } else {
                streakData.current = 1;
            }
            streakData.lastDate = today;
            this.set('streak_info', streakData);
        }
        return streakData;
    }

    getStreak() {
        return this.get('streak_info', { current: 1 }).current;
    }

    // Generic get/set
    get(key, defaultValue = null) {
        try {
            const val = localStorage.getItem(this.PREFIX + key);
            return val ? JSON.parse(val) : defaultValue;
        } catch (e) {
            console.error('Error reading storage:', e);
            return defaultValue;
        }
    }

    set(key, value) {
        try {
            localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
        } catch (e) {
            console.error('Error saving storage:', e);
        }
    }

    /**
     * Lấy danh sách bộ từ vựng theo ngôn ngữ (ko, ja, zh, en)
     */
    getDecks(lang) {
        return this.get(`decks_${lang}`, []);
    }

    /**
     * Lưu danh sách bộ từ vựng
     */
    saveDecks(lang, decks) {
        this.set(`decks_${lang}`, decks);
    }

    /**
     * Lấy 1 bộ từ vựng cụ thể theo ID
     */
    getDeckById(lang, deckId) {
        const decks = this.getDecks(lang);
        return decks.find(d => d.id === deckId) || null;
    }

    /**
     * Lưu hoặc cập nhật 1 bộ từ vựng (Lưu Local + Đồng bộ Supabase Cloud)
     */
    saveDeck(lang, deck) {
        const decks = this.getDecks(lang);
        const idx = decks.findIndex(d => d.id === deck.id);
        deck.updatedAt = new Date().toISOString();

        if (idx >= 0) {
            decks[idx] = deck;
        } else {
            decks.unshift(deck);
        }
        this.saveDecks(lang, decks);

        // Tự động đồng bộ lên Supabase Cloud trong nền
        if (window.studyCloud && typeof window.studyCloud.saveDeck === 'function') {
            window.studyCloud.saveDeck(deck).then(res => {
                if (res.success) {
                    console.log('[Study Storage] ☁️ Đã đồng bộ bộ bài lên Supabase:', deck.id);
                }
            }).catch(e => {
                console.warn('[Study Storage] Không thể đồng bộ Supabase:', e);
            });
        }

        return deck;
    }

    /**
     * Clone một bộ bài được chia sẻ vào kho cá nhân của người dùng
     */
    cloneDeck(deck) {
        const newDeck = JSON.parse(JSON.stringify(deck));
        newDeck.id = 'deck_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        newDeck.title = `${deck.title} (Bản sao)`;
        newDeck.isCloned = true;
        newDeck.originalAuthor = deck.author || 'Bạn bè MHEnt';
        newDeck.clonedAt = new Date().toISOString();
        
        // Reset tiến độ của người học mới về 0 để họ bắt đầu học
        if (Array.isArray(newDeck.words)) {
            newDeck.words.forEach(w => {
                w.reviews = [false, false, false, false];
                w.typedWord = '';
                w.isCompleted = false;
            });
        }

        this.saveDeck(deck.lang || 'ko', newDeck);
        return newDeck;
    }

    /**
     * Tạo chuỗi link chia sẻ bộ bài (Lưu Supabase và trả về URL rút gọn)
     */
    generateShareLink(deck) {
        const base = window.location.origin;

        // Lưu vào Supabase Cloud trước
        if (window.studyCloud && typeof window.studyCloud.saveDeck === 'function') {
            window.studyCloud.saveDeck(deck).catch(console.error);
        }

        // Mã hóa dữ liệu dự phòng (dual-mode: vừa có ID Cloud vừa có data dự phòng)
        const deckDataEncoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(deck)))));
        return `${base}/shared/?id=${encodeURIComponent(deck.id)}&lang=${deck.lang || 'ko'}&data=${deckDataEncoded}`;
    }
}

window.studyStorage = new StudyStorage();
