require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const countryFlagEmoji = require("country-flag-emoji");
const pino = require("pino")();

const token = process.env.BOT_TOKEN;
const api_key = process.env.API_KEY;

// Initialize bot with long polling
const bot = new TelegramBot(token, {polling: {
    interval: 5000, // Interval between requests in milliseconds (e.g., 3 seconds)
    autoStart: true, // Automatically start polling
    params: {
      timeout: 10 // Polling timeout in seconds
    } }});

// List of supported countries
const countries = ["ua", "us", "de", "es"];

// --- Helper: Fetch holiday info ---
async function fetchData(country) {
  const dd = new Date();
  try {
    const response = await fetch(
      `https://holidays.abstractapi.com/v1/?api_key=${api_key}&country=${country}&year=${dd.getFullYear()}&month=${
        dd.getMonth() + 1
      }&day=${dd.getDate()}`
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    pino.error("Fetch error:", err);
    return [];
  }
}

// --- Command: /start ---
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  const keyboard = {
    inline_keyboard: [
      countries.map((el) => ({
        text: countryFlagEmoji.get(el).emoji,
        callback_data: el,
      })),
    ],
  };

  await bot.sendMessage(chatId, "Choose a country:", { reply_markup: keyboard });
});

// --- Fallback for unknown text ---
bot.on("message", async (msg) => {
  const text = msg.text;
  const chatId = msg.chat.id;

  // Skip if it's the /start command (handled above)
  if (text.startsWith("/start")) return;

  await bot.sendMessage(
    chatId,
    "Hello! Type /start to start messaging or /help to show list of enabled commands"
  );
});

// --- Handle callback queries ---
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const country = query.data;

  const holidays = await fetchData(country);
  const holidayObj = holidays[0];
  const msg = holidayObj
    ? `🎉 Today in ${holidayObj.location} they celebrate *${holidayObj.name}*!`
    : `There are no holidays in ${country.toUpperCase()} today.`;

  await bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
  await bot.answerCallbackQuery(query.id); // acknowledge click
});

// --- Handle polling errors ---
bot.on("polling_error", (error) => {
  pino.error("Polling error:", error.message);
});

console.log("🤖 Telegram bot started with long polling...");