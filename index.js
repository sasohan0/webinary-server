require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const db = require("./db");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

function createToken(user) {
  const token = jwt.sign(
    {
      email: user.email,
    },
    "secret",
    { expiresIn: "7d" }
  );
  return token;
}

function verifyToken(req, res, next) {
  const token = req.headers.authorization.split(" ")[1];
  const verify = jwt.verify(token, "secret");
  if (!verify?.email) {
    return res.send("You are not authorized");
  }
  req.user = verify.email;
  next();
}

const uri = process.env.DATABASE_URL;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const webinaryDB = client.db("webinary");
    const eventCollection = webinaryDB.collection("eventCollection");
    const paymentCollection = webinaryDB.collection("paymentCollection");
    const bookingCollection = webinaryDB.collection("bookingCollection");

    const userCollection = webinaryDB.collection("userCollection");

    //event
    app.post("/events", verifyToken, async (req, res) => {
      const eventsData = req.body;
      const result = await eventCollection.insertOne(eventsData);
      res.send(result);
    });

    app.get("/events", async (req, res) => {
      const eventsData = eventCollection.find();
      const result = await eventsData.toArray();

      res.send(result);
    });

    app.get("/events/:id", async (req, res) => {
      const id = req.params.id;
      const eventsData = await eventCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(eventsData);
    });

    app.post("/bookings", verifyToken, async (req, res) => {
      const bookingsData = req.body;
      const result = await bookingCollection.insertOne(bookingsData);
      res.send(result);
    });
    app.get("/bookings/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const bookingsData = await bookingCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(bookingsData);
    });
    app.get("/booking", async (req, res) => {
      const eventsData = eventCollection.find();
      const result = await eventsData.toArray();

      res.send(result);
    });
    app.get("/bookings", verifyToken, async (req, res) => {
      const bookingsData = bookingCollection.find();
      const result = await bookingsData.toArray();

      res.send(result);
    });

    app.post("/create-payment-intent", verifyToken, async (req, res) => {
      const booking = req.body;
      const price = booking.bookingPrice;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      console.log(amount);
      res.send({ clientSecret: paymentIntent.client_secret });
    });
    app.get("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const eventsData = await eventCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(eventsData);
    });
    app.get("/booking/payment/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const bookingData = await bookingCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(bookingData);
    });
    app.patch("/bookings/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };

      const result = await paymentCollection.insertOne(payment);
      const updatedBooking = await bookingCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(updatedBooking);
    });

    app.patch("/events/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const result = await eventCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
      res.send(result);
    });
    app.delete("/events/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const result = await eventCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // user

    app.post("/user", async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = createToken(user);
      const isUserExist = await userCollection.findOne({ email: user?.email });
      if (isUserExist?._id) {
        return res.send({
          statu: "success",
          message: "Login success",
          token,
        });
      }
      await userCollection.insertOne(user);

      return res.send({ token });
    });

    // user/test@gmail

    app.get("/user/get/:id", verifyToken, async (req, res) => {
      const id = req.params.id;

      const result = await userCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.get("/user/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const result = await userCollection.findOne({ email });
      res.send(result);
    });

    app.patch("/user/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const userData = req.body;
      const result = await userCollection.updateOne(
        { email },
        { $set: userData },
        { upsert: true }
      );
      res.send(result);
    });

    console.log("successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Webinary is live");
});

app.listen(port, (req, res) => {
  console.log(`Server is running on port ${port}`);
});
