const mineflayer = require('mineflayer');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- CẤU HÌNH MẶC ĐỊNH BAN ĐẦU ---
let SERVER_CONFIG = {
    host: '167.235.93.185',
    port: 25847,
    version: '1.21.1',
    auth: 'offline'
};

// Trạng thái của 2 Bot
let bots = [
    { id: 1, username: 'BotTreo01', instance: null, status: 'Đang tắt', logs: [] },
    { id: 2, username: 'BotTreo02', instance: null, status: 'Đang tắt', logs: [] }
];

// Hàm ghi log
function addLog(botId, message) {
    const time = new Date().toLocaleTimeString();
    const logText = `[${time}] [Bot ${botId}] ${message}`;
    console.log(logText);
    
    const targetBot = bots.find(b => b.id === botId);
    if (targetBot) {
        targetBot.logs.push(logText);
        if (targetBot.logs.length > 50) targetBot.logs.shift();
    }
    io.emit('update_logs', { botId, logs: targetBot ? targetBot.logs : [] });
}

// Hàm khởi chạy bot
function startBot(botConfig) {
    const targetBot = bots.find(b => b.id === botConfig.id);
    if (!targetBot) return;

    if (targetBot.instance) {
        try { targetBot.instance.quit(); } catch (e) {}
    }

    targetBot.status = 'Đang kết nối...';
    io.emit('update_status', bots);
    addLog(botConfig.id, `Đang kết nối tới ${SERVER_CONFIG.host}:${SERVER_CONFIG.port} với tên: ${botConfig.username}...`);

    const bot = mineflayer.createBot({
        host: SERVER_CONFIG.host,
        port: Number(SERVER_CONFIG.port),
        username: botConfig.username,
        version: SERVER_CONFIG.version,
        auth: SERVER_CONFIG.auth,
        hideErrors: true
    });

    targetBot.instance = bot;

    bot.on('spawn', () => {
        targetBot.status = 'Đang trong game (Online)';
        io.emit('update_status', bots);
        addLog(botConfig.id, `Đã vào server thành công với tên "${bot.username}"!`);

        // Anti-AFK & di chuyển ngẫu nhiên
        const afkInterval = setInterval(() => {
            if (bot && bot.entity) {
                const randomYaw = bot.entity.yaw + (Math.random() - 0.5) * 2;
                const randomPitch = (Math.random() - 0.5) * 0.5;
                bot.look(randomYaw, randomPitch, true);

                const actions = ['forward', 'back', 'left', 'right'];
                const randomAction = actions[Math.floor(Math.random() * actions.length)];
                bot.setControlState(randomAction, true);
                setTimeout(() => { bot.setControlState(randomAction, false); }, 1500);

                bot.setControlState('jump', true);
                setTimeout(() => { bot.setControlState('jump', false); }, 400);
            }
        }, 20000);

        bot.once('end', () => { clearInterval(afkInterval); });
    });

    bot.on('death', () => {
        addLog(botConfig.id, 'Bot đã chết, đang hồi sinh...');
        setTimeout(() => { if (bot) bot.respawn(); }, 3000);
    });

    bot.on('kicked', (reason) => {
        addLog(botConfig.id, `Bị đá khỏi server! Lý do: ${JSON.stringify(reason)}`);
    });

    bot.on('end', (reason) => {
        targetBot.status = 'Mất kết nối, đang thử lại...';
        io.emit('update_status', bots);
        addLog(botConfig.id, `Mất kết nối (${reason}). Thử lại sau 30 giây...`);
        
        setTimeout(() => { startBot(botConfig); }, 30000);
    });

    bot.on('error', (err) => {
        addLog(botConfig.id, `Lỗi: ${err.message}`);
    });
}

// Phục vụ file HTML từ thư mục công khai (public)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Xử lý sự kiện WebSocket quản lý từ web
io.on('connection', (socket) => {
    socket.emit('update_status', bots);
    socket.emit('update_server_config', SERVER_CONFIG);
    bots.forEach(b => {
        socket.emit('update_logs', { botId: b.id, logs: b.logs });
    });

    // Nhận cấu hình IP/Port mới từ Web
    socket.on('update_server', (newConfig) => {
        SERVER_CONFIG.host = newConfig.host;
        SERVER_CONFIG.port = Number(newConfig.port);
        console.log(`[Hệ thống] Đã đổi IP Server thành: ${SERVER_CONFIG.host}:${SERVER_CONFIG.port}`);
        
        // Khởi động lại cả 2 bot với IP mới ngay lập tức
        bots.forEach(b => startBot(b));
    });

    // Nhận yêu cầu đổi tên bot
    socket.on('change_bot_name', (data) => {
        const target = bots.find(b => b.id === data.id);
        if (target) {
            target.username = data.username;
            addLog(target.id, `Đổi tên thành: ${target.username}. Đang kết nối lại...`);
            startBot(target);
        }
    });
});

// Khởi chạy 2 bot ban đầu
bots.forEach(b => startBot(b));

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`[Web Dashboard] Đang chạy tại cổng: ${PORT}`);
});
