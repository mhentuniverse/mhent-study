/**
 * MHENT STUDY - NATIVE SPEECH SYNTHESIS ENGINE
 * Hỗ trợ phát âm chuẩn bản xứ miễn phí 100% bằng Web Speech API
 */
class SpeechEngine {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.isSupported = 'speechSynthesis' in window;
        this.rate = 0.9; // Tốc độ chuẩn cho người học
        this.pitch = 1.0;

        if (this.isSupported) {
            this.loadVoices();
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = () => this.loadVoices();
            }
        }
    }

    loadVoices() {
        if (!this.synth) return;
        this.voices = this.synth.getVoices();
    }

    /**
     * Phát âm một từ hoặc câu
     * @param {string} text - Văn bản cần đọc
     * @param {string} langCode - 'ko', 'ja', 'zh', 'en' hoặc chuẩn BCP 47
     */
    speak(text, langCode = 'ko') {
        if (!this.isSupported || !text) {
            console.warn('SpeechSynthesis không được hỗ trợ trên thiết bị này');
            return;
        }

        // Dừng câu đang đọc trước đó nếu có
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Chuẩn hóa mã ngôn ngữ
        let targetLang = 'ko-KR';
        if (langCode.startsWith('ja')) targetLang = 'ja-JP';
        else if (langCode.startsWith('zh')) targetLang = 'zh-CN';
        else if (langCode.startsWith('en')) targetLang = 'en-US';
        else if (langCode.startsWith('ko')) targetLang = 'ko-KR';

        utterance.lang = targetLang;
        utterance.rate = this.rate;
        utterance.pitch = this.pitch;

        // Tìm voice bản xứ tốt nhất
        if (this.voices.length > 0) {
            const matchVoice = this.voices.find(v => v.lang.replace('_', '-').startsWith(targetLang.split('-')[0]));
            if (matchVoice) {
                utterance.voice = matchVoice;
            }
        }

        this.synth.speak(utterance);
    }

    setSpeed(speed = 0.9) {
        this.rate = Math.max(0.5, Math.min(2.0, speed));
    }

    stop() {
        if (this.synth) this.synth.cancel();
    }
}

window.studySpeech = new SpeechEngine();
