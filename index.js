require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT;
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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

   
    const userCollection = webinaryDB.collection("userCollection");

    //product
   app.get("/", (req, res) => {
  res.send("Hello");
});

app.listen(port, (req, res) => {
  console.log(`Server is running on port ${port}`);
});
