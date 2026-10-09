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

    // Lấy chuỗi ngày YYYY-MM-DD theo giờ địa phương (tránh lỗi múi giờ UTC)
    getLocalDateStr(offsetDays = 0) {
        const d = new Date();
        if (offsetDays !== 0) d.setDate(d.getDate() + offsetDays);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Khởi tạo hoặc kiểm tra chuỗi học tập (Streak)
    initStreak() {
        const today = this.getLocalDateStr();
        const yesterday = this.getLocalDateStr(-1);
        let streakData = this.get('streak_info', { current: 1, lastDate: today, lastStudiedDate: today });

        // Nếu ngày học gần nhất trước ngày hôm qua (đã đứt chuỗi hơn 1 ngày) -> reset về 1
        if (streakData.lastStudiedDate && streakData.lastStudiedDate !== today && streakData.lastStudiedDate !== yesterday) {
            streakData.current = 1;
            this.set('streak_info', streakData);
        }
        return streakData;
    }

    getStreak() {
        return this.initStreak().current;
    }

    // Ghi nhận phiên học thực tế (hoàn thành quiz, luyện từ vựng, flashcard)
    recordStudy() {
        const today = this.getLocalDateStr();
        const yesterday = this.getLocalDateStr(-1);
        let streakData = this.get('streak_info', { current: 1, lastDate: today, lastStudiedDate: null });

        if (streakData.lastStudiedDate === yesterday) {
            // Học liên tục ngày hôm qua sang hôm nay -> Tăng chuỗi!
            streakData.current += 1;
            streakData.lastStudiedDate = today;
            streakData.lastDate = today;
        } else if (streakData.lastStudiedDate !== today) {
            // Lần đầu hoặc bắt đầu chuỗi mới
            streakData.lastStudiedDate = today;
            streakData.lastDate = today;
        }
        this.set('streak_info', streakData);

        // Tự động cập nhật số ngày streak trên toàn bộ DOM nếu có
        document.querySelectorAll('#streakNum').forEach(el => el.textContent = streakData.current);
        document.querySelectorAll('.drawer-streak-badge').forEach(el => el.innerHTML = `🔥 Chuỗi học: ${streakData.current} Ngày`);
        document.querySelectorAll('.streak-pill-btn').forEach(el => el.classList.add('lit'));

        // Đồng bộ lên Firebase Firestore nếu đang đăng nhập
        if (typeof window.syncStudyStreakToCloud === 'function') {
            window.syncStudyStreakToCloud(streakData.current);
        }

        return streakData.current;
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
        let decks = this.get(`decks_${lang}`, []);
        if (!decks || decks.length === 0) {
            const defaultDeckMap = {
                ko: window.DEFAULT_KO_DECK,
                ja: window.DEFAULT_JA_DECK,
                zh: window.DEFAULT_ZH_DECK,
                en: window.DEFAULT_EN_DECK
            };
            const defaultDeck = defaultDeckMap[lang];
            if (defaultDeck) {
                decks = [JSON.parse(JSON.stringify(defaultDeck))];
                this.saveDecks(lang, decks);
            }
        }
        return decks || [];
    }

    /**
     * Lưu danh sách bộ từ vựng
     */
    saveDecks(lang, decks) {
        this.set(`decks_${lang}`, decks);
    }

    /**
     * Tự động đồng bộ các bộ từ vựng cá nhân từ Cloud Supabase xuống máy (hỗ trợ nhập từ ĐT sang PC)
     * Đảm bảo chỉ đồng bộ bộ bài của CHÍNH TÀI KHOẢN ĐANG ĐĂNG NHẬP, không lấy bài người khác
     */
    async syncDecksFromCloud(lang) {
        if (!window.studyCloud) {
            return this.getDecks(lang);
        }

        const currentUserId = window.studyCloud.getUserId();
        const isGuest = !currentUserId || currentUserId.startsWith('guest_');

        // Lấy danh sách bộ bài cục bộ hiện tại
        let localDecks = this.getDecks(lang);

        // 1. DỌN DẸP DỮ LIỆU LỖI CŨ:
        // Loại bỏ các bộ bài của tài khoản khác đã vô tình bị tải về máy trước đó
        if (Array.isArray(localDecks)) {
            const initialCount = localDecks.length;
            localDecks = localDecks.filter(d => {
                if (!d || !d.id) return false;
                // Giữ lại bộ bài mặc định của hệ thống
                if (d.id.endsWith('_default_1') || d.id === `${lang}_default_1`) return true;
                // Nếu bộ bài có đánh dấu userId của người khác -> Loại bỏ
                if (d.userId && !isGuest && d.userId !== currentUserId) return false;
                // Nếu chưa đăng nhập (khách) mà bộ bài có userId của tài khoản chính thức khác -> Loại bỏ
                if (isGuest && d.userId && !d.userId.startsWith('guest_')) return false;
                return true;
            });

            if (localDecks.length !== initialCount) {
                this.saveDecks(lang, localDecks);
                console.log(`[StudyStorage] 🧹 Đã phân tách dữ liệu: Loại bỏ ${initialCount - localDecks.length} bộ bài của tài khoản khác khỏi ${lang.toUpperCase()}`);
            }
        }

        // 2. Nếu là khách (chưa đăng nhập): Chỉ dùng kho bài cục bộ, không kéo từ Cloud
        if (isGuest || typeof window.studyCloud.listUserDecks !== 'function') {
            return localDecks;
        }

        try {
            // 3. Chỉ lấy các bộ bài do CHÍNH NGƯỜI DÙNG NÀY tạo trên Supabase Cloud
            const cloudDecks = await window.studyCloud.listUserDecks(currentUserId, lang);
            if (!Array.isArray(cloudDecks) || cloudDecks.length === 0) {
                return localDecks;
            }

            let changed = false;

            cloudDecks.forEach(cDeck => {
                if (!cDeck || !cDeck.id) return;
                const idx = localDecks.findIndex(d => d.id === cDeck.id);
                if (idx >= 0) {
                    const local = localDecks[idx];
                    const cloudWordsLen = (cDeck.words || []).length;
                    const localWordsLen = (local.words || []).length;
                    const cloudTime = new Date(cDeck.updatedAt || 0).getTime();
                    const localTime = new Date(local.updatedAt || 0).getTime();

                    // Ưu tiên cập nhật nếu Cloud có nhiều từ hơn hoặc mới hơn
                    if (cloudWordsLen > localWordsLen || cloudTime > localTime) {
                        localDecks[idx] = cDeck;
                        changed = true;
                    }
                } else {
                    // Bài của chính user này được tạo từ thiết bị khác (đồng bộ giữa ĐT và PC)
                    localDecks.push(cDeck);
                    changed = true;
                }
            });

            // Sắp xếp các bộ bài: bài có cập nhật mới nhất lên trước
            localDecks.sort((a, b) => {
                const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
                const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
                return tB - tA;
            });

            if (changed) {
                this.saveDecks(lang, localDecks);
                console.log(`[StudyStorage] ☁️ Đã đồng bộ ${cloudDecks.length} bộ bài cá nhân (${lang.toUpperCase()}) từ Supabase Cloud!`);
            }
            return localDecks;
        } catch (e) {
            console.warn('[StudyStorage] Không thể đồng bộ từ cloud:', e);
            return localDecks;
        }
    }

    /**
     * Lấy 1 bộ từ vựng cụ thể theo ID
     */
    getDeckById(lang, deckId) {
        const decks = this.getDecks(lang);
        return decks.find(d => d.id === deckId) || null;
    }

    /**
     * Tạo một bộ từ vựng mới
     */
    createDeck(lang, { title, description = '', words = [] }) {
        const newDeck = {
            id: `${lang}_deck_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            lang: lang,
            title: title || `Bài học mới (${lang.toUpperCase()})`,
            description: description || 'Bộ từ vựng do người học tạo',
            author: 'Người học MHEnt',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            words: words
        };

        const decks = this.getDecks(lang);
        decks.unshift(newDeck);
        this.saveDecks(lang, decks);

        // Đồng bộ Cloud
        if (window.studyCloud && typeof window.studyCloud.saveDeck === 'function') {
            window.studyCloud.saveDeck(newDeck).catch(console.warn);
        }

        return newDeck;
    }

    /**
     * Thêm danh sách từ vựng vào một bộ bài hiện có
     */
    addWordsToDeck(lang, deckId, newWords = []) {
        const deck = this.getDeckById(lang, deckId);
        if (!deck) return null;

        if (!Array.isArray(deck.words)) deck.words = [];
        deck.words.push(...newWords);
        deck.updatedAt = new Date().toISOString();
        return this.saveDeck(lang, deck);
    }

    /**
     * Xóa 1 bộ từ vựng theo ID
     */
    deleteDeck(lang, deckId) {
        let decks = this.getDecks(lang);
        decks = decks.filter(d => d.id !== deckId);
        this.saveDecks(lang, decks);
        return decks;
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

    /* ==========================================================================
       OFFLINE STUDY DECKS & CLOUD SYNC ENGINE
       ========================================================================== */

    /**
     * Lấy danh sách chỉ mục các bộ bài đã tải về máy
     */
    getOfflineDecksIndex() {
        return this.get('offline_index', []);
    }

    saveOfflineDecksIndex(indexList) {
        this.set('offline_index', indexList);
    }

    /**
     * Kiểm tra một bộ bài đã được tải về học ngoại tuyến chưa
     */
    isDeckOffline(deckId) {
        if (!deckId) return false;
        const indexList = this.getOfflineDecksIndex();
        return indexList.some(item => item.id === deckId);
    }

    /**
     * Tải và lưu trữ một bộ bài học vào bộ nhớ ngoại tuyến của thiết bị
     */
    saveDeckOffline(deck) {
        if (!deck || !deck.id) return { success: false, error: 'Dữ liệu bài học không hợp lệ' };

        const offlineDeck = JSON.parse(JSON.stringify(deck));
        offlineDeck.isOfflineCached = true;
        offlineDeck.downloadedAt = new Date().toISOString();

        const serialized = JSON.stringify(offlineDeck);
        const sizeKb = Math.max(1, Math.round(serialized.length / 1024));

        // 1. Lưu nội dung bộ bài vào storage offline riêng biệt
        this.set(`offline_deck_${deck.id}`, offlineDeck);

        // 2. Cập nhật chỉ mục bài học ngoại tuyến
        let indexList = this.getOfflineDecksIndex();
        const existingIdx = indexList.findIndex(item => item.id === deck.id);
        const meta = {
            id: deck.id,
            title: deck.title || 'Bài học ngoại tuyến',
            lang: deck.lang || 'ko',
            wordCount: Array.isArray(deck.words) ? deck.words.length : 0,
            downloadedAt: offlineDeck.downloadedAt,
            sizeKb: sizeKb
        };

        if (existingIdx >= 0) {
            indexList[existingIdx] = meta;
        } else {
            indexList.unshift(meta);
        }
        this.saveOfflineDecksIndex(indexList);

        // 3. Kích hoạt sự kiện toàn cục để UI cập nhật
        window.dispatchEvent(new CustomEvent('study:offline_updated', { detail: { action: 'saved', deckId: deck.id, meta } }));

        return { success: true, meta, sizeKb };
    }

    /**
     * Xóa một bộ bài khỏi bộ nhớ ngoại tuyến
     */
    removeDeckOffline(deckId) {
        if (!deckId) return false;

        // Xóa data
        try {
            localStorage.removeItem(`${this.PREFIX}offline_deck_${deckId}`);
        } catch (e) {}

        // Xóa khỏi index
        let indexList = this.getOfflineDecksIndex();
        indexList = indexList.filter(item => item.id !== deckId);
        this.saveOfflineDecksIndex(indexList);

        window.dispatchEvent(new CustomEvent('study:offline_updated', { detail: { action: 'removed', deckId } }));
        return true;
    }

    /**
     * Lấy chi tiết bộ bài đã tải offline
     */
    getOfflineDeck(deckId) {
        return this.get(`offline_deck_${deckId}`, null);
    }

    /**
     * Lấy toàn bộ danh sách bộ bài offline (có thể lọc theo ngôn ngữ)
     */
    getOfflineDecks(lang = null) {
        const indexList = this.getOfflineDecksIndex();
        if (lang) {
            return indexList.filter(item => item.lang === lang);
        }
        return indexList;
    }

    /**
     * Tính tổng dung lượng dữ liệu offline đã lưu trên thiết bị
     */
    getOfflineStorageStats() {
        const indexList = this.getOfflineDecksIndex();
        const totalDecks = indexList.length;
        const totalWords = indexList.reduce((sum, item) => sum + (item.wordCount || 0), 0);
        const totalKb = indexList.reduce((sum, item) => sum + (item.sizeKb || 0), 0);

        let formattedSize = `${totalKb} KB`;
        if (totalKb >= 1024) {
            formattedSize = `${(totalKb / 1024).toFixed(1)} MB`;
        }

        return { totalDecks, totalWords, totalKb, formattedSize };
    }

    /**
     * Thêm hành động học ngoại tuyến vào Hàng đợi đồng bộ (Sync Queue)
     */
    queueOfflineProgress(deck) {
        if (!deck || !deck.id) return;
        let queue = this.get('sync_queue', []);
        const idx = queue.findIndex(q => q.deckId === deck.id);

        const record = {
            deckId: deck.id,
            lang: deck.lang || 'ko',
            updatedAt: new Date().toISOString(),
            deckSnapshot: deck
        };

        if (idx >= 0) {
            queue[idx] = record;
        } else {
            queue.push(record);
        }
        this.set('sync_queue', queue);
    }

    /**
     * Tự động đẩy toàn bộ tiến độ học trong hàng đợi lên Supabase Cloud khi có mạng
     */
    async syncOfflineQueueToCloud() {
        if (!navigator.onLine) return { synced: 0 };
        const queue = this.get('sync_queue', []);
        if (!queue || queue.length === 0) return { synced: 0 };

        console.log(`[StudyStorage] ☁️ Bắt đầu đồng bộ ${queue.length} bài học ngoại tuyến lên Cloud...`);
        let syncedCount = 0;

        if (window.studyCloud && typeof window.studyCloud.saveDeck === 'function') {
            for (const item of queue) {
                try {
                    if (item.deckSnapshot) {
                        await window.studyCloud.saveDeck(item.deckSnapshot);
                        syncedCount++;
                    }
                } catch (err) {
                    console.warn(`[StudyStorage] Lỗi đồng bộ deck ${item.deckId}:`, err);
                }
            }
        }

        // Xóa hàng đợi sau khi đồng bộ
        if (syncedCount > 0) {
            this.set('sync_queue', []);
            if (window.studyUI) {
                window.studyUI.showToast(`☁️ Đã đồng bộ ${syncedCount} bài học ngoại tuyến lên Cloud!`, 'success');
            }
        }

        return { synced: syncedCount };
    }

    /**
     * Khởi tạo giám sát trạng thái mạng (Online / Offline)
     */
    initNetworkMonitor() {
        const updatePill = (isOnline) => {
            let pill = document.getElementById('offline-network-pill');
            if (!pill) {
                pill = document.createElement('div');
                pill.id = 'offline-network-pill';
                pill.className = 'offline-network-pill';
                document.body.appendChild(pill);
            }

            if (!isOnline) {
                pill.className = 'offline-network-pill status-offline show';
                pill.innerHTML = `
                    <span class="offline-pulse-dot" style="background: #f59e0b; box-shadow: 0 0 8px #f59e0b;"></span>
                    <span>Đang học Ngoại Tuyến (Offline) • Dữ liệu lưu an toàn trên máy</span>
                `;
            } else {
                pill.className = 'offline-network-pill status-online show';
                pill.innerHTML = `
                    <i class="fa-solid fa-cloud-arrow-up"></i>
                    <span>Đã kết nối lại Internet • Tự động đồng bộ lên Mây</span>
                `;
                // Kích hoạt đồng bộ hàng đợi
                this.syncOfflineQueueToCloud();
                setTimeout(() => {
                    pill.classList.remove('show');
                }, 3500);
            }
        };

        window.addEventListener('online', () => updatePill(true));
        window.addEventListener('offline', () => updatePill(false));

        // Kiểm tra ban đầu nếu vừa mở trang mà không có mạng
        if (!navigator.onLine) {
            setTimeout(() => updatePill(false), 500);
        }
    }
}

window.studyStorage = new StudyStorage();
// Khởi chạy giám sát mạng tự động
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.studyStorage.initNetworkMonitor());
} else {
    window.studyStorage.initNetworkMonitor();
}
