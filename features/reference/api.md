# API Reference

**Status:** Feature 1 authentication and Feature 2 list management, plus the starter health check.

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

## Feature provenance

| Area | Introduced |
|------|------------|
| Health check | Starter shell |
| Register, login, logout | Feature 1 |
| List CRUD | Feature 2 |
