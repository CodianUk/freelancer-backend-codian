import mongoose from "mongoose";

const appEarningsSchema = new mongoose.Schema({
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
    appEarning:{
        type:Number,
        required:true
    },
},{
    timestamps:true
});

// appEarningsSchema.virtual("order",{
//     refPath:"dbRef",
//     localField:"orderId",
//     foreignField:"_id",
// });
// appEarningsSchema.virtual("user",{
//     ref:"User",
//     localField:"userId",
//     foreignField:"_id",
// });

const appEarnings = mongoose.model("appEarnings",appEarningsSchema);



export { appEarnings};