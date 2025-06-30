const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true },
});

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

// Home
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// Create user
app.post("/api/users", async (req, res) => {
  const user = new User({ username: req.body.username });
  const saved = await user.save();
  res.json({ username: saved.username, _id: saved._id });
});

// Get all users
app.get("/api/users", async (req, res) => {
  const users = await User.find({}, "username _id");
  res.json(users);
});

// Add exercise
app.post("/api/users/:_id/exercises", async (req, res) => {
  const { description, duration, date } = req.body;
  const user = await User.findById(req.params._id);
  if (!user) return res.send("User not found");

  const ex = new Exercise({
    userId: user._id,
    description: description,
    duration: parseInt(duration),
    date: date ? new Date(date) : new Date(),
  });

  const saved = await ex.save();

  res.json({
    _id: user._id,
    username: user.username,
    description: saved.description,
    duration: saved.duration,
    date: saved.date.toDateString(),
  });
});

// Logs with from, to, limit
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

  let query = Exercise.find(filter).sort({ date: 1 }); // sort ascending

  if (limit) {
    query = query.limit(parseInt(limit));
  }

  const log = await query.exec();

  res.json({
    _id: user._id,
    username: user.username,
    count: log.length,
    log: log.map((e) => ({
      description: String(e.description),
      duration: Number(e.duration),
      date: e.date.toDateString(),
    })),
  });
});

// Listen
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
