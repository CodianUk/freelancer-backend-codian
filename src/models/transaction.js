import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({

    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    amount:{
        type:Number,
        required:true,
    },
    status:{
        type:String,
        enum:["Pause","Release","Pending"],
        default:"Pending"
    }

},{
    timestamps:true
});

const Transaction = mongoose.model("transaction",transactionSchema);

export {Transaction};