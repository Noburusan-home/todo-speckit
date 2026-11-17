# Data Model Reference

**Status:** Feature 1 users and sessions, Feature 2 lists, Feature 3 todos. Feature 4 edits the existing `users` row and adds no tables.

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
| `role` | STRING(20) | Required; default `worker`; not changed by profile update |
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

### `lists`

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `name` | STRING(100) | Required; trimmed; max 100 characters |
| `userId` | INTEGER FK | Required; references `users.id`; set from the session on create |
| `createdAt` | DATE | Sequelize timestamp |
| `updatedAt` | DATE | Sequelize timestamp |

### `todos`

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `listId` | INTEGER FK | Required; references `lists.id`; deleted when the list is deleted |
| `title` | STRING(255) | Required; trimmed; max 255 characters |
| `completed` | BOOLEAN | Required; default `false` |
| `userId` | INTEGER FK | Required; references `users.id`; set from the session on create |
| `createdAt` | DATE | Sequelize timestamp |
| `updatedAt` | DATE | Sequelize timestamp |

## Associations

- `User` hasMany `Session` (`userId`, on delete cascade)
- `Session` belongsTo `User` (`userId`)
- `User` hasMany `List` (`userId`, on delete cascade)
- `List` belongsTo `User` (`userId`)
- `List` hasMany `Todo` (`listId`, on delete cascade)
- `Todo` belongsTo `List` (`listId`)
- `User` hasMany `Todo` (`userId`, on delete cascade)
- `Todo` belongsTo `User` (`userId`)

## Feature provenance

| Area | Introduced |
|------|------------|
| `users`, `sessions` | Feature 1 |
| `lists` | Feature 2 |
| `todos` | Feature 3 |
| Profile edits on `users` | Feature 4 |
