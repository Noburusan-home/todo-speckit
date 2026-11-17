# API Reference

**Status:** Feature 1 authentication, Feature 2 lists, Feature 3 todos, and Feature 4 profile.

Base path: `/todo`. Authenticated routes require `Authorization: Bearer <token>`.

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/todo/health` | No | Process health check |
| `POST` | `/todo/register` | No | Create an account and session |
| `POST` | `/todo/login` | No | Authenticate and return the current session |
| `POST` | `/todo/logout` | Yes | Delete the session row for the bearer token |
| `GET` | `/todo/lists` | Yes | Lists owned by the caller, A–Z by name |
| `POST` | `/todo/lists` | Yes | Create a list owned by the caller |
| `PUT` | `/todo/lists/:listId` | Yes | Rename a list owned by the caller |
| `DELETE` | `/todo/lists/:listId` | Yes | Delete a list owned by the caller |
| `GET` | `/todo/lists/:listId/todos` | Yes | Todos in a list owned by the caller |
| `POST` | `/todo/lists/:listId/todos` | Yes | Add a todo to an owned list |
| `PUT` | `/todo/todos/:id` | Yes | Update an owned todo's title and/or completed flag |
| `DELETE` | `/todo/todos/:id` | Yes | Delete an owned todo |
| `GET` | `/todo/users/:id` | Yes | Fetch the caller's own profile |
| `PUT` | `/todo/users/:id` | Yes | Update the caller's own profile |

## Health

`200` `{ "status": "ok" }`

## Register

`POST /todo/register`

```json
{
  "fName": "Jane",
  "lName": "Doe",
  "email": "jdoe@example.com",
  "username": "jdoe",
  "password": "password123"
}
```

`201` success (password hash is never returned):

```json
{
  "userId": 1,
  "username": "jdoe",
  "email": "jdoe@example.com",
  "fName": "Jane",
  "lName": "Doe",
  "role": "worker",
  "token": "<jwt>"
}
```

`400` `{ "message": "..." }` when a required field is blank, the email format is invalid, the password is shorter than 8 characters, or the username or email is already taken.

| Condition | Message |
|-----------|---------|
| Missing first name | `First name is required.` |
| Missing last name | `Last name is required.` |
| Missing email | `Email is required.` |
| Invalid email | `Enter a valid email address.` |
| Missing username | `Username is required.` |
| Missing password | `Password is required.` |
| Password shorter than 8 characters | `Password must be at least 8 characters.` |
| Username taken | `Username is already taken.` |
| Email taken | `Email is already registered.` |

## Login

`POST /todo/login`

```json
{ "username": "jdoe", "password": "password123" }
```

`200` uses the same payload as registration. A non-expired session for that user is reused; otherwise a new 24-hour session is created.

| Condition | Status | Message |
|-----------|--------|---------|
| Missing username | `400` | `Username is required.` |
| Missing password | `400` | `Password is required.` |
| Unknown user or wrong password | `401` | `Invalid username or password.` |

## Logout

`POST /todo/logout` with `Authorization: Bearer <token>`.

`200` `{ "message": "Signed out." }` and the matching session row is removed.

Missing, invalid, or expired token: `401` `{ "message": "Unauthorized! ..." }`.

## Lists

A list object:

```json
{
  "id": 1,
  "name": "Groceries",
  "userId": 42,
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:00:00.000Z"
}
```

`GET /todo/lists` returns `200` and an array of the caller's lists, ordered by name.

`POST /todo/lists` body is `{ "name": "Groceries" }`. Any `userId` in the body is ignored. `201` returns the created list. The saved `userId` is `req.user.id`.

`PUT /todo/lists/:listId` body is `{ "name": "Shopping" }`. `200` returns the updated list.

`DELETE /todo/lists/:listId` returns `200` `{ "message": "List deleted." }`.

| Condition | Status | Message |
|-----------|--------|---------|
| Blank or whitespace name | `400` | `List name is required.` |
| Name longer than 100 characters | `400` | `List name must be 100 characters or fewer.` |
| Non-numeric `:listId` | `400` | `List id must be a number.` |
| Missing list, or a list owned by someone else | `404` | `List with id=<id> not found.` |
| Missing or invalid token | `401` | `Unauthorized! ...` |

## Todos

A todo object:

```json
{
  "id": 10,
  "listId": 1,
  "title": "Buy milk",
  "completed": false,
  "userId": 42,
  "createdAt": "2026-07-02T12:05:00.000Z",
  "updatedAt": "2026-07-02T12:05:00.000Z"
}
```

`GET /todo/lists/:listId/todos` returns `200` and the caller's todos for that list. Incomplete todos come first, then older `createdAt` first.

`POST /todo/lists/:listId/todos` body is `{ "title": "Buy milk" }`. `userId` and `listId` in the body are ignored. `201` returns the todo with `completed: false`, the session user's id, and the owned list's id.

`PUT /todo/todos/:id` accepts `{ "title": "Buy oat milk" }` and/or `{ "completed": true }`. `200` returns the updated todo. Ownership fields are not changed.

`DELETE /todo/todos/:id` returns `200` `{ "message": "Todo deleted." }`.

| Condition | Status | Message |
|-----------|--------|---------|
| Blank or whitespace title | `400` | `Todo title is required.` |
| Title longer than 255 characters | `400` | `Todo title must be 255 characters or fewer.` |
| `completed` is not a boolean | `400` | `Completed must be true or false.` |
| Non-numeric list id | `400` | `List id must be a number.` |
| Non-numeric todo id | `400` | `Todo id must be a number.` |
| Parent list missing or owned by someone else | `404` | `List with id=<id> not found.` |
| Todo missing or owned by someone else | `404` | `Todo with id=<id> not found.` |
| Missing or invalid token | `401` | `Unauthorized! ...` |

Deleting a list deletes its todos.

## Profile

`GET /todo/users/:id` and `PUT /todo/users/:id` succeed only when `:id` is the session user. `200` returns the user without a password hash:

```json
{
  "id": 42,
  "fName": "Jane",
  "lName": "Doe",
  "email": "jane@example.com",
  "username": "jdoe",
  "role": "worker",
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:05:00.000Z"
}
```

`PUT` body is `fName`, `lName`, `email`, and `username`. `password` is optional. Omit it to keep the current password. `role` is ignored.

| Condition | Status | Message |
|-----------|--------|---------|
| Blank first name | `400` | `First name is required.` |
| Blank last name | `400` | `Last name is required.` |
| Blank email | `400` | `Email is required.` |
| Invalid email | `400` | `Enter a valid email address.` |
| Blank username | `400` | `Username is required.` |
| Password shorter than 8 characters | `400` | `Password must be at least 8 characters.` |
| Username already used by someone else | `400` | `Username is already taken.` |
| Email already used by someone else | `400` | `Email is already registered.` |
| Non-numeric user id | `400` | `User id must be a number.` |
| Missing user, or another user's id | `404` | `User with id=<id> not found.` |
| Missing or invalid token | `401` | `Unauthorized! ...` |

## Feature provenance

| Area | Introduced |
|------|------------|
| Health check | Starter shell |
| Register, login, logout | Feature 1 |
| List CRUD | Feature 2 |
| Todo items | Feature 3 |
| Profile read and update | Feature 4 |
