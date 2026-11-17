/**
 * Feature 2 — Todo List Management
 * Spec: features/feature-2-todo-list-management.md
 *
 * Feature 3 — Todo List Item Management
 * Spec: features/feature-3-todo-list-item-management.md
 */
import { DOMWrapper, flushPromises } from "@vue/test-utils";
import Dashboard from "../src/views/Dashboard.vue";
import listServices from "../src/services/listServices.js";
import todoServices from "../src/services/todoServices.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/listServices.js", () => ({
  default: {
    getLists: vi.fn(),
    createList: vi.fn(),
    updateList: vi.fn(),
    deleteList: vi.fn(),
  },
}));

vi.mock("../src/services/todoServices.js", () => ({
  default: {
    getTodos: vi.fn(),
    createTodo: vi.fn(),
    updateTodo: vi.fn(),
    deleteTodo: vi.fn(),
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

function todo(id, title, listId, completed = false, createdAt = "2026-07-02T12:05:00.000Z") {
  return {
    id,
    listId,
    title,
    completed,
    userId: 42,
    createdAt,
    updatedAt: createdAt,
  };
}

async function openItems(listName) {
  const row = [...document.querySelectorAll(".v-list-item")].find((item) => item.textContent.includes(listName));

  if (!row) {
    throw new Error(`Missing list row: ${listName}`);
  }

  const button = row.querySelector('[aria-label="Items"]');
  await new DOMWrapper(button).trigger("click");
  await flushPromises();
}

async function fillTodoTitle(value) {
  await flushPromises();
  const input = [...document.querySelectorAll("input")].find((element) => {
    const label = element.labels?.[0]?.textContent?.trim() || element.getAttribute("aria-label") || "";
    return label === "Todo title";
  });

  if (!input) {
    throw new Error(`Missing todo title field. Text: ${document.body.textContent}`);
  }

  await new DOMWrapper(input).setValue(value);
}

function itemTitles() {
  return [...document.querySelectorAll(".v-list-item-title")].map((element) => element.textContent.trim());
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
    todoServices.getTodos.mockReset();
    todoServices.createTodo.mockReset();
    todoServices.updateTodo.mockReset();
    todoServices.deleteTodo.mockReset();
    todoServices.getTodos.mockResolvedValue({ data: [] });
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

describe("Feature 3 — Todo List Item Management", () => {
  beforeEach(() => {
    listServices.getLists.mockReset();
    todoServices.getTodos.mockReset();
    todoServices.createTodo.mockReset();
    todoServices.updateTodo.mockReset();
    todoServices.deleteTodo.mockReset();
    listServices.getLists.mockResolvedValue({ data: [] });
    todoServices.getTodos.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("US-3.1 — Add tasks to a list", () => {
    it("User adds a todo to a list via dialog", async () => {
      listServices.getLists.mockResolvedValue({ data: [list(1, "Groceries")] });
      todoServices.createTodo.mockResolvedValue({
        data: todo(10, "Buy milk", 1),
      });
      const wrapper = await mountDashboard();

      await openItems("Groceries");
      await clickButton("+ Add Item");
      await fillTodoTitle("Buy milk");
      await submitOpenForm();

      expect(todoServices.createTodo).toHaveBeenCalledWith(1, { title: "Buy milk" });
      expect(itemTitles()).toContain("Buy milk");
      expect(document.querySelector(".v-overlay--active form")).toBeNull();
      wrapper.unmount();
    });

    it("User adds a todo with an empty title", async () => {
      listServices.getLists.mockResolvedValue({ data: [list(1, "Groceries")] });
      const wrapper = await mountDashboard();

      await openItems("Groceries");
      await clickButton("+ Add Item");
      await fillTodoTitle("   ");
      await submitOpenForm();

      expect(document.body.textContent).toContain("Todo title is required.");
      expect(todoServices.createTodo).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    it("Add item is only available inside the items dialog", async () => {
      listServices.getLists.mockResolvedValue({ data: [list(1, "Groceries")] });
      const wrapper = await mountDashboard();

      expect(document.body.textContent).not.toContain("+ Add Item");
      wrapper.unmount();
    });
  });

  describe("US-3.2 — View tasks in a list", () => {
    it("List items dialog shows empty state", async () => {
      listServices.getLists.mockResolvedValue({ data: [list(2, "Personal")] });
      const wrapper = await mountDashboard();

      await openItems("Personal");

      expect(document.body.textContent).toContain("No todos in this list yet.");
      wrapper.unmount();
    });

    it("User opens items for different lists", async () => {
      listServices.getLists.mockResolvedValue({
        data: [list(1, "Work"), list(2, "Personal")],
      });
      todoServices.getTodos.mockImplementation(async (listId) => {
        if (listId === 1) {
          return { data: [todo(10, "Email client", 1), todo(11, "Write report", 1, false, "2026-07-02T12:06:00.000Z")] };
        }

        return { data: [todo(12, "Call mom", 2)] };
      });
      const wrapper = await mountDashboard();

      await openItems("Personal");
      expect(itemTitles()).toContain("Call mom");
      expect(itemTitles()).not.toContain("Email client");
      expect(itemTitles()).not.toContain("Write report");

      await clickButton("Close");
      await openItems("Work");

      expect(itemTitles()).toEqual(expect.arrayContaining(["Email client", "Write report"]));
      expect(itemTitles()).not.toContain("Call mom");
      expect(todoServices.getTodos).toHaveBeenCalledWith(2);
      expect(todoServices.getTodos).toHaveBeenCalledWith(1);
      wrapper.unmount();
    });
  });

  describe("US-3.3 — Complete tasks", () => {
    it("User marks a todo as complete", async () => {
      listServices.getLists.mockResolvedValue({ data: [list(1, "Groceries")] });
      todoServices.getTodos.mockResolvedValue({ data: [todo(10, "Buy milk", 1, false)] });
      todoServices.updateTodo.mockResolvedValue({ data: todo(10, "Buy milk", 1, true) });
      const wrapper = await mountDashboard();

      await openItems("Groceries");
      const checkbox = document.querySelector('[aria-label="Mark Buy milk complete"]');
      await new DOMWrapper(checkbox).trigger("click");
      await flushPromises();

      expect(todoServices.updateTodo).toHaveBeenCalledWith(10, { completed: true });
      expect(document.querySelector(".text-decoration-line-through")?.textContent).toContain("Buy milk");
      wrapper.unmount();
    });

    it("User marks a completed todo as incomplete", async () => {
      listServices.getLists.mockResolvedValue({ data: [list(1, "Groceries")] });
      todoServices.getTodos.mockResolvedValue({ data: [todo(10, "Buy milk", 1, true)] });
      todoServices.updateTodo.mockResolvedValue({ data: todo(10, "Buy milk", 1, false) });
      const wrapper = await mountDashboard();

      await openItems("Groceries");
      expect(document.querySelector(".text-decoration-line-through")).not.toBeNull();
      const checkbox = document.querySelector('[aria-label="Mark Buy milk incomplete"]');
      await new DOMWrapper(checkbox).trigger("click");
      await flushPromises();

      expect(todoServices.updateTodo).toHaveBeenCalledWith(10, { completed: false });
      expect(document.querySelector(".text-decoration-line-through")).toBeNull();
      wrapper.unmount();
    });
  });

  describe("US-3.4 — Edit and remove tasks", () => {
    it("User edits a todo title", async () => {
      listServices.getLists.mockResolvedValue({ data: [list(1, "Groceries")] });
      todoServices.getTodos.mockResolvedValue({ data: [todo(10, "Buy milk", 1)] });
      todoServices.updateTodo.mockResolvedValue({ data: todo(10, "Buy oat milk", 1) });
      const wrapper = await mountDashboard();

      await openItems("Groceries");
      await new DOMWrapper(document.querySelector('[aria-label="Edit todo"]')).trigger("click");
      await flushPromises();
      await fillTodoTitle("Buy oat milk");
      await submitOpenForm();

      expect(todoServices.updateTodo).toHaveBeenCalledWith(10, { title: "Buy oat milk" });
      expect(itemTitles()).toContain("Buy oat milk");
      expect(itemTitles()).not.toContain("Buy milk");
      wrapper.unmount();
    });

    it("User deletes a todo", async () => {
      listServices.getLists.mockResolvedValue({ data: [list(1, "Groceries")] });
      todoServices.getTodos.mockResolvedValue({ data: [todo(10, "Buy milk", 1)] });
      todoServices.deleteTodo.mockResolvedValue({ data: { message: "Todo deleted." } });
      const wrapper = await mountDashboard();

      await openItems("Groceries");
      await new DOMWrapper(document.querySelector('[aria-label="Delete todo"]')).trigger("click");
      await clickButton("Delete");

      expect(todoServices.deleteTodo).toHaveBeenCalledWith(10);
      expect(itemTitles()).not.toContain("Buy milk");
      expect(document.body.textContent).toContain("No todos in this list yet.");
      wrapper.unmount();
    });
  });
});
