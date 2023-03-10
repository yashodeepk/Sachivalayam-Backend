const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const db = {};

db.mongoose = mongoose;

db.user = require("./user.model");
db.role = require("./role.model");
db.task = require("./task.model");
db.taskDetails = require("./taskDetails.model");
db.zone = require("./zone.model");
db.downloads = require("./downloads.model");

db.ROLES = ["secretary", "admin", "worker", "sanitaryInspector"];

module.exports = db;
