<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import authServices from "../services/authServices.js";
import userServices from "../services/userServices.js";
import Utils from "../config/utils.js";
import { emailRules } from "../config/validation.js";

const router = useRouter();
const user = ref(Utils.getStore("user"));
const profileOpen = ref(false);
const editOpen = ref(false);
const editForm = ref(null);
const fName = ref("");
const lName = ref("");
const email = ref("");
const username = ref("");
const password = ref("");
const confirmPassword = ref("");
const editError = ref("");
const saving = ref(false);
const loggingOut = ref(false);

const required = (label) => (value) => !!value?.trim() || `${label} is required.`;
const passwordRules = [
  (value) => !value || value.length >= 8 || "Password must be at least 8 characters.",
];
const confirmRules = [(value) => value === password.value || "Passwords do not match."];

const displayName = computed(() => {
  const name = `${user.value?.fName ?? ""} ${user.value?.lName ?? ""}`.trim();
  return name || user.value?.username || "";
});

function refreshUser() {
  user.value = Utils.getStore("user");
}

onMounted(() => {
  window.addEventListener("user-logged-in", refreshUser);
});

onUnmounted(() => {
  window.removeEventListener("user-logged-in", refreshUser);
});

function applyProfile(profile) {
  fName.value = profile?.fName ?? "";
  lName.value = profile?.lName ?? "";
  email.value = profile?.email ?? "";
  username.value = profile?.username ?? "";
  password.value = "";
  confirmPassword.value = "";
}

async function openEdit() {
  editError.value = "";
  applyProfile(user.value);
  editOpen.value = true;
  profileOpen.value = false;

  if (!user.value?.userId) {
    return;
  }

  try {
    const response = await userServices.getUser(user.value.userId);
    applyProfile(response.data);
  } catch (err) {
    editError.value = err.response?.data?.message || "Unable to load profile.";
  }
}

function cancelEdit() {
  editOpen.value = false;
  editError.value = "";
}

async function saveProfile() {
  editError.value = "";
  const { valid } = await editForm.value.validate();

  if (!valid) {
    return;
  }

  saving.value = true;

  try {
    const payload = {
      fName: fName.value.trim(),
      lName: lName.value.trim(),
      email: email.value.trim(),
      username: username.value.trim(),
    };

    if (password.value) {
      payload.password = password.value;
    }

    const response = await userServices.updateUser(user.value.userId, payload);
    const current = Utils.getStore("user") ?? {};
    Utils.setStore("user", {
      ...current,
      userId: response.data.id ?? current.userId,
      fName: response.data.fName,
      lName: response.data.lName,
      email: response.data.email,
      username: response.data.username,
      role: response.data.role ?? current.role,
    });
    window.dispatchEvent(new CustomEvent("user-logged-in"));
    editOpen.value = false;
  } catch (err) {
    editError.value = err.response?.data?.message || "Unable to update profile.";
  } finally {
    saving.value = false;
  }
}

async function logOut() {
  loggingOut.value = true;

  try {
    await authServices.logoutUser();
  } catch {
    // The axios client clears an invalid session and sends the user to login.
  } finally {
    Utils.removeItem("user");
    user.value = null;
    profileOpen.value = false;
    loggingOut.value = false;
    await router.push({ name: "login" });
  }
}
</script>

<template>
  <v-app-bar color="surface" elevation="1">
    <v-app-bar-title>Todo</v-app-bar-title>
    <v-spacer />
    <v-menu v-model="profileOpen" :close-on-content-click="false" location="bottom end">
      <template #activator="{ props }">
        <v-btn icon aria-label="Profile" v-bind="props">
          <v-icon icon="mdi-account-circle" />
        </v-btn>
      </template>
      <v-list>
        <v-list-item>
          <v-list-item-title>{{ displayName }}</v-list-item-title>
          <v-list-item-subtitle>{{ user?.username }}</v-list-item-subtitle>
          <v-list-item-subtitle>{{ user?.email }}</v-list-item-subtitle>
        </v-list-item>
        <v-list-item>
          <v-btn color="primary" variant="elevated" class="oc-cta" @click="openEdit">
            Edit Profile
          </v-btn>
        </v-list-item>
        <v-list-item>
          <v-btn variant="text" :loading="loggingOut" @click="logOut">Log out</v-btn>
        </v-list-item>
      </v-list>
    </v-menu>
  </v-app-bar>

  <v-dialog v-model="editOpen" max-width="480">
    <v-card class="pa-4">
      <v-card-title>Edit Profile</v-card-title>
      <v-alert v-if="editError" type="error" class="mb-4">
        {{ editError }}
      </v-alert>
      <v-form ref="editForm" @submit.prevent="saveProfile">
        <v-text-field v-model="fName" label="First name" :rules="[required('First name')]" />
        <v-text-field v-model="lName" label="Last name" :rules="[required('Last name')]" />
        <v-text-field v-model="email" label="Email" :rules="emailRules" />
        <v-text-field v-model="username" label="Username" :rules="[required('Username')]" />
        <v-text-field
          v-model="password"
          label="Password"
          type="password"
          :rules="passwordRules"
        />
        <v-text-field
          v-model="confirmPassword"
          label="Confirm password"
          type="password"
          :rules="confirmRules"
        />
        <v-btn type="submit" color="primary" variant="elevated" class="oc-cta" :loading="saving">
          Save
        </v-btn>
        <v-btn color="secondary" variant="text" @click="cancelEdit">Cancel</v-btn>
      </v-form>
    </v-card>
  </v-dialog>
</template>
