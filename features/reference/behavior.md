# Behavior & Rules Reference

**Living snapshot** of product rules currently in force.

These files answer: *"What rules does the app enforce right now?"*  
They do **not** authorize new scope — implement only from `features/feature-*.md`.

| File | Role |
|------|------|
| [api.md](./api.md) | Routes / payloads |
| [data-model.md](./data-model.md) | Tables / columns |
| **This file** | Ownership, sort, validation, UI rules |

## Auth

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| Sign-in is username + password. Usernames are trimmed and stored lowercase. | `POST /todo/login`, `POST /todo/register` | Feature 1 |
| Passwords are hashed with bcrypt, 10 salt rounds, and are never returned by the API. | `auth.controller`, User `defaultScope` | Feature 1 |
| Password length is at least 8 characters. | Register controller and register form | Feature 1 |
| Email is required and must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. Invalid format copy is **Enter a valid email address.** Blank email copy is **Email is required.** | `emailRules` and register controller | Feature 1 |
| Duplicate username copy is **Username is already taken.** Duplicate email copy is **Email is already registered.** | Register controller | Feature 1 |
| Wrong username and wrong password share **Invalid username or password.** | Login controller | Feature 1 |
| New accounts receive role `worker`. The client cannot set `role`. | User model and register controller | Feature 1 |
| Sessions last 24 hours. Login reuses a non-expired session for the same user. | Session row + JWT `expiresIn` | Feature 1 |
| Protected API calls send `Authorization: Bearer <token>`. The token must exist on a non-expired session row. `req.user.id` is that session's user. | Axios request interceptor, `authenticate` | Feature 1 |
| A `401` or an unauthorized message clears `localStorage` key `user` and routes to login. | Axios response interceptor | Feature 1 |
| Logout deletes the server session, removes `user` from `localStorage`, and routes to login. | `POST /todo/logout`, home **Sign out** button | Feature 1 |
| Routes other than `login` and `register` require a `user` entry in `localStorage`. A signed-in user who opens login is sent home. | `router.beforeEach` | Feature 1 |
| Feature 1 home shows **Welcome, {first name}** and a standalone **Sign out** button. There is no menu bar. | `Home.vue` | Feature 1 |
| `GET /todo/lists` is authenticated and returns only that user's lists. With no list table, the result is an empty array. | `list.controller` | Feature 1 |
