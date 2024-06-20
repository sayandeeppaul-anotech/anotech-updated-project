const Withdraw = require("../models/withdrawModel");
const User = require("../models/userModel");
const Bet = require("../models/betsModel");
const DepositHistory = require("../models/depositHistoryModel");
const WithdrawLimit = require("../models/withdrawLimitsModel");

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

    // Fetch user deposit history
    const depositHistory = await DepositHistory.find({ userId: userId, depositStatus: "completed" });
    if (!depositHistory || depositHistory.length === 0) {
      return res.status(400).json({
        success: false,
        message: "You have no completed deposits to withdraw from."
      });
    }

    // Calculate total deposited amount
    const totalDeposited = depositHistory.reduce((total, deposit) => total + deposit.depositAmount, 0);

    // Fetch total bet amount (including tax deductions)
    const totalBetAggregate = await Bet.aggregate([
      { 
        $match: { userId: userId } 
      },
      {
        $group: {
          _id: null,
          totalBet: { 
            $sum: { 
              $subtract: [
                "$totalBet", 
                { $multiply: ["$totalBet", "$tax"] } // Subtracting tax from totalBet
              ]
            }
          }
        }
      }
    ]);

    const totalBetAmount = totalBetAggregate.length > 0 ? totalBetAggregate[0].totalBet : 0;
console.log('------->',totalBetAmount)
    // Check if total bet amount >= total deposited amount
    if (totalBetAmount < totalDeposited) {
      return res.status(400).json({
        success: false,
        message: "You must use all of your deposited money for betting before making a withdrawal request.",
      });
    }

    // Additional checks: Minimum withdrawal amount and withdrawal frequency
    if (balance < 110 || balance > 100000) {
      return res.status(400).json({
        success: false,
        message: "Withdrawal amount must be between 110 and 100,000 rupees",
      });
    }

    // Check if user has exceeded the daily withdrawal limit
    const currentDate = new Date();
    const startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const endOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59);

    const withdrawalLimit = await WithdrawLimit.findOneAndUpdate(
      { userId: userId },
      { $inc: { withdrawCount: 1 } },
      { upsert: true, new: true }
    );

    if (withdrawalLimit.withdrawCount > 3) {
      return res.status(400).json({
        success: false,
        message: "You cannot request withdrawals more than 3 times in a day",
      });
    }

    // Check if current time is within the allowed withdrawal period (10 am to 7 pm)
    const currentHour = currentDate.getHours();
    const startTime = Number(withdrawalLimit.withdrawalTime.start.split(':')[0]);
    const endTime = Number(withdrawalLimit.withdrawalTime.end.split(':')[0]);
    if (currentHour < startTime || currentHour >= endTime) {
      return res.status(400).json({
        success: false,
        message: `Withdrawals are only allowed between ${withdrawalLimit.withdrawalTime.start} and ${withdrawalLimit.withdrawalTime.end}`,
      });
    }

    // Update remaining deposit amount user needs to play with
    withdrawalLimit.remainingDepositAmount = totalDeposited - totalBetAmount;
    await withdrawalLimit.save();

    // Create a withdrawal request
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
