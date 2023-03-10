const config = require("../config/auth.config");
const db = require("../models");
const User = db.user;
const Role = db.role;

const send = require("../services/responseServices.js");

var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
const Zone = require("../models/zone.model");
const { ObjectId } = require("mongodb");

exports.signup = (req, res) => {
  // console.log("signup req: ", req.body);
  if (
    req.body.name == null ||
    req.body.phone == null ||
    req.body.ward == null ||
    req.body.zone == null ||
    req.body.gender == null ||
    req.body.age == null ||
    req.body.roles == null
  ) {
    send.response(res, "Please enter all data for signup process", {}, 403);
    return;
  }
  if (req.body.roles != "worker") {
    if (req.body.email == null || req.body.password == null) {
      send.response(res, "Please send email", {}, 403);
      return;
    }
  } else if (req.body.roles != "sanitaryInspector") {
    if (req.body.sachivalyam == null) {
      send.response(res, "Please send sachivalyam", {}, 403);
      return;
    }
  }

  const user = new User({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password, //bcrypt.hashSync(req.body.password, 8),
    workingSlots: req.body.workingSlots,
    phone: req.body.phone,
    ward: req.body.ward,
    zone: req.body.zone,
    sachivalyam: req.body.sachivalyam,
    gender: req.body.gender,
    age: req.body.age,
    supervisor: req.body.supervisor,
    workingSlots: req.body.workingSlots,
  });

  if (req.body.roles) {
    Role.findOne(
      {
        name: req.body.roles,
      },
      (err, roles) => {
        if (err) {
          console.log(err);
          send.response(res, err, [], 500);
          return;
        }
        user.roles = roles._id;
        if (req.body.zone) {
          Zone.findOne(
            {
              name: req.body.zone,
            },
            (err, zone) => {
              if (err) {
                console.log(err);
                send.response(res, err, [], 500);
                return;
              }
              user.zone = zone._id;
              if (req.body.ward) {
                Zone.aggregate(
                  [
                    {
                      $match: {
                        name: req.body.zone,
                      },
                    },
                    {
                      $unwind: {
                        path: "$ward",
                      },
                    },
                    {
                      $match: {
                        "ward.name": req.body.ward,
                      },
                    },
                    {
                      $unwind: {
                        path: "$ward.sachivalyam",
                      },
                    },
                    {
                      $match: {
                        "ward.sachivalyam.name": req.body.sachivalyam,
                      },
                    },
                    {
                      $project: {
                        wardid: "$ward._id",
                        wardname: "$ward.name",
                        sachivalyamid: "$ward.sachivalyam._id",
                        sachivalyamname: "$ward.sachivalyam.name",
                      },
                    },
                  ],
                  (err, ward) => {
                    if (err) {
                      console.log(err);
                      send.response(res, err, [], 500);
                      return;
                    }
                    if (ward.length <= 0) {
                      send.response(
                        res,
                        "Ward or sachivalyam not found",
                        [],
                        500
                      );
                      return;
                    }

                    user.ward = ward[0].wardid;
                    user.sachivalyam = ward[0].sachivalyamid;
                    if (req.body.password != null) {
                      user.password = bcrypt.hashSync(req.body.password, 8);
                    }

                    user.save((err, updatedUser) => {
                      if (err) {
                        console.log(err);
                        send.response(res, err, [], 500);
                        return;
                      }
                      updatedUser.roles = "ROLE_" + roles.name.toUpperCase();
                      updatedUser.ward = ward[0].wardname;
                      updatedUser.sachivalyam = ward[0].sachivalyamname;
                      updatedUser.zone = zone.name;
                      // console.log("User saved: ", updatedUser);
                      send.response(
                        res,
                        "success",
                        {
                          name: updatedUser.name,
                          email: updatedUser.email,
                          phone: updatedUser.phone,
                          ward: ward[0].wardname,
                          zone: zone.name,
                          sachivalyam: ward[0].sachivalyamname,
                          gender: updatedUser.gender,
                          age: updatedUser.age,
                          workingSlots: updatedUser.workingSlots,
                          _id: updatedUser._id,
                          createdAt: updatedUser.createdAt,
                          updatedAt: updatedUser.updatedAt,
                          roles: "ROLE_" + roles.name.toUpperCase(),
                        },
                        200
                      );
                    });
                  }
                );
              }
            }
          );
        }
      }
    );
  } else {
    Role.findOne({ name: "worker" }, (err, role) => {
      if (err) {
        console.log(err);
        send.response(res, err, [], 500);
        return;
      }

      user.roles = role._id;

      user.save((err, worker) => {
        if (err) {
          send.response(res, err, [], 500);
          return;
        }

        send.response(res, "success", worker, 200);
      });
    });
  }
};

exports.signin = (req, res) => {
  if (req.body.password == undefined || req.body.password == null) {
    send.response(res, "Password Not found.", [], 404);
    return;
  }
  if (req.body.username == undefined || req.body.username == null) {
    send.response(res, "Username Not found.", [], 404);
    return;
  }
  User.findOne({
    email: req.body.username,
  })
    .populate("roles", "-__v")
    .exec(async (err, user) => {
      if (err) {
        send.response(res, err, [], 500);
        return;
      }

      if (!user) {
        send.response(res, "User Not found.", [], 404);
        return;
      }

      if (user.password == undefined || user.password == null) {
        send.response(res, "User Not found.", [], 404);
        return;
      }

      var passwordIsValid = bcrypt.compareSync(
        req.body.password,
        user.password
      );

      if (!passwordIsValid) {
        send.response(res, "Invalid Password!", [], 401);
        return;
      }

      var token = jwt.sign({ id: user.id }, config.secret, {
        expiresIn: 604800, // 7 days
      });

      var authorities = "";

      authorities = "ROLE_" + user.roles.name.toUpperCase();

      let zone = await Zone.aggregate([
        {
          $match: {
            _id: ObjectId(user.zone),
          },
        },
        {
          $unwind: {
            path: "$ward",
          },
        },
        {
          $match: {
            "ward._id": ObjectId(user.ward),
          },
        },
        {
          $unwind: {
            path: "$ward.sachivalyam",
          },
        },
        {
          $match: {
            "ward.sachivalyam._id": ObjectId(user.sachivalyam),
          },
        },
        {
          $project: {
            zonename: "$name",
            wardname: "$ward.name",
            sachivalyamname: "$ward.sachivalyam.name",
          },
        },
      ]);

      send.response(
        res,
        "success",
        {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          ward: zone[0].wardname,
          zone: zone[0].zonename,
          sachivalyam: zone[0].sachivalyamname,
          gender: user.gender,
          age: user.age,
          roles: authorities,
          accessToken: token,
        },
        200
      );
    });
};
