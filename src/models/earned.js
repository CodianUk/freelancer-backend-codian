import mongoose from "mongoose";

const earnedSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    orderId:{
        type:mongoose.Schema.Types.ObjectId,
        refPath:"dbRef",
        required:true
    },
    dbRef:{
        type:String,
        required:true,
        enum:["oneTimeOrder","equityOrder"]
    },
    amount:{
        type:Number,
        required:true
    },
    status:{
        type:String,
        enum:["pending","released"],
        default:"pending"
    }

},{
    timestamps:true
});

const earned = mongoose.model("earned",earnedSchema);

export {earned};