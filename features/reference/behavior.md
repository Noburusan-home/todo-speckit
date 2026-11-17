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
| Logout deletes the server session, removes `user` from `localStorage`, and routes to login. | `POST /todo/logout`, profile menu **Log out** | Feature 1; Feature 4 |
| Routes other than `login` and `register` require a `user` entry in `localStorage`. A signed-in user who opens login is sent home. | `router.beforeEach` | Feature 1 |
| `MenuBar` is hidden on login and register. A user icon opens a profile menu with full name, username, email, **Edit Profile**, and **Log out**. There is no standalone **Sign out** button. | `MenuBar.vue`, `App.vue` | Feature 4 |

## Lists

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| A list belongs to one user. `userId` is taken from the session and is never updated from the request body. | `list.controller` | Feature 2 |
| Reads, renames, and deletes include `userId: req.user.id`. Another user's list returns **404**, never **403**, with **List with id=&lt;id&gt; not found.** | `getAccessibleListOrNull` | Feature 2 |
| `GET /todo/lists` returns only the caller's lists, ordered A–Z by name. | `findAll` `order` | Feature 2 |
| Names are trimmed. A blank name is **List name is required.** A name over 100 characters is **List name must be 100 characters or fewer.** | Controller and dashboard form | Feature 2 |
| The home route is one lists screen titled **My Lists**. Empty copy is **No lists yet. Create your first list.** | `Dashboard.vue` | Feature 2 |

## Todos

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| A todo belongs to one list and one user. `userId` and `listId` come from the owned list and the session, not the request body. | `todo.controller` | Feature 3 |
| Reading or adding todos requires the parent list to belong to the caller. Otherwise **404** **List with id=&lt;id&gt; not found.** | `getAccessibleListOrNull` | Feature 3 |
| Updating or deleting a todo matches `id` and `userId`. Otherwise **404** **Todo with id=&lt;id&gt; not found.** Never **403**. | `getAccessibleTodoOrNull` | Feature 3 |
| New todos start incomplete. Titles are trimmed. A blank title is **Todo title is required.** A title over 255 characters is **Todo title must be 255 characters or fewer.** | Controller and items dialog | Feature 3 |
| Todo lists are ordered incomplete first, then oldest `createdAt` first. | `findAll` `order` | Feature 3 |
| Deleting a list deletes its todos. | `List` hasMany `Todo` on delete cascade | Feature 3 |
| Each list row has an **Items** action that opens **{list name} — Items**. Empty copy is **No todos in this list yet.** **+ Add Item** is only inside that dialog. Completed titles are struck through. | `Dashboard.vue` | Feature 3 |

## Profile

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| A user can read and update only the row whose `id` is `req.user.id`. Another id returns **404** **User with id=&lt;id&gt; not found.** Never **403**. | `getAccessibleUserOrNull` | Feature 4 |
| Profile text fields are trimmed. Username is stored lowercase. Empty required fields are rejected. | `user.controller` and Edit Profile dialog | Feature 4 |
| Password is optional on update. When sent, it must be at least 8 characters and is stored as a bcrypt hash. The response never includes the hash. | `user.controller` | Feature 4 |
| `role` is returned and is not changed by a profile update. | `user.controller` | Feature 4 |
| A successful save writes `localStorage` key `user` and dispatches `user-logged-in` so the menu shows the new name. | `MenuBar.vue` | Feature 4 |
