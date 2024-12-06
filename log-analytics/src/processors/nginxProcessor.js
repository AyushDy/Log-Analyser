const BaseLogProcessor = require('./baseProcessor');

class NginxLogProcessor extends BaseLogProcessor {
    process(logEntry) {
        const pattern = /(\d+\.\d+\.\d+\.\d+).*\[([^\]]+)\] "(.*?)" (\d+) (\d+)/;
        const matches = logEntry.match(pattern);

       

        if (!matches) {
            throw new Error('Failed to parse nginx log entry');
        }

        const [, ip, timestamp, request, status, bytes] = matches;
        const level = parseInt(status) >= 400 ? 'ERROR' : 'INFO';


        return {
            timestamp: this.standardizeTimestamp(timestamp),
            level,
            message: `${request} - Status: ${status}, Bytes: ${bytes}`,
            source: 'nginx',
            rawLog: logEntry,
            metadata: { ip, status, bytes }
        };
    }
}

module.exports = NginxLogProcessor;