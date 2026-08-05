const mineflayer = require('mineflayer');
const express = require('express');
const app = express();

// --- CẤU HÌNH BOT MỚI ---
const CONFIG = {
    host: '168.119.78.155', 
    port: 25847,            
    username: 'TreoBot_y', 
    version: '1.21.1',      
    auth: 'offline'         
};

let bot;
let reconnectInterval = null;

function createMinecraftBot() {
    if (bot) {
        try {
            bot.quit();
        } catch (e) {}
        bot = null;
    }

    console.log(`[Hệ thống] Đang tạo kết nối mới sạch tới ${CONFIG.host}:${CONFIG.port}...`);
    
    bot = mineflayer.createBot({
        host: CONFIG.host,
        port: CONFIG.port,
        username: CONFIG.username,
        version: CONFIG.version,
        auth: CONFIG.auth,
        // Cấu hình bổ sung giúp giảm khả năng bị phát hiện là client giả lập
        checkTimeoutInterval: 60000,
        brand: 'vanilla'
    });

    // Xử lý khi vào server thành công và thực sự nhận entity
    bot.once('spawn', () => {
        console.log(`[Thành công] Bot "${bot.username}" đã thực sự bám trụ được vào server!`);
        
        // Tự động chuyển sang chế độ Sáng Tạo nếu có quyền OP
        setTimeout(() => {
            if (bot && bot.entity) {
                bot.chat('/gamemode creative TreoBot_Pro');
            }
        }, 4000);

        // Chống AFK nhẹ nhàng bằng cách quay góc nhìn thay vì chỉ nhảy liên tục
        const afkInterval = setInterval(() => {
            if (!bot || !bot.entity) {
                clearInterval(afkInterval);
                return;
            }
            // Xoay nhẹ góc nhìn để lừa bộ lọc chống đứng hình của server
            const yaw = bot.entity.yaw + 0.5;
            bot.look(yaw, bot.entity.pitch, true);
        }, 15000);
    });

    // Xử lý khi bị quái đánh chết
    bot.on('death', () => {
        console.log('[Hệ thống] Bot đã chết, đang hồi sinh...');
        setTimeout(() => {
            if (bot) bot.respawn();
        }, 2000);
    });

    // Xử lý khi bị server đá
    bot.on('kicked', (reason) => {
        console.warn(`[Cảnh báo] Bị server đá, lý do: ${reason}`);
    });

    // Xử lý khi mất kết nối
    bot.on('end', (reason) => {
        console.log(`[Ngắt kết nối] Lý do: ${reason}. Đang kết nối lại sau 5 giây...`);
        if (!reconnectInterval) {
            reconnectInterval = setTimeout(() => {
                reconnectInterval = null;
                createMinecraftBot();
            }, 5000);
        }
    });

    bot.on('error', (err) => {
        console.error(`[Lỗi socket]: ${err.message}`);
    });
}

// Giữ Web Service sống trên Render
const PORT = process.env.PORT || 8080;
app.get('/', (req, res) => {
    res.send('Bot Minecraft phiên bản mới đang chạy ổn định!');
});
app.listen(PORT, () => {
    console.log(`[Web] Đang lắng nghe tại cổng ${PORT}`);
    createMinecraftBot();
});
