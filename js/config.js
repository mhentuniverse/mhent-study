/**
 * MHENT STUDY - GLOBAL CONFIGURATION
 * Đồng bộ với hệ sinh thái MHEnt Universe (Firebase & Supabase)
 */
window.MHENT_CONFIG = window.MHENT_CONFIG || {
    FIREBASE: {
        apiKey: "AIzaSyDKDAAnmeqWFRqUZWTVa--m5-cORyHCoUk",
        authDomain: "mhentuniverse.firebaseapp.com",
        projectId: "mhentuniverse",
        storageBucket: "mhentuniverse.firebasestorage.app",
        messagingSenderId: "377044322952",
        appId: "1:377044322952:web:d657d1b0806d37d9246d3d"
    },
    SUPABASE: {
        URL: "https://ctzkgchjheirxwejctvl.supabase.co", // Kho dữ liệu học tập chính (Study Decks & Profiles)
        KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0emtnY2hqaGVpcnh3ZWpjdHZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjA0MTgsImV4cCI6MjA5MTgzNjQxOH0.Wl-sBpH1VvcR6-Y4D4UAVm1f5_brGK3cVIHRJBEhOJ0",
        DICT_URL: "https://hwklqefdwskmwwyofthb.supabase.co", // Kho Từ điển AI & Lời bài hát Music Lyrics Hub
        DICT_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3a2xxZWZkd3NrbXd3eW9mdGhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMTUzODYsImV4cCI6MjEwNjc5MTM4Nn0.VV2By40CkQLEq9OVU8e4HooYt-XHihGItFvOaAV78SU"
    },
    GEMINI_API_KEY: "", // Quản lý an toàn qua Backend Worker hoặc localStorage('mhent_ai_api_key')
    AISA_API_ENDPOINT: "https://api.mhentuniverse.com",
    AISA_MODEL: "aisa-scholar-v1" // Multiverse Academic & Language Sensei
};

window.firebaseConfig = window.MHENT_CONFIG.FIREBASE;
window.supabaseUrl = window.MHENT_CONFIG.SUPABASE.URL;
window.supabaseKey = window.MHENT_CONFIG.SUPABASE.KEY;
window.aisaEndpoint = window.MHENT_CONFIG.AISA_API_ENDPOINT;
window.aisaModel = window.MHENT_CONFIG.AISA_MODEL;

// ==========================================
// CƠ CHẾ ĐIỀU HƯỚNG VÀ DỌN DẸP BỘ NHỚ TRÊN CAPACITOR ANDROID APK
// ==========================================
window.resolveAppUrl = function(urlStr) {
    try {
        if (!urlStr || typeof urlStr !== 'string') return urlStr;
        if (urlStr.startsWith('#') || urlStr.startsWith('javascript:') || urlStr.startsWith('mailto:') || urlStr.startsWith('tel:') || urlStr.startsWith('mhentstudy:')) {
            return urlStr;
        }

        const u = new URL(urlStr, window.location.href);
        if (u.origin !== window.location.origin) return urlStr;

        let p = u.pathname;
        if (!p || p === '/' || p === '') {
            u.pathname = '/index.html';
            return u.href;
        }

        // Nếu đã có đuôi mở rộng (.html, .js, .css, .png, etc.) thì giữ nguyên
        if (/\.[a-zA-Z0-9]+$/.test(p)) return u.href;

        const clean = p.replace(/\/$/, '');

        // 1. Các trang gốc
        if (['/lyrics', '/login', '/download'].includes(clean)) {
            u.pathname = clean + '.html';
            return u.href;
        }

        // 2. Các phân khu ngôn ngữ chính & kho chia sẻ: /ko, /ja, /zh, /en, /shared
        if (['/ko', '/ja', '/zh', '/en', '/shared'].includes(clean)) {
            u.pathname = clean + '/index.html';
            return u.href;
        }

        // 3. Các trang alphabet & exam: /{lang}/alphabet, /{lang}/exam
        if (/\/(ko|ja|zh|en)\/(alphabet|exam)$/.test(clean)) {
            u.pathname = clean + '.html';
            return u.href;
        }

        // 4. Trang practice chủ: /{lang}/practice
        if (/\/(ko|ja|zh|en)\/practice$/.test(clean)) {
            u.pathname = clean + '/index.html';
            return u.href;
        }

        // 5. Các chế độ practice cụ thể: /{lang}/practice/{mode}
        if (/\/(ko|ja|zh|en)\/practice\/[^\/]+$/.test(clean)) {
            u.pathname = clean + '.html';
            return u.href;
        }

        // Mặc định thêm .html để không bị 404 về index.html trên Android WebView
        u.pathname = clean + '.html';
        return u.href;
    } catch(e) {
        return urlStr;
    }
};

(function() {
    const isNativeApp = Boolean(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ||
                        (typeof window !== 'undefined' && window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));

    if (isNativeApp) {
        // 1. Tự động hủy ServiceWorker và xóa sạch cache cũ (tránh lỗi sw.js tự cache index.html đè lên mọi trang)
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(regs) {
                for (let reg of regs) {
                    reg.unregister();
                }
            }).catch(function() {});
        }
        if (window.caches) {
            caches.keys().then(function(keys) {
                keys.forEach(function(k) { caches.delete(k); });
            }).catch(function() {});
        }

        // 2. Tự động can thiệp mọi cú nhấp thẻ <a> hoặc nút điều hướng để tránh 404 về index
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (link) {
                const targetUrl = link.getAttribute('href');
                if (targetUrl && !targetUrl.startsWith('#') && !targetUrl.startsWith('javascript:')) {
                    const resolved = window.resolveAppUrl(link.href);
                    if (resolved && resolved !== link.href) {
                        e.preventDefault();
                        e.stopPropagation();
                        window.location.href = resolved;
                        return;
                    }
                }
            }
        }, true);
    }
})();

