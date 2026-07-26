const mineflayer = require('mineflayer');

const botOptions = {
  host: 'Zenith-fSk4.aternos.me', // Thay bằng IP server của bạn (VD: myServer.aternos.me)
  port: 37067,                // Thay bằng Port server của bạn (Aternos thường là 25565 hoặc dãy số 5 chữ số)
  username: 'BotTreoServer',  // Tên hiển thị của bot trong game
  version: '1.21.1'           // Thay bằng phiên bản Minecraft của server bạn
};

function createBot() {
  const bot = mineflayer.createBot(botOptions);

  bot.on('spawn', () => {
    console.log('Bot đã vào server thành công và đang treo AFK!');
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    if (message === 'ping') {
      bot.chat('pong'); // Tính năng phụ: Gõ ping bot trả lời pong để biết nó còn sống
    }
  });

  // Tự động kết nối lại nếu bị mất kết nối hoặc server sập rồi mở lại
  bot.on('end', () => {
    console.log('Bot bị mất kết nối. Đang thử kết nối lại sau 15 giây...');
    setTimeout(createBot, 15000);
  });

  bot.on('error', (err) => {
    console.log('Lỗi Bot:', err);
  });
}

createBot();

