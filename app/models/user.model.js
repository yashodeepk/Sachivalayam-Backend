const mongoose = require("mongoose");

const User = mongoose.model(
  "User",
  new mongoose.Schema(
    {
      name: String,
      email: String,
      password: String,
      phone: String,
      ward: String,
      zone: String,
      sachivalyam: String,
      gender: String,
      age: Number,
      supervisor : {
        type: mongoose.Schema.Types.ObjectId, //["secretary", "admin", "worker", "sanitaryInspector"]
        ref: "User",
      },
      workingSlots: { type: Array, default: [] },
      roles: {
        type: mongoose.Schema.Types.ObjectId, //["secretary", "admin", "worker", "sanitaryInspector"]
        ref: "Role",
      },
    },
    { timestamps: true }
  )
);

module.exports = User;
