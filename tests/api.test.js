const request = require("supertest")
const { app } = require("../server")

describe("Ride-Sharing API", () => {
  test("Home route should return API status", async () => {
    const response = await request(app).get("/")

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Ride-Sharing API is running")
  });

  test("Unknown route should return 404", async () => {
    const response = await request(app).get("/unknown-route");

    expect(response.statusCode).toBe(404);
  });

  test("Ride history should require authentication", async () => {
    const response = await request(app).get("/api/rides/history");

    expect(response.statusCode).toBe(401);
  });

  test("Admin analytics should require authentication", async () => {
    const response = await request(app).get("/api/analytics/rides");

    expect(response.statusCode).toBe(401);
  });

  test("Signup should reject missing required fields", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({ name: "Test User" });

    expect(response.statusCode).toBe(400);
  });

  test("Login should reject missing credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({});

    expect(response.statusCode).toBe(400);
  });
});
