const moment = require('moment');

class BaseLogProcessor {
    standardizeTimestamp(timestamp) {
        // Define supported timestamp formats
        // console.log('timestamp', timestamp);
        const formats = [
            'DD/MMM/YYYY:HH:mm:ss Z',  // Apache/Nginx format: 10/Oct/2023:13:55:36 +0000
            'YYYY-MM-DD HH:mm:ss.SSS', // SQL timestamp format: 2023-10-10 13:55:36.123
            'YYYY-MM-DDTHH:mm:ss.SSSZ', // ISO format with milliseconds: 2023-10-10T13:55:36.123Z
            'YYYY-MM-DDTHH:mm:ssZ',    // ISO format: 2023-10-10T13:55:36Z
            'YYYY-MM-DD HH:mm:ss Z'    // Standard format with timezone: 2023-10-10 13:55:36 +0000
        ];

        // Handle Unix timestamps (numbers)
        if (!isNaN(timestamp) && String(timestamp).length === 10) {
            // console.log(moment.unix(parseInt(timestamp)).toDate());
            return moment.unix(parseInt(timestamp)).toDate();
        }

        // Try parsing with moment.js using specified formats
        for (const format of formats) {
            const parsedDate = moment(timestamp, format, true);
            if (parsedDate.isValid()) {
                // console.log(parsedDate.toDate());
                return parsedDate.toDate();
            }
        }

        // Fallback: Try native Date parsing for ISO strings
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
            // console.log(date);
            return date;
        }

        // Detailed error message for debugging
        throw new Error(`Invalid timestamp format: ${timestamp}. Supported formats are: 
            - DD/MMM/YYYY:HH:mm:ss Z (e.g., 10/Oct/2023:13:55:36 +0000)
            - YYYY-MM-DD HH:mm:ss.SSS (e.g., 2023-10-10 13:55:36.123)
            - YYYY-MM-DDTHH:mm:ss.SSSZ (e.g., 2023-10-10T13:55:36.123Z)
            - YYYY-MM-DDTHH:mm:ssZ (e.g., 2023-10-10T13:55:36Z)
            - Unix timestamp (e.g., 1696939200)`);
    }

    validateLogEntry(logEntry) {
        if (!logEntry || typeof logEntry !== 'string') {
            throw new Error('Log entry must be a non-empty string');
        }
        return logEntry.trim();
    }

    process(logEntry) {
        throw new Error('Process method must be implemented by derived classes');
    }
}

module.exports = BaseLogProcessor;