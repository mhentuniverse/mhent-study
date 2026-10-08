/**
 * MHENT STUDY - OFFLINE VAULT & DOWNLOAD MANAGER
 * Quản lý tải bộ bài học ngoại tuyến, theo dõi dung lượng lưu trữ,
 * cập nhật trạng thái nút bấm và tự động đồng bộ lên Cloud
 */

class StudyOfflineManager {
    constructor() {
        this.currentDeck = null;
        this.currentLang = 'ko';
        this.isOpen = false;
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.mount());
        } else {
            this.mount();
        }

        // Lắng nghe sự kiện offline cập nhật từ storage
        window.addEventListener('study:offline_updated', (e) => {
            this.updateButtonState();
            if (this.isOpen) this.renderModalContent();
        });
    }

    mount() {
        if (!document.getElementById('offline-vault-modal')) {
            const modalHtml = `
            <div id="offline-vault-modal" class="offline-modal-overlay" role="dialog" aria-modal="true" aria-label="Trung tâm học ngoại tuyến">
                <div class="offline-modal-card">
                    <div class="offline-modal-header">
                        <div class="offline-modal-title">
                            <i class="fa-solid fa-cloud-arrow-down" style="color: #0ea5e9;"></i>
                            <span>Kho Bài Học Ngoại Tuyến (Offline Vault)</span>
                        </div>
                        <button type="button" class="offline-modal-close" id="btnCloseOfflineModal" title="Đóng">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <div class="offline-modal-body" id="offlineModalBody">
                        <!-- Thống kê dung lượng -->
                        <div class="offline-stat-bar">
                            <div class="offline-stat-item">
                                <span class="label">Bài học đã lưu</span>
                                <span class="val" id="offlineStatDecks">0</span>
                            </div>
                            <div class="offline-stat-item">
                                <span class="label">Tổng số từ vựng</span>
                                <span class="val" id="offlineStatWords">0</span>
                            </div>
                            <div class="offline-stat-item">
                                <span class="label">Bộ nhớ đã dùng</span>
                                <span class="val" id="offlineStatSize">0 KB</span>
                            </div>
                        </div>

                        <!-- Danh sách bài học ngoại tuyến -->
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span style="font-size: 0.82rem; font-weight: 800; color: var(--study-text-muted); text-transform: uppercase;">
                                    Danh sách bài học sẵn sàng khi mất mạng:
                                </span>
                                <span id="offlineNetworkBadge" style="font-size: 0.78rem; font-weight: 800; padding: 2px 8px; border-radius: 6px;"></span>
                            </div>
                            <div class="offline-decks-list" id="offlineDecksContainer"></div>
                        </div>
                    </div>

                    <div class="offline-modal-footer">
                        <button type="button" class="btn-offline-action-sm" id="btnBatchDownloadLang">
                            <i class="fa-solid fa-bolt"></i> Tải tất cả bài của ngôn ngữ này
                        </button>
                        <button type="button" class="btn-offline-action-sm" id="btnForceSyncCloud" style="background: rgba(14, 165, 233, 0.12); color: #0ea5e9; border-color: rgba(14, 165, 233, 0.3);">
                            <i class="fa-solid fa-cloud-arrow-up"></i> Đồng bộ ngay với Mây
                        </button>
                    </div>
                </div>
            </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            document.getElementById('btnCloseOfflineModal').addEventListener('click', () => this.closeModal());
            document.getElementById('offline-vault-modal').addEventListener('click', (e) => {
                if (e.target.id === 'offline-vault-modal') this.closeModal();
            });

            document.getElementById('btnBatchDownloadLang').addEventListener('click', () => this.batchDownloadCurrentLang());
            document.getElementById('btnForceSyncCloud').addEventListener('click', () => this.forceSyncCloud());
        }

        this.bindDeckBarButton();
    }

    bindDeckBarButton() {
        const btn = document.getElementById('btnToggleOfflineDeck');
        if (btn) {
            btn.onclick = () => this.handleDeckBarButtonClick();
        }
    }

    /**
     * Đồng bộ ngữ cảnh bài học hiện tại từ VocabSheetApp
     */
    setCurrentDeck(deck, lang) {
        this.currentDeck = deck;
        if (lang) this.currentLang = lang;
        this.updateButtonState();
    }

    /**
     * Cập nhật trạng thái hiển thị của nút tải trong thanh chọn Deck
     */
    updateButtonState() {
        const btn = document.getElementById('btnToggleOfflineDeck');
        if (!btn || !this.currentDeck || !window.studyStorage) return;

        const isDownloaded = window.studyStorage.isDeckOffline(this.currentDeck.id);

        if (isDownloaded) {
            btn.className = 'btn-deck-action btn-offline-download is-downloaded';
            btn.innerHTML = `
                <span class="offline-pulse-dot"></span>
                <span>Đã lưu Offline</span>
                <i class="fa-solid fa-circle-check"></i>
            `;
            btn.title = 'Bài học này đã được lưu vào máy. Bấm để quản lý hoặc xóa bản ngoại tuyến.';
        } else {
            btn.className = 'btn-deck-action btn-offline-download';
            btn.innerHTML = `
                <i class="fa-solid fa-cloud-arrow-down"></i>
                <span>Tải về học Offline</span>
            `;
            btn.title = 'Tải toàn bộ từ vựng bài học này về máy để học không cần mạng Internet.';
        }
    }

    /**
     * Xử lý khi bấm nút Offline trên thanh Deck Bar
     */
    async handleDeckBarButtonClick() {
        if (!this.currentDeck || !window.studyStorage) return;

        const isDownloaded = window.studyStorage.isDeckOffline(this.currentDeck.id);

        if (!isDownloaded) {
            // Tải về máy ngay lập tức
            const btn = document.getElementById('btnToggleOfflineDeck');
            if (btn) {
                btn.classList.add('is-loading');
                btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang lưu...</span>`;
            }

            setTimeout(() => {
                const res = window.studyStorage.saveDeckOffline(this.currentDeck);
                if (res.success) {
                    if (window.studyUI) {
                        window.studyUI.playDing();
                        window.studyUI.showToast(`✨ Đã tải bài học "${this.currentDeck.title}" về máy thành công! Cậu có thể học không cần mạng rồi nà!`, 'success', 4000);
                    }
                } else {
                    if (window.studyUI) window.studyUI.showToast('Không thể lưu bài học offline: ' + res.error, 'error');
                }
                this.updateButtonState();
            }, 300);
        } else {
            // Đã tải -> Mở hộp thoại Quản lý chi tiết
            this.openModal();
        }
    }

    openModal() {
        this.isOpen = true;
        this.renderModalContent();
        const modal = document.getElementById('offline-vault-modal');
        if (modal) modal.classList.add('show');
    }

    closeModal() {
        this.isOpen = false;
        const modal = document.getElementById('offline-vault-modal');
        if (modal) modal.classList.remove('show');
    }

    renderModalContent() {
        if (!window.studyStorage) return;

        const stats = window.studyStorage.getOfflineStorageStats();
        const statDecks = document.getElementById('offlineStatDecks');
        const statWords = document.getElementById('offlineStatWords');
        const statSize = document.getElementById('offlineStatSize');

        if (statDecks) statDecks.textContent = stats.totalDecks;
        if (statWords) statWords.textContent = stats.totalWords;
        if (statSize) statSize.textContent = stats.formattedSize;

        // Trạng thái mạng
        const netBadge = document.getElementById('offlineNetworkBadge');
        if (netBadge) {
            if (navigator.onLine) {
                netBadge.style.background = 'rgba(16, 185, 129, 0.15)';
                netBadge.style.color = '#10b981';
                netBadge.innerHTML = '<i class="fa-solid fa-wifi"></i> Đang Online';
            } else {
                netBadge.style.background = 'rgba(245, 158, 11, 0.15)';
                netBadge.style.color = '#f59e0b';
                netBadge.innerHTML = '<i class="fa-solid fa-wifi-slash"></i> Đang Ngoại Tuyến';
            }
        }

        const container = document.getElementById('offlineDecksContainer');
        if (!container) return;

        const offlineList = window.studyStorage.getOfflineDecks();

        if (offlineList.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 35px 20px; color: var(--study-text-muted); background: var(--study-subtle); border-radius: 12px; border: 1.5px dashed var(--study-border);">
                    <div style="font-size: 2.2rem; margin-bottom: 8px;">📥</div>
                    <div style="font-weight: 800; font-size: 1rem; color: var(--study-text);">Chưa có bài học nào được tải về máy</div>
                    <p style="font-size: 0.85rem; margin: 4px 0 0 0;">Bấm nút <strong>"Tải về học Offline"</strong> trên bài học hoặc nút bên dưới để tải hàng loạt!</p>
                </div>
            `;
            return;
        }

        const langFlags = { ko: '🇰🇷 Tiếng Hàn', ja: '🇯🇵 Tiếng Nhật', zh: '🇨🇳 Tiếng Trung', en: '🇬🇧 Tiếng Anh' };

        container.innerHTML = offlineList.map(item => `
            <div class="offline-deck-item">
                <div class="offline-deck-info">
                    <span class="offline-deck-title">${this.escapeHtml(item.title)}</span>
                    <div class="offline-deck-meta">
                        <span><i class="fa-solid fa-language"></i> ${langFlags[item.lang] || item.lang}</span>
                        <span>•</span>
                        <span><i class="fa-solid fa-font"></i> ${item.wordCount || 0} từ</span>
                        <span>•</span>
                        <span><i class="fa-solid fa-hard-drive"></i> ~${item.sizeKb || 1} KB</span>
                    </div>
                </div>
                <div class="offline-deck-actions">
                    <button type="button" class="btn-offline-action-sm" onclick="window.offlineManager.studyDeckNow('${item.lang}', '${item.id}')" title="Mở học bài này ngay">
                        <i class="fa-solid fa-book-open"></i> Học
                    </button>
                    <button type="button" class="btn-offline-action-sm" onclick="window.offlineManager.updateDeckFromCloud('${item.lang}', '${item.id}')" title="Cập nhật lại từ Cloud nếu có bản mới">
                        <i class="fa-solid fa-arrows-rotate"></i>
                    </button>
                    <button type="button" class="btn-offline-action-sm danger" onclick="window.offlineManager.deleteOfflineDeck('${item.id}')" title="Xóa khỏi bộ nhớ máy để giải phóng dung lượng">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    studyDeckNow(lang, deckId) {
        this.closeModal();
        const targetUrl = `/${lang}/practice/vocab.html?deck=${encodeURIComponent(deckId)}`;
        if (window.location.pathname.includes('/vocab.html') && window.sheetApp && window.sheetApp.lang === lang) {
            window.sheetApp.switchDeck(deckId);
        } else {
            window.location.href = targetUrl;
        }
    }

    async updateDeckFromCloud(lang, deckId) {
        if (!navigator.onLine) {
            if (window.studyUI) window.studyUI.showToast('Thiết bị đang không có mạng, không thể lấy bản cập nhật từ Cloud!', 'error');
            return;
        }

        if (window.studyUI) window.studyUI.showToast('Đang cập nhật từ Supabase Cloud...', 'info');

        try {
            let latestDeck = null;
            if (window.studyCloud && typeof window.studyCloud.getDeck === 'function') {
                latestDeck = await window.studyCloud.getDeck(deckId);
            }
            if (!latestDeck && window.studyStorage) {
                latestDeck = window.studyStorage.getDeckById(lang, deckId);
            }

            if (latestDeck) {
                window.studyStorage.saveDeckOffline(latestDeck);
                if (window.studyUI) {
                    window.studyUI.playDing();
                    window.studyUI.showToast(`✅ Đã cập nhật bản mới nhất của "${latestDeck.title}"!`, 'success');
                }
                this.renderModalContent();
            }
        } catch (e) {
            if (window.studyUI) window.studyUI.showToast('Lỗi cập nhật: ' + e.message, 'error');
        }
    }

    deleteOfflineDeck(deckId) {
        if (!window.studyStorage) return;
        if (confirm('Cậu có chắc chắn muốn xóa bản ngoại tuyến của bài học này để giải phóng bộ nhớ không?')) {
            window.studyStorage.removeDeckOffline(deckId);
            if (window.studyUI) {
                window.studyUI.showToast('🗑️ Đã xóa bản ngoại tuyến khỏi thiết bị.', 'info');
            }
            this.renderModalContent();
            this.updateButtonState();
        }
    }

    batchDownloadCurrentLang() {
        if (!window.studyStorage) return;
        const allDecks = window.studyStorage.getDecks(this.currentLang);
        if (!allDecks || allDecks.length === 0) {
            if (window.studyUI) window.studyUI.showToast('Không có bài học nào để tải.', 'info');
            return;
        }

        let savedCount = 0;
        allDecks.forEach(d => {
            window.studyStorage.saveDeckOffline(d);
            savedCount++;
        });

        if (window.studyUI) {
            window.studyUI.playDing();
            window.studyUI.showToast(`⚡ Đã tải ${savedCount} bộ bài của ngôn ngữ này về máy để học offline!`, 'success', 4000);
        }
        this.renderModalContent();
        this.updateButtonState();
    }

    async forceSyncCloud() {
        if (!navigator.onLine) {
            if (window.studyUI) window.studyUI.showToast('Không có mạng để đồng bộ lúc này!', 'error');
            return;
        }

        if (window.studyUI) window.studyUI.showToast('Đang kết nối Cloud để đồng bộ...', 'info');
        if (window.studyStorage) {
            const res = await window.studyStorage.syncOfflineQueueToCloud();
            if (res.synced === 0) {
                if (window.studyUI) window.studyUI.showToast('✨ Tất cả dữ liệu học tập ngoại tuyến đã được đồng bộ khớp với Mây!', 'success');
            }
        }
    }

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}

window.offlineManager = new StudyOfflineManager();
