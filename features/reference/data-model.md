# Data Model Reference

**Status:** Feature 1 — users and sessions.

Schema below matches the Sequelize models in `backend/app/models/`.

## Tables

### `users`

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `fName` | STRING | Required |
| `lName` | STRING | Required |
| `email` | STRING | Required, unique |
| `username` | STRING(100) | Required, unique; stored lowercase |
| `password` | STRING(255) | Required; bcrypt hash only; omitted by the default scope |
| `role` | STRING(20) | Required; default `worker` |
| `createdAt` | DATE | Sequelize timestamp |
| `updatedAt` | DATE | Sequelize timestamp |

### `sessions`

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `token` | STRING(512) | Required; JWT also stored on the row |
| `email` | STRING | Required |
| `expirationDate` | DATE | Required; 24 hours after creation |
| `userId` | INTEGER FK | Required; references `users.id` |
| `createdAt` | DATE | Sequelize timestamp |
| `updatedAt` | DATE | Sequelize timestamp |

## Associations

- `User` hasMany `Session` (`userId`, on delete cascade)
- `Session` belongsTo `User` (`userId`)

## Feature provenance

| Area | Introduced |
|------|------------|
| `users`, `sessions` | Feature 1 |
