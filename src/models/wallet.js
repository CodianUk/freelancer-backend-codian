import mongoose from "mongoose";


const paymentMethodSchema = new mongoose.Schema({
    method:{
        type: String,
        required: true,
        enum:["stripe","paypal","masterCard"]
    },
    accountId:{
        type:String,
    },
    customerId:{
        type:String,
    }

},{
    timestamps:true
})


const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    netIncome: {
        type: Number,
        default: 0
    },
    availableBalance: {
        type: Number,
        default: 0
    },
    pendingClearence:{
        type:Number,
        default:0
    },
    spending:{
        type:Number,
        default:0
    },
    withdrawn:{
        type:Number,
        default:0
    },
    

    paymentMethods:[paymentMethodSchema]

},{
    timestamps:true
})

const Wallet = mongoose.model("wallet", walletSchema);

export {Wallet}



