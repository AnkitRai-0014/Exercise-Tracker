// server.js
const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const exerciseSchema = new mongoose.Schema({
  userId: String,
  description: String,
  duration: Number,
  date: Date,
});

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

// Serve front-end
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// Create new user
app.post("/api/users", async (req, res) => {
  try {
    const newUser = new User({ username: req.body.username });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.status(500).send(err);
  }
});

// Get all users
app.get("/api/users", async (req, res) => {
  const users = await User.find({});
  res.json(users.map((u) => ({ username: u.username, _id: u._id })));
});

// Add exercise
app.post("/api/users/:_id/exercises", async (req, res) => {
  const { description, duration, date } = req.body;
  const user = await User.findById(req.params._id);
  if (!user) return res.send("User not found");

  const exercise = new Exercise({
    userId: user._id,
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: req.body.date ? new Date(req.body.date) : new Date(),
  });

  const savedEx = await exercise.save();

  res.json({
    _id: user._id,
    username: user.username,
    date: savedEx.date.toDateString(),
    duration: savedEx.duration,
    description: savedEx.description,
  });
});

// Get logs with from, to, limit
app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;

  const user = await User.findById(req.params._id);
  if (!user) return res.send("User not found");

  let filter = { userId: user._id };

  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  let query = Exercise.find(filter).select("description duration date");

  if (limit) {
    query = query.limit(parseInt(limit));
  }

  const exercises = await query.exec();

  res.json({
    _id: user._id,
    username: user.username,
    count: await Exercise.countDocuments({ userId: user._id }),
    log: exercises.map((e) => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString(), // ✅ guaranteed: string, correct format
    })),
  });
});

// Listen
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
