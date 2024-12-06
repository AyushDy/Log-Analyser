const express = require('express');
const connectDB = require('./config/database');
const logRoutes = require('./routes/logRoutes');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3080;

// Connect to MongoDB
connectDB();

app.use(cors());
app.use(express.json());
app.use('/api/logs', logRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});