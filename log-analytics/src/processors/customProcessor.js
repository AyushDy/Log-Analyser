const BaseLogProcessor = require('./baseProcessor');

class CustomLogProcessor extends BaseLogProcessor {
    process(logEntry) {
        const pattern = /\[(.*?)\] \[(.*?)\] (.*?) - (.*)/;
        const matches = logEntry.match(pattern);

        if (!matches) {
            throw new Error('Failed to parse custom log entry');
        }

        const [, timestamp, level, source, message] = matches;

        return {
            timestamp: this.standardizeTimestamp(timestamp),
            level: level.toUpperCase(),
            message,
            source,
            rawLog: logEntry,
            metadata: { source }
        };
    }
}

module.exports = CustomLogProcessor;
