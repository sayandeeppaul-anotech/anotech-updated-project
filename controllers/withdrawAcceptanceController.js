const Withdraw = require("../models/withdrawModel");
const User = require("../models/userModel");

exports.withdrawAcceptanceController = async (req, res) => {
  try {
    if (!req.user || req.user.accountType !== "Admin") {
      return res.status(403).json({
        message: "You are not authorized to perform this action",
      });
    }

    const { withdrawId, acceptanceType } = req.body;

    if (!["Completed", "Rejected"].includes(acceptanceType)) {
      return res.status(400).json({
        message: "Invalid acceptance type provided.",
      });
    }

    const withdrawRequest = await Withdraw.findById(withdrawId);

    if (!withdrawRequest) {
      return res.status(404).json({
        message: "Withdrawal request not found.",
      });
    }

    if (withdrawRequest.status === "Completed" || withdrawRequest.status === "Rejected") {
      return res.status(400).json({
        message: "This withdrawal request has already been processed.",
      });
    }

    withdrawRequest.status = acceptanceType;
    const updatedRequest = await withdrawRequest.save();

    const user = await User.findById(updatedRequest.userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    if (acceptanceType === "Completed") {
      user.walletAmount -= updatedRequest.balance;
      await user.save();

      res.status(200).json({
        message: `Withdrawal request has been ${acceptanceType}.`,
        updatedRequest,
      });
    } else if (acceptanceType === "Rejected") {
      // Refund the balance back to the user's wallet
      user.walletAmount += updatedRequest.balance;
      await user.save();

      res.status(200).json({
        message: `Withdrawal request has been ${acceptanceType} and the balance has been refunded.`,
        updatedRequest,
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error updating withdrawal request",
      error: error.message,
    });
  }
};
