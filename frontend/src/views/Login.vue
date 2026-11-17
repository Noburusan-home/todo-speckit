<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import authServices from "../services/authServices.js";
import Utils from "../config/utils.js";

const router = useRouter();
const form = ref(null);
const username = ref("");
const password = ref("");
const errorMessage = ref("");
const loading = ref(false);

const usernameRules = [(value) => !!value?.trim() || "Username is required."];
const passwordRules = [(value) => !!value?.trim() || "Password is required."];

async function signIn() {
  errorMessage.value = "";
  const { valid } = await form.value.validate();

  if (!valid) {
    return;
  }

  loading.value = true;

  try {
    const response = await authServices.loginUser({
      username: username.value.trim(),
      password: password.value,
    });
    Utils.setStore("user", response.data);
    window.dispatchEvent(new CustomEvent("user-logged-in"));
    await router.push({ name: "home" });
  } catch (err) {
    errorMessage.value = err.response?.data?.message || "Invalid username or password.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="5">
        <v-card class="pa-6">
          <h1 class="text-h4 mb-6">Sign in</h1>
          <v-alert v-if="errorMessage" type="error" class="mb-4">
            {{ errorMessage }}
          </v-alert>
          <v-form ref="form" @submit.prevent="signIn">
            <v-text-field
              v-model="username"
              label="Username"
              autocomplete="username"
              :rules="usernameRules"
            />
            <v-text-field
              v-model="password"
              label="Password"
              type="password"
              autocomplete="current-password"
              :rules="passwordRules"
            />
            <v-btn
              type="submit"
              color="primary"
              variant="elevated"
              class="oc-cta"
              :loading="loading"
            >
              Sign in
            </v-btn>
          </v-form>
          <v-btn class="mt-4" color="secondary" variant="text" :to="{ name: 'register' }">
            Create an account
          </v-btn>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
