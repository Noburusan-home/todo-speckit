import apiClient from "./services.js";

export default {
  registerUser(user) {
    return apiClient.post("register", user);
  },

  loginUser(user) {
    return apiClient.post("login", user);
  },

  logoutUser() {
    return apiClient.post("logout");
  },
};
