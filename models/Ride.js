
const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema({
  rider: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
  driver: {type: mongoose.Schema.Types.ObjectId,ref: "User",default: null},
  pickup: {address: String,coordinates: {type: [Number],required: true } },
  dropoff: {address: String,coordinates: {type: [Number],required: true }},distance: Number,
  duration: Number,
  estimatedFare: Number,
  finalFare: Number,
  surgeMultiplier: {type: Number,default: 1},
  status: { type: String,enum: [ "requested", "accepted","arrived", "in_progress",
      "completed","cancelled" ], default: "requested"},
  requestedAt: {type: Date,default: Date.now},
  acceptedAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

rideSchema.index({ rider: 1, createdAt: -1 })
rideSchema.index({ driver: 1, status: 1 })
rideSchema.index({ "pickup.coordinates": "2dsphere" })

module.exports = mongoose.model("Ride", rideSchema)
