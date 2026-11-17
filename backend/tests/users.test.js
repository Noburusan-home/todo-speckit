/**
 * Feature 4 — User Profile Management
 * Spec: features/feature-4-user-profile-management.md
 */
import bcrypt from "bcryptjs";
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { buildRegisterPayload, syncTestDatabase } from "./helpers.js";

async function register(overrides) {
  const res = await request(app).post("/todo/register").send(buildRegisterPayload(overrides));
  expect(res.status).toBe(201);
  return res.body;
}

function withToken(token) {
  return { Authorization: `Bearer ${token}` };
}

function profileBody(overrides = {}) {
  return {
    fName: "Jane",
    lName: "Doe",
    email: "jdoe@example.com",
    username: "jdoe",
    ...overrides,
  };
}

describe("Feature 4 — User Profile Management", () => {
  beforeEach(async () => {
    await syncTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-4.2 — Edit profile", () => {
    it("User saves profile changes", async () => {
      const user = await register();

      const res = await request(app)
        .put(`/todo/users/${user.userId}`)
        .set(withToken(user.token))
        .send(profileBody({
          fName: "Janet",
          lName: "Smith",
          email: "janet@example.com",
          username: "janet",
        }));

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: user.userId,
        fName: "Janet",
        lName: "Smith",
        email: "janet@example.com",
        username: "janet",
        role: "worker",
      });
      expect(res.body.password).toBeUndefined();

      const stored = await db.user.unscoped().findByPk(user.userId);
      expect(await bcrypt.compare("password123", stored.password)).toBe(true);

      const renamed = await request(app)
        .put(`/todo/users/${user.userId}`)
        .set(withToken(user.token))
        .send(profileBody({
          fName: "Janet",
          lName: "Smith",
          email: "janet@example.com",
          username: "janet",
          password: "newpassword123",
        }));
      expect(renamed.status).toBe(200);
      expect(renamed.body.password).toBeUndefined();

      const login = await request(app).post("/todo/login").send({
        username: "janet",
        password: "newpassword123",
      });
      expect(login.status).toBe(200);
    });

    it("User fetches their own profile", async () => {
      const user = await register();

      const res = await request(app)
        .get(`/todo/users/${user.userId}`)
        .set(withToken(user.token));

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: user.userId,
        fName: "Jane",
        lName: "Doe",
        email: "jdoe@example.com",
        username: "jdoe",
        role: "worker",
      });
      expect(res.body.password).toBeUndefined();
    });

    it("User attempts to fetch another user's profile", async () => {
      const userA = await register();
      const userB = await register({ username: "userb", email: "b@example.com" });

      const res = await request(app)
        .get(`/todo/users/${userB.userId}`)
        .set(withToken(userA.token));

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: `User with id=${userB.userId} not found.` });
    });

    it("User attempts to update another user's profile", async () => {
      const userA = await register();
      const userB = await register({ username: "userb", email: "b@example.com" });

      const res = await request(app)
        .put(`/todo/users/${userB.userId}`)
        .set(withToken(userA.token))
        .send(profileBody({ fName: "Hijacked", username: "userb", email: "b@example.com" }));

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: `User with id=${userB.userId} not found.` });
      const stored = await db.user.findByPk(userB.userId);
      expect(stored.fName).toBe("Jane");
      expect(stored.username).toBe("userb");
    });

    it("Unauthenticated profile API request", async () => {
      const res = await request(app).get("/todo/users/1");

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Unauthorized/i);
    });

    it("Profile update rejects a password that is too short", async () => {
      const user = await register();

      const res = await request(app)
        .put(`/todo/users/${user.userId}`)
        .set(withToken(user.token))
        .send({ password: "short" });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Password must be at least 8 characters." });
    });

    it("Profile update rejects missing required fields", async () => {
      const user = await register();

      const res = await request(app)
        .put(`/todo/users/${user.userId}`)
        .set(withToken(user.token))
        .send(profileBody({ fName: "" }));

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "First name is required." });
      const stored = await db.user.findByPk(user.userId);
      expect(stored.fName).toBe("Jane");
    });

    it("Profile update rejects a duplicate username", async () => {
      const userA = await register();
      await register({ username: "userb", email: "b@example.com" });

      const res = await request(app)
        .put(`/todo/users/${userA.userId}`)
        .set(withToken(userA.token))
        .send(profileBody({ username: "userb" }));

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Username is already taken." });
      const stored = await db.user.findOne({ where: { username: "userb" } });
      expect(stored.email).toBe("b@example.com");
    });

    it("Profile update rejects a duplicate email", async () => {
      const userA = await register();
      await register({ username: "userb", email: "b@example.com" });

      const res = await request(app)
        .put(`/todo/users/${userA.userId}`)
        .set(withToken(userA.token))
        .send(profileBody({ email: "b@example.com" }));

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Email is already registered." });
      const stored = await db.user.findOne({ where: { email: "b@example.com" } });
      expect(stored.username).toBe("userb");
    });

    it("Unauthenticated profile update API request", async () => {
      const res = await request(app).put("/todo/users/1").send(profileBody());

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Unauthorized/i);
    });
  });
});
