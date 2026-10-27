/**
 * MHENT STUDY - UI KIT & AUDIO FEEDBACK
 * Toast, Dialog Popups, Sound FX (Web Audio API không cần tải file ngoài)
 */

// ==========================================
// 🚀 TỰ ĐỘNG LIÊN KẾT MHENT UI & GHI ĐÈ DIALOG HỆ THỐNG
// ==========================================
(function initMHEntUIBridge() {
    if (typeof document === 'undefined') return;

    // 1. Tự động liên kết css mhent-ui nếu chưa có
    if (!document.querySelector('link[href*="mhent-ui.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/css/mhent-ui.css';
        document.head.appendChild(link);
    }

    // 2. Tự động nạp thư viện js mhent-ui nếu chưa có
    if (typeof window.showPopup !== 'function' && !document.querySelector('script[src*="mhent-ui.js"]')) {
        const script = document.createElement('script');
        script.src = '/js/mhent-ui.js';
        script.defer = true;
        document.head.appendChild(script);
    }

    // 3. Fallback an toàn lập tức ngăn chặn hoàn toàn native alert/confirm/prompt
    if (typeof window !== 'undefined') {
        if (!window.alert || !window.alert.__mhentPatched) {
            const _origAlert = window.alert;
            window.alert = function(msg) {
                const text = String(msg !== undefined ? msg : '');
                if (typeof window.showPopup === 'function') {
                    window.showPopup(text, /lỗi|error|thất bại|không thể|sai|chưa chọn|ít nhất|vui lòng/i.test(text));
                } else if (window.studyUI && typeof window.studyUI.showToast === 'function') {
                    window.studyUI.showToast(text, /lỗi|error|thất bại|không thể|sai|chưa chọn/i.test(text) ? 'error' : 'info');
                } else {
                    _origAlert(text);
                }
            };
            window.alert.__mhentPatched = true;
        }

        if (!window.confirm || !window.confirm.__mhentPatched) {
            window.confirm = function(msg) {
                console.warn('[MHEnt UI] Trình duyệt đang gọi confirm() nguyên bản đồng bộ. Vui lòng sử dụng window.mhentConfirm hoặc window.showConfirmPopup thay thế.');
                if (window.studyUI && typeof window.studyUI.showToast === 'function') {
                    window.studyUI.showToast(msg || 'Xác nhận thao tác', 'info');
                }
                return true;
            };
            window.confirm.__mhentPatched = true;
        }

        if (!window.prompt || !window.prompt.__mhentPatched) {
            window.prompt = function(msg, defaultVal) {
                console.warn('[MHEnt UI] Trình duyệt đang gọi prompt() nguyên bản. Vui lòng dùng window.mhentPrompt hoặc window.showInputPopup thay thế.');
                if (typeof window.showInputPopup === 'function') {
                    window.showInputPopup('Nhập thông tin', msg || '', 'Xác nhận', () => {});
                }
                return defaultVal || null;
            };
            window.prompt.__mhentPatched = true;
        }

        // Khởi tạo các hàm API MHEnt UI tạm thời nếu script chưa load xong
        if (!window.showPopup) {
            window.showPopup = function(msg, isError) {
                if (window.studyUI && typeof window.studyUI.showToast === 'function') {
                    window.studyUI.showToast(msg, isError ? 'error' : 'success');
                }
            };
        }
        if (!window.showConfirmPopup) {
            window.showConfirmPopup = function(title, message, onConfirm, onCancel) {
                if (typeof onConfirm === 'function') onConfirm();
            };
        }
        if (!window.mhentConfirm) {
            window.mhentConfirm = function(title, msg) {
                return Promise.resolve(true);
            };
        }
    }
})();

class StudyUI {
    constructor() {
        this.initTheme();
        this.audioCtx = null;
    }

    initTheme() {
        const savedTheme = localStorage.getItem('mhent_theme') || 'dark';
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }

    toggleTheme() {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('mhent_theme', isDark ? 'dark' : 'light');
        this.showToast(isDark ? '🌙 Đã bật chế độ Tối' : '☀️ Đã bật chế độ Sáng', 'info');
    }

    showToast(message, type = 'info', duration = 3000) {
        let container = document.getElementById('study-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'study-toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `study-toast ${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '⚠️';

        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // Hiệu ứng âm thanh ngọt ngào qua Web Audio API
    getAudioContext() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) this.audioCtx = new AudioContext();
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        return this.audioCtx;
    }

    playDing() {
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
            osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15); // E6
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
        } catch (e) {
            // silent fail
        }
    }

    playWrong() {
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.25);
        } catch (e) {
            // silent fail
        }
    }
}

window.studyUI = new StudyUI();
