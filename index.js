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

const database = client.db("plateshare_db");
const foods = database.collection("foods");



// Add Food 
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

app.get('/food/:id', async (req, res) => {
  const { id } = req.params;
  const database = client.db("plateshare_db");
  const foods = database.collection("foods");

  const food = await foods.findOne({ _id: id }); 

  if (!food) return res.status(404).json({ error: "Food not found" });

  res.status(200).json(food);
});



app.delete('/delete-food/:id', async (req, res) => {
  const { id } = req.params;

  let query = {};
  if (ObjectId.isValid(id)) {
   
    query = { _id: new ObjectId(id) };
  } else {
   
    query = { _id: id };
  }

  const result = await foods.deleteOne(query);

  if (result.deletedCount === 0) {
    return res.status(404).json({ error: "Food not found" });
  }

  res.status(200).json({
    message: "Food deleted successfully",
    deletedCount: result.deletedCount
  });
});



app.get('/my-foods', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Donator email is required" });

  const myFoods = await foods.find({ donator_email: email }).toArray();
  res.status(200).json(myFoods);
});




app.get('/', (req, res) => {
  res.send('Smart server is running');
});


app.listen(port, () => {
  console.log(`Smart server is running on port ${port}`);
});
