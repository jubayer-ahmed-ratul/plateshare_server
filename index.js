const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri =
  "mongodb+srv://plateshare_db:8CylrlFds3PCmVrX@cluster0.bsfywqv.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB successfully!");
  } catch (err) {
    console.error( "MongoDB connection error:", err);
  }
}
connectDB();

const database = client.db("plateshare_db");
const foods = database.collection("foods");
const foodRequests = database.collection("foodRequests");

// ------------------- FOOD ROUTES -------------------

app.post("/add-food", async (req, res) => {
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

  if (
    !food_name ||
    !food_image ||
    !food_quantity ||
    !pickup_location ||
    !expire_date ||
    !donator_name ||
    !donator_email
  ) {
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
  res.status(201).json({
    message: "Food added successfully",
    insertedId: result.insertedId,
  });
});

app.get("/foods", async (req, res) => {
  const allFoods = await foods.find({}).toArray();
  res.status(200).json(allFoods);
});

app.get("/available-foods", async (req, res) => {
  const availableFoods = await foods
    .find({ food_status: "Available" })
    .toArray();
  res.status(200).json(availableFoods);
});

app.get("/food/:id", async (req, res) => {
  const { id } = req.params;
  const food = await foods.findOne({
    _id: ObjectId.isValid(id) ? new ObjectId(id) : id,
  });

  if (!food) return res.status(404).json({ error: "Food not found" });
  res.status(200).json(food);
});

app.delete("/delete-food/:id", async (req, res) => {
  const { id } = req.params;
  const query = ObjectId.isValid(id)
    ? { _id: new ObjectId(id) }
    : { _id: id };

  const result = await foods.deleteOne(query);

  if (result.deletedCount === 0)
    return res.status(404).json({ error: "Food not found" });

  res.status(200).json({
    message: "Food deleted successfully",
    deletedCount: result.deletedCount,
  });
});

app.patch("/update-food/:id", async (req, res) => {
  const { id } = req.params;
  const updatedFields = req.body;

  if (updatedFields.food_quantity) {
    updatedFields.food_quantity = parseInt(updatedFields.food_quantity);
  }

  const result = await foods.updateOne(
    { _id: ObjectId.isValid(id) ? new ObjectId(id) : id },
    { $set: updatedFields }
  );

  if (result.matchedCount === 0)
    return res.status(404).json({ error: "Food not found" });

  res.status(200).json({
    message: "Food updated successfully",
    modifiedCount: result.modifiedCount,
  });
});

app.get("/my-foods", async (req, res) => {
  const { email } = req.query;
  if (!email)
    return res.status(400).json({ error: "Donator email is required" });

  const myFoods = await foods.find({ donator_email: email }).toArray();
  res.status(200).json(myFoods);
});

app.get("/top-foods", async (req, res) => {
  const topFoods = await foods
    .find({})
    .sort({ food_quantity: -1 })
    .limit(6)
    .toArray();

  res.status(200).json(topFoods);
});

// ------------------- FOOD REQUEST ROUTES -------------------

app.post("/foodRequests", async (req, res) => {
  const {
    foodId,
    userEmail,
    name,
    photoURL,
    location,
    reason,
    contactNo,
    quantityRequested,
    status,
  } = req.body;

  if (
    !foodId ||
    !userEmail ||
    !location ||
    !reason ||
    !contactNo ||
    !quantityRequested
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const existing = await foodRequests.findOne({ foodId, userEmail });
    if (existing) {
      return res.status(400).json({ error: "You already requested this food." });
    }

    const food = await foods.findOne({
      _id: ObjectId.isValid(foodId) ? new ObjectId(foodId) : foodId,
    });
    if (!food) return res.status(404).json({ error: "Food not found" });

    if (quantityRequested > food.food_quantity) {
      return res.status(400).json({
        error: `Only ${food.food_quantity} portions available.`,
      });
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
      status: status || "pending",
      createdAt: new Date(),
    };

    const result = await foodRequests.insertOne(requestDoc);
    res.status(201).json({
      message: "Food request submitted successfully",
      insertedId: result.insertedId,
    });
  } catch (err) {
    console.error("Error creating food request:", err);
    res.status(500).json({ error: "Failed to submit food request" });
  }
});

app.get("/foodRequests", async (req, res) => {
  try {
    const requests = await foodRequests.find({}).toArray();
    res.status(200).json(requests);
  } catch (err) {
    console.error("Error fetching requests:", err);
    res.status(500).json({ error: "Failed to fetch food requests" });
  }
});

app.get("/foodRequests/:foodId", async (req, res) => {
  const { foodId } = req.params;
  try {
    const requests = await foodRequests.find({ foodId }).toArray();
    res.status(200).json(requests);
  } catch (err) {
    console.error("Error fetching requests for food:", err);
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

app.patch("/foodRequests/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) return res.status(400).json({ error: "Status is required" });

  try {
    const request = await foodRequests.findOne({
      _id: ObjectId.isValid(id) ? new ObjectId(id) : id,
    });
    if (!request) return res.status(404).json({ error: "Request not found" });

    await foodRequests.updateOne(
      { _id: ObjectId.isValid(id) ? new ObjectId(id) : id },
      { $set: { status } }
    );

    if (status === "accepted") {
      const food = await foods.findOne({
        _id: ObjectId.isValid(request.foodId)
          ? new ObjectId(request.foodId)
          : request.foodId,
      });
      if (!food) return res.status(404).json({ error: "Food not found" });

      let remaining = food.food_quantity - request.quantityRequested;
      if (remaining < 0) remaining = 0;

    
      await foods.updateOne(
        {
          _id: ObjectId.isValid(request.foodId)
            ? new ObjectId(request.foodId)
            : request.foodId,
        },
        {
          $set: {
            food_quantity: remaining,
            food_status: remaining === 0 ? "Donated" : "Available",
          },
        }
      );
      if (remaining === 0) {
        await foodRequests.updateMany(
          {
            foodId: request.foodId,
            _id: { $ne: ObjectId.isValid(id) ? new ObjectId(id) : id },
            status: "pending",
          },
          { $set: { status: "rejected" } }
        );
      }
    }

    res.status(200).json({ message: "Request status updated successfully" });
  } catch (err) {
    console.error("Error updating request:", err);
    res.status(500).json({ error: "Failed to update request" });
  }
});

app.get("/", (req, res) => {
  res.send("🍽️ PlateShare server is running...");
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
