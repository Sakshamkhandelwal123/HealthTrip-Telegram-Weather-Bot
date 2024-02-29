const mongoose = require("mongoose");
const axios = require("axios");
const User = require("./models/User");

const TelegramBot = require("node-telegram-bot-api");

const token = "7101451369:AAG9F0pVZlDU7BOrpEsG8211zhlBn__i2NU";
const bot = new TelegramBot(token, { polling: true });

// MongoDB setup
mongoose.connect(
  "mongodb+srv://saksham:saksham@cluster0.zpiajua.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
  { useNewUrlParser: true, useUnifiedTopology: true }
);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  console.log("Connected to MongoDB");
});

const AdminSettings = mongoose.model("AdminSettings", {
  apiKey: String,
  messageFrequency: String,
});

// Start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  // Check if the user is already in the database
  const existingUser = await User.findOne({ telegramId: chatId });

  if (!existingUser) {
    bot.sendMessage(chatId, "Hi there! What is your name?");

    bot.once("message", async (msg) => {
      const name = msg.text;
      bot.sendMessage(
        chatId,
        "Nice to meet you, " + name + "! What city are you from?"
      );

      bot.once("message", async (msg) => {
        const city = msg.text;
        bot.sendMessage(chatId, "Got it! What country do you live in?");

        bot.once("message", async (msg) => {
          const country = msg.text;
          // Save user data to MongoDB
          const newUser = new User({ telegramId: chatId, name, city, country });
          await newUser.save();

          bot.sendMessage(chatId, "Thank you! You are now registered.");

          // Start sending daily weather updates
          startWeatherUpdates(chatId, city, country);
        });
      });
    });
  } else {
    bot.sendMessage(chatId, "Welcome back!");
    startWeatherUpdates(chatId, existingUser.city, existingUser.country);
  }
});

async function startWeatherUpdates(chatId, city, country) {
  try {
    const apiUrl = `https://api.weatherapi.com/v1/current.json?key=4db60e619ca54c53807102620220104&q=${city}`;
    const response = await axios.get(apiUrl);
    const data = response.data;

    const temperature = data.current.temp_c;
    const description = data.current.condition.text;

    const message = `Good morning! Here's the weather update for ${city}, ${country}:\nTemperature: ${temperature}°C\nDescription: ${description}`;

    bot.sendMessage(chatId, message);
  } catch (error) {
    console.error("Error fetching weather data:", error.message);
  }
}

// Admin panel commands
bot.onText(/\/setapikey (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const apiKey = match[1];

  await AdminSettings.findOneAndUpdate({}, { apiKey }, { upsert: true });
  bot.sendMessage(chatId, "API key set successfully.");
});

async function getApiKey() {
  const adminSettings = await AdminSettings.findOne();
  return adminSettings ? adminSettings.apiKey : null;
}

bot.onText(/\/setfrequency (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const frequency = match[1];

  await AdminSettings.findOneAndUpdate(
    {},
    { messageFrequency: frequency },
    { upsert: true }
  );
  bot.sendMessage(chatId, "Message frequency set successfully.");
});

bot.onText(/\/blockuser (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = match[1];

  await User.deleteOne({ telegramId: userId });
  bot.sendMessage(chatId, "User blocked successfully.");
});

console.log("Bot is running...");
