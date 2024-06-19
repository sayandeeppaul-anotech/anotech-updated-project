const UserModel = require('../../models/userModel');
const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth');
const {isAdmin} = require('../../middlewares/roleSpecificMiddleware')

router.get('/UserBalance', auth,isAdmin, async (req, res) => {
    try {
        // Find details of all users
        const users = await UserModel.find();

        // Retrieve object IDs and wallet amounts of all users
        const userBalances = users.map(user => ({
            userObjectId: user._id,
            walletAmount: user.walletAmount
        }));

        res.status(200).json({
            success: true,
            message: "All Users' Balances retrieved successfully",
            users: userBalances,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal issues",
            error: error.message,
        });
    }
});

module.exports = router;
