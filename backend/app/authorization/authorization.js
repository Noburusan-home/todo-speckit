import jwt from "jsonwebtoken";
import db from "../models/index.js";
import authConfig from "../config/auth.config.js";
import logger from "../config/logger.js";

function bearerToken(req) {
  const header = req.headers.authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

export async function authenticate(req, res, next) {
  const token = bearerToken(req);

  if (!token) {
    return res.status(401).send({ message: "Unauthorized! No token provided." });
  }

  try {
    jwt.verify(token, authConfig.secret);
  } catch {
    return res.status(401).send({ message: "Unauthorized! Invalid token." });
  }

  try {
    const session = await db.session.findOne({
      where: { token },
      include: [db.user],
    });

    if (!session?.user || new Date(session.expirationDate).getTime() < Date.now()) {
      return res.status(401).send({ message: "Unauthorized! Invalid or expired session." });
    }

    req.user = {
      id: session.user.id,
      role: session.user.role,
      organizationId: null,
    };

    return next();
  } catch (err) {
    logger.error(err.message);
    return res.status(401).send({ message: "Unauthorized! Unable to validate session." });
  }
}

export function requireAdmin(req, res, next) {
  const role = req.user?.role;

  if (role === "admin" || role === "superadmin") {
    return next();
  }

  return res.status(403).send({ message: "Require Admin Role!" });
}

export function requireSuperAdmin(req, res, next) {
  if (req.user?.role === "superadmin") {
    return next();
  }

  return res.status(403).send({ message: "Require Super Admin Role!" });
}
