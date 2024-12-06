const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        required: true,
        index: true
    },
    level: {
        type: String,
        required: true,
        index: true
    },
    message: {
        type: String,
        required: true,
        text: true // Enable text search
    },
    source: {
        type: String,
        required: true,
        index: true
    },
    rawLog: {
        type: String,
        required: true
    },
    metadata: {
        type: Map,
        of: String
    }
}, {
    timestamps: true
});

// Create indexes for efficient searching
logSchema.index({ message: 'text' });
logSchema.index({ timestamp: 1, level: 1, source: 1 });

module.exports = mongoose.model('Log', logSchema);