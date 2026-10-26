const getRoute = require("../utils/mapbox")
const Ride = require("../models/Ride")
const User = require("../models/User")
const calculateFare = require("../utils/fare")
const notifyUser = require("../utils/notify")
const { makeCSV, makePDF } = require("../utils/exportRide")

const requestRide = async (req, res) => {
  try {
    const {pickupAddress,dropoffAddress,pickupLongitude,pickupLatitude,dropoffLongitude,dropoffLatitude } = req.body;

    const pickup = [pickupLongitude, pickupLatitude];
    const dropoff = [dropoffLongitude, dropoffLatitude];

    if ( !pickupAddress ||!dropoffAddress ||!pickup.every(Number.isFinite) ||
    !dropoff.every(Number.isFinite) ||pickupLongitude < -180 ||pickupLongitude > 180 || dropoffLongitude < -180 || dropoffLongitude > 180 || pickupLatitude < -90 ||pickupLatitude > 90 || dropoffLatitude < -90 || dropoffLatitude > 90
    ) {
      return res.status(400).json({
        message: "Valid addresses and coordinates are required"
      })
    }

    
    const route = await getRoute(pickup, dropoff)

    
    const fare = calculateFare(route.distance, route.duration);

    const ride = await Ride.create({rider: req.user.id,
      pickup: {
        address: pickupAddress,
        coordinates: pickup
      },
      dropoff: {
        address: dropoffAddress,
        coordinates: dropoff
      },
      distance: Number(route.distance.toFixed(2)),
      duration: Number(route.duration.toFixed(2)),
      estimatedFare: fare.estimatedFare,
      surgeMultiplier: fare.surgeMultiplier,
      status: "requested"
    });

    
    const drivers = await User.find({ role: "driver", isAvailable: true,
      _id: { $ne: req.user.id },
      location: {
        $near: {
          $geometry: {type: "Point",coordinates: pickup
          },
          $maxDistance: 10000
        }
      }
    }).limit(10)

    
    const io = req.app.get("io")

    if (io) {
      drivers.forEach((driver) => {
        notifyUser(io, driver._id, "new ride request", {rideId: ride._id,
          pickup: ride.pickup,dropoff: ride.dropoff,distance: ride.distance,
          estimatedFare: ride.estimatedFare
        })
      })
    }

    return res.status(201).json({message: drivers.length ? "Ride created and nearby drivers notified": "Ride created, but no nearby drivers are available",
      ride,nearbyDrivers: drivers.length,
      route: route.geometry,
      fare
    })
  } catch (error) {
    return res.status(500).json({ message: error.message})
  }
}


const getRideRequests = async (req, res) => {
  try {
    const { longitude, latitude, radius = 10, riderRating } = req.query;

    const filters = { status: "requested" };

    if (longitude !== undefined || latitude !== undefined) {
      const lng = Number(longitude);
      const lat = Number(latitude);

      if (!Number.isFinite(lng) ||!Number.isFinite(lat) ||lng < -180 ||
        lng > 180 ||lat < -90 ||lat > 90
      ) {
        return res.status(400).json({ message: "Valid longitude and latitude are required"
        })
      }

      const distanceInMeters = Number(radius) * 1000

      if (!Number.isFinite(distanceInMeters) ||distanceInMeters <= 0 ||
        distanceInMeters > 50000
      ) {
        return res.status(400).json({message: "Radius must be between 0 and 50 kilometers"
        })
      }

      filters["pickup.coordinates"] = {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat]
          },
          $maxDistance: distanceInMeters
        }
      }
    }

    let rides = await Ride.find(filters).populate("rider", "name rating")
    .limit(50)

    if (riderRating !== undefined) {
      const minimumRating = Number(riderRating);

      if (!Number.isFinite(minimumRating) ||minimumRating < 0 ||
        minimumRating > 5
      ) {
        return res.status(400).json({
          message: "riderRating must be between 0 and 5"
        })
      }

      rides = rides.filter(
        (ride) => (ride.rider?.rating || 0) >= minimumRating
      )
    }

    return res.json({count: rides.length,rides})

  } catch (error) {
 return res.status(500).json({message: error.message});
  }
}


const manageRide = async (req, res) => {
  try {
    const { action } = req.body;
    const { id } = req.params;

    const ride = await Ride.findById(id);

    if (!ride) {
      return res.status(404).json({ message: "Ride not found" })
    }

    const io = req.app.get("io")

    const isAdmin = req.user.role === "admin"
    const userId = String(req.user.id)
    const isRider = String(ride.rider) === userId
    const isDriver = String(ride.driver) === userId

    
    if (action === "accept") {
      if (ride.status !== "requested") {
        return res.status(400).json({message: "This ride is no longer available"
        })
      }

      const driver = await User.findById(req.user.id)

      if (!driver || driver.role !== "driver") {
        return res.status(403).json({
          message: "Only drivers can accept rides"
        })
      }

      if (!driver.isAvailable) {
        return res.status(400).json({
          message: "You must be available to accept a ride"
        })
      }

      const acceptedRide = await Ride.findOneAndUpdate( {_id: ride._id,
        status: "requested"
        },{ driver: driver._id,
          status: "accepted",
          acceptedAt: new Date()
        },
        { new: true }
      )

      if (!acceptedRide) {
        return res.status(409).json({
          message: "Another driver already accepted ride"
        })
      }

      await User.findByIdAndUpdate(driver._id, { isAvailable: false})

      notifyUser(io, acceptedRide.rider, "ride_status", {
        rideId: acceptedRide._id,
        status: acceptedRide.status,
        driver: {
          id: driver._id,
          name: driver.name,
          rating: driver.rating
        }
      })

      return res.json({message: "Ride accepted",ride: acceptedRide })
    }

    
    if (action === "decline") {
      if (ride.status !== "requested") {
        return res.status(400).json({message: "This ride is no longer available"
        })
      }

      if (req.user.role !== "driver") {
        return res.status(403).json({message: "Only drivers can decline rides"
        })
      }

      return res.json({message: "Ride declined. It remains available to other drivers"})
    }

    
    if (action === "cancel") {
      if (!isAdmin && !isRider && !isDriver) {
        return res.status(403).json({message: "You cannot cancel this ride"
        })
      }

      if (["completed", "cancelled"].includes(ride.status)) {
        return res.status(400).json({message: "This ride cannot be cancelled"
        })
      }

      ride.status = "cancelled"
      await ride.save()

      if (ride.driver) {
        await User.findByIdAndUpdate(ride.driver, {isAvailable: true })

        notifyUser(io, ride.driver, "ride_status", {rideId: ride._id,status: ride.status
        })
      }

      notifyUser(io, ride.rider, "ride_status", { rideId: ride._id, status: ride.status
      })

      return res.json({message: "Ride cancelled",ride
      })
    }

    
    if (!isAdmin && !isDriver) {
      return res.status(403).json({
        message: "Only the assigned driver or admin can update ride status"
      })
    }

    if (isDriver && !isAdmin && !isDriver) {
      return res.status(403).json({
        message: "You are not allowed to update this ride"
      })
    }

    const nextStatus = {arrive: "arrived",start: "in_progress",complete: "completed"
    }

    if (!nextStatus[action]) {
      return res.status(400).json({ message: "Invalid ride action"
      })
    }

    const allowedTransitions = {accepted: ["arrived"],arrived: ["in_progress"],
      in_progress: ["completed"]
    }

    if (!allowedTransitions[ride.status]?.includes(nextStatus[action])) {
      return res.status(400).json({ message: "Invalid ride status transition"
      })
    }

    ride.status = nextStatus[action]

    if (action === "complete") {
      ride.completedAt = new Date();
      ride.finalFare = ride.estimatedFare
    }

    await ride.save();

    if (action === "complete" && ride.driver) {
      await User.findByIdAndUpdate(ride.driver, {
        isAvailable: true
      })
    }

    notifyUser(io, ride.rider, "ride_status", { rideId: ride._id, status: ride.status,
      finalFare: ride.finalFare
    })

    if (ride.driver) {
      notifyUser(io, ride.driver, "ride_status", {rideId: ride._id,
        status: ride.status
      });
    }

    return res.json({message: "Ride status updated",ride
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
};

const getRideHistory = async(req,res)=>{
try {
  const filters = {}

    if (req.user.role === "rider") {
      filters.rider = req.user.id
    } else if (req.user.role === "driver") {
      filters.driver = req.user.id
    }

    const rides = await Ride.find(filters).populate("rider", "name email")
    .populate("driver", "name rating").sort({ createdAt: -1 }).limit(500)

    res.json({ count: rides.length, rides })
} catch (error) {
   res.status(500).json({ message: error.message })
}
}

const exportHistory = async(req,res)=>{
  try {
    const filters = {}

    if (req.user.role === "rider") {
      filters.rider = req.user.id;
    } else if (req.user.role === "driver") {
      filters.driver = req.user.id;
    }

    const rides = await Ride.find(filters).sort({ createdAt: -1 }).limit(500)

    if (req.query.format === "pdf") {
      return makePDF(rides, res)
    }

    if (req.query.format === "csv") {
      res.setHeader("Content-Type", "text/csv")
      res.setHeader("Content-Disposition",'attachment; filename="ride-history.csv"'
      )

      return res.send(makeCSV(rides))
    }

    res.status(400).json({ message: "Use format=csv or format=pdf" })
  } catch (error) {
    
  }
}

const searchRides = async(req,res)=>{
  try {
    const { destination, maxFare, maxDuration, minDriverRating } = req.query

    const filters = {
      status: { $in: ["accepted", "arrived", "in_progress"] }
    }

    if (destination) {
      filters["dropoff.address"] = { $regex: destination, $options: "i"
      }
    }

    if (maxFare !== undefined) {
      filters.estimatedFare = { $lte: Number(maxFare) }
    }

    if (maxDuration !== undefined) {
      filters.duration = { $lte: Number(maxDuration) }
    }

    let rides = await Ride.find(filters).populate("driver", "name rating").limit(50)

    if (minDriverRating !== undefined) {
      const minimum = Number(minDriverRating)

      if (!Number.isFinite(minimum) || minimum < 0 || minimum > 5) {
        return res.status(400).json({ message: "minDriverRating must be between 0 and 5"  })
      }

      rides = rides.filter(
        (ride) => ride.driver && ride.driver.rating >= minimum
      )
    }

    res.json({ count: rides.length, rides })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}


const estimateFare =async (req, res)=> {
  try {
    const {pickupLongitude,pickupLatitude,dropoffLongitude,dropoffLatitude
    } = req.query;

    const pickup = [Number(pickupLongitude),Number(pickupLatitude)]

    const dropoff = [ Number(dropoffLongitude), Number(dropoffLatitude)]

    if (!pickup.every(Number.isFinite) ||!dropoff.every(Number.isFinite) ||
      pickup[0] < -180 || pickup[0] > 180 ||
      dropoff[0] < -180 || dropoff[0] > 180 ||pickup[1] < -90 || pickup[1] > 90 ||
      dropoff[1] < -90 || dropoff[1] > 90
    ) {
      return res.status(400).json({ message: "Valid pickup and drop-off coordinates are required"
      })
    }

    const route = await getRoute(pickup, dropoff);
    const fare = calculateFare(route.distance, route.duration);

    res.json({distance: Number(route.distance.toFixed(2)),
      duration: Number(route.duration.toFixed(2)),...fare,route: route.geometry
    })

  } catch (error) {
    res.status(502).json({message: "Unable to calculate route or fare",
      error: error.message
    })
  }
}

module.exports = {requestRide,getRideRequests,manageRide,getRideHistory,exportHistory,searchRides,estimateFare}