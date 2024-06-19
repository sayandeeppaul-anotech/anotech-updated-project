// const Withdraw = require("../models/withdrawModel");
// const User = require("../models/userModel");

// exports.withdrawAcceptanceController = async (req, res) => {
//   try {
//     // Ensure the user is an admin
//     if (!req.user || req.user.accountType !== "Admin") {
//       return res.status(403).json({
//         message: "You are not authorized to perform this action",
//       });
//     // }

//     const { withdrawId, acceptanceType } = req.body;

//     // Validate acceptance type
//     if (!["Completed", "Rejected"].includes(acceptanceType)) {
//       return res.status(400).json({
//         message: "Invalid acceptance type provided.",
//       });
//     }

//     // Find the withdrawal request
//     const withdrawRequest = await Withdraw.findById(withdrawId);

//     if (!withdrawRequest) {
//       return res.status(404).json({
//         message: "Withdrawal request not found.",
//       });
//     }

//     // If the acceptance type is 'Completed', update status and deduct from user's wallet
//     if (acceptanceType === "Completed") {
//       // Ensure the request is still pending before updating
//       if (withdrawRequest.status !== "Pending") {
//         return res.status(400).json({
//           message: "Withdrawal request has already been processed.",
//         });
//       }

//       // Update status to 'Completed'
//       withdrawRequest.status = "Completed";
//       await withdrawRequest.save();

//       // Find the user associated with the withdrawal request
//       const user = await User.findById(withdrawRequest.userId);

//       if (!user) {
//         return res.status(404).json({
//           message: "User not found.",
//         });
//       }

//       // Check if user has sufficient balance
//       if (user.walletAmount < withdrawRequest.balance) {
//         // Rollback status to 'Pending' if balance is insufficient
//         withdrawRequest.status = "Pending";
//         await withdrawRequest.save();

//         return res.status(400).json({
//           message: "Insufficient balance in the user's wallet.",
//         });
//       }

//       // Deduct the balance from the user's wallet
//       user.walletAmount -= withdrawRequest.balance;
//       await user.save();
//     } else {
//       // Update status to 'Rejected'
//       withdrawRequest.status = "Rejected";
//       await withdrawRequest.save();
//     }

//     res.status(200).json({
//       message: `Withdrawal request has been ${acceptanceType}.`,
//       withdrawRequest: withdrawRequest,
//     });

//   } catch (error) {
//     res.status(500).json({
//       message: "Error updating withdraw request",
//       error: error.message,
//     });
//   }
// };
