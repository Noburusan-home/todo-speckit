/**
 * Feature 2 — Todo List Management
 * Spec: features/feature-2-todo-list-management.md
 */
import { DOMWrapper, flushPromises } from "@vue/test-utils";
import Dashboard from "../src/views/Dashboard.vue";
import listServices from "../src/services/listServices.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/listServices.js", () => ({
  default: {
    getLists: vi.fn(),
    createList: vi.fn(),
    updateList: vi.fn(),
    deleteList: vi.fn(),
  },
}));

function list(id, name) {
  return {
    id,
    name,
    userId: 42,
    createdAt: "2026-07-02T12:00:00.000Z",
    updatedAt: "2026-07-02T12:00:00.000Z",
  };
}

async function mountDashboard() {
  const mounted = await mountWithPlugins(Dashboard, { attachTo: document.body });
  await flushPromises();
  return mounted.wrapper;
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

async function fillListName(value) {
  await flushPromises();
  const input = [...document.querySelectorAll("input")].find((element) => {
    const label = element.labels?.[0]?.textContent?.trim() || element.getAttribute("aria-label") || "";
    return label === "List name";
  });

  if (!input) {
    throw new Error(`Missing list name field. Text: ${document.body.textContent}`);
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

describe("Feature 2 — Todo List Management", () => {
  beforeEach(() => {
    listServices.getLists.mockReset();
    listServices.createList.mockReset();
    listServices.updateList.mockReset();
    listServices.deleteList.mockReset();
    listServices.getLists.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("US-2.1 — Create todo lists", () => {
    it("User creates a new list", async () => {
      listServices.createList.mockResolvedValue({ data: list(1, "Groceries") });
      const wrapper = await mountDashboard();

      await clickButton("+ New List");
      await fillListName("Groceries");
      await submitOpenForm();

      expect(listServices.createList).toHaveBeenCalledWith({ name: "Groceries" });
      expect(wrapper.text()).toContain("Groceries");
      expect(document.querySelector(".v-overlay--active")).toBeNull();
      wrapper.unmount();
    });

    it("User creates a list with an empty name", async () => {
      const wrapper = await mountDashboard();

      await clickButton("+ New List");
      await fillListName("   ");
      await submitOpenForm();

      expect(document.body.textContent).toContain("List name is required.");
      expect(listServices.createList).not.toHaveBeenCalled();
      wrapper.unmount();
    });
  });

  describe("US-2.2 — View my lists", () => {
    it("Dashboard loads with existing lists", async () => {
      listServices.getLists.mockResolvedValue({
        data: [list(1, "Personal"), list(2, "Work")],
      });
      const wrapper = await mountDashboard();

      expect(wrapper.text()).toContain("Personal");
      expect(wrapper.text()).toContain("Work");
      expect(wrapper.findAll('[aria-label="Edit list"]')).toHaveLength(2);
      expect(wrapper.findAll('[aria-label="Delete list"]')).toHaveLength(2);
      wrapper.unmount();
    });

    it("User has no lists", async () => {
      const wrapper = await mountDashboard();

      expect(wrapper.text()).toContain("No lists yet. Create your first list.");
      wrapper.unmount();
    });
  });

  describe("US-2.3 — Manage list rows", () => {
    it("List rows show edit and delete actions", async () => {
      listServices.getLists.mockResolvedValue({ data: [list(1, "Groceries")] });
      const wrapper = await mountDashboard();
      const row = wrapper.findAllComponents({ name: "VListItem" }).find((item) => item.text().includes("Groceries"));

      expect(row.find('[aria-label="Edit list"]').exists()).toBe(true);
      expect(row.find('[aria-label="Delete list"]').exists()).toBe(true);
      wrapper.unmount();
    });
  });

  describe("US-2.4 — Rename and delete lists", () => {
    it("User renames a list", async () => {
      listServices.getLists.mockResolvedValue({ data: [list(1, "Groceries")] });
      listServices.updateList.mockResolvedValue({ data: list(1, "Shopping") });
      const wrapper = await mountDashboard();

      await wrapper.get('[aria-label="Edit list"]').trigger("click");
      await fillListName("Shopping");
      await submitOpenForm();

      expect(listServices.updateList).toHaveBeenCalledWith(1, { name: "Shopping" });
      expect(wrapper.text()).toContain("Shopping");
      expect(wrapper.text()).not.toContain("Groceries");
      wrapper.unmount();
    });

    it("User deletes a list", async () => {
      listServices.getLists.mockResolvedValue({ data: [list(1, "Groceries")] });
      listServices.deleteList.mockResolvedValue({ data: { message: "List deleted." } });
      const wrapper = await mountDashboard();

      await wrapper.get('[aria-label="Delete list"]').trigger("click");
      await clickButton("Delete");

      expect(listServices.deleteList).toHaveBeenCalledWith(1);
      expect(wrapper.text()).not.toContain("Groceries");
      expect(wrapper.text()).toContain("No lists yet. Create your first list.");
      wrapper.unmount();
    });
  });
});
