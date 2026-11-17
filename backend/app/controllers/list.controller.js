import db from "../models/index.js";
import logger from "../config/logger.js";
import { getAccessibleListOrNull } from "../authorization/authorization.js";

const exports = {};

function trimmedName(value) {
  return typeof value === "string" ? value.trim() : "";
}

function nameError(name) {
  if (!name) {
    return "List name is required.";
  }

  if (name.length > 100) {
    return "List name must be 100 characters or fewer.";
  }

  return null;
}

function parseListId(value) {
  const id = parseInt(value, 10);

  if (Number.isNaN(id)) {
    return null;
  }

  return id;
}

exports.findAll = async (req, res) => {
  try {
    const lists = await db.list.findAll({
      where: { userId: req.user.id },
      order: [["name", "ASC"]],
    });

    logger.debug(`List read for userId=${req.user.id}`);
    return res.send(lists);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "Unable to load lists." });
  }
};

exports.create = async (req, res) => {
  const name = trimmedName(req.body?.name);
  const message = nameError(name);

  if (message) {
    return res.status(400).send({ message });
  }

  try {
    const list = await db.list.create({
      name,
      userId: req.user.id,
    });

    logger.debug(`List created id=${list.id} userId=${req.user.id}`);
    return res.status(201).send(list);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "Unable to create the list." });
  }
};

exports.update = async (req, res) => {
  const id = parseListId(req.params.listId);

  if (id === null) {
    return res.status(400).send({ message: "List id must be a number." });
  }

  const name = trimmedName(req.body?.name);
  const message = nameError(name);

  if (message) {
    return res.status(400).send({ message });
  }

  try {
    const list = await getAccessibleListOrNull(req, id);

    if (!list) {
      return res.status(404).send({ message: `List with id=${id} not found.` });
    }

    await list.update({ name });
    logger.debug(`List renamed id=${id} userId=${req.user.id}`);
    return res.send(list);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "Unable to rename the list." });
  }
};

exports.remove = async (req, res) => {
  const id = parseListId(req.params.listId);

  if (id === null) {
    return res.status(400).send({ message: "List id must be a number." });
  }

  try {
    const list = await getAccessibleListOrNull(req, id);

    if (!list) {
      return res.status(404).send({ message: `List with id=${id} not found.` });
    }

    await list.destroy();
    logger.debug(`List deleted id=${id} userId=${req.user.id}`);
    return res.send({ message: "List deleted." });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "Unable to delete the list." });
  }
};

export default exports;
