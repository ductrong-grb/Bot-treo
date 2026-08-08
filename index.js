const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mineflayer = require('mineflayer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Phục vụ file tĩnh trong thư mục public
app.use(express.static(path.join(__dirname, 'public')));

// Cấu hình khởi tạo Bot
let botConfig = {
  host: process.env.MC_HOST || '50.117.3.3',
  port: parseInt(process.env.MC_PORT) || 26168,
  username: process.env.MC_USERNAME || 'BotTreo_Pro',
  version: false
};

let bot = null;
let reconnectTimer = null;
let afkInterval = null;
const maxLogs = 50;
const logs = [];

// Hàm lưu log và gửi realtime tới web
function addLog(msg) {
  const timestamp = new Date().toLocaleTimeString();
  const formattedLog = `[${timestamp}] ${msg}`;
  logs.push(formattedLog);
  if (logs.length > maxLogs) logs.shift();
  io.emit('update_logs', logs);
}

// Khởi tạo Bot Mineflayer
function createBot() {
  if (bot) {
    try { bot.end(); } catch (e) {}
  }

  addLog(`Đang kết nối tới ${botConfig.host}:${botConfig.port} với tên "${botConfig.username}"...`);
  io.emit('update_status', { status: 'Connecting', config: botConfig });

  bot = mineflayer.createBot(botConfig);
  bindBotEvents();
}

function bindBotEvents() {
  // Khi kết nối thành công vào thế giới
  bot.once('spawn', () => {
    addLog(`Bot "${bot.username}" đã vào game thành công!`);
    io.emit('update_status', { status: 'Online', config: botConfig });

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    startAntiAFK();
    updateHealthStats();
  });

  // Cập nhật chỉ số Sinh tồn (Máu & Thức ăn)
  bot.on('health', () => {
    updateHealthStats();
  });

  // Lắng nghe tin nhắn chat
  bot.on('messagestr', (message) => {
    if (message.trim()) {
      addLog(`[Chat] ${message}`);
    }
  });

  // Xử lý khi ngắt kết nối
  bot.once('end', (reason) => {
    addLog(`Bot đã ngắt kết nối: ${reason}`);
    io.emit('update_status', { status: 'Offline', config: botConfig });
    stopAntiAFK();
    scheduleReconnect();
  });

  // Xử lý lỗi
  bot.on('error', (err) => {
    addLog(`[Lỗi Bot] ${err.message}`);
  });
}

function updateHealthStats() {
  if (!bot) return;
  io.emit('update_stats', {
    health: Math.round(bot.health || 0),
    food: Math.round(bot.food || 0)
  });
}

// Cơ chế chống AFK tự động
function startAntiAFK() {
  stopAntiAFK();
  afkInterval = setInterval(() => {
    if (bot && bot.entity) {
      const randomYaw = (Math.random() - 0.5) * Math.PI;
      const randomPitch = (Math.random() - 0.5) * (Math.PI / 2);
      bot.look(randomYaw, randomPitch, true);

      if (Math.random() > 0.6) {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 400);
      }
    }
  }, 12000);
}

function stopAntiAFK() {
  if (afkInterval) clearInterval(afkInterval);
}

function scheduleReconnect() {
  if (!reconnectTimer) {
    addLog('Tự động kết nối lại sau 10 giây...');
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      createBot();
    }, 10000);
  }
}

// Xử lý kết nối Socket.IO từ Giao diện Web
io.on('connection', (socket) => {
  // Gửi trạng thái ban đầu cho giao diện
  socket.emit('update_status', {
    status: bot && bot.entity ? 'Online' : 'Offline',
    config: botConfig
  });
  socket.emit('update_logs', logs);
  if (bot) updateHealthStats();

  // Đổi Server
  socket.on('update_server', (data) => {
    botConfig.host = data.host;
    botConfig.port = parseInt(data.port) || 25565;
    addLog(`Đã nhận lệnh đổi server sang ${botConfig.host}:${botConfig.port}`);
    createBot();
  });

  // Đổi Tên Bot
  socket.on('change_bot_name', (data) => {
    if (data.username && data.username.trim()) {
      botConfig.username = data.username.trim();
      addLog(`Đã nhận lệnh đổi tên bot thành "${botConfig.username}"`);
      createBot();
    }
  });

  // Lệnh gửi chat vào game từ Web
  socket.on('send_chat', (msg) => {
    if (bot && bot.entity && msg.trim()) {
      bot.chat(msg);
      addLog(`[Web -> Game] ${msg}`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`[Web Dashboard] Chạy tại port ${PORT}`);
  createBot();
});
