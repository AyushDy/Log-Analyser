const BaseLogProcessor = require('./baseProcessor');

class JsonLogProcessor extends BaseLogProcessor {
    process(logEntry) {
        try {
            // console.log(logEntry);
            const data = JSON.parse(logEntry);
            return {
                timestamp: this.standardizeTimestamp(data.timestamp),
                level: data.level || 'INFO',
                message: data.message || 'No message',
                source: data.service || 'json',
                rawLog: logEntry,
                metadata: data
            };
        } catch (error) {
            throw new Error('Failed to parse JSON log entry');
        }
    }
}

module.exports = JsonLogProcessor;