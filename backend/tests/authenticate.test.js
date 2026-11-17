/**
 * Feature 1 — User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { buildRegisterPayload, syncTestDatabase } from "./helpers.js";

describe("Feature 1 — User Authentication & Session Management", () => {
  beforeEach(async () => {
    await syncTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-1.3 — Stay signed in across page loads", () => {
    it("API request includes session token", async () => {
      const registered = await request(app).post("/todo/register").send(buildRegisterPayload());
      const token = registered.body.token;

      const missing = await request(app).get("/todo/lists");
      expect(missing.status).toBe(401);

      const authed = await request(app)
        .get("/todo/lists")
        .set("Authorization", `Bearer ${token}`);

      expect(authed.status).toBe(200);
      expect(authed.request.header.Authorization).toBe(`Bearer ${token}`);
    });

    it("Protected API request succeeds with a valid session", async () => {
      const userA = await request(app).post("/todo/register").send(buildRegisterPayload());
      await request(app).post("/todo/register").send(
        buildRegisterPayload({
          username: "userb",
          email: "userb@example.com",
        })
      );

      const res = await request(app)
        .get("/todo/lists")
        .set("Authorization", `Bearer ${userA.body.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.every((list) => list.userId === userA.body.userId)).toBe(true);
    });

    it("Expired or invalid session token", async () => {
      const registered = await request(app).post("/todo/register").send(buildRegisterPayload());
      const token = registered.body.token;

      await db.session.update(
        { expirationDate: new Date(Date.now() - 1000) },
        { where: { token } }
      );

      const expired = await request(app)
        .get("/todo/lists")
        .set("Authorization", `Bearer ${token}`);

      expect(expired.status).toBe(401);
      expect(expired.body.message).toMatch(/Unauthorized/i);

      const invalid = await request(app)
        .get("/todo/lists")
        .set("Authorization", "Bearer not-a-real-token");

      expect(invalid.status).toBe(401);
      expect(invalid.body.message).toMatch(/Unauthorized/i);
    });
  });

  describe("US-1.5 — Block unauthenticated access", () => {
    it("Unauthenticated user accesses a protected route", async () => {
      const res = await request(app).get("/todo/lists");

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Unauthorized/i);
    });
  });
});
