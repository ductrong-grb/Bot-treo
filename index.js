const mineflayer = require('mineflayer');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { pingTimeout: 60000 });

// Cấu hình Server mặc định
let SERVER_CONFIG = {
    host: '167.235.93.185',
    port: 25847,
    version: '1.21.1',
    auth: 'offline'
};

// Trạng thái của 2 Bot (Không lưu instance trực tiếp vào đây để tránh lỗi Socket)
let botsData = [
    { id: 1, username: 'BotTreaos01', status: 'Đang tắt', logs: [] },
    { id: 2, username: 'BotTreo0sz2', status: 'Đang tắt', logs: [] }
];

// Lưu trữ instance của bot riêng biệt
const botInstances = { 1: null, 2: null };

// Hàm gửi dữ liệu trạng thái an toàn qua Web
function sendSafeStatus() {
    io.emit('update_status', botsData);
}

// Hàm ghi log gọn nhẹ
function addLog(botId, message) {
    const time = new Date().toLocaleTimeString();
    const logText = `[${time}] [Bot ${botId}] ${message}`;
    console.log(logText);
    
    const targetBot = botsData.find(b => b.id === botId);
    if (targetBot) {
        targetBot.logs.push(logText);
        if (targetBot.logs.length > 20) targetBot.logs.shift(); // Giữ tối đa 20 dòng log
    }
    io.emit('update_logs', { botId, logs: targetBot ? targetBot.logs : [] });
}

// Hàm khởi chạy bot
function startBot(botConfig) {
    const targetBot = botsData.find(b => b.id === botConfig.id);
    if (!targetBot) return;

    // Dọn dẹp bot cũ
    if (botInstances[botConfig.id]) {
        try { 
            botInstances[botConfig.id].removeAllListeners();
            botInstances[botConfig.id].quit(); 
        } catch (e) {}
        botInstances[botConfig.id] = null;
    }

    targetBot.status = 'Đang kết nối...';
    sendSafeStatus();
    addLog(botConfig.id, `Đang kết nối tới ${SERVER_CONFIG.host}:${SERVER_CONFIG.port} với tên: ${targetBot.username}...`);

    const bot = mineflayer.createBot({
        host: SERVER_CONFIG.host,
        port: Number(SERVER_CONFIG.port),
        username: targetBot.username,
        version: SERVER_CONFIG.version,
        auth: SERVER_CONFIG.auth,
        hideErrors: true,
        checkTimeoutInterval: 60000
    });

    botInstances[botConfig.id] = bot;

    bot.once('spawn', () => {
        targetBot.status = 'Đang trong game (Online)';
        sendSafeStatus();
        addLog(botConfig.id, `Đã vào server thành công với tên "${bot.username}"!`);

        // Anti-AFK
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
        targetBot.status = 'Mất kết nối';
        sendSafeStatus();
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

// Xử lý WebSocket
io.on('connection', (socket) => {
    socket.emit('update_status', botsData);
    socket.emit('update_server_config', SERVER_CONFIG);
    botsData.forEach(b => {
        socket.emit('update_logs', { botId: b.id, logs: b.logs });
    });

    socket.on('update_server', (newConfig) => {
        SERVER_CONFIG.host = newConfig.host;
        SERVER_CONFIG.port = Number(newConfig.port);
        console.log(`[Hệ thống] Đã đổi IP Server thành: ${SERVER_CONFIG.host}:${SERVER_CONFIG.port}`);
        
        startBot(botsData[0]);
        setTimeout(() => { startBot(botsData[1]); }, 6000);
    });

    socket.on('change_bot_name', (data) => {
        const target = botsData.find(b => b.id === data.id);
        if (target) {
            target.username = data.username;
            addLog(target.id, `Đổi tên thành: ${target.username}. Đang kết nối lại...`);
            startBot(target);
        }
    });
});

// Cho Bot 1 vào trước, 6 giây sau Bot 2 mới vào
startBot(botsData[0]);
setTimeout(() => {
    startBot(botsData[1]);
}, 6000);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`[Web Dashboard] Đang chạy tại cổng: ${PORT}`);
});
