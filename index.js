const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId  } = require('mongodb');
const jwt = require('jsonwebtoken'); // Import jsonwebtoken
 


dotenv.config();
const app = express();
const port = process.env.PORT || 5000;
const WEDDB = "Bridal";

// MongoDB URI
const uri = process.env.MONGODB_URI || "mongodb+srv://tahsifdreamdriver:gQPQQvx4ZkKxCGke@cluster0.n7jc7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

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

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    console.log("Connected successfully to MongoDB!");

    const appCollection = client.db(WEDDB).collection("appointment");
    const offDaysCollection = client.db(WEDDB).collection("offdays");
    const userCollection = client.db(WEDDB).collection("user");

    // ...........admin+user 
    
    // jwt created......
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      });
      res.send({ token });
    });
   
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Forbidden access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      try {
        const user = await userCollection.findOne({ email });
        if (user?.role !== 'admin') {
          return res.status(403).send({ message: 'Forbidden access' });
        }
        next();
      } catch (error) {
        console.error('Error verifying admin:', error);
        res.status(500).send('Internal Server Error');
      }
    };

    // app.get('/user/:id', async (req, res) => {
    //   const userId = req.params.userId;
    //   try {
    //     const user = await userCollection.findOne({ _id: id});
    //     if (user) {
    //       res.send({ role: user.role });
    //     } else {
    //       res.status(404).send({ message: 'User not found' });
    //     }
    //   } catch (error) {
    //     console.error('Error fetching user data:', error);
    //     res.status(500).send('Internal Server Error');
    //   }
    // });

    // user related API working for admin and user.................
    app.get('/user/:id', async (req, res) => {
      const userId = req.params.id;
      try {
        const user = await userCollection.findOne({ _id: new ObjectId(userId)});
        if (user) {
          res.send({ role: user.role });
        } else {
          res.status(404).send({ message: 'User not found' });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).send('Internal Server Error');
      }
    });
    
    app.get('/user', async (req, res) => {
      console.log(req.headers);
      try {
        const result = await userCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    // user retrieving working
    app.get('/user/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
          return res.send({ message: 'forbidden access' });
      }
      const query = { email: email };
      try {
          const user = await userCollection.findOne(query);
          let admin = false;
          if (user) {
              admin = user?.role === 'admin';
          }
          res.send({ admin });
      } catch (error) {
          console.error('Error retrieving user:', error);
          res.status(500).send('Internal Server Error');
      }
  });
  

    // user creation work..............
    app.post('/user', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      try {
        const existingUser = await userCollection.findOne(query);
        if (existingUser) {
          return res.send({ message: 'User already exists', insertedId: null });
        }
        const result = await userCollection.insertOne(user); // This line should insert a user
        res.send(result);
      } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).send('Internal Server Error');
      }
    });
    

    // user updated work
    app.patch('/user/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      };
      try {
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    // user deletion...........
    app.delete('/user/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      try {
        const result = await userCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    // ............end admin+user
    // Endpoint to fetch appointment
    // Endpoint to fetch appointments
    // Endpoint to fetch appointments
        app.get('/app', async (req, res) => {
          try {
            const result = await appCollection.find({}, { projection: { recaptcha: 0 } }).toArray();
            res.send(result);
          } catch (error) {
            console.error('Error fetching appointment:', error);
            res.status(500).send('Internal Server Error');
          }
        });

          // Endpoint to add an appointment
          app.post('/addapp', async (req, res) => {
            try {
              const newApp = req.body;
              const existingAppointment = await appCollection.findOne({ datetime: newApp.datetime });
      
              if (existingAppointment) {
                return res.status(400).json({ message: 'Selected time slot is already booked.' });
              }
      
              const isOffDay = await offDaysCollection.findOne({ date: newApp.datetime.split('T')[0] });
              if (isOffDay) {
                return res.status(400).json({ message: 'Selected day is not available for appointments.' });
              }
      
              const result = await appCollection.insertOne(newApp);
      
              // Send confirmation email
      
              
      
              res.status(201).send(result);
            } catch (error) {
              res.status(500).send({ message: "Failed to add appointment", error });
            }
          });
      
        // .............fetch based on date..............
        app.get('/app/:date', async (req, res) => {
          const date = req.params.date; // 'YYYY-MM-DD'
          console.log('Received date:', date); // Check what date is being received

          try {
            const details = await appCollection.find({
              datetime: { $regex: `^${date}` }
            }).toArray(); // Convert cursor to array

            console.log('Fetched details:', details); // Check what is being fetched

            if (details.length === 0) {
              return res.status(404).json({ message: 'No details found for this date.' });
            }

            res.json(details);
          } catch (error) {
            console.error('Error fetching details:', error);
            res.status(500).json({ error: 'Server error' });
          }
        });
      // Delete operation for this app
      app.delete('/app/:id', async (req, res) => {
        const id = req.params.id;

        try {
          const result = await appCollection.deleteOne({ _id: new ObjectId(id) });

          if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'No details found for this ID.' });
          }

          res.json({ message: 'Detail deleted successfully.' });
        } catch (error) {
          console.error('Error deleting detail:', error);
          res.status(500).json({ error: 'Server error' });
        }
      });
      // ...............users details ...fetching
    app.get('/user-details', async (req, res) => {
      const email = req.query.email;

      try {
        const userDetails = await appCollection.find({ email }).toArray();

        if (userDetails.length === 0) {
          return res.status(404).json({ message: 'No user details found for this email.' });
        }

        res.json(userDetails);
      } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ error: 'Server error' });
      }
    });

    // user details deleteion
    app.delete('/user-details/:id', async (req, res) => {
      const id = req.params.id;

      try {
        const result = await appCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: 'No user details found with this ID.' });
        }

        res.json({ message: 'User detail deleted successfully.' });
      } catch (error) {
        console.error('Error deleting user detail:', error);
        res.status(500).json({ error: 'Server error' });
      }
    });


    // Endpoint to check available time slots for a given date
   // Endpoint to check available time slots for a given date
// app.get('/check-available-time', async (req, res) => {
//   try {
//     const { date } = req.query;
//     const startDate = new Date(date);
//     const endDate = new Date(date);
//     endDate.setDate(startDate.getDate() + 1); // Check availability for the whole day

//     const appointments = await appCollection.find({
//       datetime: {
//         $gte: startDate.toISOString(),
//         $lt: endDate.toISOString()
//       }
//     }).toArray();

//     const bookedSlots = appointments.map(app => {
//       const time = new Date(app.datetime).toTimeString().split(' ')[0].slice(0, 5);
//       return time;
//     });

//     // Define possible time slots
//     const possibleSlots = ['11:30', '13:00', '14:30', '16:00'];
//     const availableSlots = possibleSlots.filter(slot => !bookedSlots.includes(slot));

//     res.json({ slots: availableSlots });
//   } catch (error) {
//     res.status(500).json({ message: "Failed to check available slots", error });
//   }
// });

 // Endpoint to check available time slots for a given date
// app.get('/check-available-time', async (req, res) => {
//   try {
//     const { date } = req.query;
//     const startDate = new Date(date);
//     const endDate = new Date(date);
//     endDate.setDate(startDate.getDate() + 1); // Check availability for the whole day

//     const appointments = await appCollection.find({
//       datetime: {
//         $gte: startDate.toISOString(),
//         $lt: endDate.toISOString()
//       }
//     }).toArray();

//     const bookedSlots = appointments.map(app => {
//       const time = new Date(app.datetime).toTimeString().split(' ')[0].slice(0, 5);
//       return time;
//     });

//     // Define possible time slots
//     const possibleSlots = ['11:30', '12:30', '2:00', '4:00'];
//     const availableSlots = possibleSlots.filter(slot => !bookedSlots.includes(slot));

//     res.json({ slots: availableSlots });
//   } catch (error) {
//     res.status(500).json({ message: "Failed to check available slots", error });
//   }
// });

// ............new 
    app.get('/check-available-time', async (req, res) => {
      try {
        const { date } = req.query;
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(startDate.getDate() + 1); // Check availability for the whole day

        const appointments = await appCollection.find({
          datetime: {
            $gte: startDate.toISOString(),
            $lt: endDate.toISOString()
          }
        }).toArray();

        const bookedSlots = appointments.map(app => {
          const time = new Date(app.datetime).toTimeString().split(' ')[0].slice(0, 5);
          return time;
        });

        // Define possible time slots
        const possibleSlots = ['11:30', '13:00', '14:30', '16:00'];
        const availableSlots = possibleSlots.filter(slot => !bookedSlots.includes(slot));

        res.json({ slots: availableSlots });
      } catch (error) {
        res.status(500).json({ message: "Failed to check available slots", error });
      }
    });
      

    // Endpoint to check if a time slot is available
    app.get('/check-slot', async (req, res) => {
      try {
        const { datetime } = req.query;

        const existingAppointment = await appCollection.findOne({ datetime });
        if (existingAppointment) {
          return res.json({ available: false });
        }

        const isOffDay = await offDaysCollection.findOne({ date: datetime.split('T')[0] });
        if (isOffDay) {
          return res.json({ available: false });
        }

        res.json({ available: true });
      } catch (error) {
        res.status(500).json({ message: "Failed to check slot availability", error });
      }
    });

    // Endpoint to mark days as off for appointments
     // Endpoint to fetch off days
     app.get('/offdays', async (req, res) => {
      try {
        const result = await offDaysCollection.find().toArray();
        res.json(result.map(day => day.date)); // Send only the dates
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch off days", error });
      }
    });

    app.post('/offdays', async (req, res) => {
      try {
        const { date } = req.body;
        const existingOffDay = await offDaysCollection.findOne({ date });
        if (existingOffDay) {
            return res.status(400).json({ message: "This day is already marked as off." });
        }
        const result = await offDaysCollection.insertOne({ date });
        res.status(201).json(result);
        
      } catch (error) {
        res.status(500).json({ message: "Failed to add off day", error });
      }
    });

    // ..............fetch data from backend
  
    app.get('/offdays/:date', async (req, res) => {
      try {
        const date = req.params.date;
        console.log('Date parameter received:', date); // Debugging line
        const offDay = await offDaysCollection.findOne({ date: date });
    
        if (offDay) {
          res.json(offDay);
        } else {
          res.status(404).json({ message: 'No details found for this date' });
        }
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
      }
    });


    
    
    
    // .................end data from backend

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