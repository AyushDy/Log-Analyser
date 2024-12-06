# Log Processing Application  

This application processes and stores logs in a MongoDB database. It supports multiple log formats (e.g., Nginx, JSON, custom) and efficient batch uploads with validation.  

---

## Features  
- Stream-based log processing for memory efficiency.  
- Supports multiple log formats with custom processors.  
- Batch processing and upload for large-scale logs.  
- Efficient search with pagination and text indexing.  

---

## Prerequisites  
1. **Node.js**: Ensure you have Node.js installed (v14 or higher).  
2. **MongoDB**: Set up MongoDB and ensure it is running.  
3. **Git**: Clone the repository to your local machine.  

---

## Setup Instructions  

### 1. Clone the Repository  
```bash  
git clone <repository-url>  
cd <repository-folder>
```

### 2. Install Dependencies

```bash
npm install  
```

### 3. Configure Environment Variables

Create a .env file in the root directory:

```bash
touch .env  
```

Add the following variables to your .env file:

| Variable                   | Description                                                                 | Default Value              |
|----------------------------|-----------------------------------------------------------------------------|----------------------------|
| `MONGO_URI`                | MongoDB connection string. Update as per your database setup.               | `mongodb://localhost:27017/logs` |
| `LOG_VALIDATION_BATCH_SIZE`| Batch size for log validation.                                              | `10000`                    |
| `LOG_UPLOAD_BATCH_SIZE`    | Batch size for log uploads.                                                 | `10000`                    |
| `MAX_CONCURRENT_BATCHES`   | Maximum number of concurrent batches for processing.                        | `8`                        |
| `STREAM_HIGH_WATER_MARK`   | High water mark for stream processing.                                       | `16384`                    |
| `PORT`                     | Port on which the application will run.                                      | `3000`                     |

### 4. Set Up MongoDB

Ensure MongoDB is running on your system. Update the `MONGO_URI` in .env with your MongoDB connection string if necessary.

### 5. Start the Application

```bash
npm start  
```

The application will start and be available at `http://localhost:<PORT>`.

The base api url will be `http://localhost:<PORT>/api/logs`.

---

## API Endpoints

### 1. Upload Logs

**Endpoint**: `/upload`  
**Method**: `POST`  
**Description**: Upload a single log file for processing.  

**Request**:
- `Content-Type`: `multipart/form-data`
- `file`: The log file to upload.

**Response**:
- `200 OK`: Logs processed successfully.
- `400 Bad Request`: Error in processing logs.

**Example**:
```bash
curl -X POST http://localhost:<PORT>/api/logs/upload -F "file=@/path/to/logfile.log"
```

### 2. Batch Upload Logs

**Endpoint**: `/batch`  
**Method**: `POST`  
**Description**: Upload multiple log files for processing.  

**Request**:
- `Content-Type`: `multipart/form-data`
- `files`: Array of log files to upload.

**Response**:
- `200 OK`: Batch logs processed successfully.
- `400 Bad Request`: Error in processing logs.

**Example**:
```bash
curl -X POST http://localhost:<PORT>/api/logs/batch -F "files=@/path/to/logfile1.log" -F "files=@/path/to/logfile2.log"
```

### 3. Search Logs

**Endpoint**: `/search`  
**Method**: `GET`  
**Description**: Search logs with filters, pagination, and sorting.  

**Request Parameters**:
- `startTime` (optional): Start time for filtering logs.
- `endTime` (optional): End time for filtering logs.
- `level` (optional): Log level to filter by.
- `source` (optional): Log source to filter by.
- `keyword` (optional): Keyword to search in logs.
- `lastId` (Currently not implemented): ID of the last log from the previous search for pagination. 
- `limit` (optional): Number of logs to return per page (default: 50).
- `sortBy` (optional): Field to sort by (default: `timestamp`). Valid fields: `timestamp`, `level`, `source`, `_id`.
- `sortOrder` (optional): Order to sort by (default: `desc`). Valid values: `asc`, `desc`.

**Response**:
- `200 OK`: Logs retrieved successfully.
- `400 Bad Request`: Error in retrieving logs.

**Example**:
```bash
curl -X GET "http://localhost:<PORT>/api/logs/search?startTime=2023-10-01T00:00:00Z&endTime=2023-10-10T23:59:59Z&level=ERROR&source=nginx&keyword=failed&sortBy=timestamp&sortOrder=desc&page=1&limit=50"
```

### Pagination and Sorting

The search endpoint supports pagination and sorting to efficiently retrieve logs.

#### Pagination

- **Parameters**:
  - `page`: The page number to retrieve (default: 1).
  - `limit`: The number of logs to return per page (default: 50, max: 1000).

- **Example**:
  ```bash
  curl -X GET "http://localhost:<PORT>/api/logs/search?page=2&limit=20"
  ```

#### Sorting

- **Parameters**:
  - `sortBy`: The field to sort by (default: `timestamp`). Valid fields: `timestamp`, `level`, `source`, `_id`.
  - `sortOrder`: The order to sort by (default: `desc`). Valid values: `asc`, `desc`.

- **Example**:
  ```bash
  curl -X GET "http://localhost:<PORT>/api/logs/search?sortBy=level&sortOrder=asc"
  ```

### Cursor-Based Pagination (Idea Phase)

Cursor-based pagination is an efficient way to paginate through large datasets. Instead of using page numbers, it uses a cursor (usually the ID of the last item from the previous page) to fetch the next set of results.

#### Query Parameters

- `lastId` (optional): The ID of the last log from the previous search. Used as a cursor for pagination.
- `limit` (optional): The number of logs to return per page (default: 50, max: 1000).

#### Example Query

```bash
curl -X GET "http://localhost:<PORT>/api/logs/search?lastId=<last_log_id>&limit=50"
```

In this example, replace `<last_log_id>` with the ID of the last log from the previous search results. This will fetch the next set of logs starting from the given ID.

---

## Rate Limiting

**Note**: No rate limiting has been implemented yet. This means that the API does not currently restrict the number of requests a client can make in a given period. Implementing rate limiting is recommended for production environments to prevent abuse and ensure fair usage.

---

## File Structure

```
log.js                # MongoDB model for storing logs
/processors
    nginxProcessor.js     # Processor for Nginx logs
    jsonProcessor.js      # Processor for JSON logs
    customProcessor.js    # Processor for custom logs
/services
    logService.js         # Core service for log processing and database interactions
/routes
    logRoutes.js          # API route definitions
```

---

# System Design: Log Processing API

This document outlines the system design for the Log Processing API, highlighting its architecture, components, and workflow to efficiently handle log processing at scale.

---

## High-Level Architecture

### Overview

The system processes, validates, and stores log files while supporting advanced search functionality. It is designed for scalability, memory efficiency, and modularity.

- **Frontend**: For uploading logs and visualizing search results (not covered in this API).
- **Backend (Node.js)**: Core API logic for log processing, validation, and querying.
- **Database (MongoDB)**: Persistent storage for logs with indexing for efficient querying.

---

## Components

### 1. **API Gateway**
   - **Role**: Serves as the single entry point for all client requests.
   - **Endpoints**:
     - `/upload`: Handles single file uploads.
     - `/batch-upload`: Handles multiple file uploads.
     - `/search`: Allows querying logs with filters and pagination.

### 2. **Log Processor**
   - **Role**: Processes log entries based on format (e.g., `nginx`, `json`, `custom`).
   - **Implementation**: Abstracted into format-specific processors.
   - **Key Features**:
     - Memory-efficient streaming.
     - Modular design for easy addition of new formats.

### 3. **Log Service**
   - **Role**: Manages processing, validation, and database interactions.
   - **Key Features**:
     - Batch-based validation and insertion.
     - Controlled concurrency for optimal performance.
     - Cursor-based pagination for efficient querying.

### 4. **Database (MongoDB)**
   - **Role**: Stores processed logs and facilitates querying.
   - **Design**:
     - Collection: `logs`
     - Indexes:
       - `timestamp`: For filtering by date range.
       - `text`: For keyword searches (if enabled).

---

## Workflow

### 1. Log Upload
- **Input**: Log files (single or multiple).
- **Process**:
  1. Files are streamed to the server.
  2. Logs are validated and processed in chunks (batch size configurable via `LOG_UPLOAD_BATCH_SIZE`).
  3. Valid logs are inserted into the database in batches.

### 2. Log Search
- **Input**: Query parameters (e.g., `startTime`, `endTime`, `level`, `keyword`).
- **Process**:
  1. Query conditions are built dynamically based on parameters.
  2. Logs are fetched using a cursor-based approach for pagination.
  3. Results include logs, total count, and metadata (e.g., `hasMore`, `lastId`).

---

## Scalability Features

1. **Streaming**:
   - Log processing uses Node.js streams to handle large files efficiently.
   - High-watermark is configurable via `STREAM_HIGH_WATER_MARK`.

2. **Batching**:
   - Logs are processed and inserted into the database in batches (`LOG_UPLOAD_BATCH_SIZE`).
   - Batching reduces the load on the database and optimizes network usage.

3. **Concurrency Control**:
   - Multiple batches are processed concurrently (`MAX_CONCURRENT_BATCHES`).
   - Prevents system overload by limiting active batches.

4. **Indexing**:
   - MongoDB indexes (e.g., `timestamp`, `text`) improve query performance.

---

## Deployment

### 1. **Development**
- Use `nodemon` for live reloading.
- Run locally with `npm start`.

### 2. **Production**
- Deploy the API on a platform like AWS, GCP, or Azure.
- Use Docker for containerization.
- Reverse proxy with NGINX for load balancing.

### 3. **Scaling**
- **Horizontal Scaling**: Add more instances of the Node.js API.
- **Vertical Scaling**: Increase resources (CPU, RAM) for MongoDB.
- **Database Optimization**: Use sharding and replica sets in MongoDB for distributed storage and fault tolerance.

---

## Challenges and Solutions

| **Challenge**                     | **Solution**                                                                 |
|------------------------------------|-------------------------------------------------------------------------------|
| Handling large log files           | Stream-based processing and memory-efficient batching.                        |
| High database write load           | Batch inserts with controlled concurrency.                                    |
| Querying large datasets efficiently| Indexed fields (`timestamp`, `text`) and cursor-based pagination.             |
| Supporting multiple log formats    | Modular processor design with pluggable format-specific processors.           |
| Fault tolerance during processing  | Partial failure handling and retry mechanisms in batch processing.            |

---

## Future Enhancements

1. **Support for More Formats**:
   - Add additional processors for formats like Apache logs to broaden compatibility.

2. **Distributed Processing**:
   - Integrate message queues like RabbitMQ or Kafka to distribute log processing tasks among multiple workers.

3. **Monitoring and Alerts**:
   - Implement tools like Prometheus or Datadog for real-time monitoring and alerting on system performance and errors.

4. **GraphQL Support**:
   - Introduce a GraphQL API layer to allow flexible querying for diverse frontend use cases.

5. **File Storage**:
   - Enable raw log file archiving in cloud storage solutions such as AWS S3 for long-term storage and backup.

6. **Reduced Validation and Parsing Load**:
   - Leverage specialized libraries to offload intensive log validation and parsing tasks from the CPU.

7. **Worker Threads for Faster Processing**:
   - Utilize worker threads to parallelize log processing, enhancing throughput for large datasets.

---

This design ensures the system is scalable, efficient, and ready for production use cases involving high-volume log processing.
