<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import authServices from "../services/authServices.js";
import Utils from "../config/utils.js";
import { emailRules } from "../config/validation.js";

const router = useRouter();
const form = ref(null);
const fName = ref("");
const lName = ref("");
const email = ref("");
const username = ref("");
const password = ref("");
const confirmPassword = ref("");
const errorMessage = ref("");
const loading = ref(false);

const required = (label) => (value) => !!value?.trim() || `${label} is required.`;
const passwordRules = [
  required("Password"),
  (value) => !value?.trim() || value.length >= 8 || "Password must be at least 8 characters.",
];
const confirmRules = [
  (value) => value === password.value || "Passwords do not match.",
];

async function createAccount() {
  errorMessage.value = "";
  const { valid } = await form.value.validate();

  if (!valid) {
    return;
  }

  loading.value = true;

  try {
    const response = await authServices.registerUser({
      fName: fName.value.trim(),
      lName: lName.value.trim(),
      email: email.value.trim(),
      username: username.value.trim(),
      password: password.value,
    });
    Utils.setStore("user", response.data);
    window.dispatchEvent(new CustomEvent("user-logged-in"));
    await router.push({ name: "home" });
  } catch (err) {
    errorMessage.value = err.response?.data?.message || "Unable to create account.";
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
          <h1 class="text-h4 mb-6">Create account</h1>
          <v-alert v-if="errorMessage" type="error" class="mb-4">
            {{ errorMessage }}
          </v-alert>
          <v-form ref="form" @submit.prevent="createAccount">
            <v-text-field v-model="fName" label="First name" autocomplete="given-name" :rules="[required('First name')]" />
            <v-text-field v-model="lName" label="Last name" autocomplete="family-name" :rules="[required('Last name')]" />
            <v-text-field v-model="email" label="Email" autocomplete="email" :rules="emailRules" />
            <v-text-field v-model="username" label="Username" autocomplete="username" :rules="[required('Username')]" />
            <v-text-field
              v-model="password"
              label="Password"
              type="password"
              autocomplete="new-password"
              :rules="passwordRules"
            />
            <v-text-field
              v-model="confirmPassword"
              label="Confirm password"
              type="password"
              autocomplete="new-password"
              :rules="confirmRules"
            />
            <v-btn
              type="submit"
              color="primary"
              variant="elevated"
              class="oc-cta"
              :loading="loading"
            >
              Create account
            </v-btn>
          </v-form>
          <v-btn class="mt-4" color="secondary" variant="text" :to="{ name: 'login' }">
            Sign in
          </v-btn>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
