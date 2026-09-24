/**
 * MHENT STUDY - UI KIT & AUDIO FEEDBACK
 * Toast, Dialog Popups, Sound FX (Web Audio API không cần tải file ngoài)
 */
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
