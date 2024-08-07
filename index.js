const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion } = require('mongodb');
const nodemailer = require('nodemailer');

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;
const WEDDB = "Bridal";

// MongoDB URI and email credentials
const uri = "mongodb+srv://tahsifdreamdriver:gQPQQvx4ZkKxCGke@cluster0.n7jc7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

// Middleware
app.use(cors());
app.use(express.json()); // To parse JSON bodies

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Create Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    console.log("Connected successfully to MongoDB!");

    // Select the database and collection
    const appCollection = client.db(WEDDB).collection("appointment");

    // Endpoint to add an appointment
    app.post('/addapp', async (req, res) => {
      try {
        const newApp = req.body;
        const result = await appCollection.insertOne(newApp);

        // Send email to admin
        const adminMailOptions = {
          from: EMAIL_USER,
          to: 'tahsif.cse@gmail.com',
          subject: 'New Appointment Booking',
          text: `New appointment booked by ${newApp.name}. Address: ${newApp.address}, Date & Time: ${newApp.datetime}, Number: ${newApp.number}, Email: ${newApp.email}`,
        };

        // Send email to user
        const userMailOptions = {
          from: EMAIL_USER,
          to: newApp.email,
          subject: 'Appointment Confirmation',
          text: 'Your appointment has been successfully booked.',
        };

        // Send both emails
        await transporter.sendMail(adminMailOptions);
        await transporter.sendMail(userMailOptions);

        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to add appointment or send emails", error });
      }
    });

    // Start the server
    app.listen(port, () => {
      console.log(`App listening on port ${port}`);
    });

  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!');
});
