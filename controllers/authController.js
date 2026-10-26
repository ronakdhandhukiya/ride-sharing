const User = require("../models/User")
const bcrypt = require("bcryptjs")

const jwt = require("jsonwebtoken")

const signup = async(req,res)=>{
  try {
    const {name ,email,password,role,phone}=req.body

    if(!name || !email || !password){
      return res.status(400).json({message :"Please enter required fields"})
    }

    if(password.length<6){
      return res.status(400).json({message :"Password must be at least 6 characters"})
    }

    if(role && !["rider","driver"].includes(role)){
      return res.json({message : "Public signup supports driver and rider only "})
    }

    const exitingUser = await User.findOne({email})

    if(exitingUser){
      return res.status(409).json({message :"Email already registered"})
    }

    const hashed = await bcrypt.hash(password,5)

    const newUser = await User.create({...req.body,password:hashed,role : role ||"rider"})

    res.status(201).json({message : "Account created successfully",data:newUser})
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}


const login = async(req,res)=>{
  try {
    const {email,password} = req.body

    if(!email || !password){
      return res.status(400).json({message : "Please enter email or password"})
    }

    const existingUser = await User.findOne({email})

    if(!existingUser){
      return res.json({message : "user does not exist with this email"})
    }
    const comparePassword = await bcrypt.compare(password,existingUser.password)

    if(!comparePassword){
      return res.json({message : "Please enter correct password"})
    }

    const token = jwt.sign({id: existingUser._id.toString(),role: existingUser.role},process.env.JWT_SECRET,{expiresIn:"1h"})

    res.json({message : "Login successful",token})
  } catch (error) {
     res.status(500).json({ message: error.message })
  }
}


const updateDriverLocation = async(req,res)=>{
  try {
     const { longitude, latitude } = req.body

     if (!Number.isFinite(longitude) ||!Number.isFinite(latitude) ||
      longitude < -180 ||longitude > 180 ||latitude < -90 ||latitude > 90
    ) {
      return res.status(400).json({
        message: "Valid longitude and latitude are required"
      })
    }


  const driver = await User.findByIdAndUpdate(
      req.user.id,
      {
        location: {
          type: "Point",
          coordinates: [longitude, latitude]
        }
      },
      { new: true }
    ).select("-password");

    const io = req.app.get("io");

    const activeRide = await require("../models/Ride").findOne({
      driver: req.user.id,
      status: { $in: ["accepted", "arrived", "in_progress"] }
    });

    if (activeRide) {
      const notifyUser = require("../utils/notify");

      notifyUser(io, activeRide.rider, "driver_location", {
        rideId: activeRide._id,
        location: [longitude, latitude]
      });
    }

    res.json({
      message: "Driver location updated",
      location: driver.location
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}


const updateAvailability = async(req,res)=>{
  try {
    const { isAvailable } = req.body;

    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({message: "isAvailable must be true or false"
      })
    }

    if (!isAvailable) {
      const activeRide = await require("../models/Ride").findOne({driver: req.user.id,
        status: { $in: ["accepted", "arrived", "in_progress"] }
      })

      if (activeRide) {
        return res.status(400).json({ message: "Finish the active ride before going offline"})
      }
    }

    const driver = await User.findByIdAndUpdate( req.user.id, { isAvailable }, { new: true })
    .select("-password");

    res.json({message: "Availability updated",isAvailable: driver.isAvailable })
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = {signup,login,updateDriverLocation,updateAvailability}