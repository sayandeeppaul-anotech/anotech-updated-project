const Withdraw = require("../models/withdrawModel");
const User = require("../models/userModel");
const Bet = require("../models/betsModel");
const DepositHistory = require("../models/depositHistoryModel");

const requestWithdraw = async (req, res) => {
  try {
    const userId = req.user._id;
    const userDetail = await User.findById(userId);
    const balance = req.body.balance;

    if (!userDetail) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    if (userDetail.walletAmount < balance) {
      return res.status(400).json({
        success: false,
        message: "You have insufficient balance to withdraw",
      });
    }

    if (balance <= 300) {
      return res.status(400).json({
        success: false,
        message: "Minimum withdraw amount is 300",
      });
    }

    // Get today's deposits
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysDeposits = await DepositHistory.aggregate([
      {
        $match: {
          userId: userId,
          depositStatus: 'Completed',
          createdAt: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$depositAmount" }
        }
      },
    ]);

    const todaysTotalDeposit = todaysDeposits.length ? todaysDeposits[0].total : 0;

    // Calculate total bet amount for today
    const todaysBets = await Bet.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$betAmount" }
        }
      },
    ]);

    const todaysTotalBet = todaysBets.length ? todaysBets[0].total : 0;

    if (todaysTotalBet < todaysTotalDeposit) {
      return res.status(400).json({
        success: false,
        message: "You must use all of today's deposit for betting before making a withdrawal request.",
      });
    }

    // Calculate total bet amount
    const totalBetAmountResult = await Bet.aggregate([
      { $match: { userId: userId } },
      { $group: { _id: null, total: { $sum: "$betAmount" } } },
    ]);

    const totalBetAmount = totalBetAmountResult.length ? totalBetAmountResult[0].total : 0;

    // Calculate total deposit amount
    const totalDepositAmountResult = await DepositHistory.aggregate([
      {
        $match: {
          userId: userId,
          depositStatus: 'Completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$depositAmount" }
        }
      },
    ]);

    const totalDepositAmount = totalDepositAmountResult.length ? totalDepositAmountResult[0].total : 0;

    if (totalDepositAmount > totalBetAmount) {
      return res.status(400).json({
        success: false,
        message: "You can't withdraw because your total deposit amount is greater than your total bet amount",
      });
    }

    const withdrawRequest = new Withdraw({
      balance: balance,
      withdrawMethod: req.body.withdrawMethod,
      status: "Pending",
      userId: userId,
    });

    const savedRequest = await withdrawRequest.save();

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
      success: true,
      message: "Withdrawal request sent to admin for review.",
      withdrawRequest: savedRequest,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating withdrawal request",
      error: error.message,
    });
  }
};

module.exports = { requestWithdraw };
