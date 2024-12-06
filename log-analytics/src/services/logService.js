const Log = require("../models/log");
const NginxLogProcessor = require("../processors/nginxProcessor");
const JsonLogProcessor = require("../processors/jsonProcessor");
const CustomLogProcessor = require("../processors/customProcessor");
const { Transform } = require("stream");
// const readline = require("readline");
const { Readable } = require("stream");
const chunk = require("lodash/chunk");
require('dotenv').config();

class LogService {
    constructor() {
        this.processors = new Map([
          ["nginx", new NginxLogProcessor()],
          ["json", new JsonLogProcessor()],
          ["custom", new CustomLogProcessor()],
        ]);
    
        // Configuration
        this.BATCH_SIZE = parseInt(process.env.LOG_UPLOAD_BATCH_SIZE, 10);
        this.MAX_CONCURRENT_BATCHES = parseInt(process.env.MAX_CONCURRENT_BATCHES, 10);
        this.STREAM_HIGH_WATER_MARK = parseInt(process.env.STREAM_HIGH_WATER_MARK, 10);
      }
    
      // Stream transformer for processing logs
      createLogTransformer(processor) {
        return new Transform({
          objectMode: true,
          highWaterMark: this.STREAM_HIGH_WATER_MARK,
          async transform(chunk, encoding, callback) {
            try {
              const processed = await processor.process(chunk);
              callback(null, processed);
            } catch (error) {
              callback(null, { error: error.message, rawLog: chunk });
            }
          },
        });
      }
    
      // Process logs using streams for memory efficiency
      async processLogs(logs, format) {
        const processor = this.processors.get(format);
        if (!processor) throw new Error("Unsupported log format");
    
        const results = { success: [], errors: [], totalProcessed: 0 };
        const logStream = Readable.from(logs, { objectMode: true });
    
        const transformer = this.createLogTransformer(processor);
        const processedLogs = [];
    
        logStream.pipe(transformer);
    
        for await (const processed of transformer) {
          if (processed.error) {
            results.errors.push({ log: processed.rawLog, error: processed.error });
          } else {
            processedLogs.push(processed);
            results.totalProcessed++;
          }
    
          // Batch insert when reaching batch size
          if (processedLogs.length >= this.BATCH_SIZE) {
            await this.batchInsertLogs(processedLogs, results);
            processedLogs.length = 0; // Clear array
          }
        }
    
        // Insert remaining logs
        if (processedLogs.length > 0) {
          await this.batchInsertLogs(processedLogs, results);
        }
  
        // console.log(results);
        return results;
      }
    
      // Handle batch insertions with controlled concurrency
      async batchInsertLogs(logs, results) {
        const batches = chunk(logs, this.BATCH_SIZE);
        const batchPromises = [];
    
        for (const batch of batches) {
          if (batchPromises.length >= this.MAX_CONCURRENT_BATCHES) {
            await Promise.race(batchPromises);
          }
    
          const promise = Log.insertMany(batch, { ordered: false })
            .then((inserted) => {
              results.success.push(...inserted);
            })
            .catch((err) => {
              if (err.writeErrors) {
                const successfulOps = err.result.nInserted;
                results.success.push(...batch.slice(0, successfulOps));
                results.errors.push({
                  error: "Partial batch insertion failure",
                  details: err.writeErrors,
                });
              } else {
                results.errors.push({
                  error: "Batch insertion failed",
                  details: err.message,
                });
              }
            });
    
          batchPromises.push(promise);
        }
    
        await Promise.all(batchPromises);
      }

  // Improved search with cursor-based pagination and efficient querying
  async searchLogs({
    startTime,
    endTime,
    level,
    source,
    keyword,
    sortBy = 'timestamp',
    sortOrder = 'desc',
    page = 1,
    lastId = null,
    limit = 50,
  }) {
    const query = {};
    
    // Validate and sanitize pagination params
    const currentPage = Math.max(1, parseInt(page));
    const itemsPerPage = Math.min(parseInt(limit), 1000); // Prevent excessive limit values
    
    // Build sort options
    const sortOptions = {};
    const validSortFields = ['timestamp', 'level', 'source', '_id'];
    const validSortOrders = ['asc', 'desc'];
    
    // Validate sort parameters
    const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'timestamp';
    const finalSortOrder = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';
    sortOptions[finalSortBy] = finalSortOrder === 'desc' ? -1 : 1;
    
    // Always include _id in sort for consistency
    if (finalSortBy !== '_id') {
      sortOptions._id = -1;
    }
  
    // Build query conditions
    if (startTime || endTime) {
      query.timestamp = {};
      if (startTime) query.timestamp.$gte = new Date(startTime);
      if (endTime) query.timestamp.$lte = new Date(endTime);
    }
  
    if (level) query.level = level;
    if (source) query.source = source;
    if (keyword) {
      // Use text index if available, otherwise fallback to regex
      if (await this.hasTextIndex()) {
        query.$text = { $search: keyword };
      } else {
        query.$or = [
          { message: { $regex: keyword, $options: "i" } },
          { source: { $regex: keyword, $options: "i" } },
        ];
      }
    }
  
    // Calculate skip value for pagination
    const skip = (currentPage - 1) * itemsPerPage;
  
    const options = {
      sort: sortOptions,
      limit: itemsPerPage,
      skip: skip,
    };
  
    // Execute queries
    const [logs, total] = await Promise.all([
      Log.find(query, null, options).lean(),
      Log.countDocuments(query)
    ]);
  
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / itemsPerPage);
    const hasMore = currentPage < totalPages;
    const lastLogId = logs.length > 0 ? logs[logs.length - 1]._id : null;
  
    return {
      logs,
      pagination: {
        currentPage,
        totalPages,
        totalItems: total,
        itemsPerPage,
        hasMore,
        lastId: lastLogId
      },
      sort: {
        field: finalSortBy,
        order: finalSortOrder
      }
    };
  }

  // Helper method to check if text index exists
  async hasTextIndex() {
    const indexes = await Log.collection.getIndexes();
    return Object.values(indexes).some((index) => index.textIndexVersion);
  }
}

module.exports = new LogService();
