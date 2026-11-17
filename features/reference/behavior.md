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
| Logout deletes the server session, removes `user` from `localStorage`, and routes to login. | `POST /todo/logout`, MenuBar **Sign out** | Feature 1; Feature 2 |
| Routes other than `login` and `register` require a `user` entry in `localStorage`. A signed-in user who opens login is sent home. | `router.beforeEach` | Feature 1 |
| `MenuBar` shows the signed-in user's name and **Sign out**. It is hidden on login and register. | `MenuBar.vue`, `App.vue` | Feature 2 |

## Lists

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| A list belongs to one user. `userId` is taken from the session and is never updated from the request body. | `list.controller` | Feature 2 |
| Reads, renames, and deletes include `userId: req.user.id`. Another user's list returns **404**, never **403**, with **List with id=&lt;id&gt; not found.** | `getAccessibleListOrNull` | Feature 2 |
| `GET /todo/lists` returns only the caller's lists, ordered A–Z by name. | `findAll` `order` | Feature 2 |
| Names are trimmed. A blank name is **List name is required.** A name over 100 characters is **List name must be 100 characters or fewer.** | Controller and dashboard form | Feature 2 |
| The home route is one lists screen titled **My Lists**. Empty copy is **No lists yet. Create your first list.** | `Dashboard.vue` | Feature 2 |
