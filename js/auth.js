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

            // Lưu profile vào cache
            try {
                const userSnap = await getDoc(doc(db, "users", user.uid));
                const uData = userSnap.exists() ? userSnap.data() : {};
                localStorage.setItem('mhent_user_profile', JSON.stringify({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || user.email.split('@')[0],
                    photoURL: user.photoURL || '/assets/avt-web.jpg',
                    role: uData.role || 'user'
                }));
            } catch (e) {}
        } else {
            if (btnLogin) btnLogin.style.display = 'inline-flex';
            if (userProfile) userProfile.style.display = 'none';
        }
    });
}

// Chạy tự động khi DOM sẵn sàng
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavbarAuth);
} else {
    initNavbarAuth();
}
