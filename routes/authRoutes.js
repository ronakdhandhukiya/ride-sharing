
const express = require("express")
const authRouter = express.Router()

const {signup,login,updateDriverLocation,updateAvailability} = require("../controllers/authController")

const { protect, allowRoles } = require("../middleware/auth")

authRouter.post("/signup", signup);
authRouter.post("/login", login);

authRouter.patch("/driver/location",protect,allowRoles("driver"),updateDriverLocation)

authRouter.patch( "/driver/availability",protect, allowRoles("driver"),
 updateAvailability
);

module.exports = authRouter;
