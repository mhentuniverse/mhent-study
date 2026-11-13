/**
 * MHENT STUDY - DISCORD RICH PRESENCE MANAGER
 * Tự động kết nối tới Discord Desktop Client qua Named Pipe (Windows) hoặc Unix Socket (macOS/Linux)
 * Hỗ trợ hiển thị Activity: Playing, Listening (Lyrics Hub), Watching (Cinema/Video)
 */

const net = require('net');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');

// Client ID chính thức của MHEnt. Study Universe từ Discord Developer Portal
const DEFAULT_CLIENT_ID = '1570699759319126037';

class DiscordRPCManager extends EventEmitter {
    constructor(options = {}) {
        super();
        this.clientId = options.clientId || DEFAULT_CLIENT_ID;
        this.socket = null;
        this.connected = false;
        this.ready = false;
        this.user = null;
        this.currentActivity = null;
        this.reconnectTimer = null;
        this.buffer = Buffer.alloc(0);
        this.isExplicitlyClosed = false;

        // Tự động load client ID đã lưu trong app data nếu có
        this.configPath = path.join(
            process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library', 'Preferences') : '/var/local'),
            'mhent-study-discord.json'
        );
        this.loadSavedConfig();
    }

    loadSavedConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const raw = fs.readFileSync(this.configPath, 'utf8');
                const conf = JSON.parse(raw);
                if (conf && conf.clientId) {
                    this.clientId = conf.clientId;
                }
            }
        } catch (e) {
            console.warn('[Discord RPC] Không thể đọc config lưu trữ:', e.message);
        }
    }

    saveConfig() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify({ clientId: this.clientId }, null, 2), 'utf8');
        } catch (e) {
            console.warn('[Discord RPC] Không thể lưu config:', e.message);
        }
    }

    /**
     * Tìm Named Pipe hoặc Unix Socket của Discord
     */
    getSocketPath(index = 0) {
        if (process.platform === 'win32') {
            return `\\\\?\\pipe\\discord-ipc-${index}`;
        }
        const { env: { XDG_RUNTIME_DIR, TMPDIR, TMP, TEMP } } = process;
        const prefix = XDG_RUNTIME_DIR || TMPDIR || TMP || TEMP || '/tmp';
        return path.join(prefix, `discord-ipc-${index}`);
    }

    /**
     * Bắt đầu kết nối tới Discord Desktop Client
     */
    connect(clientId = null) {
        if (clientId) {
            this.clientId = clientId;
            this.saveConfig();
        }

        if (this.socket) {
            try { this.socket.destroy(); } catch (e) {}
            this.socket = null;
        }

        this.connected = false;
        this.ready = false;
        this.buffer = Buffer.alloc(0);

        this.tryConnectPipe(0);
    }

    tryConnectPipe(pipeIndex = 0) {
        if (pipeIndex > 9) {
            // Không tìm thấy pipe nào mở (Discord chưa chạy) -> Đặt lịch thử lại sau 15s
            this.scheduleReconnect(15000);
            return;
        }

        const pipePath = this.getSocketPath(pipeIndex);
        const socket = net.createConnection(pipePath);

        const onConnect = () => {
            cleanup();
            this.socket = socket;
            this.connected = true;
            this.setupSocketListeners();
            this.sendHandshake();
        };

        const onError = (err) => {
            cleanup();
            // Thử tiếp pipe kế tiếp
            this.tryConnectPipe(pipeIndex + 1);
        };

        const cleanup = () => {
            socket.removeListener('connect', onConnect);
            socket.removeListener('error', onError);
        };

        socket.once('connect', onConnect);
        socket.once('error', onError);
    }

    sendHandshake() {
        if (!this.socket || !this.connected) return;
        const payload = JSON.stringify({ v: 1, client_id: this.clientId });
        const buf = Buffer.alloc(8 + Buffer.byteLength(payload));
        buf.writeInt32LE(0, 0); // Opcode 0: HANDSHAKE
        buf.writeInt32LE(Buffer.byteLength(payload), 4);
        buf.write(payload, 8);
        this.socket.write(buf);
    }

    setupSocketListeners() {
        if (!this.socket) return;

        this.socket.on('data', (chunk) => {
            this.buffer = Buffer.concat([this.buffer, chunk]);
            this.processBuffer();
        });

        this.socket.on('error', (err) => {
            console.warn('[Discord RPC] Lỗi socket:', err.message);
            this.handleDisconnect();
        });

        this.socket.on('close', () => {
            console.log('[Discord RPC] Socket đã đóng');
            this.handleDisconnect();
        });
    }

    processBuffer() {
        while (this.buffer.length >= 8) {
            const opcode = this.buffer.readInt32LE(0);
            const length = this.buffer.readInt32LE(4);

            if (this.buffer.length < 8 + length) {
                // Chưa đủ dữ liệu của frame, chờ chunk tiếp theo
                break;
            }

            const rawJson = this.buffer.slice(8, 8 + length).toString('utf8');
            this.buffer = this.buffer.slice(8 + length);

            try {
                const message = JSON.parse(rawJson);
                this.handleMessage(opcode, message);
            } catch (err) {
                console.warn('[Discord RPC] Lỗi parse frame:', err.message);
            }
        }
    }

    handleMessage(opcode, message) {
        if (opcode === 1) { // FRAME
            if (message.evt === 'READY') {
                this.ready = true;
                this.user = message.data.user;
                console.log(`[Discord RPC] Đã kết nối thành công tới Discord! Người dùng: ${this.user.global_name || this.user.username}`);
                this.emit('ready', this.user);

                // Nếu có activity đang chờ, gửi lại ngay. Nếu KHÔNG có activity nào, dọn sạch Discord ngay lập tức!
                if (this.currentActivity) {
                    this.setActivity(this.currentActivity);
                } else {
                    this.clearActivity();
                }
            } else if (message.evt === 'ERROR') {
                console.warn('[Discord RPC] Lỗi từ Discord:', message.data);
                this.emit('error', message.data);
            }
        } else if (opcode === 2) { // CLOSE
            console.warn('[Discord RPC] Nhận tín hiệu Close từ Discord:', message);
            this.handleDisconnect();
        } else if (opcode === 3) { // PING
            // Phản hồi PONG
            const buf = Buffer.alloc(8);
            buf.writeInt32LE(4, 0); // Opcode 4: PONG
            buf.writeInt32LE(0, 4);
            if (this.socket) this.socket.write(buf);
        }
    }

    handleDisconnect() {
        this.connected = false;
        this.ready = false;
        this.user = null;
        if (this.socket) {
            try { this.socket.destroy(); } catch (e) {}
            this.socket = null;
        }
        this.emit('disconnected');
        this.scheduleReconnect(15000);
    }

    scheduleReconnect(delayMs = 15000) {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        if (this.isExplicitlyClosed) return;

        this.reconnectTimer = setTimeout(() => {
            console.log('[Discord RPC] Đang thử kết nối lại tới Discord...');
            this.connect();
        }, delayMs);
    }

    /**
     * Gửi Rich Presence Activity lên Discord
     * @param {Object} activity 
     */
    setActivity(activity) {
        this.currentActivity = activity;
        if (!this.ready || !this.socket) {
            return false;
        }

        try {
            const formatted = this.formatActivity(activity);
            const payload = JSON.stringify({
                cmd: 'SET_ACTIVITY',
                args: {
                    pid: process.pid,
                    activity: formatted
                },
                nonce: Date.now().toString()
            });

            const buf = Buffer.alloc(8 + Buffer.byteLength(payload));
            buf.writeInt32LE(1, 0); // Opcode 1: FRAME
            buf.writeInt32LE(Buffer.byteLength(payload), 4);
            buf.write(payload, 8);
            this.socket.write(buf);
            return true;
        } catch (e) {
            console.warn('[Discord RPC] Lỗi khi gửi setActivity:', e.message);
            return false;
        }
    }

    formatActivity(raw) {
        if (!raw) return null;

        const activity = {
            details: raw.details || 'MHEnt. Study — Vũ Trụ Ngôn Ngữ',
            state: raw.state || 'Khám phá bài học đa phương tiện',
            type: typeof raw.type === 'number' ? raw.type : 0 // 0: Playing, 2: Listening, 3: Watching
        };

        // Timestamps (bắt đầu hoặc kết thúc)
        if (raw.startTimestamp || raw.endTimestamp) {
            activity.timestamps = {};
            if (raw.startTimestamp) {
                activity.timestamps.start = typeof raw.startTimestamp === 'number' && raw.startTimestamp > 1e11
                    ? Math.floor(raw.startTimestamp / 1000)
                    : raw.startTimestamp;
            }
            if (raw.endTimestamp) {
                activity.timestamps.end = typeof raw.endTimestamp === 'number' && raw.endTimestamp > 1e11
                    ? Math.floor(raw.endTimestamp / 1000)
                    : raw.endTimestamp;
            }
        }

        // Assets (Hình ảnh & Tooltip)
        if (raw.largeImage || raw.largeImageKey || raw.smallImage || raw.smallImageKey) {
            activity.assets = {};
            if (raw.largeImage || raw.largeImageKey) {
                activity.assets.large_image = raw.largeImage || raw.largeImageKey;
                activity.assets.large_text = raw.largeImageText || raw.largeText || 'MHEnt. Study Universe';
            }
            if (raw.smallImage || raw.smallImageKey) {
                activity.assets.small_image = raw.smallImage || raw.smallImageKey;
                activity.assets.small_text = raw.smallImageText || raw.smallText || 'MHEnt Universe';
            }
        }

        // Buttons (Tối đa 2 nút)
        if (Array.isArray(raw.buttons) && raw.buttons.length > 0) {
            activity.buttons = raw.buttons.slice(0, 2).map(btn => ({
                label: (btn.label || 'Mở MHEnt').substring(0, 32),
                url: btn.url || 'https://www.mhentuniverse.com'
            }));
        }

        return activity;
    }

    clearActivity() {
        this.currentActivity = null;
        if (!this.ready || !this.socket) return false;
        return this.setActivity(null);
    }

    setClientId(newClientId) {
        if (!newClientId || newClientId === this.clientId) return;
        console.log(`[Discord RPC] Cập nhật Client ID sang: ${newClientId}`);
        this.clientId = newClientId;
        this.saveConfig();
        this.connect();
    }

    getStatus() {
        return {
            connected: this.connected,
            ready: this.ready,
            clientId: this.clientId,
            user: this.user,
            currentActivity: this.currentActivity
        };
    }

    destroy() {
        this.isExplicitlyClosed = true;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.clearActivity();
        if (this.socket) {
            try { this.socket.destroy(); } catch (e) {}
            this.socket = null;
        }
    }
}

module.exports = DiscordRPCManager;

