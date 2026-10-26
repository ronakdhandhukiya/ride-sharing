
const express = require("express")
const rideRouter = express.Router()

const {requestRide,getRideRequests,manageRide,getRideHistory,exportHistory,searchRides,estimateFare} = require("../controllers/rideController")

const { protect, allowRoles } = require("../middleware/auth")
rideRouter.use(protect)

rideRouter.post("/",allowRoles("rider"),requestRide)
rideRouter.get("/requests",allowRoles("driver"),getRideRequests)
rideRouter.get( "/search", allowRoles("rider"), searchRides)
rideRouter.get("/history",allowRoles("rider", "driver", "admin"),getRideHistory)
rideRouter.get("/history/export",allowRoles("rider", "driver", "admin"),exportHistory)
rideRouter.patch("/:id/action",allowRoles("rider", "driver", "admin"), manageRide)
rideRouter.get("/fare", estimateFare)
module.exports = rideRouter
