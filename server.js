const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose"); //install mongoose my command "npm i mongoose"
const { MongoClient } = require("mongodb");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const app = express();
app.use(cookieParser());
app.use(express.json());
app.listen(3005);

//
app.use(
  cors({
    origin: `http://localhost:3000`,
    credentials: true,
  })
);

//
app.use(
  express.static("./build", () => {
    console.log("/req");
  })
);
app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "build", "index.html"));
  console.log("/req");
});

const db_link =
  "mongodb+srv://polidahiya830:12er56ui90%40Poli@cluster0.pvrgiqn.mongodb.net/?retryWrites=true&w=majority";

mongoose.connect(db_link).then(async function () {
  const client = new MongoClient(db_link);
  await client.connect();
  const db = client.db("settyl");
  const users = db.collection("users");
  const tasks = db.collection("tasks");
  console.log("db connected");

  console.log("listening");

  // createposts
  app.post("/createtask", verifyToken,async (req, res) => {
    try {
      console.log("ctrequest");
      // 
        const increaseValue=1
        users.updateOne(
          { email: req.email },
          { $inc: { ttask: increaseValue } })
      // 
      req.body.id = Date.now();
      req.body.status = "Incomplete";
      req.body.email = req.email;
      tasks.insertOne(req.body);
      res.json({
        message: "Task created successfully",
      });
    } catch (error) {
      console.log(error);
    }
  });

  //tasks
  app.get("/task", verifyToken, async (req, res) => {
    try {
      console.log("task get req");
      const result = await tasks.find({ email: req.email }).toArray();
      res.json(result);
    } catch (error) {
      console.log(error);
    }
  });

 

  //
  app.post("/Edittask", verifyToken, async (req, res) => {
    try {
      // 
      const result = await tasks.findOne({ id: req.body.id })
      console.log(result.status,req.body.status);
      if(result.status=="Incomplete" && req.body.status=="complete"){
        const increaseValue=1
        users.updateOne(
          { email: req.email },
          { $inc: { ctask: increaseValue } })
      }
      else{
        if(result.status=="complete" && req.body.status=="Incomplete"){
          const increaseValue=-1
          users.updateOne(
            { email: req.email },
            { $inc: { ctask: increaseValue } })
        }
      }
      // 
      const query = { id: req.body.id };
      const update = {
        $set: {
          title: req.body.title,
          description: req.body.description,
          due_date: req.body.due_date,
          assigned_to: req.body.assigned_to,
          status: req.body.status,
        },
      };
      const options = { returnOriginal: false };
      await tasks.findOneAndUpdate(query, update, options);
      res.json({
        message: "Task editted successfully",
      });
    } catch (error) {
      console.log(error);
    }
  });

  //
  app.post("/Deletetask", verifyToken, async (req, res) => {
    try {
      console.log("deletetask get req");
      await tasks.findOneAndDelete({ id: req.body.id });
      //
      res.json({
        message: "Task deleted successfully",
      });
    } catch (error) {
      console.log(error);
    }
  });

  // Admin

   // admin users
   app.get("/users", verifyToken, async (req, res) => {
    try {
      console.log("users get req");
      //
      let user = await users.find({}).toArray();
      res.json(user);
      //
    } catch (error) {
      console.log(error);
    }
  });
  // admin tasks
  app.get("/admintask:email", verifyToken, async (req, res) => {
    try {
      console.log("admin task get req");
      const { email } = req.params;
      const newemail=(email.replace(/:/g, ""))
      console.log("email",newemail);
      const result = await tasks.find({ email: newemail }).toArray();
      console.log("results", result);
      res.json(result);
    } catch (error) {
      console.log(error);
    }
  });

  //user verification

  app.post("/signup", (req, res) => {
    try {
      let email = req.body.email;
      let userdata = {
        fullname: req.body.fullname,
        email: req.body.email,
        password: req.body.password,
        confirmpassword: req.body.confirmpassword,
        ttask:0,
        ctask:0,
      };

      const query = { email: `${email}` };
      users.findOne(query).then((user) => {
        if (user) {
          res.json({
            message: "user exist",
          });
        } else {
          users.insertOne(userdata);
          console.log(userdata);
          res.json({
            message: "signup successfully",
          });
        }
      });
    } catch (error) {
      console.log(error);
    }
  });

  //login
  app.post("/login", (req, res) => {
    try {
      console.log("login req");
      let email = req.body.email;
      let password = req.body.password;
      console.log(req.body);

      users.findOne({ email: `${email}` }).then((user) => {
        if (user) {
          if (user.password == password) {
            const token = jwt.sign({ userId: email }, "this-world-is-toxic", {
              expiresIn: "24h",
            });
            res.cookie(`token`, token, {
              httpOnly: true,
              sameSite: "lax",
              maxAge: 24 * 60 * 60 * 1000,
            });
            if(email=="admin@gmail.com"){
              res.status(200).json({ message: "Login successful(Admin)", token });
            }else{
              res.status(200).json({ message: "Login successful", token });
            }
          } else {
            user.message = "Wrong password";
            res.json({
              message: "User not found",
            });
          }
        } else {
          res.json({
            message: "User not found",
          });
        }
      });
    } catch (error) {
      console.log(error);
    }
  });

  // token verification

  function verifyToken(req, res, next) {
    //
    if (req.headers.cookie) {
      const cookiedata = req.headers.cookie;
      const cookiesArray = cookiedata.split(";");
      const cookiesobject = {};
      cookiesArray.forEach((cookie) => {
        const [key, value] = cookie.trim().split("=");
        cookiesobject[key] = value.replace(/%40/g, "@");
      });
      const token = cookiesobject.token;

      //
      if (token) {
        jwt.verify(token, "this-world-is-toxic", (err, decoded) => {
          if (err) {
            return res.json({ message: "Invalid token" });
          }
          req.email = decoded.userId;
          next();
        });
      } else {
        res.json({ message: "Token not provided" });
      }
    } else {
      console.log("unlogined request");
      return res.json({ message: "Please login first" });
    }
  }
});
