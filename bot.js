const mineflayer = require('mineflayer');

const bot = mineflayer.createBot({
    host: '168.119.78.155', // IP server của bạn
    port: 25847,            // Port server
    username: 'TreoBot_GH', // Tên bot
    version: '1.21.1',      // Phiên bản server
    auth: 'offline'
});

bot.on('spawn', () => {
    console.log('Bot đã vào game thành công!');
    
    // Tự động chuyển chế độ sáng tạo
    setTimeout(() => {
        bot.chat('/gamemode creative TreoBot_GH');
    }, 3000);

    // Chống AFK bằng cách xoay góc nhìn mỗi 20 giây
    setInterval(() => {
        if (bot && bot.entity) {
            bot.look(bot.entity.yaw + 1, bot.entity.pitch, true);
        }
    }, 20000);
});

bot.on('death', () => {
    setTimeout(() => bot.respawn(), 2000);
});

bot.on('end', (reason) => {
    console.log(`Mất kết nối: ${reason}`);
    process.exit(1); // Thoát để GitHub Action biết đường khởi động lại nếu cần
});

bot.on('error', (err) => {
    console.log(`Lỗi: ${err.message}`);
});

