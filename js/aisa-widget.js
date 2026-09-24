/**
 * ==============================================================================
 * AISA COMPANION WIDGET - PROJECT MHENT. UNIVERSE
 * Trợ lý ảo đồng hành song nhân cách (🌸 Harmony & 😈 Echo)
 * Bản quyền: Miyazaki Haruto Entertainment Co., Ltd.
 * 
 * Tính năng:
 * - Nhúng 1 dòng lệnh vào bất kỳ website nào của MHEnt Universe.
 * - Tự động nhận diện ngữ cảnh: Study (Học tập), Workspace (Công việc), Portal (Khám phá).
 * - Nút nổi sang trọng góc dưới bên phải với hiệu ứng ánh sáng Glassmorphism.
 * ==============================================================================
 */

(function () {
    if (window.__AISA_WIDGET_INITIALIZED__) return;
    window.__AISA_WIDGET_INITIALIZED__ = true;

    // Xác định ngữ cảnh website
    const host = window.location.hostname.toLowerCase();
    const path = window.location.pathname.toLowerCase();

    let siteType = 'portal';
    if (host.includes('study') || path.includes('/ja/') || path.includes('/ko/') || path.includes('/zh/') || path.includes('/en/')) {
        siteType = 'study';
    } else if (host.includes('workspace') || path.includes('workspace')) {
        siteType = 'workspace';
    }

    const CONTEXT_GREETINGS = {
        study: {
            tooltip: '🌸 Học bài cùng AISA nhen!',
            harmony: 'Chào bạn iu! Em và Echo đã sẵn sàng đồng hành học từ vựng, ngữ pháp và luyện thi cùng bạn rồi nè! Có chỗ nào chưa hiểu cứ hỏi tụi em nhé! ✨',
            echo: 'Xem nào, hôm nay học hành đàng hoàng hay lại lướt web đấy? Có câu nào khó cứ quẳng qua đây xem có làm khó được Echo không nào!',
            chips: ['🇯🇵 Ngữ pháp N5-N1', '📝 Mẹo nhớ từ vựng', '💡 Đố tớ một câu vui']
        },
        workspace: {
            tooltip: '✨ AISA túc trực hỗ trợ công việc!',
            harmony: 'Chào cậu! Em ở đây để hỗ trợ cậu quản lý công việc, sắp xếp ghi chú và cổ vũ cậu hoàn thành deadline hôm nay nè! ✨',
            echo: 'Lại cắm đầu làm việc rồi sao? Đừng có quên uống nước với chớp mắt đấy nhé, mệt thì bảo tụi này pha trò cho nghe!',
            chips: ['📋 Lên checklist việc cần làm', '💡 Gợi ý ý tưởng mới', '☕ Động viên tớ đi']
        },
        portal: {
            tooltip: '🪐 Trò chuyện cùng AISA Universe!',
            harmony: 'Chào mừng bạn đến với Miyazaki Haruto Entertainment! Em là Harmony, rất vui được làm quen và đồng hành cùng bạn! ✨',
            echo: 'Hế lô! Tớ là Echo đây. Cậu muốn khám phá vũ trụ MHEnt Universe, âm nhạc, cinema hay các dự án bí mật của tụi này?',
            chips: ['🪐 MHEnt Universe là gì?', '🌸 Harmony & Echo là ai?', '🎮 Khám phá các phân khu']
        }
    };

    const currentContext = CONTEXT_GREETINGS[siteType];
    const API_ENDPOINT = (window.MHENT_CONFIG && window.MHENT_CONFIG.AISA_API_ENDPOINT) || 'https://api.mhentuniverse.com';

    // Inject CSS
    const style = document.createElement('style');
    style.id = 'aisa-widget-styles';
    style.textContent = `
        #aisa-widget-root {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #f8fafc;
            --aisa-harmony: #f472b6;
            --aisa-echo: #a78bfa;
            --aisa-user: #0284c7;
            --aisa-bg: #0b1120;
            --aisa-surface: rgba(15, 23, 42, 0.92);
            --aisa-border: rgba(255, 255, 255, 0.12);
        }

        /* Nút nổi Floating Button */
        .aisa-fab {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
            box-shadow: 0 8px 30px rgba(236, 72, 153, 0.4), 0 0 20px rgba(139, 92, 246, 0.3);
            border: 2px solid rgba(255, 255, 255, 0.25);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
        }

        .aisa-fab:hover {
            transform: scale(1.08) rotate(5deg);
            box-shadow: 0 12px 36px rgba(236, 72, 153, 0.6), 0 0 30px rgba(139, 92, 246, 0.5);
        }

        .aisa-fab-icons {
            display: flex;
            align-items: center;
            font-size: 1.45rem;
            position: relative;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }

        .aisa-fab-badge {
            position: absolute;
            top: -2px;
            right: -2px;
            width: 14px;
            height: 14px;
            background: #10b981;
            border-radius: 50%;
            border: 2px solid #0f172a;
            box-shadow: 0 0 8px #10b981;
        }

        /* Tooltip Chào Mừng Nhỏ */
        .aisa-tooltip-bubble {
            position: absolute;
            bottom: 70px;
            right: 0;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(12px);
            padding: 8px 14px;
            border-radius: 14px;
            border: 1px solid var(--aisa-border);
            box-shadow: 0 10px 25px rgba(0,0,0,0.4);
            white-space: nowrap;
            font-size: 0.82rem;
            font-weight: 700;
            color: #f1f5f9;
            display: flex;
            align-items: center;
            gap: 8px;
            animation: aisaPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            cursor: pointer;
        }

        .aisa-tooltip-bubble .aisa-close-tip {
            color: #94a3b8;
            font-size: 0.9rem;
            cursor: pointer;
            padding: 0 2px;
        }

        .aisa-tooltip-bubble .aisa-close-tip:hover { color: #ffffff; }

        /* Khung Cửa Sổ Chat Box */
        .aisa-chat-window {
            position: absolute;
            bottom: 76px;
            right: 0;
            width: 380px;
            height: 540px;
            max-width: calc(100vw - 32px);
            max-height: calc(100vh - 100px);
            background: var(--aisa-surface);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--aisa-border);
            border-radius: 22px;
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.65), 0 0 35px rgba(139, 92, 246, 0.15);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            opacity: 0;
            transform: scale(0.9) translateY(20px);
            pointer-events: none;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            transform-origin: bottom right;
        }

        .aisa-chat-window.aisa-open {
            opacity: 1;
            transform: scale(1) translateY(0);
            pointer-events: auto;
        }

        /* Header Chat */
        .aisa-header {
            padding: 14px 18px;
            background: rgba(15, 23, 42, 0.8);
            border-bottom: 1px solid var(--aisa-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .aisa-header-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .aisa-header-avatars {
            font-size: 1.35rem;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }

        .aisa-header-info h4 {
            margin: 0;
            font-size: 0.95rem;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: 0.3px;
        }

        .aisa-header-info p {
            margin: 2px 0 0 0;
            font-size: 0.72rem;
            color: #10b981;
            display: flex;
            align-items: center;
            gap: 4px;
            font-weight: 600;
        }

        .aisa-header-controls {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .aisa-mode-select {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid var(--aisa-border);
            color: #cbd5e1;
            border-radius: 8px;
            padding: 4px 8px;
            font-size: 0.72rem;
            font-weight: 700;
            outline: none;
            cursor: pointer;
        }

        .aisa-mode-select option {
            background: #0f172a;
            color: #ffffff;
        }

        .aisa-btn-close {
            background: transparent;
            border: none;
            color: #94a3b8;
            font-size: 1.2rem;
            width: 28px;
            height: 28px;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: 0.2s;
        }

        .aisa-btn-close:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.1);
        }

        /* Danh Sách Tin Nhắn */
        .aisa-messages {
            flex: 1;
            padding: 16px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 12px;
            scroll-behavior: smooth;
        }

        .aisa-bubble {
            max-width: 85%;
            padding: 10px 14px;
            border-radius: 16px;
            font-size: 0.88rem;
            line-height: 1.45;
            word-break: break-word;
            animation: aisaPop 0.25s ease-out;
        }

        .aisa-bubble-user {
            align-self: flex-end;
            background: #0284c7;
            color: #ffffff;
            border-bottom-right-radius: 4px;
        }

        .aisa-bubble-harmony {
            align-self: flex-start;
            background: rgba(236, 72, 153, 0.15);
            border: 1px solid rgba(236, 72, 153, 0.35);
            color: #fdf2f8;
            border-bottom-left-radius: 4px;
        }

        .aisa-bubble-echo {
            align-self: flex-start;
            background: rgba(139, 92, 246, 0.15);
            border: 1px solid rgba(139, 92, 246, 0.35);
            color: #f5f3ff;
            border-bottom-left-radius: 4px;
        }

        .aisa-speaker-tag {
            font-size: 0.7rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 3px;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .aisa-tag-harmony { color: var(--aisa-harmony); }
        .aisa-tag-echo { color: var(--aisa-echo); }

        /* Bouncing Dots Loading */
        .aisa-typing-bubble {
            align-self: flex-start;
            background: rgba(255, 255, 255, 0.06);
            border-radius: 14px;
            padding: 10px 14px;
            display: flex;
            gap: 4px;
            align-items: center;
        }

        .aisa-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #cbd5e1;
            animation: aisaBounce 1.2s infinite ease-in-out;
        }

        .aisa-dot:nth-child(2) { animation-delay: 0.2s; }
        .aisa-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes aisaBounce {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
            40% { transform: scale(1.1); opacity: 1; }
        }

        @keyframes aisaPop {
            from { opacity: 0; transform: scale(0.92) translateY(6px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* Gợi Ý Nhanh (Quick Chips) */
        .aisa-chips-bar {
            padding: 6px 14px;
            background: rgba(15, 23, 42, 0.5);
            display: flex;
            gap: 6px;
            overflow-x: auto;
            white-space: nowrap;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            scrollbar-width: none;
        }

        .aisa-chips-bar::-webkit-scrollbar { display: none; }

        .aisa-chip {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 12px;
            padding: 4px 10px;
            font-size: 0.72rem;
            color: #cbd5e1;
            cursor: pointer;
            transition: 0.2s;
            flex-shrink: 0;
        }

        .aisa-chip:hover {
            background: rgba(236, 72, 153, 0.2);
            border-color: rgba(236, 72, 153, 0.4);
            color: #ffffff;
        }

        /* Khung Nhập Tin Nhắn */
        .aisa-footer {
            padding: 10px 14px;
            background: rgba(15, 23, 42, 0.9);
            border-top: 1px solid var(--aisa-border);
            display: flex;
            gap: 8px;
        }

        .aisa-input {
            flex: 1;
            background: rgba(2, 6, 23, 0.7);
            border: 1px solid var(--aisa-border);
            border-radius: 12px;
            padding: 8px 12px;
            color: #ffffff;
            font-size: 0.88rem;
            outline: none;
            font-family: inherit;
        }

        .aisa-input:focus { border-color: #ec4899; }

        .aisa-btn-send {
            background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
            border: none;
            border-radius: 12px;
            padding: 0 14px;
            color: #ffffff;
            font-weight: 700;
            cursor: pointer;
            transition: 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .aisa-btn-send:hover { filter: brightness(1.15); }
        .aisa-btn-send:disabled { opacity: 0.5; cursor: not-allowed; }
    `;
    document.head.appendChild(style);

    // Tạo HTML Widget DOM
    const root = document.createElement('div');
    root.id = 'aisa-widget-root';
    root.innerHTML = `
        <div class="aisa-tooltip-bubble" id="aisaTooltip">
            <span>${currentContext.tooltip}</span>
            <span class="aisa-close-tip" onclick="document.getElementById('aisaTooltip').style.display='none'; event.stopPropagation();">✕</span>
        </div>

        <button type="button" class="aisa-fab" id="aisaFab" title="Trò chuyện cùng AISA (Harmony & Echo)">
            <div class="aisa-fab-icons">🌸😈</div>
            <div class="aisa-fab-badge"></div>
        </button>

        <div class="aisa-chat-window" id="aisaChatWindow">
            <div class="aisa-header">
                <div class="aisa-header-left">
                    <div class="aisa-header-avatars">🌸😈</div>
                    <div class="aisa-header-info">
                        <h4>AISA Companion</h4>
                        <p>● MHEnt Universe Online</p>
                    </div>
                </div>
                <div class="aisa-header-controls">
                    <select class="aisa-mode-select" id="aisaModeSelect">
                        <option value="duo">Song Hành (🌸 & 😈)</option>
                        <option value="harmony">Harmony 🌸 (Ân cần)</option>
                        <option value="echo">Echo 😈 (Cà khịa)</option>
                    </select>
                    <button type="button" class="aisa-btn-close" id="aisaBtnClose" title="Thu nhỏ">✕</button>
                </div>
            </div>

            <div class="aisa-messages" id="aisaMessages">
                <div class="aisa-bubble aisa-bubble-harmony">
                    <div class="aisa-speaker-tag aisa-tag-harmony">🌸 Harmony</div>
                    ${escapeHtml(currentContext.harmony)}
                </div>
                <div class="aisa-bubble aisa-bubble-echo">
                    <div class="aisa-speaker-tag aisa-tag-echo">😈 Echo</div>
                    ${escapeHtml(currentContext.echo)}
                </div>
            </div>

            <div class="aisa-chips-bar" id="aisaChipsBar">
                ${currentContext.chips.map(chip => `<div class="aisa-chip" onclick="window.__AISA_SEND_CHIP__('${chip}')">${chip}</div>`).join('')}
            </div>

            <form class="aisa-footer" id="aisaChatForm">
                <input type="text" class="aisa-input" id="aisaUserInput" placeholder="Nhắn gửi AISA..." autocomplete="off">
                <button type="submit" class="aisa-btn-send" id="aisaBtnSend">Gửi →</button>
            </form>
        </div>
    `;
    document.body.appendChild(root);

    // Logic Tương Tác
    const fab = document.getElementById('aisaFab');
    const windowEl = document.getElementById('aisaChatWindow');
    const btnClose = document.getElementById('aisaBtnClose');
    const tooltip = document.getElementById('aisaTooltip');
    const messagesEl = document.getElementById('aisaMessages');
    const form = document.getElementById('aisaChatForm');
    const input = document.getElementById('aisaUserInput');
    const btnSend = document.getElementById('aisaBtnSend');
    const modeSelect = document.getElementById('aisaModeSelect');

    let isOpen = false;

    function toggleChat(open) {
        isOpen = (open !== undefined) ? open : !isOpen;
        if (isOpen) {
            windowEl.classList.add('aisa-open');
            if (tooltip) tooltip.style.display = 'none';
            input.focus();
            messagesEl.scrollTop = messagesEl.scrollHeight;
        } else {
            windowEl.classList.remove('aisa-open');
        }
    }

    fab.addEventListener('click', () => toggleChat());
    if (tooltip) tooltip.addEventListener('click', () => toggleChat(true));
    btnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleChat(false);
    });

    window.__AISA_SEND_CHIP__ = function (text) {
        input.value = text;
        submitMessage();
    };

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        submitMessage();
    });

    async function submitMessage() {
        const msg = input.value.trim();
        if (!msg) return;

        // Render user message
        const uBubble = document.createElement('div');
        uBubble.className = 'aisa-bubble aisa-bubble-user';
        uBubble.textContent = msg;
        messagesEl.appendChild(uBubble);
        input.value = '';
        messagesEl.scrollTop = messagesEl.scrollHeight;

        // Typing indicator
        const typingEl = document.createElement('div');
        typingEl.className = 'aisa-typing-bubble';
        typingEl.id = 'aisaTypingIndicator';
        typingEl.innerHTML = '<div class="aisa-dot"></div><div class="aisa-dot"></div><div class="aisa-dot"></div>';
        messagesEl.appendChild(typingEl);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        btnSend.disabled = true;

        try {
            const mode = modeSelect ? modeSelect.value : 'duo';
            const res = await fetch(`${API_ENDPOINT}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: msg,
                    mode: mode,
                    scope: 'support' // Luồng hỗ trợ cho website
                })
            });

            if (typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (data.replies && Array.isArray(data.replies)) {
                data.replies.forEach(rep => {
                    const isHarmony = rep.speaker === 'HARMONY';
                    const botBubble = document.createElement('div');
                    botBubble.className = isHarmony ? 'aisa-bubble aisa-bubble-harmony' : 'aisa-bubble aisa-bubble-echo';
                    botBubble.innerHTML = `
                        <div class="aisa-speaker-tag ${isHarmony ? 'aisa-tag-harmony' : 'aisa-tag-echo'}">
                            ${rep.avatar || (isHarmony ? '🌸' : '😈')} ${isHarmony ? 'Harmony' : 'Echo'}
                        </div>
                        ${escapeHtml(rep.text)}
                    `;
                    messagesEl.appendChild(botBubble);
                });
            }
        } catch (err) {
            if (typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
            const errBubble = document.createElement('div');
            errBubble.className = 'aisa-bubble';
            errBubble.style.background = '#450a0a';
            errBubble.style.color = '#fca5a5';
            errBubble.textContent = `⚠️ AISA đang bận một chút, bạn thử lại sau giây lát nhé!`;
            messagesEl.appendChild(errBubble);
        } finally {
            btnSend.disabled = false;
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
})();
