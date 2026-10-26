
const express = require("express")
const analyticsRouter = express.Router()

const { getRideAnalytics, getDriverPerformance, getServiceStats
} = require("../controllers/analyticsController")

const { protect, allowRoles } = require("../middleware/auth")

analyticsRouter.use(protect, allowRoles("admin"))
analyticsRouter.get("/rides", getRideAnalytics)
analyticsRouter.get("/drivers", getDriverPerformance)
analyticsRouter.get("/service", getServiceStats)

module.exports = analyticsRouter
