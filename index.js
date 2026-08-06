const mineflayer = require('mineflayer');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
// Tăng thời gian pingTimeout để giữ kết nối Socket ổn định
const io = new Server(server, { pingTimeout: 60000 });

// --- CẤU HÌNH MẶC ĐỊNH BAN ĐẦU ---
let SERVER_CONFIG = {
    host: '167.235.93.185',
    port: 25847,
    version: '1.21.1',
    auth: 'offline'
};

// Trạng thái của 2 Bot
let bots = [
    { id: 1, username: 'BotTreao01', instance: null, status: 'Đang tắt', logs: [] },
    { id: 2, username: 'BotTreos02', instance: null, status: 'Đang tắt', logs: [] }
];

// Hàm ghi log (Đã giới hạn lưu 25 dòng log/bot để tiết kiệm RAM)
function addLog(botId, message) {
    const time = new Date().toLocaleTimeString();
    const logText = `[${time}] [Bot ${botId}] ${message}`;
    console.log(logText);
    
    const targetBot = bots.find(b => b.id === botId);
    if (targetBot) {
        targetBot.logs.push(logText);
        if (targetBot.logs.length > 25) targetBot.logs.shift(); // Xóa log cũ tránh rò rỉ RAM
    }
    io.emit('update_logs', { botId, logs: targetBot ? targetBot.logs : [] });
}

// Hàm khởi chạy bot
function startBot(botConfig) {
    const targetBot = bots.find(b => b.id === botConfig.id);
    if (!targetBot) return;

    // Dọn dẹp bot cũ kỹ càng trước khi tạo mới
    if (targetBot.instance) {
        try { 
            targetBot.instance.removeAllListeners();
            targetBot.instance.quit(); 
        } catch (e) {}
        targetBot.instance = null;
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
        hideErrors: true,
        checkTimeoutInterval: 60000
    });

    targetBot.instance = bot;

    bot.once('spawn', () => {
        targetBot.status = 'Đang trong game (Online)';
        io.emit('update_status', bots);
        addLog(botConfig.id, `Đã vào server thành công với tên "${bot.username}"!`);

        // Anti-AFK & di chuyển ngẫu nhiên
        const afkInterval = setInterval(() => {
            if (bot && bot.entity) {
                const randomYaw = bot.entity.yaw + (Math.random() - 0.5) * 2;
                bot.look(randomYaw, 0, true);

                const actions = ['forward', 'back', 'left', 'right'];
                const randomAction = actions[Math.floor(Math.random() * actions.length)];
                bot.setControlState(randomAction, true);
                setTimeout(() => { if (bot) bot.setControlState(randomAction, false); }, 1200);

                bot.setControlState('jump', true);
                setTimeout(() => { if (bot) bot.setControlState('jump', false); }, 400);
            }
        }, 25000);

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
        addLog(botConfig.id, `Mất kết nối (${reason}). Thử lại sau 35 giây...`);
        
        setTimeout(() => { startBot(botConfig); }, 35000);
    });

    bot.on('error', (err) => {
        addLog(botConfig.id, `Lỗi: ${err.message}`);
    });
}

// Phục vụ file HTML từ thư mục public
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Xử lý sự kiện WebSocket
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
        
        // Đổi IP và kết nối giãn cách 6 giây tránh spam
        startBot(bots[0]);
        setTimeout(() => { startBot(bots[1]); }, 6000);
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

// Cho Bot 1 vào trước, 6 giây sau Bot 2 mới vào (chống bị Server chặn do vào cùng lúc)
startBot(bots[0]);
setTimeout(() => {
    startBot(bots[1]);
}, 6000);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`[Web Dashboard] Đang chạy tại cổng: ${PORT}`);
});
