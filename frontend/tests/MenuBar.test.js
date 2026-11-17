/**
 * Feature 4 — User Profile Management
 * Spec: features/feature-4-user-profile-management.md
 */
import { DOMWrapper, flushPromises } from "@vue/test-utils";
import { h } from "vue";
import { VApp } from "vuetify/components";
import MenuBar from "../src/components/MenuBar.vue";
import authServices from "../src/services/authServices.js";
import userServices from "../src/services/userServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/authServices.js", () => ({
  default: {
    registerUser: vi.fn(),
    loginUser: vi.fn(),
    logoutUser: vi.fn(),
  },
}));

vi.mock("../src/services/userServices.js", () => ({
  default: {
    getUser: vi.fn(),
    updateUser: vi.fn(),
  },
}));

const sessionUser = {
  userId: 42,
  username: "jdoe",
  email: "jdoe@example.com",
  fName: "Jane",
  lName: "Doe",
  role: "worker",
  token: "token",
};

const profile = {
  id: 42,
  fName: "Jane",
  lName: "Doe",
  email: "jdoe@example.com",
  username: "jdoe",
  role: "worker",
};

async function mountMenuBar() {
  const mounted = await mountWithPlugins(
    {
      components: { VApp, MenuBar },
      render: () => h(VApp, null, { default: () => h(MenuBar) }),
    },
    { attachTo: document.body }
  );

  await flushPromises();
  return mounted;
}

function buttons() {
  return [...document.querySelectorAll("button")];
}

async function clickButton(text) {
  await flushPromises();
  const button = buttons().find((item) => item.textContent.trim() === text);

  if (!button) {
    throw new Error(`Missing button: ${text}. Buttons: ${buttons().map((item) => item.textContent.trim()).join(" | ")}`);
  }

  await new DOMWrapper(button).trigger("click");
  await flushPromises();
}

async function openProfile() {
  const button = document.querySelector('[aria-label="Profile"]');

  if (!button) {
    throw new Error("Missing profile button");
  }

  await new DOMWrapper(button).trigger("click");
  await flushPromises();
}

async function fillField(label, value) {
  await flushPromises();
  const input = [...document.querySelectorAll("input")].find((element) => {
    const fieldLabel = element.labels?.[0]?.textContent?.trim() || element.getAttribute("aria-label") || "";
    return fieldLabel === label;
  });

  if (!input) {
    throw new Error(`Missing field: ${label}. Text: ${document.body.textContent}`);
  }

  await new DOMWrapper(input).setValue(value);
}

async function submitOpenForm() {
  const form = document.querySelector(".v-overlay--active form");

  if (!form) {
    throw new Error("Missing open form");
  }

  await new DOMWrapper(form).trigger("submit");
  await flushPromises();
}

describe("Feature 4 — User Profile Management", () => {
  beforeEach(() => {
    localStorage.clear();
    Utils.setStore("user", sessionUser);
    authServices.logoutUser.mockReset();
    userServices.getUser.mockReset();
    userServices.updateUser.mockReset();
    userServices.getUser.mockResolvedValue({ data: { ...profile } });
    authServices.logoutUser.mockResolvedValue({ data: { message: "Signed out." } });
  });

  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
  });

  describe("US-4.1 — View profile from the menu bar", () => {
    it("User opens the profile dropdown from the menu bar", async () => {
      const { wrapper } = await mountMenuBar();

      await openProfile();

      expect(document.body.textContent).toContain("Jane Doe");
      expect(document.body.textContent).toContain("jdoe");
      expect(document.body.textContent).toContain("jdoe@example.com");
      expect(document.body.textContent).toContain("Edit Profile");
      expect(document.body.textContent).toContain("Log out");
      wrapper.unmount();
    });
  });

  describe("US-4.2 — Edit profile", () => {
    it("User opens the edit profile dialog", async () => {
      const { wrapper } = await mountMenuBar();

      await openProfile();
      await clickButton("Edit Profile");

      expect(document.body.textContent).toContain("Edit Profile");
      const values = Object.fromEntries(
        [...document.querySelectorAll("input")].map((element) => [
          element.labels?.[0]?.textContent?.trim() || element.getAttribute("aria-label") || "",
          element.value,
        ])
      );
      expect(values["First name"]).toBe("Jane");
      expect(values["Last name"]).toBe("Doe");
      expect(values.Email).toBe("jdoe@example.com");
      expect(values.Username).toBe("jdoe");
      wrapper.unmount();
    });

    it("User cancels the edit profile dialog", async () => {
      const { wrapper } = await mountMenuBar();

      await openProfile();
      await clickButton("Edit Profile");
      await fillField("First name", "Janet");
      await clickButton("Cancel");

      expect(document.querySelector(".v-overlay--active form")).toBeNull();
      expect(userServices.updateUser).not.toHaveBeenCalled();
      expect(Utils.getStore("user").fName).toBe("Jane");
      wrapper.unmount();
    });

    it("User saves profile changes", async () => {
      userServices.updateUser.mockResolvedValue({
        data: {
          id: 42,
          fName: "Janet",
          lName: "Doe",
          email: "janet@example.com",
          username: "janet",
          role: "worker",
        },
      });
      const { wrapper } = await mountMenuBar();

      await openProfile();
      await clickButton("Edit Profile");
      await fillField("First name", "Janet");
      await fillField("Email", "janet@example.com");
      await fillField("Username", "janet");
      await submitOpenForm();

      expect(userServices.updateUser).toHaveBeenCalledWith(42, {
        fName: "Janet",
        lName: "Doe",
        email: "janet@example.com",
        username: "janet",
      });
      expect(document.querySelector(".v-overlay--active form")).toBeNull();
      expect(Utils.getStore("user")).toMatchObject({
        userId: 42,
        fName: "Janet",
        lName: "Doe",
        email: "janet@example.com",
        username: "janet",
        token: "token",
      });

      await openProfile();
      expect(document.body.textContent).toContain("Janet Doe");
      expect(document.body.textContent).toContain("janet");
      expect(document.body.textContent).toContain("janet@example.com");
      wrapper.unmount();
    });

    it("User saves profile with invalid email format", async () => {
      const { wrapper } = await mountMenuBar();

      await openProfile();
      await clickButton("Edit Profile");
      await fillField("Email", "notanemail");
      await submitOpenForm();

      expect(document.body.textContent).toContain("Enter a valid email address.");
      expect(userServices.updateUser).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    it("User saves profile with mismatched passwords", async () => {
      const { wrapper } = await mountMenuBar();

      await openProfile();
      await clickButton("Edit Profile");
      await fillField("Password", "newpassword123");
      await fillField("Confirm password", "different123");
      await submitOpenForm();

      expect(document.body.textContent).toContain("Passwords do not match.");
      expect(userServices.updateUser).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    it("User saves profile with a password that is too short", async () => {
      const { wrapper } = await mountMenuBar();

      await openProfile();
      await clickButton("Edit Profile");
      await fillField("Password", "short");
      await fillField("Confirm password", "short");
      await submitOpenForm();

      expect(document.body.textContent).toContain("Password must be at least 8 characters.");
      expect(userServices.updateUser).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    it("Profile update API returns an error", async () => {
      userServices.updateUser.mockRejectedValue({
        response: { status: 400, data: { message: "Username is already taken." } },
      });
      const { wrapper } = await mountMenuBar();

      await openProfile();
      await clickButton("Edit Profile");
      await submitOpenForm();

      expect(document.body.textContent).toContain("Username is already taken.");
      expect(document.querySelector(".v-overlay--active form")).not.toBeNull();
      wrapper.unmount();
    });
  });

  describe("US-4.3 — Log out from profile", () => {
    it("User logs out from the profile dropdown", async () => {
      const { wrapper, router } = await mountMenuBar();

      await openProfile();
      await clickButton("Log out");

      expect(authServices.logoutUser).toHaveBeenCalled();
      expect(Utils.getStore("user")).toBeNull();
      await vi.waitFor(() => {
        expect(router.currentRoute.value.name).toBe("login");
      });
      wrapper.unmount();
    });
  });

  describe("US-4.4 — Single logout entry point", () => {
    it("Menu bar does not show Sign out", async () => {
      const { wrapper } = await mountMenuBar();

      expect(wrapper.text()).not.toContain("Sign out");
      expect(document.body.textContent).not.toContain("Sign out");
      wrapper.unmount();
    });
  });
});
