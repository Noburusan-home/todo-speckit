import bcrypt from "bcryptjs";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { getAccessibleUserOrNull } from "../authorization/authorization.js";

const SALT_ROUNDS = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const exports = {};

function trimmed(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseUserId(value) {
  const id = parseInt(value, 10);

  if (Number.isNaN(id)) {
    return null;
  }

  return id;
}

exports.findOne = async (req, res) => {
  const id = parseUserId(req.params.id);

  if (id === null) {
    return res.status(400).send({ message: "User id must be a number." });
  }

  try {
    const user = await getAccessibleUserOrNull(req, id);

    if (!user) {
      return res.status(404).send({ message: `User with id=${id} not found.` });
    }

    logger.debug(`Profile read userId=${req.user.id}`);
    return res.send(user);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "Unable to load profile." });
  }
};

exports.update = async (req, res) => {
  const id = parseUserId(req.params.id);

  if (id === null) {
    return res.status(400).send({ message: "User id must be a number." });
  }

  const fName = trimmed(req.body?.fName);
  const lName = trimmed(req.body?.lName);
  const email = trimmed(req.body?.email);
  const username = trimmed(req.body?.username).toLowerCase();
  const passwordProvided = typeof req.body?.password === "string" && req.body.password.length > 0;
  const password = passwordProvided ? req.body.password : "";

  try {
    const user = await getAccessibleUserOrNull(req, id);

    if (!user) {
      return res.status(404).send({ message: `User with id=${id} not found.` });
    }

    if (passwordProvided && password.length < 8) {
      return res.status(400).send({ message: "Password must be at least 8 characters." });
    }

    if (!fName) {
      return res.status(400).send({ message: "First name is required." });
    }

    if (!lName) {
      return res.status(400).send({ message: "Last name is required." });
    }

    if (!email) {
      return res.status(400).send({ message: "Email is required." });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).send({ message: "Enter a valid email address." });
    }

    if (!username) {
      return res.status(400).send({ message: "Username is required." });
    }

    const usernameTaken = await db.user.findOne({ where: { username } });

    if (usernameTaken && usernameTaken.id !== user.id) {
      return res.status(400).send({ message: "Username is already taken." });
    }

    const emailTaken = await db.user.findOne({ where: { email } });

    if (emailTaken && emailTaken.id !== user.id) {
      return res.status(400).send({ message: "Email is already registered." });
    }

    const changes = { fName, lName, email, username };

    if (passwordProvided) {
      changes.password = await bcrypt.hash(password, SALT_ROUNDS);
    }

    await user.update(changes);
    const fresh = await db.user.findByPk(user.id);
    logger.debug(`Profile update userId=${req.user.id}`);
    return res.send(fresh);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "Unable to update profile." });
  }
};

export default exports;
