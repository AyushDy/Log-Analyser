const { parentPort, workerData } = require('worker_threads');
require('dotenv').config();

// Import helper functions for categorization
const { isJsonLog, isNginxLog, isCustomAppLog } = require('../controllers/logControllers'); 

parentPort.on('message', async (batch) => {
    try {
        const categorizedLogs = {
            jsonLogs: [],
            nginxLogs: [],
            customLogs: [],
            unknownLogs: [],
        };

        for (const log of batch) {
            if (isJsonLog(log)) categorizedLogs.jsonLogs.push(log);
            else if (isNginxLog(log)) categorizedLogs.nginxLogs.push(log);
            else if (isCustomAppLog(log)) categorizedLogs.customLogs.push(log);
            else categorizedLogs.unknownLogs.push(log);
        }

        // Send processed data back
        parentPort.postMessage(categorizedLogs);
    } catch (error) {
        parentPort.postMessage({ error: error.message });
    }
});
