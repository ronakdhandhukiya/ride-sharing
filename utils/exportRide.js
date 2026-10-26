
const PDFDocument = require("pdfkit");
const { createObjectCsvStringifier } = require("csv-writer");

function makeCSV(rides) {
  const csvWriter = createObjectCsvStringifier({
    header: [
      { id: "id", title: "Ride ID" },
      { id: "pickup", title: "Pickup" },
      { id: "dropoff", title: "Dropoff" },
      { id: "status", title: "Status" },
      { id: "fare", title: "Fare (INR)" },
      { id: "date", title: "Date" }
    ]
  });

  const rows = rides.map((ride) => ({
    id: ride._id.toString(),
    pickup: ride.pickup.address || "",
    dropoff: ride.dropoff.address || "",
    status: ride.status,
    fare: ride.finalFare ?? ride.estimatedFare ?? 0,
    date: ride.createdAt.toISOString()
  }));

  return (
    csvWriter.getHeaderString() +
    csvWriter.stringifyRecords(rows)
  );
}

function makePDF(rides, res) {
  const pdf = new PDFDocument({ margin: 40 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="ride-history.pdf"'
  );

  pdf.pipe(res);
  pdf.fontSize(20).text("Ride History", { underline: true });
  pdf.moveDown();

  rides.forEach((ride, index) => {
    pdf.fontSize(10).text(
      `${index + 1}. ${ride.pickup.address || "Pickup"} -> ` +
      `${ride.dropoff.address || "Dropoff"}`
    );

    pdf.text(
      `Status: ${ride.status} | Fare: INR ${
        ride.finalFare ?? ride.estimatedFare ?? 0
      }`
    );

    pdf.text(`Date: ${ride.createdAt.toISOString()}`);
    pdf.moveDown();
  });

  pdf.end();
}

module.exports = { makeCSV, makePDF };
