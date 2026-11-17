/**
 * Feature 1 — User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */
import router from "../src/router.js";
import Utils from "../src/config/utils.js";

const session = {
  userId: 1,
  username: "jdoe",
  email: "jdoe@example.com",
  fName: "Jane",
  lName: "Doe",
  role: "worker",
  token: "session-token",
};

describe("Feature 1 — User Authentication & Session Management", () => {
  beforeEach(async () => {
    localStorage.clear();
    await router.push({ name: "register" });
    await router.isReady();
  });

  describe("US-1.3 — Stay signed in across page loads", () => {
    it("Signed-in user visits login page", async () => {
      Utils.setStore("user", session);
      await router.push({ name: "home" });
      await router.push({ name: "login" });

      expect(router.currentRoute.value.name).toBe("home");
    });
  });

  describe("US-1.5 — Block unauthenticated access", () => {
    it("Unauthenticated user accesses a protected route", async () => {
      await router.push({ name: "home" });

      expect(router.currentRoute.value.name).toBe("login");
    });
  });
});

describe("Feature 2 — Todo List Management", () => {
  beforeEach(async () => {
    localStorage.clear();
    await router.push({ name: "register" });
    await router.isReady();
  });

  describe("US-2.5 — Private lists only", () => {
    it("Unauthenticated user accesses the dashboard", async () => {
      await router.push({ name: "home" });

      expect(router.currentRoute.value.name).toBe("login");
    });
  });
});
