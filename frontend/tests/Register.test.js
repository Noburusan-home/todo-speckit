/**
 * Feature 1 — User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */
import { flushPromises } from "@vue/test-utils";
import Register from "../src/views/Register.vue";
import authServices from "../src/services/authServices.js";
import { createTestRouter, mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/authServices.js", () => ({
  default: {
    registerUser: vi.fn(),
    loginUser: vi.fn(),
    logoutUser: vi.fn(),
  },
}));

async function fill(wrapper, label, value) {
  const field = wrapper
    .findAllComponents({ name: "VTextField" })
    .find((item) => item.props("label") === label);

  if (!field) {
    throw new Error(`Missing field: ${label}`);
  }

  await field.find("input").setValue(value);
}

async function mountRegister() {
  const router = await createTestRouter("/register");
  const { wrapper } = await mountWithPlugins(Register, { router });
  return { wrapper, router };
}

async function fillValid(wrapper, overrides = {}) {
  const values = {
    "First name": "Jane",
    "Last name": "Doe",
    Email: "jane@example.com",
    Username: "jdoe",
    Password: "password123",
    "Confirm password": "password123",
    ...overrides,
  };

  for (const [label, value] of Object.entries(values)) {
    await fill(wrapper, label, value);
  }
}

describe("Feature 1 — User Authentication & Session Management", () => {
  beforeEach(() => {
    localStorage.clear();
    authServices.registerUser.mockReset();
  });

  describe("US-1.1 — Registration", () => {
    it("User submits registration with invalid email format", async () => {
      const { wrapper } = await mountRegister();
      await fillValid(wrapper, { Email: "notanemail" });
      await wrapper.find("form").trigger("submit");
      await flushPromises();

      expect(wrapper.text()).toContain("Enter a valid email address.");
      expect(authServices.registerUser).not.toHaveBeenCalled();
    });

    it("User submits registration with missing username", async () => {
      const { wrapper } = await mountRegister();
      await fillValid(wrapper, { Username: "" });
      await wrapper.find("form").trigger("submit");
      await flushPromises();

      expect(wrapper.text()).toContain("Username is required.");
      expect(authServices.registerUser).not.toHaveBeenCalled();
    });

    it("User submits registration with password too short", async () => {
      const { wrapper } = await mountRegister();
      await fillValid(wrapper, { Password: "short", "Confirm password": "short" });
      await wrapper.find("form").trigger("submit");
      await flushPromises();

      expect(wrapper.text()).toContain("Password must be at least 8 characters.");
      expect(authServices.registerUser).not.toHaveBeenCalled();
    });

    it("User submits registration with mismatched passwords", async () => {
      const { wrapper } = await mountRegister();
      await fillValid(wrapper, { Password: "password123", "Confirm password": "password456" });
      await wrapper.find("form").trigger("submit");
      await flushPromises();

      expect(wrapper.text()).toContain("Passwords do not match.");
      expect(authServices.registerUser).not.toHaveBeenCalled();
    });
  });
});
