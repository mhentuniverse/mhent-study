// ==========================================
// 🚀 MHEnt. UI Library - Core Alerts & Popups (V1.3 - Smooth Transitions)
// ==========================================

const svgSuccess = `<svg viewBox="0 0 24 24" width="50" height="50" stroke="#10b981" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
const svgError = `<svg viewBox="0 0 24 24" width="50" height="50" stroke="#ef4444" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
const svgWarning = `<svg viewBox="0 0 24 24" width="50" height="50" stroke="#f59e0b" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;

// ==========================================
// 1. POPUP THÔNG THƯỜNG
// ==========================================
window.showPopup = function(message, isError = false) {
    removeExistingOverlays();
    const overlay = document.createElement('div');
    overlay.className = 'mhent-ui-overlay'; // Bỏ chữ 'show' ở đây
    overlay.id = 'mhent-active-popup';
    overlay.innerHTML = `
        <div class="mhent-ui-box ${isError ? 'error' : 'success'}">
            <div class="mhent-ui-icon">${isError ? svgError : svgSuccess}</div>
            <h3 class="mhent-ui-title">${isError ? "Ối, Lỗi Rùi!" : "Thành Công!"}</h3>
            <p class="mhent-ui-msg">${message}</p>
            <button class="mhent-ui-btn-primary" onclick="closePopup()">Tuyệt vời</button>
        </div>
    `;
    document.body.appendChild(overlay);

    // Dùng setTimeout cực ngắn để ép trình duyệt render class .show sau khi tạo DOM => Kích hoạt transition
    setTimeout(() => { overlay.classList.add('show'); }, 10);

    if (isError) {
        setTimeout(() => { closePopup(); }, 3000);
    }
};

// ==========================================
// 2. POPUP XÁC NHẬN (CONFIRM)
// ==========================================
window.showConfirmPopup = function(title, message, onConfirm) {
    removeExistingOverlays();
    const overlay = document.createElement('div');
    overlay.className = 'mhent-ui-overlay'; 
    overlay.id = 'mhent-active-confirm';
    overlay.innerHTML = `
        <div class="mhent-ui-box warning">
            <div class="mhent-ui-icon">${svgWarning}</div>
            <h3 class="mhent-ui-title">${title}</h3>
            <p class="mhent-ui-msg">${message}</p>
            <div class="mhent-ui-actions">
                <button class="mhent-ui-btn-outline" id="mhent-cancel">Hủy bỏ</button>
                <button class="mhent-ui-btn-primary" id="mhent-accept">Xác nhận</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => { overlay.classList.add('show'); }, 10);

    document.getElementById('mhent-cancel').onclick = () => closeConfirmPopup();
    document.getElementById('mhent-accept').onclick = () => {
        closeConfirmPopup();
        if (typeof onConfirm === 'function') onConfirm();
    };
};

// ==========================================
// HÀM TẮT POPUP CÓ ANIMATION OUT
// ==========================================
window.closePopup = function() {
    const popup = document.getElementById('mhent-active-popup');
    if (popup) {
        popup.classList.remove('show');
        popup.classList.add('out');
        setTimeout(() => popup.remove(), 400); // Chờ animation FadeOut (400ms)
    }
};

window.closeConfirmPopup = function() {
    const confirm = document.getElementById('mhent-active-confirm');
    if (confirm) {
        confirm.classList.remove('show');
        confirm.classList.add('out');
        setTimeout(() => confirm.remove(), 400);
    }
};

function removeExistingOverlays() {
    const existing = document.querySelectorAll('.mhent-ui-overlay');
    existing.forEach(el => el.remove());
}

// ==========================================
// 3. TOAST THÔNG BÁO GÓC MÀN HÌNH
// ==========================================
window.showToast = function(title, message, type = 'success') {
    let container = document.getElementById('mhent-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'mhent-toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `mhent-toast ${type}`;
    let icon = type === 'error' ? svgError : (type === 'info' ? svgWarning : svgSuccess);
    
    toast.innerHTML = `
        <div class="mhent-toast-icon">${icon}</div>
        <div class="mhent-toast-content">
            <div class="mhent-toast-title">${title}</div>
            <div class="mhent-toast-desc">${message}</div>
        </div>
    `;
    container.appendChild(toast);
    
    setTimeout(() => { 
        toast.style.animation = 'toastFadeOut 0.4s forwards cubic-bezier(0.175, 0.885, 0.32, 1.275)'; 
        setTimeout(() => toast.remove(), 400);
    }, 3000);
};

// ==========================================
// CÁC HÀM TIỆN ÍCH (Giữ nguyên)
// ==========================================
function initializeBackToTopButton() {
    if (document.getElementById('btn-back-to-top')) return;
    const button = document.createElement('button');
    button.id = 'btn-back-to-top';
    button.type = 'button';
    button.title = 'Lên đầu trang';
    button.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`;
    button.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    const toggleVisibility = () => { window.scrollY > 300 ? button.classList.add('visible') : button.classList.remove('visible'); };
    window.addEventListener('scroll', toggleVisibility, { passive: true });
    toggleVisibility();
    document.body.appendChild(button);
}

window.buildLoginRedirectUrl = function(defaultPath = null) {
    const currentPath = defaultPath || `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (!currentPath || currentPath.startsWith('/login') || currentPath.startsWith('/auth-action')) return '/login';
    return `/login?redirect=${encodeURIComponent(currentPath)}`;
};

window.redirectToLogin = function(defaultPath = null) {
    window.location.href = window.buildLoginRedirectUrl(defaultPath);
};

function initializeLoginRedirectButtons() {
    const loginSelectors = ['#btn-login', '.btn-login', '.btn-auth'];
    document.addEventListener('click', (event) => {
        const target = event.target.closest ? event.target.closest(loginSelectors.join(',')) : null;
        if (!target || target.getAttribute('onclick') || target.closest('.dropdown-menu')) return;
        const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (currentPath.startsWith('/login') || currentPath.startsWith('/auth-action')) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
    }, true);
}

document.addEventListener('DOMContentLoaded', () => {
    initializeBackToTopButton();
    initializeLoginRedirectButtons();
});

// ==========================================
// 4. HIỆU ỨNG GÕ CHỮ (TYPING POPUP)
// ==========================================
window.showTypingPopup = function(message = "Đang xử lý...") {
    if (document.getElementById('mhent-typing-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'mhent-typing-overlay';
    overlay.innerHTML = `
        <div class="mhent-typing-box">
            <div class="mhent-typing-indicator"><span></span><span></span><span></span></div>
            <div class="mhent-typing-text">${message}</div>
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => { overlay.classList.add('show'); }, 10);
};

window.hideTypingPopup = function() {
    const overlay = document.getElementById('mhent-typing-overlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
    }
};

// ==========================================
// 5. HIỆU ỨNG POPUP NHẬP LIỆU (INPUT DIALOG)
// ==========================================
window.showInputPopup = function(title, placeholder, confirmText, callback) {
    if (document.getElementById('mhent-input-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'mhent-input-overlay';
    overlay.innerHTML = `
        <div class="mhent-input-box">
            <div class="mhent-input-title">${title}</div>
            <input type="text" id="mhent-custom-input" class="mhent-input-field" placeholder="${placeholder}" autocomplete="off">
            <div class="mhent-input-actions">
                <button class="mhent-btn-cancel" onclick="closeInputPopup()">Hủy</button>
                <button class="mhent-btn-confirm" id="mhent-btn-confirm-input">${confirmText}</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => { overlay.classList.add('show'); }, 10);

    const inputField = document.getElementById('mhent-custom-input');
    inputField.focus();
    inputField.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') document.getElementById('mhent-btn-confirm-input').click();
    });

    document.getElementById('mhent-btn-confirm-input').addEventListener('click', () => {
        const val = inputField.value.trim();
        closeInputPopup();
        if (callback) callback(val);
    });
};

window.closeInputPopup = function() {
    const overlay = document.getElementById('mhent-input-overlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
    }
};

// ==========================================================================
// 🚀 HỆ THỐNG MENU ĐÁY & SIDE DRAWER SIÊU LINH HOẠT (V5.2 - PRO MAX)
// ==========================================================================

// 1. TỪ ĐIỂN CẤU HÌNH ĐA VŨ TRỤ CHUẨN XÁC
const MHENT_UNIVERSES = {
    cinema: {
        name: 'Cinema', path: '/cinema', color: '#ff85a2', roleKey: 'cinema',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>',
        personalMenu: [
            { title: 'Thư viện phim đã lưu', url: '/cinema/library', icon: 'fa-bookmark', color: '#ff85a2' },
            { title: 'Thông báo phim mới', url: '/cinema/notification', icon: 'fa-bell', color: '#ff85a2', badge: 'NEW' }
        ],
        studioUrl: '/cinema/studio', adminUrl: '/cinema/admin',
        adminLabel: 'Admin Cinema', studioLabel: 'Studio Cinema',
        openCreation: false
    },
    arena: {
        name: 'Arena', path: '/arena', color: '#ff9a55', roleKey: 'arena',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect><line x1="6" y1="12" x2="10" y2="12"></line><line x1="8" y1="10" x2="8" y2="14"></line><line x1="15" y1="13" x2="15.01" y2="13"></line><line x1="18" y1="11" x2="18.01" y2="11"></line></svg>',
        personalMenu: [], studioUrl: '/arena/studio', adminUrl: '/arena/admin',
        adminLabel: 'Admin Arena', studioLabel: 'Studio Arena',
        openCreation: false
    },
    teach: {
        name: 'Edu', path: '/teach', color: '#0ea5e9', roleKey: 'teacher',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>',
        personalMenu: [], studioUrl: '/teach/admin', adminUrl: '/teach/admin',
        adminLabel: 'Admin Edu', studioLabel: 'Admin Edu',
        openCreation: false
    },
    manga:  { name: 'Manga',  path: '#',       color: '#ec4899', roleKey: 'manga', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>', personalMenu: [], openCreation: false },
    game: { 
        name: 'Game', path: '/game', color: '#10b981', roleKey: 'game', 
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><circle cx="15.5" cy="15.5" r="1.5"></circle><circle cx="15.5" cy="8.5" r="1.5"></circle><circle cx="8.5" cy="15.5" r="1.5"></circle><circle cx="12" cy="12" r="1.5"></circle></svg>', 
        personalMenu: [],
        // 👉 NÂNG CẤP: Dùng mảng adminMenus để chứa không giới hạn các trạm chỉ huy sub-sub-folder:
        adminMenus: [
            { title: 'Admin Cờ Vua', url: '/game/chess/admin', icon: 'fa-chess', roleKey: 'chess' },
            { title: 'Admin Cờ Tướng', url: '/game/xiangqi/admin', icon: 'fa-chess-knight', roleKey: 'xiangqi' }
            // Sau này làm Caro hay Uno, cậu chỉ cần thêm 1 dòng vào đây là xong!
        ],
        openCreation: false 
    },
    music:  { name: 'Music',  path: '#',       color: '#8b5cf6', roleKey: 'music', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>', personalMenu: [] },
    novel:  { name: 'Novel',  path: '#',       color: '#f43f5e', roleKey: 'novel', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>', personalMenu: [] }
};

// 2. HÀM MỞ MENU TRƯỢT NGANG (SIDE DRAWER V6.8 - PERFECT ROOT RBAC & AUTO SYNC)
window.openSideDrawer = function() {
    let oldDrawer = document.getElementById('mhent-side-drawer-overlay');
    if (oldDrawer) oldDrawer.remove();

    // [1] LẤY DỮ LIỆU TỪ BỘ NHỚ CACHE ĐA VŨ TRỤ (localStorage)
    let cachedProfileStr = localStorage.getItem('mhent_user_profile') || '{}';
    let cachedProfile = {};
    try { cachedProfile = JSON.parse(cachedProfileStr); } catch(e) { cachedProfile = {}; }

    // 👉 CHÌA KHÓA VÀNG: Đưa hết về chữ thường để chống lỗi phân biệt Hoa/Thường (Admin, Root Admin -> admin, root)
    let userRole = (cachedProfile.role || localStorage.getItem('mhent_user_role') || '').toLowerCase();
    let currentPath = window.location.pathname;

    // [2] QUÉT THỰC TẾ TRÊN DOM
    let loginBtn = document.getElementById('btn-login');
    let profileEl = document.getElementById('user-profile');
    let nameEl = document.getElementById('user-name') || document.getElementById('creator-name-title');
    let avtEl = document.getElementById('user-avatar');
    
    let isLoginBtnVisible = loginBtn && (window.getComputedStyle(loginBtn).display !== 'none' || loginBtn.style.display === 'block' || loginBtn.style.display === 'inline-block' || loginBtn.style.display === 'flex');
    let isProfileVisible = profileEl && window.getComputedStyle(profileEl).display !== 'none';
    
    let isProtectedPage = currentPath.includes('/admin') || currentPath.includes('/studio');
    let hasValidMemory = (cachedProfile.email !== undefined && cachedProfile.email !== "") || 
                         (userRole !== '' && userRole !== 'guest' && userRole !== 'null');

    let isLoggedOut = true;
    if (isLoginBtnVisible && !isProtectedPage) {
        isLoggedOut = true;
        if (userRole !== 'guest') localStorage.setItem('mhent_user_role', 'guest');
    } else if (isProtectedPage || isProfileVisible || hasValidMemory || (nameEl && nameEl.innerText !== "Đang tải..." && nameEl.innerText.trim() !== "")) {
        isLoggedOut = false;
    }

    // [3] XÁC ĐỊNH VŨ TRỤ HIỆN TẠI VÀ TÊN NHÓM (TEAM NAME)
    let activeUniKey = Object.keys(MHENT_UNIVERSES).find(key => {
        let p = MHENT_UNIVERSES[key].path;
        return p !== '#' && p !== '' && currentPath.includes(p);
    });
    let currentUni = activeUniKey ? MHENT_UNIVERSES[activeUniKey] : null;
    let isAtRoot = (!currentUni || currentPath === '/' || currentPath.endsWith('index.html') || currentPath.endsWith('mhentuniverse.vercel.app/'));

    let userName = "Khách thăm quan";
    let userAvt = "/assets/avt-web.jpg";
    let userBadge = "✨ Vui lòng đăng nhập";
    let activeTeamName = "";
    let teamBadgeHTML = "";

    // 👉 QUÉT QUYÈN ROOT ADMIN SIÊU NHẠY (Nhận diện mọi từ khóa: admin, root, boss, chủ tịch)
    let isRootAdmin = currentPath.includes('/admin') || 
                      userRole.includes('admin') || 
                      userRole.includes('root') || 
                      userRole.includes('chủ tịch') || 
                      userRole.includes('boss') || 
                      (window.currentUserRole && window.currentUserRole.toLowerCase().includes('admin'));

    // KHI ĐÃ ĐĂNG NHẬP -> XỬ LÝ QUYỀN LỰC VÀ NHÓM DỊCH ĐA VŨ TRỤ:
    if (!isLoggedOut) {
        if (currentPath.includes('/cinema')) {
            activeTeamName = cachedProfile.teamCinema || cachedProfile.teamName || (document.getElementById('team-name')?.innerText !== "Đang tải..." ? document.getElementById('team-name')?.innerText : "");
        } else if (currentPath.includes('/arena')) {
            activeTeamName = cachedProfile.teamArena || cachedProfile.teamName || "";
        } else if (currentPath.includes('/teach')) {
            activeTeamName = cachedProfile.teamEdu || cachedProfile.teamTeach || cachedProfile.teamName || "";
        } else if (currentPath.includes('/manga')) {
            activeTeamName = cachedProfile.teamManga || cachedProfile.teamName || "";
        } else if (currentPath.includes('/novel')) {
            activeTeamName = cachedProfile.teamNovel || cachedProfile.teamName || "";
        } else if (currentPath.includes('/music')) {
            activeTeamName = cachedProfile.teamMusic || cachedProfile.teamName || "";
        } else {
            activeTeamName = cachedProfile.teamName || cachedProfile.teamCinema || cachedProfile.teamArena || "";
        }

        if (nameEl && nameEl.innerText !== "Đang tải..." && nameEl.innerText.trim() !== "") {
            userName = nameEl.innerText.trim();
        } else if (cachedProfile.displayName && cachedProfile.displayName !== "") {
            userName = cachedProfile.displayName;
        } else if (cachedProfile.email && cachedProfile.email !== "") {
            userName = cachedProfile.email.split('@')[0];
        } else {
            userName = isRootAdmin ? "Giám đốc" : "Creator MHEnt";
        }

        if (avtEl && avtEl.getAttribute('src') && avtEl.getAttribute('src').trim() !== "" && !avtEl.src.includes('index.html')) {
            userAvt = avtEl.src;
        } else if (cachedProfile.photoURL && cachedProfile.photoURL !== "/assets/avt-web.jpg") {
            userAvt = cachedProfile.photoURL;
        }

        if (isRootAdmin) {
            userBadge = '👑 ADMIN';
        } else if (userRole.includes('cinema') || userRole.includes('arena') || userRole.includes('teacher') || userRole.includes('creator') || userRole.includes('studio') || isProtectedPage) {
            userBadge = `🎬 Creator ${currentUni ? currentUni.name : 'MHEnt'}`;
        } else {
            userBadge = '✨ Thành viên MHEnt';
        }

        if (activeTeamName && activeTeamName.trim() !== "" && activeTeamName !== "Đang tải...") {
            let badgeColor = currentUni ? currentUni.color : '#ff85a2';
            teamBadgeHTML = `
                <div class="drawer-team-badge" style="background: ${badgeColor}22; color: ${badgeColor}; border: 1px solid ${badgeColor}55; font-weight: 900; font-size: 12.5px; padding: 4px 14px; border-radius: 20px; display: inline-flex; align-items: center; gap: 6px; margin: 6px 0 2px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <i class="fa-solid fa-people-group"></i> Nhóm: ${activeTeamName}
                </div>
            `;
        }
    }

    let isDark = document.body.classList.contains('dark-mode');
    let overlay = document.createElement('div');
    overlay.className = 'mhent-drawer-overlay';
    overlay.id = 'mhent-side-drawer-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) window.closeSideDrawer(); };

    // [4] XÂY DỰNG DANH SÁCH MENU:
    let menuHTML = '';

    if (!isLoggedOut) {
        menuHTML += `
            <a onclick="window.location.href='/profile#info'; closeSideDrawer();" class="drawer-item">
                <div class="drawer-item-left"><i class="fa-solid fa-user"></i> <span>Hồ sơ cá nhân</span></div>
                <i class="fa-solid fa-chevron-right" style="font-size: 14px; color: var(--text-muted);"></i>
            </a>
        `;

        if (currentUni && currentUni.personalMenu) {
            currentUni.personalMenu.forEach(item => {
                let badgeHTML = item.badge ? `<span style="font-size: 10px; background: ${item.color}; color: white; padding: 2px 8px; border-radius: 10px; font-weight: 900; margin-left: auto; margin-right: 10px;">${item.badge}</span>` : '';
                menuHTML += `
                    <a onclick="window.location.href='${item.url}'; closeSideDrawer();" class="drawer-item">
                        <div class="drawer-item-left"><i class="fa-solid ${item.icon}" style="color: ${item.color};"></i> <span>${item.title}</span></div>
                        ${badgeHTML}
                        <i class="fa-solid fa-chevron-right" style="font-size: 14px; color: var(--text-muted);"></i>
                    </a>
                `;
            });
        }

        menuHTML += `
            <div class="drawer-item" onclick="toggleDarkMode(); document.getElementById('drawer-dark-switch').checked = document.body.classList.contains('dark-mode');">
                <div class="drawer-item-left"><i class="fa-solid fa-moon"></i> <span>Chế độ tối (Dark Mode)</span></div>
                <input type="checkbox" id="drawer-dark-switch" ${isDark ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--theme-accent, #ff85a2); pointer-events: none;">
            </div>
        `;

        // (4) ⚡ KHU VỰC QUẢN TRỊ & STUDIO (STUDIO BẢN ĐỊA -> ADMIN BẢN ĐỊA -> ROOT ADMIN CUỐI CÙNG)
        let studioButtonsHTML = '';
        let localAdminButtonsHTML = '';
        let rootAdminButtonHTML = '';
        
        let isRootAdmin = currentPath.includes('/admin') || 
                          userRole.includes('admin') || 
                          userRole.includes('root') || 
                          userRole.includes('chủ tịch') || 
                          userRole.includes('boss') || 
                          (window.currentUserRole && window.currentUserRole.toLowerCase().includes('admin'));

        // 1. QUÉT NÚT BẢN ĐỊA (Chỉ vẽ của Phân khu đang đứng)
        Object.keys(MHENT_UNIVERSES).forEach(key => {
            let uni = MHENT_UNIVERSES[key];
            let isCurrentUni = (currentUni && currentUni === uni);
            
            if (isCurrentUni) {
                // Vẽ nút Studio của phân khu
                if (uni.studioUrl) {
                    let hasUniRole = userRole.includes(key) || (uni.roleKey && userRole.includes(uni.roleKey));
                    let hasGeneralStudioRole = userRole.includes('studio') || userRole.includes('creator') || userRole.includes('uploader') || userRole.includes('teacher');
                    
                    if (isRootAdmin || hasUniRole || hasGeneralStudioRole || uni.openCreation === true) {
                        let badgeText = uni.openCreation ? "FREE" : "CREATOR";
                        let badgeBg = uni.openCreation ? "#10b98122" : `${uni.color}22`;
                        let badgeColor = uni.openCreation ? "#10b981" : uni.color;

                        studioButtonsHTML += `
                            <a onclick="window.location.href='${uni.studioUrl}'; closeSideDrawer();" class="drawer-item" style="color: ${uni.color};">
                                <div class="drawer-item-left"><i class="fa-solid fa-wand-magic-sparkles" style="color: ${uni.color};"></i> <span>${uni.studioLabel || ('Studio ' + uni.name)}</span></div>
                                <span style="font-size: 10px; background: ${badgeBg}; color: ${badgeColor}; padding: 2px 8px; border-radius: 10px; font-weight: 900;">${badgeText}</span>
                            </a>
                        `;
                    }
                }

                // Vẽ nút Admin riêng của phân khu (Khác /admin tối cao)
                let canAccessUniAdmin = isRootAdmin || userRole.includes('admin_' + key) || (uni.roleKey && userRole.includes('admin_' + uni.roleKey)) || userRole.includes('game');
                
                // 👉 TRƯỜNG HỢP 1: Nếu phân khu có nhiều Sub-Admin (Mảng adminMenus như Vũ trụ Game)
                if (Array.isArray(uni.adminMenus)) {
                    uni.adminMenus.forEach(subAdmin => {
                        // Kiểm tra quyền: Chủ tịch hoặc có quyền chung của Vũ trụ Game, HOẶC có quyền riêng của từng môn (ví dụ: role 'chess')
                        let canAccessSub = canAccessUniAdmin || (subAdmin.roleKey && (userRole.includes(subAdmin.roleKey) || userRole.includes('admin_' + subAdmin.roleKey)));
                        
                        if (canAccessSub) {
                            localAdminButtonsHTML += `
                                <a onclick="window.location.href='${subAdmin.url}'; closeSideDrawer();" class="drawer-item" style="color: #3b82f6;">
                                    <div class="drawer-item-left"><i class="fa-solid ${subAdmin.icon || 'fa-shield-halved'}" style="color: #3b82f6;"></i> <span>${subAdmin.title}</span></div>
                                    <span style="font-size: 10px; background: rgba(59,130,246,0.2); color: #3b82f6; padding: 2px 8px; border-radius: 10px; font-weight: 900;">ADMIN</span>
                                </a>
                            `;
                        }
                    });
                } 
                // 👉 TRƯỜNG HỢP 2: Nếu chỉ có 1 Admin duy nhất dạng chuỗi (Như Cinema, Arena, Edu)
                else if (uni.adminUrl && uni.adminUrl !== '/admin') {
                    if (canAccessUniAdmin) {
                        localAdminButtonsHTML += `
                            <a onclick="window.location.href='${uni.adminUrl}'; closeSideDrawer();" class="drawer-item" style="color: #3b82f6;">
                                <div class="drawer-item-left"><i class="fa-solid fa-shield-halved" style="color: #3b82f6;"></i> <span>${uni.adminLabel || ('Admin ' + uni.name)}</span></div>
                                <span style="font-size: 10px; background: rgba(59,130,246,0.2); color: #3b82f6; padding: 2px 8px; border-radius: 10px; font-weight: 900;">ADMIN</span>
                            </a>
                        `;
                    }
                }
            }
        });

        // 2. NÚT ROOT ADMIN: Đặt ở vị trí cuối cùng trong danh sách Quản trị!
        if (isRootAdmin) {
            rootAdminButtonHTML = `
                <a onclick="window.location.href='/admin'; closeSideDrawer();" class="drawer-item" style="color: #10b981;">
                    <div class="drawer-item-left"><i class="fa-solid fa-user-shield" style="color: #10b981;"></i> <span>Admin Hệ Thống</span></div>
                    <span style="font-size: 10px; background: rgba(16,185,129,0.2); color: #10b981; padding: 2px 8px; border-radius: 10px; font-weight: 900;">ROOT</span>
                </a>
            `;
        }

        // TỔNG HỢP THEO THỨ TỰ CHUẨN: Studio Bản Địa ➔ Admin Bản Địa ➔ Admin Hệ Thống Tối Cao
        if (studioButtonsHTML || localAdminButtonsHTML) {
            menuHTML += `<div style="font-size: 11px; font-weight: 900; color: var(--text-muted); text-transform: uppercase; margin: 15px 0 5px 10px; letter-spacing: 1px;">Khu Vực Sáng Tạo & Quản Trị</div>`;
            menuHTML += studioButtonsHTML + localAdminButtonsHTML;
        }
        if (rootAdminButtonHTML) {
            menuHTML += `<div style="font-size: 11px; font-weight: 900; color: var(--text-muted); text-transform: uppercase; margin: 15px 0 5px 10px; letter-spacing: 1px;">Khu Vực Điều Hành</div>`;
            menuHTML += rootAdminButtonHTML;
        }
        
        menuHTML += `
            <div style="height: 1px; background: var(--border-color); margin: 10px 5px;"></div>
            <a onclick="window.openNavCustomizer(); closeSideDrawer();" class="drawer-item">
                <div class="drawer-item-left"><i class="fa-solid fa-sliders"></i> <span>Tùy chỉnh Menu đáy</span></div>
                <i class="fa-solid fa-chevron-right" style="font-size: 14px; color: var(--text-muted);"></i>
            </a>

            <a onclick="window.location.href='/profile#settings'; closeSideDrawer();" class="drawer-item">
                <div class="drawer-item-left"><i class="fa-solid fa-gear"></i> <span>Cài đặt bảo mật</span></div>
                <i class="fa-solid fa-chevron-right" style="font-size: 14px; color: var(--text-muted);"></i>
            </a>
        `;
    } else {
        menuHTML = `
            <div class="drawer-item" onclick="toggleDarkMode(); document.getElementById('drawer-dark-switch').checked = document.body.classList.contains('dark-mode');">
                <div class="drawer-item-left"><i class="fa-solid fa-moon"></i> <span>Chế độ tối (Dark Mode)</span></div>
                <input type="checkbox" id="drawer-dark-switch" ${isDark ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--theme-accent, #ff85a2); pointer-events: none;">
            </div>

            <a onclick="window.openNavCustomizer(); closeSideDrawer();" class="drawer-item">
                <div class="drawer-item-left"><i class="fa-solid fa-sliders"></i> <span>Tùy chỉnh Menu đáy</span></div>
                <i class="fa-solid fa-chevron-right" style="font-size: 14px; color: var(--text-muted);"></i>
            </a>

            <a onclick="window.location.href='/about'; closeSideDrawer();" class="drawer-item">
                <div class="drawer-item-left"><i class="fa-solid fa-circle-info"></i> <span>Về MHEnt. Universe</span></div>
                <i class="fa-solid fa-chevron-right" style="font-size: 14px; color: var(--text-muted);"></i>
            </a>
        `;
    }

    let footerHTML = !isLoggedOut ? `
        <button class="drawer-btn-logout" onclick="closeSideDrawer(); localStorage.setItem('mhent_user_role', 'guest'); localStorage.removeItem('mhent_user_profile'); window.currentUserEmail = ''; let btn = document.getElementById('btn-logout'); if(btn) btn.click(); else window.location.href='/';">
            <i class="fa-solid fa-right-from-bracket"></i> Đăng xuất tài khoản
        </button>
    ` : `
        <button class="drawer-btn-logout" style="background: var(--theme-accent, #ff85a2); color: white; border-color: transparent; box-shadow: 0 4px 15px rgba(255,133,162,0.3);" onclick="closeSideDrawer(); if(window.redirectToLogin) window.redirectToLogin(); else window.location.href='/login';">
            <i class="fa-solid fa-right-to-bracket"></i> Đăng nhập / Đăng ký
        </button>
    `;

    overlay.innerHTML = `
        <div class="mhent-side-drawer">
            <div class="drawer-header">
                <button class="drawer-close-btn" onclick="closeSideDrawer()">&times;</button>
                <img src="${userAvt}" alt="Avatar" class="drawer-avt" onerror="this.src='/assets/avt-web.jpg'">
                <div class="drawer-name" style="margin-bottom: 2px;">${userName}</div>
                ${teamBadgeHTML}
                <div class="drawer-email" style="margin-top: 4px;">${userBadge}</div>
            </div>

            <div class="drawer-menu-list">
                ${menuHTML}
            </div>

            <div class="drawer-footer">
                ${footerHTML}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('show'), 10);
};

// ==========================================================================
// ⚡ RADAR TỰ ĐỘNG ĐỒNG BỘ FIRESTORE TRÊN MỌI TRANG (NEVER FORGET ROLE AGAIN!)
// ==========================================================================
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        try {
            const { getAuth, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js");
            const { getFirestore, doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
            const { getApps } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js");
            
            if (getApps().length > 0) {
                const auth = getAuth();
                const db = getFirestore();
                onAuthStateChanged(auth, async (user) => {
                    if (user) {
                        try {
                            const userSnap = await getDoc(doc(db, "users", user.uid));
                            if (userSnap.exists()) {
                                const uData = userSnap.data();
                                localStorage.setItem('mhent_user_role', uData.role || 'user');
                                localStorage.setItem('mhent_user_profile', JSON.stringify({
                                    uid: user.uid,
                                    email: user.email,
                                    displayName: user.displayName || user.email.split('@')[0],
                                    photoURL: user.photoURL || "/assets/avt-web.jpg",
                                    role: uData.role || 'user',
                                    teamCinema: uData.teamCinema || uData.teamName || '',
                                    teamArena: uData.teamArena || uData.teamName || '',
                                    teamManga: uData.teamManga || uData.teamName || '',
                                    teamMusic: uData.teamMusic || uData.teamName || '',
                                    teamNovel: uData.teamNovel || uData.teamName || '',
                                    teamEdu: uData.teamEdu || uData.teamTeach || uData.teamName || ''
                                }));
                            }
                        } catch(e) {}
                    }
                });
            }
        } catch(e) {}
    }, 500);
});

// 3. HÀM ĐÓNG MENU TRƯỢT NGANG
window.closeSideDrawer = function() {
    let overlay = document.getElementById('mhent-side-drawer-overlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 350);
    }
};

// 4. HÀM MỞ MENU TRƯỢT BÊN TRÁI CHO ADMIN / STUDIO
window.toggleAdminLeftDrawer = function() {
    let sidebar = document.querySelector('.admin-sidebar');
    if (!sidebar) return;

    let overlay = document.getElementById('admin-left-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'admin-left-overlay';
        overlay.className = 'mhent-drawer-overlay';
        overlay.onclick = function() { window.toggleAdminLeftDrawer(); };
        document.body.appendChild(overlay);
    }

    if (sidebar.classList.contains('show-mobile')) {
        sidebar.classList.remove('show-mobile');
        overlay.classList.remove('show');
        setTimeout(() => overlay.style.display = 'none', 300);
    } else {
        overlay.style.display = 'block';
        setTimeout(() => {
            sidebar.classList.add('show-mobile');
            overlay.classList.add('show');
        }, 10);
    }
};

// 5. HÀM VẼ MENU ĐÁY TỰ ĐỘNG
window.renderBottomNav = function() {
    if (window.innerWidth > 768) return;

    let nav = document.getElementById('mhent-bottom-nav');
    if (!nav) {
        nav = document.createElement('div');
        nav.id = 'mhent-bottom-nav';
        nav.className = 'mhent-bottom-nav';
        document.body.appendChild(nav);
    }

    let favApps = JSON.parse(localStorage.getItem('mhent_custom_nav') || '["cinema", "arena"]');
    let currentPath = window.location.pathname;

    let isHomeActive = (currentPath === '/' || currentPath === '/index.html') ? 'active' : '';
    let html = `
        <a onclick="window.location.href='/'" class="bottom-nav-item ${isHomeActive}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
            <span>Đại Sảnh</span>
        </a>
    `;

    favApps.forEach(appKey => {
        let app = MHENT_UNIVERSES[appKey];
        if (app) {
            let isActive = currentPath.startsWith(app.path) ? 'active' : '';
            html += `
                <a onclick="window.location.href='${app.path}'" class="bottom-nav-item ${isActive}">
                    ${app.icon}
                    <span>${app.name}</span>
                </a>
            `;
        }
    });

    let isProfileActive = currentPath.includes('/profile') ? 'active' : '';
    html += `
        <a onclick="window.openSideDrawer(); return false;" class="bottom-nav-item ${isProfileActive}" style="cursor: pointer;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span>Hồ Sơ</span>
        </a>
    `;

    nav.innerHTML = html;
};

document.addEventListener("DOMContentLoaded", () => {
    window.renderBottomNav();

    let adminBrand = document.querySelector('.master-header .brand');
    if (adminBrand) {
        adminBrand.style.cursor = "pointer";
        adminBrand.title = "Bấm để mở Menu chức năng";
        if (window.innerWidth <= 768) {
            adminBrand.innerHTML = `<i class="fa-solid fa-bars" style="margin-right: 8px; color: var(--theme-accent, #ff85a2);"></i>` + adminBrand.innerHTML;
        }
        adminBrand.onclick = function() { window.toggleAdminLeftDrawer(); };
    }
});

// 6. HÀM MỞ BẢNG CHỌN VŨ TRỤ YÊU THÍCH
window.openNavCustomizer = function() {
    let favApps = JSON.parse(localStorage.getItem('mhent_custom_nav') || '["cinema", "arena"]');
    
    let appsHTML = '';
    for (let key in MHENT_UNIVERSES) {
        let app = MHENT_UNIVERSES[key];
        let isChecked = favApps.includes(key) ? 'checked' : '';
        appsHTML += `
            <label style="display: flex; align-items: center; justify-content: space-between; padding: 12px 15px; background: rgba(0,0,0,0.03); border: 1px solid var(--border-color); border-radius: 12px; margin-bottom: 8px; cursor: pointer; font-family: 'Nunito', sans-serif; font-weight: 800; color: var(--text-primary);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: ${app.color};">${app.icon}</span>
                    <span>MHEnt. ${app.name}</span>
                </div>
                <input type="checkbox" name="custom_app_item" value="${key}" ${isChecked} style="width: 18px; height: 18px; accent-color: ${app.color}; cursor: pointer;">
            </label>
        `;
    }

    let overlay = document.createElement('div');
    overlay.className = 'mhent-ui-overlay show';
    overlay.id = 'modal-nav-customizer';
    overlay.innerHTML = `
        <div class="mhent-ui-box" style="text-align: left; max-width: 420px;">
            <h3 style="font-weight: 900; color: var(--text-primary); margin-top: 0; margin-bottom: 5px; text-align: center;">Tùy chỉnh Menu Đáy 📱</h3>
            <p style="color: var(--text-secondary); font-size: 13.5px; text-align: center; margin-bottom: 20px;">Chọn từ 1 đến 3 vũ trụ cậu hay ghé thăm nhất để ghim xuống thanh điều hướng nhé!</p>
            
            <div style="max-height: 300px; overflow-y: auto; margin-bottom: 20px; padding-right: 5px;">
                ${appsHTML}
            </div>

            <div style="display: flex; gap: 10px;">
                <button onclick="document.getElementById('modal-nav-customizer').remove()" class="mhent-ui-btn-outline" style="flex: 1;">Hủy</button>
                <button onclick="saveCustomNav()" class="mhent-ui-btn-primary" style="flex: 1; background: var(--theme-accent, #ff85a2);">Lưu Ngay</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
};

// 7. HÀM LƯU LẠI VÀ VẼ LẠI MENU NGAY LẬP TỨC
window.saveCustomNav = function() {
    let checkedBoxes = document.querySelectorAll('input[name="custom_app_item"]:checked');
    if (checkedBoxes.length < 1 || checkedBoxes.length > 3) {
        if (typeof showToast === 'function') showToast("Lỗi", "Cậu vui lòng chọn từ 1 đến 3 vũ trụ nhé!", "error");
        else alert("Vui lòng chọn từ 1 đến 3 vũ trụ!");
        return;
    }

    let selectedApps = [];
    checkedBoxes.forEach(box => selectedApps.push(box.value));

    localStorage.setItem('mhent_custom_nav', JSON.stringify(selectedApps));

    let modal = document.getElementById('modal-nav-customizer');
    if (modal) modal.remove();

    window.renderBottomNav();

    if (typeof showToast === 'function') showToast("Thành công", "Đã cập nhật thanh Menu của cậu!", "success");
};