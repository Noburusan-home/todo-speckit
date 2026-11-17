import db from "../app/models/index.js";

/** Sync schema for tests. */
export const syncTestDatabase = async () => {
  await db.sequelize.sync({ force: true });
};

export function buildRegisterPayload(overrides = {}) {
  return {
    fName: "Jane",
    lName: "Doe",
    email: "jdoe@example.com",
    username: "jdoe",
    password: "password123",
    ...overrides,
  };
}
