const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB URI
const uri = "mongodb+srv://plateshare_db:8CylrlFds3PCmVrX@cluster0.bsfywqv.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Connect once and reuse the client
async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB successfully!");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

// Call it immediately
connectDB();

// Route to insert a food document
app.post('/add-food', async (req, res) => {
  try {
    const database = client.db("plateshare_db");
    const foods = database.collection("foods");

    const doc = req.body; // Get the food info from request body
    const result = await foods.insertOne(doc);

    res.status(201).json({
      message: "Food added successfully",
      insertedId: result.insertedId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add food" });
  }
});

// Basic root route
app.get('/', (req, res) => {
  res.send('Smart server is running');
});
// GET all foods
app.get('/foods', async (req, res) => {
  try {
    const database = client.db("plateshare_db");
    const foods = database.collection("foods");

    const allFoods = await foods.find({}).toArray(); // Fetch all documents
    res.status(200).json(allFoods);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch foods" });
  }
});


app.listen(port, () => {
  console.log(`Smart server is running on port ${port}`);
});
