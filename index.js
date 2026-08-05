const mineflayer = require('mineflayer');
const express = require('express');
const app = express();

// --- CẤU HÌNH BOT (THAY ĐỔI TẠI ĐÂY) ---
const CONFIG = {
    host: '168.119.78.155', // Địa chỉ IP server
    port: 25847,            // Cổng kết nối
    username: 'TreoBot_Pro', // Tên nhân vật của bot
    version: '1.21.1',      // Phiên bản server
    auth: 'offline'         // Giữ nguyên nếu là server crack/offline
};

let bot;
let reconnectInterval = 30000; // Tăng thời gian chờ lên 30 giây để tránh bị server chặn do spam kết nối

function createMinecraftBot() {
    console.log(`[Hệ thống] Đang khởi tạo kết nối đến ${CONFIG.host}:${CONFIG.port}...`);
    
    bot = mineflayer.createBot({
        host: CONFIG.host,
        port: CONFIG.port,
        username: CONFIG.username,
        version: CONFIG.version,
        auth: CONFIG.auth,
        hideErrors: true // Ẩn bớt các lỗi mạng rác để log sạch hơn
    });

    // Xử lý khi vào server thành công
    bot.on('spawn', () => {
        console.log(`[Thành công] Bot "${bot.username}" đã vào server và bắt đầu treo an toàn!`);
        
        // Đăng nhập/Đăng ký nếu server yêu cầu (bỏ comment nếu cần)
        // bot.chat('/register matkhau123 matkhau123');
        // bot.chat('/login matkhau123');

        // --- HỆ THỐNG ANTI-AFK THÔNG MINH ---
        // Thay đổi hành động ngẫu nhiên mỗi 25-45 giây để đánh lừa anti-cheat và tránh bị đá vì đứng im quá lâu
        setInterval(() => {
            if (bot && bot.entity) {
                // Hành động 1: Nhảy nhẹ
                bot.setControlState('jump', true);
                setTimeout(() => { bot.setControlState('jump', false); }, 400);

                // Hành động 2: Xoay góc nhìn ngẫu nhiên một chút trông giống người thật
                const randomYaw = bot.entity.yaw + (Math.random() - 0.5) * 1.5;
                const randomPitch = (Math.random() - 0.5) * 0.5;
                bot.look(randomYaw, randomPitch, true);
            }
        }, 30000);
    });

    // Tự động hồi sinh ngay khi chết
    bot.on('death', () => {
        console.log('[Hệ thống] Bot đã bị hạ gục! Đang hồi sinh sau 3 giây...');
        setTimeout(() => {
            if (bot) {
                bot.respawn();
            }
        }, 3000);
    });

    // Ghi nhận lý do bị đá khỏi server
    bot.on('kicked', (reason) => {
        console.warn(`[Cảnh báo] Bot bị server đá. Lý do: ${JSON.stringify(reason)}`);
    });

    // Khi mất kết nối, chờ thời gian lâu hơn trước khi thử lại để tránh bị chặn IP
    bot.on('end', (reason) => {
        console.log(`[Ngắt kết nối] Mất kết nối (${reason}). Sẽ thử kết nối lại sau ${reconnectInterval / 1000} giây...`);
        setTimeout(() => {
            createMinecraftBot();
        }, reconnectInterval);
    });

    // Bắt lỗi ngoại lệ tránh làm sập ứng dụng web
    bot.on('error', (err) => {
        console.error(`[Lỗi bot]: ${err.message}`);
    });
}

// Khởi tạo Web Server giữ Render luôn thức (Ping keep-alive)
const PORT = process.env.PORT || 8080;
app.get('/', (req, res) => {
    res.send('Bot Minecraft Proxy Keeper is running!');
});

app.listen(PORT, () => {
    console.log(`[Web] Cổng giám sát hoạt động tại port: ${PORT}`);
    // Khởi chạy bot Minecraft lần đầu tiên
    createMinecraftBot();
});
