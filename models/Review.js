
const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  ride: {type: mongoose.Schema.Types.ObjectId,ref: "Ride",required: true},
  rider: {type: mongoose.Schema.Types.ObjectId,ref: "User",required: true},
  driver: {type: mongoose.Schema.Types.ObjectId,ref: "User",required: true},
  rating: {type: Number,required: true,min: 1,max: 5},
  comment: {type: String,maxlength: 1000,default: ""}
}, {
  timestamps: true
})

reviewSchema.index({ ride: 1 }, { unique: true })
reviewSchema.index({ driver: 1, createdAt: -1 })

module.exports = mongoose.model("Review", reviewSchema)
