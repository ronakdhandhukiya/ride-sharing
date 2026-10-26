const Ride = require("../models/Ride")
const User = require("../models/User")
const Review = require("../models/Review")

const addReview = async(req,res)=>{
  try {
    const {rating,comment} = req.body

    if(!Number.isInteger(rating) || rating < 1 || rating > 5){
      return res.status(400).json({message: "Rating must be an integer from 1 to 5"})
    }

     const ride = await Ride.findById(req.params.rideId)

       if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    if(String(ride.rider)!== req.user.id){
      return res.status(403).json({message :"Only the rider can review this ride"})
    }

    if(ride.status !== "completed" || !ride.driver){
      return res.status(400).json({message :"Only completed rides can be reviewed"})
    }

    const review = await Review.create({...req.body,rating,comment})

    const reviews = await Review.find({ driver: ride.driver })

    const totalRating =reviews.reduce((sum,item)=> sum+item.rating,0)

    await User.findByIdAndUpdate(ride.driver, {
      rating: Number((totalRating / reviews.length).toFixed(2)),
      totalReviews: reviews.length
    })

    res.status(201).json({message :"Review submitted successfully",review})


  } catch (error) {
    res.status(409).json({message: "This ride has already been reviewed"})
  }
}

const getDriverRating = async(req,res)=>{
  try {
    const driver = await User.findOne({ _id: req.params.driverId,role: "driver"}).select("name rating total reviews")

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" })

    }

    const reviews = await Review.find({driver:driver._id}).populate("rider","name").limit(100)

    res.json({driver,reviews})

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { addReview, getDriverRating }