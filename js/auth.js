/**
 * MHENT STUDY - AUTHENTICATION & SINGLE SIGN-ON ENGINE
 * Đồng bộ phiên đăng nhập với MHEnt Universe qua Firebase Auth
 */
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getAuth, 
    setPersistence,
    browserLocalPersistence,
    onAuthStateChanged, 
    signOut, 
    signInWithPopup, 
    signInWithRedirect, 
    getRedirectResult,
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = window.firebaseConfig || (window.MHENT_CONFIG && window.MHENT_CONFIG.FIREBASE);
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Đảm bảo phiên đăng nhập được lưu vĩnh viễn trên thiết bị (LocalStorage / IndexedDB)
setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('[Study Auth] Could not set persistence:', err);
});
window.studyAuth = auth;

const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
    prompt: 'select_account'
});

export { 
    auth, 
    db, 
    provider, 
    onAuthStateChanged,
    signOut,
    signInWithPopup, 
    signInWithRedirect, 
    getRedirectResult, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    sendPasswordResetEmail 
};

// Tự động đồng bộ UI Navbar theo trạng thái đăng nhập
export function initNavbarAuth() {
    const btnLogin = document.getElementById('btn-login');
    const userProfile = document.getElementById('user-profile');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const btnLogout = document.getElementById('btn-logout');

    // 🌐 1. Kiểm tra Cookie phiên đăng nhập dùng chung toàn miền (*.mhentuniverse.com)
    function getSharedSessionCookie() {
        const match = document.cookie.match(/(^|;\s*)mhent_auth_session=([^;]*)/);
        if (!match) return null;
        try {
            return JSON.parse(decodeURIComponent(match[2]));
        } catch(e) {
            return null;
        }
    }

    const sharedUser = getSharedSessionCookie();
    if (sharedUser && sharedUser.uid) {
        localStorage.setItem('mhent_user_profile', JSON.stringify(sharedUser));
        localStorage.setItem('mhent_user_role', sharedUser.role || 'user');
    }

    // 2. Khôi phục UI ngay lập tức từ bộ nhớ đệm để tránh giật lag khi mở app
    const cachedProfileStr = localStorage.getItem('mhent_user_profile');
    if (cachedProfileStr) {
        try {
            const cachedUser = JSON.parse(cachedProfileStr);
            if (cachedUser && cachedUser.uid && (cachedUser.email || cachedUser.displayName)) {
                if (btnLogin) btnLogin.style.display = 'none';
                if (userProfile) {
                    userProfile.style.display = 'inline-flex';
                    userProfile.title = 'Xem thông tin cá nhân & Tiện ích (MHEnt Drawer)';
                    userProfile.onclick = (e) => {
                        e.preventDefault();
                        if (typeof window.openSideDrawer === 'function') window.openSideDrawer();
                    };
                    if (userAvatar) userAvatar.src = cachedUser.photoURL || '/assets/avt-web.jpg';
                    if (userName) userName.textContent = cachedUser.displayName || (cachedUser.email ? cachedUser.email.split('@')[0] : 'Học viên MHEnt');
                }
                if (cachedUser.streak) {
                    document.querySelectorAll('#streakNum').forEach(el => el.textContent = cachedUser.streak);
                }
            }
        } catch (e) {}
    }

    if (btnLogin) {
        btnLogin.onclick = (e) => {
            if (e && e.preventDefault) e.preventDefault();
            const isDesktop = Boolean(window.MHEntDesktop && window.MHEntDesktop.isDesktop);
            const isNativeApp = Boolean(window.AndroidAuth) || Boolean(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
            const platform = isDesktop ? 'desktop' : (isNativeApp ? 'app' : 'web');
            const targetRedirect = window.location.href;
            const ssoUrl = `https://accounts.mhentuniverse.com/login?source=mhentstudy&platform=${platform}&redirect=${encodeURIComponent(targetRedirect)}`;

            if (isDesktop && window.MHEntDesktop && window.MHEntDesktop.openExternal) {
                window.MHEntDesktop.openExternal(ssoUrl);
            } else if (isNativeApp && window.AndroidAuth && window.AndroidAuth.openExternalUrl) {
                window.AndroidAuth.openExternalUrl(ssoUrl);
            } else {
                window.location.href = ssoUrl;
            }
        };
    }

    if (btnLogout) {
        btnLogout.onclick = async () => {
            await signOut(auth);
            localStorage.removeItem('mhent_user_profile');
            localStorage.setItem('mhent_user_role', 'guest');
            // Xóa cookie liên tên miền trên toàn bộ hệ thống
            document.cookie = "mhent_auth_session=; domain=.mhentuniverse.com; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure";
            document.cookie = "mhent_auth_token=; domain=.mhentuniverse.com; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure";
            if (typeof showToast === 'function') {
                showToast('Thông báo', 'Đã đăng xuất khỏi MHEnt Universe!', 'info');
            }
            setTimeout(() => window.location.reload(), 800);
        };
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            if (btnLogin) btnLogin.style.display = 'none';
            if (userProfile) {
                userProfile.style.display = 'inline-flex';
                userProfile.title = 'Xem thông tin cá nhân & Tiện ích (MHEnt Drawer)';
                userProfile.onclick = (e) => {
                    e.preventDefault();
                    if (typeof window.openSideDrawer === 'function') {
                        window.openSideDrawer();
                    }
                };
                if (userAvatar) userAvatar.src = user.photoURL || '/assets/avt-web.jpg';
                if (userName) userName.textContent = user.displayName || user.email.split('@')[0];
            }

            // Lưu profile và đồng bộ Streak học tập vào Firestore & Cache
            try {
                const userSnap = await getDoc(doc(db, "users", user.uid));
                const uData = userSnap.exists() ? userSnap.data() : {};
                
                // Đồng bộ Streak theo ngày đăng nhập
                const today = window.studyStorage ? window.studyStorage.getLocalDateStr() : new Date().toISOString().slice(0, 10);
                const yesterday = window.studyStorage ? window.studyStorage.getLocalDateStr(-1) : '';

                let streak = typeof uData.streak === 'number' && uData.streak > 0 ? uData.streak : 1;
                const lastStreakDate = uData.lastStreakDate || uData.lastLoginDate || '';

                if (lastStreakDate === yesterday) {
                    streak += 1; // Đăng nhập ngày liên tiếp hôm sau -> Tăng chuỗi!
                } else if (lastStreakDate && lastStreakDate !== today) {
                    streak = 1; // Bị gián đoạn > 1 ngày -> Khởi tạo lại 1
                }

                // Cập nhật lại Firestore
                await setDoc(doc(db, "users", user.uid), {
                    streak: streak,
                    lastStreakDate: today,
                    lastLoginDate: today
                }, { merge: true });

                // Đồng bộ xuống LocalStorage & DOM
                if (window.studyStorage) {
                    let sInfo = window.studyStorage.get('streak_info', { current: streak });
                    sInfo.current = streak;
                    sInfo.lastDate = today;
                    sInfo.lastLoginDate = today;
                    window.studyStorage.set('streak_info', sInfo);
                }
                document.querySelectorAll('#streakNum').forEach(el => el.textContent = streak);
                document.querySelectorAll('.drawer-streak-badge').forEach(el => el.innerHTML = `🔥 Chuỗi học: ${streak} Ngày`);
                document.querySelectorAll('.streak-pill-btn').forEach(el => el.classList.add('lit'));

                localStorage.setItem('mhent_user_profile', JSON.stringify({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || user.email.split('@')[0],
                    photoURL: user.photoURL || '/assets/avt-web.jpg',
                    role: uData.role || 'user',
                    streak: streak
                }));
            } catch (e) {
                console.warn('[Study Auth] Lỗi đồng bộ streak Firestore:', e);
            }
        } else {
            // Không có phiên Firebase trực tiếp, kiểm tra nếu còn lưu session trong LocalStorage hoặc Cookie liên miền
            const cookieUser = getSharedSessionCookie();
            const cachedProfileStr = localStorage.getItem('mhent_user_profile');
            let hasValidCache = false;
            let activeUser = cookieUser;

            if (!activeUser && cachedProfileStr) {
                try {
                    const parsed = JSON.parse(cachedProfileStr);
                    if (parsed && parsed.uid && (parsed.email || parsed.displayName)) {
                        activeUser = parsed;
                    }
                } catch(e) {}
            }

            if (activeUser && activeUser.uid) {
                hasValidCache = true;
                if (btnLogin) btnLogin.style.display = 'none';
                if (userProfile) {
                    userProfile.style.display = 'inline-flex';
                    if (userAvatar) userAvatar.src = activeUser.photoURL || '/assets/avt-web.jpg';
                    if (userName) userName.textContent = activeUser.displayName || (activeUser.email ? activeUser.email.split('@')[0] : 'Học viên MHEnt');
                }
            }

            if (!hasValidCache) {
                if (btnLogin) btnLogin.style.display = 'inline-flex';
                if (userProfile) userProfile.style.display = 'none';
            }
        }
    });
}

// Hàm đẩy streak lên Cloud Firestore khi học xong 1 bài
window.syncStudyStreakToCloud = async function(newStreak) {
    try {
        const user = auth.currentUser;
        if (user) {
            const today = window.studyStorage ? window.studyStorage.getLocalDateStr() : new Date().toISOString().slice(0, 10);
            await setDoc(doc(db, "users", user.uid), {
                streak: newStreak,
                lastStudiedDate: today,
                lastStreakDate: today
            }, { merge: true });
        }
    } catch(e) {}
};

// ================================================================
// XỬ LÝ DEEP LINK TỰ ĐỘNG ĐĂNG NHẬP (MHENTSTUDY:// TỪ MHENT UNIVERSE SSO & GOOGLE)
// ================================================================
window.handleMHEntDeepLink = async function(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return;
    console.log('[MHEnt Study] Nhận Deep Link xác thực:', rawUrl);

    try {
        const queryString = rawUrl.includes('?') ? rawUrl.substring(rawUrl.indexOf('?') + 1) : '';
        const params = new URLSearchParams(queryString);
        const uid = params.get('uid');
        const email = params.get('email') ? decodeURIComponent(params.get('email')) : '';
        const name = params.get('name') ? decodeURIComponent(params.get('name')) : '';
        const photo = params.get('photo') ? decodeURIComponent(params.get('photo')) : '';
        const token = params.get('token');

        if (uid) {
            const profile = {
                uid: uid,
                email: email || `${uid}@mhentuniverse.com`,
                displayName: name || (email ? email.split('@')[0] : 'Học viên MHEnt'),
                photoURL: photo || '/assets/avt-web.jpg',
                role: 'user',
                source: 'sso_deep_link'
            };

            // Lưu thông tin phiên đăng nhập vào LocalStorage
            localStorage.setItem('mhent_user_profile', JSON.stringify(profile));
            localStorage.setItem('mhent_user_role', 'user');
            if (token) {
                localStorage.setItem('mhent_app_token', token);
            }

            // Đồng bộ nhanh với Firestore nếu có thể
            try {
                const userRef = doc(db, "users", uid);
                const snap = await getDoc(userRef);
                if (!snap.exists()) {
                    await setDoc(userRef, {
                        email: profile.email,
                        displayName: profile.displayName,
                        photoURL: profile.photoURL,
                        role: "user",
                        createdAt: new Date().toISOString()
                    }, { merge: true });
                } else {
                    const data = snap.data();
                    profile.streak = data.streak || 1;
                    profile.role = data.role || 'user';
                    localStorage.setItem('mhent_user_profile', JSON.stringify(profile));
                }
            } catch (fsErr) {
                console.warn('[Study Auth] Lỗi đồng bộ Firestore khi nhận Deep Link:', fsErr);
            }

            // Kích hoạt đồng bộ toàn bộ dữ liệu Supabase Cloud cho tất cả các ngôn ngữ
            if (window.studyStorage && typeof window.studyStorage.syncDecksFromCloud === 'function') {
                try {
                    await Promise.all(['ko', 'ja', 'en', 'zh'].map(l => window.studyStorage.syncDecksFromCloud(l)));
                    console.log('[Study Auth] ☁️ Đã đồng bộ kho bài học Supabase Cloud cho tài khoản:', uid);
                } catch(syncErr) {
                    console.warn('[Study Auth] Lỗi đồng bộ Supabase Cloud:', syncErr);
                }
            }

            // Nếu đang mở trang bài học VocabSheetApp thì đồng bộ và làm mới ngay
            if (window.sheetApp && typeof window.sheetApp.syncCloudDecks === 'function') {
                try { await window.sheetApp.syncCloudDecks(); } catch(e) {}
            }

            // Cập nhật ngay giao diện Navbar nếu đang mở
            if (typeof initNavbarAuth === 'function') {
                initNavbarAuth();
            }

            // Chuyển hướng người dùng về trang ban đầu hoặc trang chủ Study Hub
            const redirectTarget = params.get('redirect') ? decodeURIComponent(params.get('redirect')) : '';
            if (redirectTarget && !redirectTarget.includes('login')) {
                setTimeout(() => {
                    window.location.href = redirectTarget;
                }, 400);
            } else if (window.location.pathname.includes('login') || window.location.pathname.endsWith('login.html')) {
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 400);
            } else {
                setTimeout(() => {
                    window.location.reload();
                }, 400);
            }
        }
    } catch (e) {
        console.error('[Study Auth] Lỗi xử lý Deep Link:', e);
    }
};

// Kiểm tra Deep Link đang chờ xử lý
if (window.__pendingDeepLink) {
    const pending = window.__pendingDeepLink;
    window.__pendingDeepLink = null;
    window.handleMHEntDeepLink(pending);
}

// Chạy tự động khi DOM sẵn sàng
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavbarAuth);
} else {
    initNavbarAuth();
}
