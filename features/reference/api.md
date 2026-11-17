# API Reference

**Status:** Feature 1 authentication, plus the starter health check.

Base path: `/todo`. Authenticated routes require `Authorization: Bearer <token>`.

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/todo/health` | No | Process health check |
| `POST` | `/todo/register` | No | Create an account and session |
| `POST` | `/todo/login` | No | Authenticate and return the current session |
| `POST` | `/todo/logout` | Yes | Delete the session row for the bearer token |
| `GET` | `/todo/lists` | Yes | Lists owned by `req.user.id`. No list table yet, so the body is `[]` |

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

`GET /todo/lists` with a valid bearer token returns `200` and `[]`.

Unauthenticated calls return `401` `{ "message": "Unauthorized! ..." }`.

## Feature provenance

| Area | Introduced |
|------|------------|
| Health check | Starter shell |
| Register, login, logout, guarded list read | Feature 1 |
