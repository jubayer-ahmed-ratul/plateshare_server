const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// ------------------- MIDDLEWARE -------------------
app.use(cors());
app.use(express.json());

// ------------------- DATABASE -------------------
const uri =
  "mongodb+srv://plateshare_db:8CylrlFds3PCmVrX@cluster0.bsfywqv.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
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
const foodRequests = database.collection("foodRequests");

// ------------------- FOOD MANAGEMENT -------------------

// Add Food
app.post("/add-food", async (req, res) => {
  const { food_name, food_image, food_quantity, pickup_location, expire_date, additional_notes, donator_name, donator_email, donator_image } = req.body;

  if (!food_name || !food_image || !food_quantity || !pickup_location || !expire_date || !donator_name || !donator_email) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const doc = {
    food_name,
    food_image,
    food_quantity: parseInt(food_quantity),
    pickup_location,
    expire_date: new Date(expire_date),
    additional_notes: additional_notes || "",
    donator_name,
    donator_email,
    donator_image: donator_image || "",
    food_status: "Available",
    created_at: new Date(),
  };

  const result = await foods.insertOne(doc);
  res.status(201).json({ message: "Food added successfully", insertedId: result.insertedId });
});

// Get All Foods
app.get("/foods", async (req, res) => {
  const allFoods = await foods.find({}).toArray();
  res.json(allFoods);
});

// Get Available Foods
app.get("/available-foods", async (req, res) => {
  const availableFoods = await foods.find({ food_status: "Available" }).toArray();
  res.json(availableFoods);
});

// Get Food By ID
app.get("/food/:id", async (req, res) => {
  const { id } = req.params;
  const food = await foods.findOne({ _id: ObjectId.isValid(id) ? new ObjectId(id) : id });
  if (!food) return res.status(404).json({ error: "Food not found" });
  res.json(food);
});

// Update Food
app.patch("/update-food/:id", async (req, res) => {
  const { id } = req.params;
  const updatedFields = req.body;

  if (updatedFields.food_quantity) updatedFields.food_quantity = parseInt(updatedFields.food_quantity);

  const result = await foods.updateOne({ _id: ObjectId.isValid(id) ? new ObjectId(id) : id }, { $set: updatedFields });

  if (result.matchedCount === 0) return res.status(404).json({ error: "Food not found" });
  res.json({ message: "Food updated successfully", modifiedCount: result.modifiedCount });
});

// Delete Food
app.delete("/delete-food/:id", async (req, res) => {
  const { id } = req.params;
  const result = await foods.deleteOne({ _id: ObjectId.isValid(id) ? new ObjectId(id) : id });
  if (result.deletedCount === 0) return res.status(404).json({ error: "Food not found" });
  res.json({ message: "Food deleted successfully", deletedCount: result.deletedCount });
});

// My Foods
app.get("/my-foods", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Donator email is required" });
  const myFoods = await foods.find({ donator_email: email }).toArray();
  res.json(myFoods);
});

// Top Foods
app.get("/top-foods", async (req, res) => {
  const topFoods = await foods.find({}).sort({ food_quantity: -1 }).limit(6).toArray();
  res.json(topFoods);
});

// ------------------- FOOD REQUESTS -------------------

// Create Food Request (with duplicate check)
app.post("/foodRequests", async (req, res) => {
  const { foodId, userEmail, name, photoURL, location, reason, contactNo, quantityRequested } = req.body;
  
  if (!foodId || !userEmail || !location || !reason || !contactNo || !quantityRequested) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Check if user already requested this food
    const existingRequest = await foodRequests.findOne({ 
      foodId, 
      userEmail 
    });

    if (existingRequest) {
      return res.status(400).json({ 
        error: "You have already requested this food item" 
      });
    }

    const food = await foods.findOne({ _id: ObjectId.isValid(foodId) ? new ObjectId(foodId) : foodId });
    if (!food) return res.status(404).json({ error: "Food not found" });

    const existingRequests = await foodRequests.aggregate([
      { $match: { foodId } },
      { $group: { _id: "$foodId", totalRequested: { $sum: "$quantityRequested" } } },
    ]).toArray();

    const alreadyRequested = existingRequests[0]?.totalRequested || 0;
    if (alreadyRequested + parseInt(quantityRequested) > food.food_quantity) {
      return res.status(400).json({ error: `Only ${food.food_quantity - alreadyRequested} portion(s) available.` });
    }

    const requestDoc = {
      foodId,
      userEmail,
      name: name || "",
      photoURL: photoURL || "",
      location,
      reason,
      contactNo,
      quantityRequested: parseInt(quantityRequested),
      status: "pending",
      createdAt: new Date(),
    };

    const result = await foodRequests.insertOne(requestDoc);
    res.status(201).json({ message: "Food request submitted successfully", insertedId: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit food request" });
  }
});

// Get My Food Requests
app.get("/my-food-requests", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "User email is required" });

  try {
    const myRequests = await foodRequests.find({ userEmail: email }).toArray();
    const foodIds = myRequests.map(r => r.foodId).filter(Boolean).map(id => ObjectId.isValid(id) ? new ObjectId(id) : id);
    const foodsList = await foods.find({ _id: { $in: foodIds } }).toArray();
    const foodsMap = {};
    foodsList.forEach(f => { foodsMap[f._id.toString()] = f });

    const result = myRequests.map(r => ({ ...r, foodDetails: foodsMap[r.foodId] || { food_name: r.foodId, food_image: "" } }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch your requests" });
  }
});

// Get Food Requests for Owner
app.get("/owner-food-requests", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Owner email is required" });

  try {
    // Get all foods by this owner
    const myFoods = await foods.find({ donator_email: email }).toArray();
    const foodIds = myFoods.map(f => f._id.toString());

    // Get all requests for these foods
    const requests = await foodRequests.find({ 
      foodId: { $in: foodIds } 
    }).toArray();

    // Combine with food details
    const result = requests.map(req => ({
      ...req,
      foodDetails: myFoods.find(f => f._id.toString() === req.foodId) || { 
        food_name: "Unknown Food", 
        food_image: "" 
      }
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

// Update Food Request Status
app.patch("/foodRequests/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Status is required" });

  try {
    const request = await foodRequests.findOne({ _id: ObjectId.isValid(id) ? new ObjectId(id) : id });
    if (!request) return res.status(404).json({ error: "Request not found" });

    await foodRequests.updateOne({ _id: ObjectId.isValid(id) ? new ObjectId(id) : id }, { $set: { status } });

    if (status === "accepted") {
      const food = await foods.findOne({ _id: ObjectId.isValid(request.foodId) ? new ObjectId(request.foodId) : request.foodId });
      if (!food) return res.status(404).json({ error: "Food not found" });

      let remaining = food.food_quantity - request.quantityRequested;
      if (remaining < 0) remaining = 0;

      await foods.updateOne({ _id: ObjectId.isValid(request.foodId) ? new ObjectId(request.foodId) : request.foodId },
        { $set: { food_quantity: remaining, food_status: remaining === 0 ? "Donated" : "Available" } }
      );

      if (remaining === 0) {
        await foodRequests.updateMany({ foodId: request.foodId, _id: { $ne: ObjectId.isValid(id) ? new ObjectId(id) : id }, status: "pending" },
          { $set: { status: "rejected" } }
        );
      }
    }

    res.json({ message: "Request status updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update request" });
  }
});

// ------------------- DEFAULT ROUTE -------------------
app.get("/", (req, res) => res.send("🍽️ PlateShare server is running..."));

// ------------------- START SERVER -------------------
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));