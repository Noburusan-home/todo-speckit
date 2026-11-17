<script setup>
import { onMounted, ref } from "vue";
import listServices from "../services/listServices.js";
import todoServices from "../services/todoServices.js";

const lists = ref([]);
const loading = ref(false);
const loadError = ref("");
const formError = ref("");
const saving = ref(false);

const createOpen = ref(false);
const renameOpen = ref(false);
const deleteOpen = ref(false);
const createName = ref("");
const renameName = ref("");
const selected = ref(null);
const createForm = ref(null);
const renameForm = ref(null);
const addTodoForm = ref(null);
const editTodoForm = ref(null);

const itemsOpen = ref(false);
const itemsList = ref(null);
const todos = ref([]);
const todosLoading = ref(false);
const itemsError = ref("");
const todoFormError = ref("");
const addTodoOpen = ref(false);
const editTodoOpen = ref(false);
const deleteTodoOpen = ref(false);
const todoTitle = ref("");
const selectedTodo = ref(null);

const nameRules = [(value) => !!value?.trim() || "List name is required."];
const titleRules = [(value) => !!value?.trim() || "Todo title is required."];

function sortLists(rows) {
  return [...rows].sort((left, right) => left.name.localeCompare(right.name));
}

function sortTodos(rows) {
  return [...rows].sort((left, right) => {
    if (left.completed !== right.completed) {
      return left.completed ? 1 : -1;
    }

    return new Date(left.createdAt) - new Date(right.createdAt);
  });
}

function apiMessage(err, fallback) {
  return err.response?.data?.message || fallback;
}

async function loadLists() {
  loading.value = true;
  loadError.value = "";

  try {
    const response = await listServices.getLists();
    lists.value = sortLists(response.data ?? []);
  } catch (err) {
    loadError.value = apiMessage(err, "Unable to load lists.");
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  createName.value = "";
  formError.value = "";
  createOpen.value = true;
}

async function createList() {
  formError.value = "";
  const { valid } = await createForm.value.validate();

  if (!valid) {
    return;
  }

  saving.value = true;

  try {
    const response = await listServices.createList({ name: createName.value.trim() });
    lists.value = sortLists([...lists.value, response.data]);
    createOpen.value = false;
  } catch (err) {
    formError.value = apiMessage(err, "Unable to create the list.");
  } finally {
    saving.value = false;
  }
}

function openRename(list) {
  selected.value = list;
  renameName.value = list.name;
  formError.value = "";
  renameOpen.value = true;
}

async function renameList() {
  formError.value = "";
  const { valid } = await renameForm.value.validate();

  if (!valid) {
    return;
  }

  saving.value = true;

  try {
    const response = await listServices.updateList(selected.value.id, {
      name: renameName.value.trim(),
    });
    lists.value = sortLists(
      lists.value.map((list) => (list.id === response.data.id ? response.data : list))
    );
    renameOpen.value = false;
  } catch (err) {
    formError.value = apiMessage(err, "Unable to rename the list.");
  } finally {
    saving.value = false;
  }
}

function openDelete(list) {
  selected.value = list;
  formError.value = "";
  deleteOpen.value = true;
}

async function confirmDelete() {
  formError.value = "";
  saving.value = true;

  try {
    await listServices.deleteList(selected.value.id);
    lists.value = lists.value.filter((list) => list.id !== selected.value.id);
    deleteOpen.value = false;
  } catch (err) {
    formError.value = apiMessage(err, "Unable to delete the list.");
  } finally {
    saving.value = false;
  }
}

onMounted(loadLists);

async function openItems(list) {
  itemsList.value = list;
  todos.value = [];
  itemsError.value = "";
  todoFormError.value = "";
  addTodoOpen.value = false;
  editTodoOpen.value = false;
  deleteTodoOpen.value = false;
  itemsOpen.value = true;
  todosLoading.value = true;

  try {
    const response = await todoServices.getTodos(list.id);
    todos.value = sortTodos(response.data ?? []);
  } catch (err) {
    itemsError.value = apiMessage(err, "Unable to load todos.");
  } finally {
    todosLoading.value = false;
  }
}

function closeItems() {
  itemsOpen.value = false;
  addTodoOpen.value = false;
  editTodoOpen.value = false;
  deleteTodoOpen.value = false;
}

function openAddTodo() {
  todoTitle.value = "";
  todoFormError.value = "";
  addTodoOpen.value = true;
}

async function createTodo() {
  todoFormError.value = "";
  const { valid } = await addTodoForm.value.validate();

  if (!valid) {
    return;
  }

  saving.value = true;

  try {
    const response = await todoServices.createTodo(itemsList.value.id, {
      title: todoTitle.value.trim(),
    });
    todos.value = sortTodos([...todos.value, response.data]);
    addTodoOpen.value = false;
  } catch (err) {
    todoFormError.value = apiMessage(err, "Unable to add the todo.");
  } finally {
    saving.value = false;
  }
}

function openEditTodo(todo) {
  selectedTodo.value = todo;
  todoTitle.value = todo.title;
  todoFormError.value = "";
  editTodoOpen.value = true;
}

async function saveTodo() {
  todoFormError.value = "";
  const { valid } = await editTodoForm.value.validate();

  if (!valid) {
    return;
  }

  saving.value = true;

  try {
    const response = await todoServices.updateTodo(selectedTodo.value.id, {
      title: todoTitle.value.trim(),
    });
    todos.value = sortTodos(
      todos.value.map((todo) => (todo.id === response.data.id ? response.data : todo))
    );
    editTodoOpen.value = false;
  } catch (err) {
    todoFormError.value = apiMessage(err, "Unable to update the todo.");
  } finally {
    saving.value = false;
  }
}

async function setCompleted(todo, completed) {
  itemsError.value = "";

  try {
    const response = await todoServices.updateTodo(todo.id, { completed });
    todos.value = sortTodos(
      todos.value.map((item) => (item.id === response.data.id ? response.data : item))
    );
  } catch (err) {
    itemsError.value = apiMessage(err, "Unable to update the todo.");
  }
}

function openDeleteTodo(todo) {
  selectedTodo.value = todo;
  todoFormError.value = "";
  deleteTodoOpen.value = true;
}

async function confirmDeleteTodo() {
  todoFormError.value = "";
  saving.value = true;

  try {
    await todoServices.deleteTodo(selectedTodo.value.id);
    todos.value = todos.value.filter((todo) => todo.id !== selectedTodo.value.id);
    deleteTodoOpen.value = false;
  } catch (err) {
    todoFormError.value = apiMessage(err, "Unable to delete the todo.");
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <v-container class="py-8">
    <div class="d-flex align-center justify-space-between mb-4">
      <h1 class="text-h4">My Lists</h1>
      <v-btn color="primary" variant="elevated" class="oc-cta" @click="openCreate">+ New List</v-btn>
    </div>

    <v-alert v-if="loadError" type="error" class="mb-4">{{ loadError }}</v-alert>
    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <p v-else-if="lists.length === 0">No lists yet. Create your first list.</p>

    <v-list v-else class="bg-surface" rounded="lg">
      <v-list-item v-for="list in lists" :key="list.id">
        <v-list-item-title>{{ list.name }}</v-list-item-title>
        <template #append>
          <v-btn icon size="small" aria-label="Items" @click="openItems(list)">
            <v-icon icon="mdi-format-list-bulleted" />
          </v-btn>
          <v-btn icon size="small" aria-label="Edit list" @click="openRename(list)">
            <v-icon icon="mdi-pencil" />
          </v-btn>
          <v-btn icon size="small" aria-label="Delete list" @click="openDelete(list)">
            <v-icon icon="mdi-delete" />
          </v-btn>
        </template>
      </v-list-item>
    </v-list>

    <v-dialog v-model="createOpen" max-width="480">
      <v-card class="pa-4">
        <h2 class="text-h5 mb-4">New list</h2>
        <v-alert v-if="formError" type="error" class="mb-4">{{ formError }}</v-alert>
        <v-form ref="createForm" @submit.prevent="createList">
          <v-text-field v-model="createName" label="List name" :rules="nameRules" />
          <v-btn type="submit" color="primary" variant="elevated" class="oc-cta" :loading="saving">
            Create
          </v-btn>
          <v-btn class="ml-2" color="secondary" variant="text" type="button" @click="createOpen = false">
            Cancel
          </v-btn>
        </v-form>
      </v-card>
    </v-dialog>

    <v-dialog v-model="renameOpen" max-width="480">
      <v-card class="pa-4">
        <h2 class="text-h5 mb-4">Rename list</h2>
        <v-alert v-if="formError" type="error" class="mb-4">{{ formError }}</v-alert>
        <v-form ref="renameForm" @submit.prevent="renameList">
          <v-text-field v-model="renameName" label="List name" :rules="nameRules" />
          <v-btn type="submit" color="primary" variant="elevated" class="oc-cta" :loading="saving">
            Save
          </v-btn>
          <v-btn class="ml-2" color="secondary" variant="text" type="button" @click="renameOpen = false">
            Cancel
          </v-btn>
        </v-form>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteOpen" max-width="480">
      <v-card class="pa-4">
        <h2 class="text-h5 mb-4">Delete list</h2>
        <p class="mb-4">Delete {{ selected?.name }}?</p>
        <v-alert v-if="formError" type="error" class="mb-4">{{ formError }}</v-alert>
        <v-btn color="primary" variant="elevated" class="oc-cta" :loading="saving" @click="confirmDelete">
          Delete
        </v-btn>
        <v-btn class="ml-2" color="secondary" variant="text" @click="deleteOpen = false">Cancel</v-btn>
      </v-card>
    </v-dialog>

    <v-dialog v-model="itemsOpen" max-width="640">
      <v-card class="pa-4">
        <div class="d-flex align-center justify-space-between mb-4">
          <h2 class="text-h5">{{ itemsList?.name }} — Items</h2>
          <v-btn color="primary" variant="elevated" class="oc-cta" @click="openAddTodo">+ Add Item</v-btn>
        </div>
        <v-alert v-if="itemsError" type="error" class="mb-4">{{ itemsError }}</v-alert>
        <v-progress-linear v-if="todosLoading" indeterminate color="primary" class="mb-4" />
        <p v-else-if="todos.length === 0">No todos in this list yet.</p>
        <v-list v-else class="bg-surface">
          <v-list-item v-for="todo in todos" :key="todo.id">
            <template #prepend>
              <v-checkbox-btn
                :model-value="todo.completed"
                :aria-label="`Mark ${todo.title} ${todo.completed ? 'incomplete' : 'complete'}`"
                @update:model-value="(value) => setCompleted(todo, value)"
              />
            </template>
            <v-list-item-title :class="{ 'text-decoration-line-through text-medium-emphasis': todo.completed }">
              {{ todo.title }}
            </v-list-item-title>
            <template #append>
              <v-btn icon size="small" aria-label="Edit todo" @click="openEditTodo(todo)">
                <v-icon icon="mdi-pencil" />
              </v-btn>
              <v-btn icon size="small" aria-label="Delete todo" @click="openDeleteTodo(todo)">
                <v-icon icon="mdi-delete" />
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
        <v-btn class="mt-4" color="secondary" variant="text" @click="closeItems">Close</v-btn>
      </v-card>
    </v-dialog>

    <v-dialog v-model="addTodoOpen" max-width="480">
      <v-card class="pa-4">
        <h2 class="text-h5 mb-4">Add item</h2>
        <v-alert v-if="todoFormError" type="error" class="mb-4">{{ todoFormError }}</v-alert>
        <v-form ref="addTodoForm" @submit.prevent="createTodo">
          <v-text-field v-model="todoTitle" label="Todo title" :rules="titleRules" />
          <v-btn type="submit" color="primary" variant="elevated" class="oc-cta" :loading="saving">
            Add
          </v-btn>
          <v-btn class="ml-2" color="secondary" variant="text" type="button" @click="addTodoOpen = false">
            Cancel
          </v-btn>
        </v-form>
      </v-card>
    </v-dialog>

    <v-dialog v-model="editTodoOpen" max-width="480">
      <v-card class="pa-4">
        <h2 class="text-h5 mb-4">Edit item</h2>
        <v-alert v-if="todoFormError" type="error" class="mb-4">{{ todoFormError }}</v-alert>
        <v-form ref="editTodoForm" @submit.prevent="saveTodo">
          <v-text-field v-model="todoTitle" label="Todo title" :rules="titleRules" />
          <v-btn type="submit" color="primary" variant="elevated" class="oc-cta" :loading="saving">
            Save
          </v-btn>
          <v-btn class="ml-2" color="secondary" variant="text" type="button" @click="editTodoOpen = false">
            Cancel
          </v-btn>
        </v-form>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteTodoOpen" max-width="480">
      <v-card class="pa-4">
        <h2 class="text-h5 mb-4">Delete todo</h2>
        <p class="mb-4">Delete {{ selectedTodo?.title }}?</p>
        <v-alert v-if="todoFormError" type="error" class="mb-4">{{ todoFormError }}</v-alert>
        <v-btn color="primary" variant="elevated" class="oc-cta" :loading="saving" @click="confirmDeleteTodo">
          Delete
        </v-btn>
        <v-btn class="ml-2" color="secondary" variant="text" @click="deleteTodoOpen = false">Cancel</v-btn>
      </v-card>
    </v-dialog>
  </v-container>
</template>
