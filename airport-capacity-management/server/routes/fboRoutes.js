const express = require("express");
const router = express.Router();
const fboController = require("../controllers/FBOController");

router.post("/addFBO", fboController.addFBO);
router.delete("/deleteFBO/:id", fboController.deleteFBO);
router.patch("/updateFBO", fboController.updateFBO);

module.exports = router;