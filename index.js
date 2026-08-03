const mineflayer = require('mineflayer');
const http = require('http');

const botOptions = {
  host: 'netheriteh.falixsrv.me', 
  port: 168.119.78.155:25847,                
  username: 'BotTreoServerb',  
  version: '1.21.1'           
};

function createBot() {
  const bot = mineflayer.createBot(botOptions);

  bot.on('spawn', () => {
    console.log('Bot đã vào server thành công và đang treo AFK!');
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    if (message === 'ping') {
      bot.chat('pong'); 
    }
  });

  bot.on('end', () => {
    console.log('Bot bị mất kết nối. Đang thử kết nối lại sau 15 giây...');
    setTimeout(createBot, 15000);
  });

  bot.on('error', (err) => {
    console.log('Lỗi Bot:', err);
  });
}

createBot(); // jssjsjsjhh

// --- ĐOẠN CODE THÊM VÀO ĐỂ FIX LỖI 503 CHO UPTIMEROBOT ---
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.write("Bot Minecraft đang chạy online!");
  res.end();
}).listen(8080, () => {
  console.log('Cổng web ảo 8080 đã mở để UptimeRobot ping!');
});
