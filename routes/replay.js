const express = require("express");
const { getHistory } = require("../sockets/replayLogger");

const router = express.Router();

router.get("/:roomId/history", async (req, res) => {
  try {
    const history = await getHistory(req.params.roomId);
    res.json({ roomId: req.params.roomId, count: history.length, history });
  } catch (err) {
    console.error("Replay history error:", err.message);
    res.status(500).json({ error: "Failed to load session history" });
  }
});

module.exports = router;