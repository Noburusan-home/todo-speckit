<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import authServices from "../services/authServices.js";
import Utils from "../config/utils.js";

const router = useRouter();
const user = Utils.getStore("user");
const loading = ref(false);

async function signOut() {
  loading.value = true;

  try {
    await authServices.logoutUser();
  } catch {
    // The axios client clears an invalid session and sends the user to login.
  } finally {
    Utils.removeItem("user");
    loading.value = false;
    await router.push({ name: "login" });
  }
}
</script>

<template>
  <v-container class="py-10">
    <h1 class="text-h4 mb-4">Welcome, {{ user?.fName }}</h1>
    <v-btn color="primary" variant="elevated" class="oc-cta" :loading="loading" @click="signOut">
      Sign out
    </v-btn>
  </v-container>
</template>
