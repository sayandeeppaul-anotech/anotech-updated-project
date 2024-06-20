const mongoose = require('mongoose')

const withdrawLimitSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    withdrawCount: { type: Number, default: 0 }, // Number of withdrawals made in a day
    remainingDepositAmount: { type: Number, default: 0 }, // Amount user needs to play with
    withdrawalTime: {
      start: { type: String, default: '10:00' }, // Start time of withdrawal window
      end: { type: String, default: '19:00' },   // End time of withdrawal window
    },
    withdrawalLimit: { type: String, default: '110-100000' }, // Withdrawal amount range
  });
  
  const WithdrawLimit = mongoose.model('WithdrawLimit', withdrawLimitSchema);
  
  module.exports = WithdrawLimit;