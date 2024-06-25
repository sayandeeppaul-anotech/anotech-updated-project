const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const thirdPartyWalletSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ThirdPartyWallet', thirdPartyWalletSchema);
