
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {type: String,required: true},
  email: { type: String, required: true, unique: true, lowercase: true},
  password: {type: String,required: true},
  role: {type: String, enum: ["rider", "driver", "admin"], default: "rider"},
  phone: String,
  isAvailable: { type: Boolean, default: false},
  location: { type: { type: String, enum: ["Point"], default: "Point"},
    coordinates: {type: [Number],default: [0, 0] }
  },
  rating: {type: Number,default: 0},
  totalReviews: {type: Number,default: 0}
}, {
  timestamps: true
});

userSchema.index({ location: "2dsphere" })

module.exports = mongoose.model("User", userSchema)
