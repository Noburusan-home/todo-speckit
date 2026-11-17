import db from "../models/index.js";
import logger from "../config/logger.js";
import { getAccessibleListOrNull, getAccessibleTodoOrNull } from "../authorization/authorization.js";

const exports = {};

function parseId(value) {
  const id = parseInt(value, 10);

  if (Number.isNaN(id)) {
    return null;
  }

  return id;
}

function trimmedTitle(value) {
  return typeof value === "string" ? value.trim() : "";
}

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function dueDateError(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string" || !DATE_ONLY_REGEX.test(value)) {
    return "Due date must be a valid date in YYYY-MM-DD format.";
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const valid = parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;

  if (!valid) {
    return "Due date must be a valid date in YYYY-MM-DD format.";
  }

  return null;
}

function titleError(title) {
  if (!title) {
    return "Todo title is required.";
  }

  if (title.length > 255) {
    return "Todo title must be 255 characters or fewer.";
  }

  return null;
}

exports.findAll = async (req, res) => {
  const listId = parseId(req.params.listId);

  if (listId === null) {
    return res.status(400).send({ message: "List id must be a number." });
  }

  try {
    const list = await getAccessibleListOrNull(req, listId);

    if (!list) {
      return res.status(404).send({ message: `List with id=${listId} not found.` });
    }

    const todos = await db.todo.findAll({
      where: { listId: list.id, userId: req.user.id },
      order: [
        ["completed", "ASC"],
        ["createdAt", "ASC"],
      ],
    });

    logger.debug(`Todo read listId=${list.id} userId=${req.user.id}`);
    return res.send(todos);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "Unable to load todos." });
  }
};

exports.create = async (req, res) => {
  const listId = parseId(req.params.listId);

  if (listId === null) {
    return res.status(400).send({ message: "List id must be a number." });
  }

  const title = trimmedTitle(req.body?.title);
  const message = titleError(title);

  if (message) {
    return res.status(400).send({ message });
  }

  try {
    const list = await getAccessibleListOrNull(req, listId);

    if (!list) {
      return res.status(404).send({ message: `List with id=${listId} not found.` });
    }

    let dueDate = null;

    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "dueDate") && req.body.dueDate !== null) {
      const dateMessage = dueDateError(req.body.dueDate);

      if (dateMessage) {
        return res.status(400).send({ message: dateMessage });
      }

      dueDate = req.body.dueDate;
    }

    const todo = await db.todo.create({
      title,
      completed: false,
      dueDate,
      listId: list.id,
      userId: req.user.id,
    });

    logger.debug(`Todo created id=${todo.id} listId=${list.id} userId=${req.user.id}`);
    return res.status(201).send(todo);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "Unable to create the todo." });
  }
};

exports.update = async (req, res) => {
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(400).send({ message: "Todo id must be a number." });
  }

  const changes = {};

  if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "title")) {
    const title = trimmedTitle(req.body.title);
    const message = titleError(title);

    if (message) {
      return res.status(400).send({ message });
    }

    changes.title = title;
  }

  if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "completed")) {
    if (typeof req.body.completed !== "boolean") {
      return res.status(400).send({ message: "Completed must be true or false." });
    }

    changes.completed = req.body.completed;
  }

  try {
    const todo = await getAccessibleTodoOrNull(req, id);

    if (!todo) {
      return res.status(404).send({ message: `Todo with id=${id} not found.` });
    }

    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "dueDate")) {
      const dateMessage = dueDateError(req.body.dueDate);

      if (dateMessage) {
        return res.status(400).send({ message: dateMessage });
      }

      changes.dueDate = req.body.dueDate;
    }

    await todo.update(changes);
    logger.debug(`Todo updated id=${id} userId=${req.user.id}`);
    return res.send(todo);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "Unable to update the todo." });
  }
};

exports.remove = async (req, res) => {
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(400).send({ message: "Todo id must be a number." });
  }

  try {
    const todo = await getAccessibleTodoOrNull(req, id);

    if (!todo) {
      return res.status(404).send({ message: `Todo with id=${id} not found.` });
    }

    await todo.destroy();
    logger.debug(`Todo deleted id=${id} userId=${req.user.id}`);
    return res.send({ message: "Todo deleted." });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "Unable to delete the todo." });
  }
};

export default exports;
