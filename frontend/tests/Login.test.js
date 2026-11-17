/**
 * Feature 1 — User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */
import { flushPromises } from "@vue/test-utils";
import Login from "../src/views/Login.vue";
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

describe("Feature 1 — User Authentication & Session Management", () => {
  beforeEach(() => {
    localStorage.clear();
    authServices.loginUser.mockReset();
  });

  describe("US-1.2 — Sign in", () => {
    it("User signs in with invalid password", async () => {
      authServices.loginUser.mockRejectedValue({
        response: { status: 401, data: { message: "Invalid username or password." } },
      });

      const router = await createTestRouter("/login");
      const { wrapper } = await mountWithPlugins(Login, { router });
      await fill(wrapper, "Username", "jdoe");
      await fill(wrapper, "Password", "wrong-password");
      await wrapper.find("form").trigger("submit");
      await flushPromises();

      expect(authServices.loginUser).toHaveBeenCalledOnce();
      expect(wrapper.find(".v-alert").text()).toContain("Invalid username or password.");
      expect(router.currentRoute.value.name).toBe("login");
    });

    it("User signs in with missing username", async () => {
      const router = await createTestRouter("/login");
      const { wrapper } = await mountWithPlugins(Login, { router });
      await fill(wrapper, "Password", "password123");
      await wrapper.find("form").trigger("submit");
      await flushPromises();

      expect(wrapper.text()).toContain("Username is required.");
      expect(authServices.loginUser).not.toHaveBeenCalled();
    });

    it("User signs in with missing password", async () => {
      const router = await createTestRouter("/login");
      const { wrapper } = await mountWithPlugins(Login, { router });
      await fill(wrapper, "Username", "jdoe");
      await wrapper.find("form").trigger("submit");
      await flushPromises();

      expect(wrapper.text()).toContain("Password is required.");
      expect(authServices.loginUser).not.toHaveBeenCalled();
    });
  });
});
