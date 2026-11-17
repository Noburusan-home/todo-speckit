/**
 * Feature 3 — Todo List Item Management
 * Spec: features/feature-3-todo-list-item-management.md
 *
 * Feature 5 — Todo Due Date
 * Spec: features/feature-5-todo-due-date.md
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

async function createList(token, name) {
  const res = await request(app).post("/todo/lists").set(withToken(token)).send({ name });
  expect(res.status).toBe(201);
  return res.body;
}

describe("Feature 3 — Todo List Item Management", () => {
  beforeEach(async () => {
    await syncTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-3.1 — Add tasks to a list", () => {
    it("User adds a todo to a list via dialog", async () => {
      const user = await register();
      const list = await createList(user.token, "Groceries");

      const res = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(withToken(user.token))
        .send({ title: "Buy milk" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        title: "Buy milk",
        completed: false,
        userId: user.userId,
        listId: list.id,
      });
      expect(res.body.id).toEqual(expect.any(Number));
    });

    it("User adds a todo with an empty title", async () => {
      const user = await register();
      const list = await createList(user.token, "Groceries");

      const empty = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(withToken(user.token))
        .send({ title: "" });
      const whitespace = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(withToken(user.token))
        .send({ title: "   " });

      expect(empty.status).toBe(400);
      expect(empty.body).toEqual({ message: "Todo title is required." });
      expect(whitespace.status).toBe(400);
      expect(whitespace.body).toEqual({ message: "Todo title is required." });
      expect(await db.todo.count()).toBe(0);
    });
  });

  describe("US-3.2 — View tasks in a list", () => {
    it("User only sees their own todos when opening items", async () => {
      const userA = await register();
      const userB = await register({ username: "userb", email: "userb@example.com" });
      const listA = await createList(userA.token, "Work");
      const listB = await createList(userB.token, "Work");

      await request(app)
        .post(`/todo/lists/${listA.id}/todos`)
        .set(withToken(userA.token))
        .send({ title: "My task" });
      await request(app)
        .post(`/todo/lists/${listB.id}/todos`)
        .set(withToken(userB.token))
        .send({ title: "Their task" });

      const res = await request(app)
        .get(`/todo/lists/${listA.id}/todos`)
        .set(withToken(userA.token));

      expect(res.status).toBe(200);
      expect(res.body.map((todo) => todo.title)).toEqual(["My task"]);
      expect(res.body.every((todo) => todo.userId === userA.userId)).toBe(true);
    });
  });

  describe("US-3.3 — Complete tasks", () => {
    it("User marks a todo as complete", async () => {
      const user = await register();
      const list = await createList(user.token, "Groceries");
      const created = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(withToken(user.token))
        .send({ title: "Buy milk" });

      const res = await request(app)
        .put(`/todo/todos/${created.body.id}`)
        .set(withToken(user.token))
        .send({ completed: true });

      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(true);
      expect(res.body.title).toBe("Buy milk");
    });

    it("User marks a completed todo as incomplete", async () => {
      const user = await register();
      const list = await createList(user.token, "Groceries");
      const created = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(withToken(user.token))
        .send({ title: "Buy milk" });
      await request(app)
        .put(`/todo/todos/${created.body.id}`)
        .set(withToken(user.token))
        .send({ completed: true });

      const res = await request(app)
        .put(`/todo/todos/${created.body.id}`)
        .set(withToken(user.token))
        .send({ completed: false });

      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(false);
    });
  });

  describe("US-3.4 — Edit and remove tasks", () => {
    it("User edits a todo title", async () => {
      const user = await register();
      const list = await createList(user.token, "Groceries");
      const created = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(withToken(user.token))
        .send({ title: "Buy milk" });

      const res = await request(app)
        .put(`/todo/todos/${created.body.id}`)
        .set(withToken(user.token))
        .send({ title: "Buy oat milk" });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Buy oat milk");
      expect(res.body.listId).toBe(list.id);
      expect(res.body.userId).toBe(user.userId);
    });

    it("User deletes a todo", async () => {
      const user = await register();
      const list = await createList(user.token, "Groceries");
      const created = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(withToken(user.token))
        .send({ title: "Buy milk" });

      const res = await request(app)
        .delete(`/todo/todos/${created.body.id}`)
        .set(withToken(user.token));

      expect(res.status).toBe(200);
      expect(await db.todo.findByPk(created.body.id)).toBeNull();
    });
  });

  describe("US-3.5 — Private items only", () => {
    it("User cannot read todos in another user's list", async () => {
      const userA = await register();
      const userB = await register({ username: "userb", email: "userb@example.com" });
      const secret = await createList(userB.token, "Secret");
      await request(app)
        .post(`/todo/lists/${secret.id}/todos`)
        .set(withToken(userB.token))
        .send({ title: "Hidden task" });

      const res = await request(app)
        .get(`/todo/lists/${secret.id}/todos`)
        .set(withToken(userA.token));

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: `List with id=${secret.id} not found.` });
      expect(JSON.stringify(res.body)).not.toContain("Hidden task");
    });

    it("User attempts to add a todo to another user's list", async () => {
      const userA = await register();
      const userB = await register({ username: "userb", email: "userb@example.com" });
      const secret = await createList(userB.token, "Secret");

      const res = await request(app)
        .post(`/todo/lists/${secret.id}/todos`)
        .set(withToken(userA.token))
        .send({ title: "Intruder task" });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: `List with id=${secret.id} not found.` });
      expect(await db.todo.count({ where: { listId: secret.id } })).toBe(0);
    });

    it("User attempts to rename another user's todo", async () => {
      const userA = await register();
      const userB = await register({ username: "userb", email: "userb@example.com" });
      const secret = await createList(userB.token, "Secret");
      const created = await request(app)
        .post(`/todo/lists/${secret.id}/todos`)
        .set(withToken(userB.token))
        .send({ title: "Hidden task" });

      const res = await request(app)
        .put(`/todo/todos/${created.body.id}`)
        .set(withToken(userA.token))
        .send({ title: "Hijacked" });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: `Todo with id=${created.body.id} not found.` });
      expect((await db.todo.findByPk(created.body.id)).title).toBe("Hidden task");
    });

    it("User attempts to delete another user's todo", async () => {
      const userA = await register();
      const userB = await register({ username: "userb", email: "userb@example.com" });
      const secret = await createList(userB.token, "Secret");
      const created = await request(app)
        .post(`/todo/lists/${secret.id}/todos`)
        .set(withToken(userB.token))
        .send({ title: "Hidden task" });

      const res = await request(app)
        .delete(`/todo/todos/${created.body.id}`)
        .set(withToken(userA.token));

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: `Todo with id=${created.body.id} not found.` });
      expect(await db.todo.findByPk(created.body.id)).not.toBeNull();
    });

    it("Client cannot assign a todo to another user on create", async () => {
      const user = await register();
      const list = await createList(user.token, "Groceries");

      const res = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(withToken(user.token))
        .send({ title: "Buy milk", userId: 999, listId: 999 });

      expect(res.status).toBe(201);
      expect(res.body.userId).toBe(user.userId);
      expect(res.body.listId).toBe(list.id);
      const stored = await db.todo.findByPk(res.body.id);
      expect(stored.userId).toBe(user.userId);
      expect(stored.listId).toBe(list.id);
    });

    it("Unauthenticated API request for todos", async () => {
      const res = await request(app).get("/todo/lists/1/todos");

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Unauthorized/i);
    });
  });

  describe("US-3.6 — Lists carry their items", () => {
    it("Deleting a list removes its todos", async () => {
      const user = await register();
      const list = await createList(user.token, "Groceries");
      await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(withToken(user.token))
        .send({ title: "Buy milk" });
      await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(withToken(user.token))
        .send({ title: "Buy eggs" });

      const deleted = await request(app)
        .delete(`/todo/lists/${list.id}`)
        .set(withToken(user.token));
      expect(deleted.status).toBe(200);

      expect(await db.todo.count({ where: { listId: list.id } })).toBe(0);
      const again = await request(app)
        .get(`/todo/lists/${list.id}/todos`)
        .set(withToken(user.token));
      expect(again.status).toBe(404);
      expect(again.body).toEqual({ message: `List with id=${list.id} not found.` });
    });
  });

  describe("US-5.1 — Set a due date when creating a todo", () => {
    it("User adds a todo with a due date", async () => {
      const user = await register();
      const list = await createList(user.token, "Groceries");

      const res = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(withToken(user.token))
        .send({ title: "Buy milk", dueDate: "2026-07-15" });

      expect(res.status).toBe(201);
      expect(res.body.dueDate).toBe("2026-07-15");
      expect(res.body.title).toBe("Buy milk");
    });

    it("User adds a todo without a due date", async () => {
      const user = await register();
      const list = await createList(user.token, "Groceries");

      const res = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(withToken(user.token))
        .send({ title: "Buy milk" });

      expect(res.status).toBe(201);
      expect(res.body.dueDate).toBeNull();
    });

    it("API rejects an invalid due date on create", async () => {
      const user = await register();
      const list = await createList(user.token, "Groceries");

      const res = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(withToken(user.token))
        .send({ title: "Task", dueDate: "not-a-date" });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Due date must be a valid date in YYYY-MM-DD format." });
      expect(await db.todo.count()).toBe(0);
    });
  });

  describe("US-5.3 — Edit or clear a due date", () => {
    it("User sets a due date when editing a todo", async () => {
      const user = await register();
      const list = await createList(user.token, "Groceries");
      const created = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(withToken(user.token))
        .send({ title: "Buy milk" });

      const res = await request(app)
        .put(`/todo/todos/${created.body.id}`)
        .set(withToken(user.token))
        .send({ dueDate: "2026-07-20" });

      expect(res.status).toBe(200);
      expect(res.body.dueDate).toBe("2026-07-20");
      expect(res.body.title).toBe("Buy milk");
    });

    it("User clears a due date when editing a todo", async () => {
      const user = await register();
      const list = await createList(user.token, "Groceries");
      const created = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(withToken(user.token))
        .send({ title: "Buy milk", dueDate: "2026-07-20" });

      const res = await request(app)
        .put(`/todo/todos/${created.body.id}`)
        .set(withToken(user.token))
        .send({ dueDate: null });

      expect(res.status).toBe(200);
      expect(res.body.dueDate).toBeNull();
    });

    it("API rejects an invalid due date on update", async () => {
      const user = await register();
      const list = await createList(user.token, "Groceries");
      const created = await request(app)
        .post(`/todo/lists/${list.id}/todos`)
        .set(withToken(user.token))
        .send({ title: "Buy milk", dueDate: "2026-07-15" });

      const res = await request(app)
        .put(`/todo/todos/${created.body.id}`)
        .set(withToken(user.token))
        .send({ dueDate: "2026-99-99" });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Due date must be a valid date in YYYY-MM-DD format." });
      expect((await db.todo.findByPk(created.body.id)).dueDate).toBe("2026-07-15");
    });

    it("User cannot set due date on another user's todo", async () => {
      const userA = await register();
      const userB = await register({ username: "userb", email: "userb@example.com" });
      const secret = await createList(userB.token, "Secret");
      const created = await request(app)
        .post(`/todo/lists/${secret.id}/todos`)
        .set(withToken(userB.token))
        .send({ title: "Hidden task" });

      const res = await request(app)
        .put(`/todo/todos/${created.body.id}`)
        .set(withToken(userA.token))
        .send({ dueDate: "2026-07-15" });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: `Todo with id=${created.body.id} not found.` });
      expect((await db.todo.findByPk(created.body.id)).dueDate).toBeNull();
    });
  });
});
