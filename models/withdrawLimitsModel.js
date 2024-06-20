const mongoose = require('mongoose');

const withdrawLimitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  withdrawCount: { type: Number, default: 0 }, // Number of withdrawals made in a day
  remainingDepositAmount: { type: Number, default: 0 }, // Amount user needs to play with
  lastWithdrawalDate: { type: Date }, // Date of the last withdrawal
  withdrawalTime: {
    start: { type: String, default: '10:00 AM' }, // Start time of withdrawal window
    end: { type: String, default: '07:00 PM' },   // End time of withdrawal window
  },
  withdrawalLimit: {
    lowerLimit: { type: Number, default: 110 }, // Lower limit of withdrawal amount
    upperLimit: { type: Number, default: 100000 }, // Upper limit of withdrawal amount
  },
});

const WithdrawLimit = mongoose.model('WithdrawLimit', withdrawLimitSchema);

module.exports = WithdrawLimit;
