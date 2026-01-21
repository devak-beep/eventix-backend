const express = require("express");
const router = express.Router();

const {
  createEvent,
  getEventById,
} = require("../controllers/event.controller");

router.post("/", createEvent);
router.get("/:id", getEventById);

module.exports = router;
