const User = require("../models/User")
const Review = require("../models/Review")

const getDrivers = async(req,res)=>{
  try {
    const drivers = await User.find({role :"driver"}).select("-password")
    .sort({rating:-1}).limit(100)

    res.json({count : drivers.length,drivers})
  
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}


const getDriverReviews = async(req,res) =>{
  try {
    const {id} = req.params

    const reviews = await Review.find({driver : id}).populate("rider","name").limit(100)
    res.json({ count: reviews.length, reviews })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = {getDriverReviews,getDrivers}
