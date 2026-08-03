const mineflayer = require('mineflayer');
const express = require('express');
const app = express();

// --- CẤU HÌNH BOT (THAY ĐỔI TẠI ĐÂY) ---
const CONFIG = {
    host: '168.119.78.155', // Địa chỉ IP server (không để chung với port)
    port: 25847,            // Cổng kết nối (phải là dạng số, không để trong dấu nháy)
    username: 'TreoBot_Pro', // Tên nhân vật của bot trong game
    version: '1.20.1',      // Nhập CHÍNH XÁC phiên bản server đang chạy để tránh bị kick
    auth: 'offline'         // Giữ nguyên nếu là server crack/offline
};

let bot;

function createMinecraftBot() {
    console.log(`[Hệ thống] Đang khởi tạo kết nối đến ${CONFIG.host}:${CONFIG.port}...`);
    
    bot = mineflayer.createBot({
        host: CONFIG.host,
        port: CONFIG.port,
        username: CONFIG.username,
        version: CONFIG.version,
        auth: CONFIG.auth,
        hideErrors: false
    });

    // Xử lý khi vào server thành công
    bot.on('spawn', () => {
        console.log(`[Thành công] Bot "${bot.username}" đã vào server và đang treo!`);
        
        // Chat lệnh đăng ký/đăng nhập nếu server yêu cầu (bỏ dấu // ở đầu để dùng)
        // bot.chat('/register matkhau123 matkhau123');
        // bot.chat('/login matkhau123');
        
        // Giả lập hành động nhảy nhỏ mỗi 20 giây để đánh lừa hệ thống Anti-AFK
        setInterval(() => {
            if (bot && bot.entity) {
                bot.setControlState('jump', true);
                setTimeout(() => {
                    if(bot && bot.entity) bot.setControlState('jump', false);
                }, 500);
            }
        }, 20000);
    });

    // Nhận diện lý do bị server đá (Kicked)
    bot.on('kicked', (reason) => {
        console.warn(`[Cảnh báo] Bot bị server đá với lý do: ${reason}`);
    });

    // Tự động kết nối lại sau 15 giây nếu mất kết nối hoặc sập
    bot.on('end', () => {
        console.log('[Ngắt kết nối] Đã mất liên lạc với server. Đang chờ 15 giây để thử lại...');
        setTimeout(() => {
            createMinecraftBot();
        }, 15000);
    });

    // Bắt lỗi hệ thống để bot không làm sập server Render của bạn
    bot.on('error', (err) => {
        console.error(`[Lỗi kết nối]: ${err.message}`);
    });
}

// Giữ cho Render luôn chạy (Web Service yêu cầu mở port)
const PORT = process.env.PORT || 8080;
app.get('/', (req, res) => {
    res.send('Bot Minecraft đang hoạt động ổn định!');
});
app.listen(PORT, () => {
    console.log(`[Web] Cổng giám sát hoạt động tại port: ${PORT}`);
    // Khởi chạy bot Minecraft
    createMinecraftBot();
});
