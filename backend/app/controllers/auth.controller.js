import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import db from "../models/index.js";
import logger from "../config/logger.js";
import authConfig from "../config/auth.config.js";

const SALT_ROUNDS = 10;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const exports = {};

function trimmed(value) {
  return typeof value === "string" ? value.trim() : "";
}

function authPayload(user, token) {
  return {
    userId: user.id,
    username: user.username,
    email: user.email,
    fName: user.fName,
    lName: user.lName,
    role: user.role,
    token,
  };
}

async function issueSession(user) {
  const existing = await db.session.findOne({
    where: {
      userId: user.id,
      expirationDate: { [Op.gte]: new Date() },
    },
  });

  if (existing?.token) {
    return existing.token;
  }

  const token = jwt.sign({ id: user.id }, authConfig.secret, {
    expiresIn: SESSION_TTL_MS / 1000,
  });

  await db.session.create({
    token,
    email: user.email,
    expirationDate: new Date(Date.now() + SESSION_TTL_MS),
    userId: user.id,
  });

  return token;
}

function duplicateMessage(err) {
  const field = err.errors?.[0]?.path;

  if (field === "username") {
    return "Username is already taken.";
  }

  if (field === "email") {
    return "Email is already registered.";
  }

  return null;
}

exports.register = async (req, res) => {
  const fName = trimmed(req.body?.fName);
  const lName = trimmed(req.body?.lName);
  const email = trimmed(req.body?.email);
  const username = trimmed(req.body?.username).toLowerCase();
  const password = typeof req.body?.password === "string" ? req.body.password : "";

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

  if (!password.trim()) {
    return res.status(400).send({ message: "Password is required." });
  }

  if (password.length < 8) {
    return res.status(400).send({ message: "Password must be at least 8 characters." });
  }

  try {
    const usernameTaken = await db.user.findOne({ where: { username } });

    if (usernameTaken) {
      return res.status(400).send({ message: "Username is already taken." });
    }

    const emailTaken = await db.user.findOne({ where: { email } });

    if (emailTaken) {
      return res.status(400).send({ message: "Email is already registered." });
    }

    const user = await db.user.create({
      fName,
      lName,
      email,
      username,
      password: await bcrypt.hash(password, SALT_ROUNDS),
      role: "worker",
    });

    const token = await issueSession(user);
    logger.debug(`Registered userId=${user.id}`);
    return res.status(201).send(authPayload(user, token));
  } catch (err) {
    const message = err.name === "SequelizeUniqueConstraintError" ? duplicateMessage(err) : null;

    if (message) {
      return res.status(400).send({ message });
    }

    logger.error(err.message);
    return res.status(500).send({ message: "Unable to register." });
  }
};

exports.login = async (req, res) => {
  const username = trimmed(req.body?.username).toLowerCase();
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!username) {
    return res.status(400).send({ message: "Username is required." });
  }

  if (!password.trim()) {
    return res.status(400).send({ message: "Password is required." });
  }

  try {
    const user = await db.user.unscoped().findOne({ where: { username } });
    const matches = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !matches) {
      return res.status(401).send({ message: "Invalid username or password." });
    }

    const token = await issueSession(user);
    logger.debug(`Login userId=${user.id}`);
    return res.send(authPayload(user, token));
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "Unable to sign in." });
  }
};

exports.logout = async (req, res) => {
  const header = req.headers.authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();

  try {
    if (token) {
      await db.session.destroy({ where: { token } });
    }

    logger.debug(`Logout userId=${req.user?.id}`);
    return res.send({ message: "Signed out." });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "Unable to sign out." });
  }
};

export default exports;
