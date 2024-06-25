const express = require('express');
const router = express.Router();
const User = require('../../models/userModel');
const ThirdPartyWallet = require('../../models/thirdpartyWallet');
const auth = require('../../middlewares/auth');

// Route to add game winning amount to third-party wallet
router.post("/add-game-winning", auth, async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ msg: "Valid amount is required" });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        let thirdPartyWallet = user.walletAmount
        // Update third-party wallet amount
        thirdPartyWallet -= amount;
        await user.save();
        console.log('.----.>',thirdPartyWallet)
      

        // Save the game winning amount to the third-party wallet collection
        const walletEntry = new ThirdPartyWallet({
            user: user._id,
            amount: amount
        });
        await walletEntry.save();

        res.status(200).json({ 
            msg: "Game winning amount added to third-party wallet",
            thirdPartyWallet: thirdPartyWallet
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Server Error" });
    }
});

// Transfer amount from third-party wallet to main wallet
router.post("/transfer-to-main", auth, async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ msg: "Valid amount is required" });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (user.thirdPartyWallet < amount) {
            return res.status(400).json({ msg: "Insufficient funds in third-party wallet" });
        }

        user.thirdPartyWallet -= amount;
        user.walletAmount += amount;
        await user.save();

        res.status(200).json({ 
            msg: "Amount transferred to main wallet",
            mainWallet: user.walletAmount,
            thirdPartyWallet: user.thirdPartyWallet 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Server Error" });
    }
});

// Fetch user's wallet amounts (main wallet and third-party wallet)
router.get('/getamount', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Fetch third-party wallet amount from ThirdPartyWallet collection
        const walletEntries = await ThirdPartyWallet.find({ user: user._id });
        let totalGameWinnings = 0;
        if (walletEntries.length > 0) {
            totalGameWinnings = walletEntries.reduce((total, entry) => total + entry.amount, 0);
        }

        res.status(200).json({ 
            mainWallet: user.walletAmount,
            thirdPartyWallet: user.thirdPartyWallet,
            gameWinnings: totalGameWinnings
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
