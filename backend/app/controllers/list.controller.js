import logger from "../config/logger.js";

const exports = {};

exports.findAll = async (req, res) => {
  logger.debug(`List read for userId=${req.user.id}`);
  res.send([]);
};

export default exports;
