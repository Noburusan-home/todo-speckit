/**
 * Feature 1 — User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */
import bcrypt from "bcryptjs";
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

  describe("US-1.1 — Registration", () => {
    it("User registers with valid information", async () => {
      const res = await request(app).post("/todo/register").send(buildRegisterPayload());

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        username: "jdoe",
        email: "jdoe@example.com",
        fName: "Jane",
        lName: "Doe",
        role: "worker",
      });
      expect(res.body.userId).toEqual(expect.any(Number));
      expect(res.body.token).toEqual(expect.any(String));
      expect(res.body.password).toBeUndefined();

      const stored = await db.user.unscoped().findOne({ where: { username: "jdoe" } });
      expect(stored.password).not.toBe("password123");
      expect(await bcrypt.compare("password123", stored.password)).toBe(true);

      const session = await db.session.findOne({ where: { token: res.body.token } });
      expect(session).not.toBeNull();
      expect(session.userId).toBe(res.body.userId);
      expect(new Date(session.expirationDate).getTime()).toBeGreaterThan(Date.now());
    });

    it("User submits registration with missing email", async () => {
      const payload = buildRegisterPayload();
      delete payload.email;

      const res = await request(app).post("/todo/register").send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Email is required." });
      expect(await db.user.count()).toBe(0);
    });

    it("User submits registration with password too short", async () => {
      const res = await request(app)
        .post("/todo/register")
        .send(buildRegisterPayload({ password: "short" }));

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Password must be at least 8 characters." });
      expect(await db.user.count()).toBe(0);
    });

    it("User registers with a duplicate username", async () => {
      await request(app).post("/todo/register").send(buildRegisterPayload());

      const res = await request(app)
        .post("/todo/register")
        .send(buildRegisterPayload({ email: "other@example.com" }));

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Username is already taken." });
      expect(await db.user.count()).toBe(1);
    });

    it("User registers with a duplicate email", async () => {
      await request(app).post("/todo/register").send(buildRegisterPayload());

      const res = await request(app)
        .post("/todo/register")
        .send(buildRegisterPayload({ username: "janed" }));

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Email is already registered." });
      expect(await db.user.count()).toBe(1);
    });
  });

  describe("US-1.2 — Sign in", () => {
    it("User signs in with valid credentials", async () => {
      await request(app).post("/todo/register").send(buildRegisterPayload());
      await db.session.destroy({ where: {} });

      const created = await request(app).post("/todo/login").send({
        username: "jdoe",
        password: "password123",
      });

      expect(created.status).toBe(200);
      expect(created.body).toMatchObject({
        username: "jdoe",
        role: "worker",
      });
      expect(created.body.userId).toEqual(expect.any(Number));
      expect(created.body.token).toEqual(expect.any(String));
      expect(created.body.password).toBeUndefined();
      expect(await db.session.count()).toBe(1);

      const reused = await request(app).post("/todo/login").send({
        username: " Jdoe ",
        password: "password123",
      });

      expect(reused.status).toBe(200);
      expect(reused.body.token).toBe(created.body.token);
      expect(await db.session.count()).toBe(1);
    });

    it("User signs in with invalid password", async () => {
      await request(app).post("/todo/register").send(buildRegisterPayload());

      const res = await request(app).post("/todo/login").send({
        username: "jdoe",
        password: "wrong-password",
      });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Invalid username or password." });
    });

    it("User signs in with missing username", async () => {
      const res = await request(app).post("/todo/login").send({
        username: "   ",
        password: "password123",
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Username is required." });
    });

    it("User signs in with missing password", async () => {
      const res = await request(app).post("/todo/login").send({
        username: "jdoe",
        password: "   ",
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Password is required." });
    });
  });

  describe("US-1.4 — Sign out", () => {
    it("User signs out", async () => {
      const registered = await request(app).post("/todo/register").send(buildRegisterPayload());
      const token = registered.body.token;

      const res = await request(app)
        .post("/todo/logout")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(await db.session.findOne({ where: { token } })).toBeNull();

      const again = await request(app)
        .get("/todo/lists")
        .set("Authorization", `Bearer ${token}`);

      expect(again.status).toBe(401);
      expect(again.body.message).toMatch(/Unauthorized/i);
    });
  });
});
