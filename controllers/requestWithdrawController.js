const Withdraw = require("../models/withdrawModel");
const User = require("../models/userModel");
const Bet = require("../models/betsModel");
const DepositHistory = require("../models/depositHistoryModel");
const WithdrawLimit = require("../models/withdrawLimitsModel");
const moment = require('moment');

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
              $add: [
                "$totalBet", 
                { $multiply: ["$totalBet", "$tax"] } // Adding tax to totalBet
              ] 
            }
          }
        }
      }
    ]);

    const totalBetAmount = totalBetAggregate.length > 0 ? totalBetAggregate[0].totalBet : 0;

    // Check if total bet amount (including tax) >= total deposited amount
    if (totalBetAmount < totalDeposited) {
      return res.status(400).json({
        success: false,
        message: "You must use all of your deposited money for betting before making a withdrawal request.",
      });
    }

    // Fetch withdrawal limits or create default values if not found
    let withdrawalLimitDoc = await WithdrawLimit.findOne();

    if (!withdrawalLimitDoc) {
      withdrawalLimitDoc = new WithdrawLimit({
        withdrawCount: 3, // Default daily withdrawal count
        withdrawalTime: {
          start: '10:00 AM', // Default withdrawal start time
          end: '07:00 PM',   // Default withdrawal end time
        },
        withdrawalLimit: {
          lowerLimit: 110,   // Default lower withdrawal limit
          upperLimit: 100000 // Default upper withdrawal limit
        }
      });
    }

    // Additional checks based on withdrawal limits
    const lowerLimit = withdrawalLimitDoc.withdrawalLimit.lowerLimit;
    const upperLimit = withdrawalLimitDoc.withdrawalLimit.upperLimit;

    // Adjusted line to compare withdrawal amount with limits
    if (balance < lowerLimit || balance > upperLimit) {
      return res.status(400).json({
        success: false,
        message: `Withdrawal amount must be between ${lowerLimit} and ${upperLimit} rupees`,
      });
    }

    // Check if user has exceeded the daily withdrawal limit
    const currentDate = new Date();
    const startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const endOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59);

    const todayWithdrawals = await Withdraw.countDocuments({
      userId: req.user._id,
      createdAt: { $gte: startOfDay, $lt: endOfDay },
    });

    if (todayWithdrawals >= withdrawalLimitDoc.withdrawCount) {
      return res.status(400).json({
        success: false,
        message: `You cannot request withdrawals more than ${withdrawalLimitDoc.withdrawCount} times in a day`,
      });
    }

    // Check if current time is within the allowed withdrawal period
    const currentTime = moment();
    const startTime = moment(withdrawalLimitDoc.withdrawalTime.start, 'hh:mm A');
    const endTime = moment(withdrawalLimitDoc.withdrawalTime.end, 'hh:mm A');

    if (!currentTime.isBetween(startTime, endTime)) {
      return res.status(400).json({
        success: false,
        message: `Withdrawals are only allowed between ${withdrawalLimitDoc.withdrawalTime.start} and ${withdrawalLimitDoc.withdrawalTime.end}`,
      });
    }

    // Update remaining deposit amount user needs to play with
    const remainingDepositAmount = Math.max(totalDeposited - totalBetAmount, 0);

    // Update withdrawal limit document with remaining deposit amount
    withdrawalLimitDoc.remainingDepositAmount = remainingDepositAmount;
    await withdrawalLimitDoc.save();

    // Create a withdrawal request
    const withdrawRequest = new Withdraw({
      balance: balance,
      withdrawMethod: req.body.withdrawMethod,
      status: "Pending",
      userId: userId,
    });

    const savedRequest = await withdrawRequest.save();

    // Update user's withdraw records
    await User.findByIdAndUpdate(
      userId,
      { $push: { withdrawRecords: savedRequest._id } },
      { new: true }
    );

    // Update withdraw records for all admin users
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
