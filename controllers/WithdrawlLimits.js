const express = require('express');
const router = express.Router();
const WithdrawLimit = require("../models/withdrawLimitsModel");
const auth = require('../middlewares/auth')
const {isAdmin} = require('../middlewares/roleSpecificMiddleware')
router.get('/withdraw-limit',auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Fetch the withdrawal limit data for the user
    const withdrawalLimit = await WithdrawLimit.find();
    console.log('---->',withdrawalLimit)
    if (!withdrawalLimit) {
      return res.status(404).json({
        success: false,
        message: "Withdrawal limit data not found for user",
      });
    }

    // Respond with the withdrawal limit data
    res.status(200).json({
      success: true,
      data: withdrawalLimit,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching withdrawal limit data",
      error: error.message,
    });
  }
});

/////////////////////// Admin specific features//////////////////----->
router.put('/withdraw-limit-change', auth,isAdmin, async (req, res) => {
  const { withdrawCount, lastWithdrawalDate, withdrawalTime, withdrawalLimit } = req.body;

  try {
      // Update withdrawal limits for all users
      const updatedWithdrawLimits = await WithdrawLimit.updateMany(
          {},
          {
              $set: {        
                  withdrawCount,
                  lastWithdrawalDate,
                  withdrawalTime,
                  withdrawalLimit
              }
          }
      );

      res.status(200).json({ success: true, message: 'Withdraw limits updated for all users', updatedWithdrawLimits });
  } catch (error) {
      console.error('Error updating withdraw limits:', error);
      res.status(500).json({ success: false, message: 'Failed to update withdraw limits', error: error.message });
  }
});

router.get('/withdraw-limit-get',auth,isAdmin, async (req, res) => {
  const userId = req.user._id; // Assuming userId is extracted from authenticated user

  try {
      const withdrawLimit = await WithdrawLimit.find();
      if (!withdrawLimit) {
          return res.status(404).json({ success: false, message: 'Withdraw limit not found for the user' });
      }

      res.status(200).json({ success: true, message: 'Withdraw limit found', withdrawLimit });
  } catch (error) {
      console.error('Error fetching withdraw limit:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch withdraw limit', error: error.message });
  }
});

module.exports = router;
