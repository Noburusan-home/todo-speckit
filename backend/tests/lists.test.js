/**
 * Feature 2 — Todo List Management
 * Spec: features/feature-2-todo-list-management.md
 */
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

describe("Feature 2 — Todo List Management", () => {
  beforeEach(async () => {
    await syncTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-2.1 — Create todo lists", () => {
    it("User creates a new list", async () => {
      const user = await register();

      const res = await request(app)
        .post("/todo/lists")
        .set(withToken(user.token))
        .send({ name: "Groceries" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        name: "Groceries",
        userId: user.userId,
      });
      expect(res.body.id).toEqual(expect.any(Number));
      expect(res.body.createdAt).toEqual(expect.any(String));
      expect(res.body.updatedAt).toEqual(expect.any(String));
    });

    it("User creates a list with an empty name", async () => {
      const user = await register();

      const empty = await request(app)
        .post("/todo/lists")
        .set(withToken(user.token))
        .send({ name: "" });
      const whitespace = await request(app)
        .post("/todo/lists")
        .set(withToken(user.token))
        .send({ name: "   " });

      expect(empty.status).toBe(400);
      expect(empty.body).toEqual({ message: "List name is required." });
      expect(whitespace.status).toBe(400);
      expect(whitespace.body).toEqual({ message: "List name is required." });
      expect(await db.list.count()).toBe(0);
    });

    it("User creates a list with a name that is too long", async () => {
      const user = await register();

      const res = await request(app)
        .post("/todo/lists")
        .set(withToken(user.token))
        .send({ name: "a".repeat(101) });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "List name must be 100 characters or fewer." });
      expect(await db.list.count()).toBe(0);
    });
  });

  describe("US-2.2 — View my lists", () => {
    it("Dashboard loads with existing lists", async () => {
      const user = await register();

      await request(app).post("/todo/lists").set(withToken(user.token)).send({ name: "Work" });
      await request(app).post("/todo/lists").set(withToken(user.token)).send({ name: "Personal" });

      const res = await request(app).get("/todo/lists").set(withToken(user.token));

      expect(res.status).toBe(200);
      expect(res.body.map((list) => list.name)).toEqual(["Personal", "Work"]);
    });

    it("User cannot see another user's lists", async () => {
      const userA = await register();
      const userB = await register({
        username: "userb",
        email: "userb@example.com",
      });

      await request(app).post("/todo/lists").set(withToken(userA.token)).send({ name: "Work" });
      await request(app)
        .post("/todo/lists")
        .set(withToken(userB.token))
        .send({ name: "Secret Project" });

      const res = await request(app).get("/todo/lists").set(withToken(userA.token));

      expect(res.status).toBe(200);
      expect(res.body.map((list) => list.name)).toEqual(["Work"]);
      expect(res.body.every((list) => list.userId === userA.userId)).toBe(true);
      expect(res.body.some((list) => list.name === "Secret Project")).toBe(false);
    });
  });

  describe("US-2.4 — Rename and delete lists", () => {
    it("User renames a list", async () => {
      const user = await register();
      const created = await request(app)
        .post("/todo/lists")
        .set(withToken(user.token))
        .send({ name: "Groceries" });

      const res = await request(app)
        .put(`/todo/lists/${created.body.id}`)
        .set(withToken(user.token))
        .send({ name: "Shopping" });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: created.body.id,
        name: "Shopping",
        userId: user.userId,
      });
    });

    it("User deletes a list", async () => {
      const user = await register();
      const created = await request(app)
        .post("/todo/lists")
        .set(withToken(user.token))
        .send({ name: "Groceries" });

      const res = await request(app)
        .delete(`/todo/lists/${created.body.id}`)
        .set(withToken(user.token));

      expect(res.status).toBe(200);
      expect(await db.list.findByPk(created.body.id)).toBeNull();
    });
  });

  describe("US-2.5 — Private lists only", () => {
    it("User attempts to rename another user's list", async () => {
      const userA = await register();
      const userB = await register({
        username: "userb",
        email: "userb@example.com",
      });
      const created = await request(app)
        .post("/todo/lists")
        .set(withToken(userB.token))
        .send({ name: "Secret Project" });

      const res = await request(app)
        .put(`/todo/lists/${created.body.id}`)
        .set(withToken(userA.token))
        .send({ name: "Hijacked" });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: `List with id=${created.body.id} not found.` });

      const stored = await db.list.findByPk(created.body.id);
      expect(stored.name).toBe("Secret Project");
    });

    it("User attempts to delete another user's list", async () => {
      const userA = await register();
      const userB = await register({
        username: "userb",
        email: "userb@example.com",
      });
      const created = await request(app)
        .post("/todo/lists")
        .set(withToken(userB.token))
        .send({ name: "Secret Project" });

      const res = await request(app)
        .delete(`/todo/lists/${created.body.id}`)
        .set(withToken(userA.token));

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: `List with id=${created.body.id} not found.` });
      expect(await db.list.findByPk(created.body.id)).not.toBeNull();
    });

    it("Client cannot assign a list to another user on create", async () => {
      const userA = await register();

      const res = await request(app)
        .post("/todo/lists")
        .set(withToken(userA.token))
        .send({ name: "Groceries", userId: 999 });

      expect(res.status).toBe(201);
      expect(res.body.userId).toBe(userA.userId);
      expect(res.body.userId).not.toBe(999);

      const stored = await db.list.findByPk(res.body.id);
      expect(stored.userId).toBe(userA.userId);
    });

    it("Unauthenticated API request to lists", async () => {
      const res = await request(app).get("/todo/lists");

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Unauthorized/i);
    });
  });
});
