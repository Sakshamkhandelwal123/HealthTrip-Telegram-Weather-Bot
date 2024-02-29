const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, unique: true },
  name: String,
  city: String,
  country: String,
});

const User = mongoose.model('User', userSchema);

module.exports = User;
