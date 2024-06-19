const express = require('express')
const router = express.Router()
const auth = require('../middlewares/auth')
const k3betmodel = require('../models/K3betmodel')

router.get('/k3bethistory',auth,async(req,res)=>{
    try {
        const userBets = await k3betmodel.find({ user: req.user._id });
       console.log('---->',userBets)
       res.status(200).json(userBets)
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error retrieving bet history', error: error.message });
    }
})
module.exports = router