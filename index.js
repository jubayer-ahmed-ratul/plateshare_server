const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://plateshare_db:8CylrlFds3PCmVrX@cluster0.bsfywqv.mongodb.net/?appName=Cluster0";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB successfully!");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}
connectDB();

// Database & collection
const database = client.db("plateshare_db");
const foods = database.collection("foods");



// Add Food (Create)
app.post('/add-food', async (req, res) => {
  const {
    food_name,
    food_image,
    food_quantity,
    pickup_location,
    expire_date,
    additional_notes,
    donator_name,
    donator_email,
    donator_image,
  } = req.body;

  if (!food_name || !food_image || !food_quantity || !pickup_location || !expire_date || !donator_name || !donator_email) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const doc = {
    food_name,
    food_image,
    food_quantity,
    pickup_location,
    expire_date: new Date(expire_date),
    additional_notes: additional_notes || "",
    donator_name,
    donator_email,
    donator_image: donator_image || "",
    food_status: "Available",
    created_at: new Date()
  };

  const result = await foods.insertOne(doc);
  res.status(201).json({ message: "Food added successfully", insertedId: result.insertedId });
});


app.get('/foods', async (req, res) => {
  const allFoods = await foods.find({}).toArray();
  res.status(200).json(allFoods);
});

app.get('/available-foods', async (req, res) => {
  const availableFoods = await foods.find({ food_status: "Available" }).toArray();
  res.status(200).json(availableFoods);
});



// Root route
app.get('/', (req, res) => {
  res.send('Smart server is running');
});

// Start server
app.listen(port, () => {
  console.log(`Smart server is running on port ${port}`);
});
