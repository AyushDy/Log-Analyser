const readline = require('readline');
const { Readable } = require('stream');
const logService = require("../services/logService");
const { Worker } = require('worker_threads');
require('dotenv').config();

const uploadLog = async (req, res) => {
    // console.log("req received");
    try {
        if (!req.file || !req.file.buffer || !req.file.buffer.toString().trim()) {
            throw new Error('Uploaded file is empty or invalid');
        }

        const logsStream = Readable.from(req.file.buffer);
        const rl = readline.createInterface({
            input: logsStream,
            crlfDelay: Infinity, // Handle all line endings correctly
        });

        // Categorize logs based on format
        const categorizedLogs = {
            jsonLogs: [],
            nginxLogs: [],
            customLogs: [],
            unknownLogs: [],
        };

        // Process logs asynchronously in batches
        const batchSize = process.env.LOG_VALIDATION_BATCH_SIZE=10000 || 10000;
         // Process in batches of 10000 log entries
        let batch = [];

        for await (const log of rl) {
            if (log.trim()) {
                batch.push(log);
                if (batch.length >= batchSize) {
                    await processBatch(batch, categorizedLogs);
                    batch = []; // Reset batch after processing
                }
            }
        }

        // Process any remaining logs in the last batch
        if (batch.length > 0) {
            await processBatch(batch, categorizedLogs);
        }

        // Process the categorized logs in parallel
        const processedLogs = await Promise.all([
            logService.processLogs(categorizedLogs.jsonLogs, 'json'),
            logService.processLogs(categorizedLogs.nginxLogs, 'nginx'),
            logService.processLogs(categorizedLogs.customLogs, 'custom'),
        ]);

        // console.log(categorizedLogs.jsonLogs);

        // Response with details for each category
        res.json({
            success: true,
            message: 'Logs processed successfully',
            categorizedResults: {
                jsonLogs: processedLogs[0].success.length,
                nginxLogs: processedLogs[1].success.length,
                customLogs: processedLogs[2].success.length,
                unknownLogs: categorizedLogs.unknownLogs.length,
            },
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};


const batchUploadLogs = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            throw new Error('No files were uploaded');
        }

        // Initialize categorized logs for all files
        const overallCategorizedLogs = req.files.map(() => ({
            jsonLogs: [],
            nginxLogs: [],
            customLogs: [],
            unknownLogs: [],
        }));

        // Helper to process a single file
        const processFile = async (file, categorizedLogs) => {
            const logsStream = Readable.from(file.buffer);
            const rl = readline.createInterface({
                input: logsStream,
                crlfDelay: Infinity,
            });

            const batchSize = process.env.LOG_VALIDATION_BATCH_SIZE || 10000;
            let batch = [];

            for await (const log of rl) {
                if (log.trim()) {
                    batch.push(log);
                    if (batch.length >= batchSize) {
                        await processBatch(batch, categorizedLogs);
                        batch = [];
                    }
                }
            }

            // Process any remaining logs in the last batch
            if (batch.length > 0) {
                await processBatch(batch, categorizedLogs);
            }
        };

        // Process all files in parallel
        await Promise.all(
            req.files.map((file, index) =>
                processFile(file, overallCategorizedLogs[index])
            )
        );

        // Process the categorized logs for all files in parallel
        const allProcessedLogs = await Promise.all(
            overallCategorizedLogs.map(async (categorizedLogs) => {
                const [jsonResults, nginxResults, customResults] = await Promise.all([
                    logService.processLogs(categorizedLogs.jsonLogs, 'json'),
                    logService.processLogs(categorizedLogs.nginxLogs, 'nginx'),
                    logService.processLogs(categorizedLogs.customLogs, 'custom'),
                ]);
                
                return {
                    jsonLogs: jsonResults,
                    nginxLogs: nginxResults,
                    customLogs: customResults
                };
            })
        );

        // Build response summary for all files
        const responseSummary = req.files.map((file, index) => ({
            fileName: file.originalname,
            categorizedResults: {
                ...allProcessedLogs[index],
                unknownLogs: overallCategorizedLogs[index].unknownLogs,
            },
        }));

        res.json({
            success: true,
            message: 'Batch logs processed successfully',
            files: responseSummary,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};


const searchLog = async (req, res) => {
    // console.log("req received");
  try {
    const result = await logService.searchLogs(req.query);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};


// Helper function to process a batch of log entries
async function processBatch(batch, categorizedLogs) {
    // Categorize each log entry asynchronously
    const categorizationPromises = batch.map(async (log) => {
        if (isJsonLog(log)) {
            categorizedLogs.jsonLogs.push(log);
        } else if (isNginxLog(log)) {
            categorizedLogs.nginxLogs.push(log);
        } else if (isCustomAppLog(log)) {
            categorizedLogs.customLogs.push(log);
        } else {
            categorizedLogs.unknownLogs.push(log);
        }
    });

    // Wait for all categorization tasks to complete
    await Promise.all(categorizationPromises);
}

// Helper function to detect JSON log format
function isJsonLog(logEntry) {
    try {
        const parsed = JSON.parse(logEntry);
        return parsed.timestamp && parsed.level && parsed.message;
    } catch (error) {
        return false;
    }
}


// Helper function to detect Nginx log format
function isNginxLog(logEntry) {
    const nginxPattern = /^\d+\.\d+\.\d+\.\d+/;
    return nginxPattern.test(logEntry);
}


// Helper function to detect Custom App log format
function isCustomAppLog(logEntry) {
    const customAppPattern = /\[.*\]\s*\[.*\]\s*\w+\s*-/;
    return customAppPattern.test(logEntry);
}


// Export both functions
module.exports = {
  uploadLog,
  searchLog,
  batchUploadLogs,
};

