
const Ride = require("../models/Ride");
const User = require("../models/User");

async function getRideAnalytics(req, res) {
  try {
    const rides = await Ride.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          totalRides: { $sum: 1 }, completedRides: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0]
            }
          },
          cancelledRides: {
            $sum: {
              $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0]
            }
          },
          earnings: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] },
              { $ifNull: ["$finalFare", 0] }, 0
              ] }
          }}
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ])

    res.json({ rides })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

async function getDriverPerformance(req, res) {
  try {
    const drivers = await Ride.aggregate([ {
        $match: { driver: { $ne: null } }
      }, { $group: { _id: "$driver", totalRides: { $sum: 1 },
      completedRides: {
            $sum: {$cond: [{ $eq: ["$status", "completed"] }, 1, 0]
            }
          },
          earnings: { $sum: { $cond: [
                { $eq: ["$status", "completed"] },
                { $ifNull: ["$finalFare", 0] }, 0
              ]}
          }}
      },
      {
        $lookup: {from: "users",localField: "_id",foreignField: "_id",
          as: "driver"
        }
      },
      { $unwind: "$driver" },
      {
        $project: {name: "$driver.name",rating: "$driver.rating", totalRides: 1,
          completedRides: 1, earnings: 1
        }
      },
      { $sort: { completedRides: -1 } },
      { $limit: 100 }
    ]);

    res.json({ drivers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getServiceStats(req, res) {
  try {
    const [totalUsers, totalDrivers, totalRides, rideStatuses] =
      await Promise.all([
        User.countDocuments({ role: "rider" }),
        User.countDocuments({ role: "driver" }),
        Ride.countDocuments(),
        Ride.aggregate([
          { $group: {_id: "$status",count: { $sum: 1 } } }
        ])
      ]);

    res.json({ totalUsers,totalDrivers, totalRides, rideStatuses})
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = { getRideAnalytics,getDriverPerformance,getServiceStats}
