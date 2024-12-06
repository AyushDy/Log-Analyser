const express = require("express");
const multer = require("multer");
const {uploadLog, searchLog, batchUploadLogs} = require("../controllers/logControllers");


const router = express.Router();
const upload = multer();

router
.post("/upload", upload.single("file"),uploadLog)
.post("/batch-upload", upload.array("files"), batchUploadLogs)



router.get("/search",searchLog);

module.exports = router;
