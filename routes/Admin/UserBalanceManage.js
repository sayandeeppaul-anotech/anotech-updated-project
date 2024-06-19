const express = require('express')
const router = express.Router()
const User = require('../../models/userModel')
const {isAdmin} = require('../../middlewares/roleSpecificMiddleware')
const auth = require('../../middlewares/auth')

router.post('/userbalancemanage',auth,isAdmin,async(req,res)=>{
    try {
        const {userId, amount} = req.body
        if(!userId||!amount){
            return res.status(400).json({message:"Please provide all the required fields"})
        }
        const user = await User.findById(userId)
        if(!user){
            return res.status(404).json({message:"User not found"})
        }

        user.walletAmount += amount 
        await user.save()
        res.json({ msg: 'User balance updated successfully'});
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
})
module.exports = router