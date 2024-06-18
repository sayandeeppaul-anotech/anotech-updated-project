const Withdraw = require("../models/withdrawModel");
const User = require("../models/userModel");
const Bet = require("../models/betsModel");
const DepositHistory = require("../models/depositHistoryModel");

const requestWithdraw = async (req, res) => {
  let savedRequest;
  try {
    const userId = req.user._id;
    const userDetail = await User.find({ _id: userId });
    const balance = req.body.balance;

    let totalBetAmount = await Bet.aggregate([
      { $match: { userId: userId } },
      { $group: { _id: null, total: { $sum: "$betAmount" } } },
    ]);
    
    if (totalBetAmount.length === 0) {
      totalBetAmount = [{ total: 0 }];
    }
const totalDepositAmount = await DepositHistory.aggregate([
  { 
    $match: { 
      userId: userId,
      depositStatus: 'completed' 
    } 
  },
  { 
    $group: { 
      _id: null, 
      total: { $sum: "$depositAmount" } 
    } 
  },
]);


console.log('Total bet amount:', totalBetAmount[0].total);
console.log('Total deposit amount:', totalDepositAmount[0].total);
console.log('Total bet amount type:', typeof totalBetAmount[0].total);
console.log('Total deposit amount type:', typeof totalDepositAmount[0].total);
if (
  totalDepositAmount.length > 0 &&
  totalBetAmount.length > 0 &&
  totalDepositAmount[0].total > totalBetAmount[0].total
) {
  res.status(400).json({
    success: false,
    message: "You can't withdraw because your total deposit amount is greater than your total bet amount",
  });
} else if (userDetail[0].walletAmount < balance) {
      res.status(400).json({
        success: false,
        message: "You have insufficient balance to withdraw",
      });
    } else if (balance <= 300) {
      res.status(400).json({
        success: false,
        message: "Minimum withdraw amount is 300",
      });
    } else {
      const withdrawRequest = new Withdraw({
        balance: balance,
        withdrawMethod: req.body.withdrawMethod,
        status: "Pending",
        userId: userId,
      });

      savedRequest = await withdrawRequest.save();
      await User.findByIdAndUpdate(
        userId,
        { $push: { withdrawRecords: savedRequest._id } },
        { new: true }
      );

      await User.updateMany(
        { accountType: "Admin" },
        { $push: { withdrawRecords: savedRequest._id } }
      );

      res.status(201).json({
        message: "Withdrawal request sent to admin for review.",
        withdrawRequest: savedRequest,
      });
    }
  } catch (error) {
    // If creating the withdrawal request fails, also try to delete the created request
    if (savedRequest && savedRequest._id) {
      await Withdraw.findByIdAndDelete(savedRequest._id);
    }

    res.status(500).json({
      message: "Error creating withdrawal request",
      error: error.message,
    });
  }
};

module.exports = { requestWithdraw };