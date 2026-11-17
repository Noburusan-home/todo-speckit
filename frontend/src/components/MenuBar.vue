<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import authServices from "../services/authServices.js";
import Utils from "../config/utils.js";

const router = useRouter();
const user = ref(Utils.getStore("user"));
const loading = ref(false);

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

async function signOut() {
  loading.value = true;

  try {
    await authServices.logoutUser();
  } catch {
    // The axios client clears an invalid session and sends the user to login.
  } finally {
    Utils.removeItem("user");
    user.value = null;
    loading.value = false;
    await router.push({ name: "login" });
  }
}
</script>

<template>
  <v-app-bar color="surface" elevation="1">
    <v-app-bar-title>Todo</v-app-bar-title>
    <v-spacer />
    <span class="mr-4">{{ displayName }}</span>
    <v-btn color="primary" variant="elevated" class="oc-cta" :loading="loading" @click="signOut">
      Sign out
    </v-btn>
  </v-app-bar>
</template>
