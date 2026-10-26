
const express = require("express")
const ratingRouter = express.Router()

const {addReview,getDriverRating} = require("../controllers/ratingController");

const { protect, allowRoles } = require("../middleware/auth")

ratingRouter.post( "/:rideId", protect, allowRoles("rider"), addReview)
ratingRouter.get("/driver/:driverId",protect,getDriverRating)

module.exports = ratingRouter
