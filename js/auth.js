/**
 * MHENT STUDY - AUTHENTICATION & SINGLE SIGN-ON ENGINE
 * Đồng bộ phiên đăng nhập với MHEnt Universe qua Firebase Auth
 */
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getAuth, 
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
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { auth, db, provider, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail };

// Tự động đồng bộ UI Navbar theo trạng thái đăng nhập
export function initNavbarAuth() {
    const btnLogin = document.getElementById('btn-login');
    const userProfile = document.getElementById('user-profile');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const btnLogout = document.getElementById('btn-logout');

    if (btnLogin) {
        btnLogin.onclick = () => {
            const redirectUrl = encodeURIComponent(window.location.href);
            window.location.href = `/login.html?redirect=${redirectUrl}`;
        };
    }

    if (btnLogout) {
        btnLogout.onclick = async () => {
            await signOut(auth);
            localStorage.removeItem('mhent_user_profile');
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
                userProfile.style.display = 'flex';
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
            if (btnLogin) btnLogin.style.display = 'inline-flex';
            if (userProfile) userProfile.style.display = 'none';
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

// Chạy tự động khi DOM sẵn sàng
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavbarAuth);
} else {
    initNavbarAuth();
}
