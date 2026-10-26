
const express = require("express")
const driverRouter = express.Router()

const {getDrivers,getDriverReviews} = require("../controllers/driverController")

const { protect, allowRoles } = require("../middleware/auth")

driverRouter.get("/",protect,allowRoles("admin"),getDrivers)

driverRouter.get("/:id/reviews",protect,getDriverReviews)

module.exports = driverRouter
