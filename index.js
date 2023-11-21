import express from "express";
import mysql from "mysql";
import cors from "cors"; 
import fs from "fs";
import multer from 'multer';
import path from "path";
import bcrypt from "bcrypt";
const saltRounds = 10;
import jwt from "jsonwebtoken"; 
const __dirname = path.resolve();
const app =express()

 

const db = mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"",
    database:"property_mgmt_system"
})

app.use(express.json())

const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage });

// app.use(cors())
app.use(cors({ 
  origin: 'http://localhost:3000', 
  methods: ["POST","GET","PUT","DELETE"],
  credentials: true 
}));

const userDirectory = path.join(__dirname, "user_images");
app.use("/user_images", express.static(userDirectory));

const propertyImages = path.join(__dirname, "property_images");
app.use("/property_images", express.static(propertyImages));
 
app.get("/", (req,res) => {
    res.json("Success")
})
app.post("/setuser",  (req,res) => { 
console.log('------------------------------')
  console.log(req.body);
})

app.get("/getUser", (req,res) => {
    const q = "select * from user"
    db.query(q,(err,data)=>{
        if(err) return res.json(err)
        return res.json(data)
    })
})

app.get("/getUserDoc/:id", (req, res) => {
    const userId = req.params.id;
    const imagePath = path.join(userDirectory, `user_${userId}.jpg`);
  
    if (fs.existsSync(imagePath)) {
      res.sendFile(imagePath);
    } else {
      res.status(404).send("Image not found");
    }
});

app.post("/addUser", upload.single('file'), async (req, res) => {
  try {

    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
    console.log(req.body);

    const q = "insert into user (`first_name`, `last_name`, `email`, `password`, `mobile_number`, `social_media_account`, `profile_picture`) VALUES (?,?,?,?,?,?,?)";
    const values = [
      req.body.firstName,
      req.body.lastName,
      req.body.email,
      hashedPassword,
      req.body.mobile,
      req.body.socialmedia,
      // req.file.buffer
      path.join("/user_images", `user_${req.file.originalname}`)
    ];

    if (!fs.existsSync(userDirectory)) {
      fs.mkdirSync(userDirectory);
    }

    db.query(q, values, async (insertErr, insertResult) => {
      if (insertErr) {
        return res.status(500).json(insertErr);
      }

      const userId = insertResult.insertId;
      const imagePath = path.join(userDirectory, `user_${userId}.jpg`);

      fs.writeFile(imagePath, req.file.buffer, (writeErr) => {
        if (writeErr) {
          return res.status(500).json(writeErr);
        }

        return res.json("Registration and image upload done successfully");
      });
    });
  } catch (error) {
    return res.status(500).json(error);
  }
});

app.post("/addProperty", upload.single('file'), async (req, res) => {
  try {
    const q = "insert into property (`user_id`, `country`, `state`, `city`, `street_address`, `zipcode`, `property_type`, `property_desc`, `num_of_bed_rooms`, `num_of_bath_rooms`, `available_date_from`, `availability_status`, `num_of_units`, `property_images`, `location`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
    const values = [
      req.body.userId,
      req.body.country,
      req.body.state,
      req.body.city,
      req.body.street,
      req.body.zipcode,
      req.body.propertyType,
      req.body.propertyDesc,
      req.body.bedrooms,
      req.body.bathrooms,
      req.body.availableDate,
      req.body.availabilityStatus,
      req.body.units,
      // req.file.buffer,
      path.join("/property_images", `${req.file.originalname}`),
      req.body.location
    ];

    db.query(q, values, async (insertErr, insertResult) => {
      if (insertErr) {
        return res.status(500).json(insertErr);
      }
      
      const propertyId = insertResult.insertId;
      const imagePath = path.join(propertyImages, `property_${propertyId}.jpg`);

      fs.writeFile(imagePath, req.file.buffer, (writeErr) => {
        if (writeErr) {
          return res.status(500).json(writeErr);
        }
        
        return res.json("Property Added successfully");
      });
    });
  } catch (error) {
    return res.status(500).json(error);
  }
});

app.get("/getUser/:id", (req, res) => {
    const empId = req.params.id;
    const q = "select * from user where id = ?";

    db.query(q, [empId], (err, data) => {
        if (err) return res.json(err);
        return res.json(data);
    });
});

const verifyUser = (req, res, next) => {
  const token =  req.headers.authorization && req.headers.authorization.split(' ')[1];

  if(!token){
    return res.status(401).json({ status: 'Error', message: 'Unauthorized' });
  }else{
    jwt.verify(token, "jwt-secret-key", (err,decoded) => {
      if(err) {
        return res.status(403).json({ status: 'Error', message: 'Forbidden' });
      } else {
        req.user = decoded;
        console.log("Verification completed");
        console.log(req.user);
        next();
      }
    })
  }
}

app.get('/verify', verifyUser, (req,res) => {
  return res.json({Status : "Success", name: req.user.name});
})


app.post("/login", (req, res) => {
  const q = "SELECT * FROM user WHERE `mobile_number`=?";
  const values = [req.body.mobile];

  db.query(q, values, async (err, data) => {
    if (err) {
      return res.status(500).json(err);
    }

    if (data.length > 0) {
      const storedHashedPassword = data[0].password;

      try {
        
        const passwordMatch = await bcrypt.compare(req.body.password, storedHashedPassword);

        if (passwordMatch) {

          const user = {
            id: data[0].id,
            mobile : data[0].mobile,
            password: data[0].password,
            
          };

          const secretKey = 'your_secret_key';
          const expiresIn = '1m';
          const token = jwt.sign(user, secretKey, { expiresIn });

          return res.json({ status: "Success", token });
          
        } else {
          return res.status(401).json({ message: "Credentials mismatched" });
        }
      } catch (compareError) {
        console.error(compareError);
        return res.status(500).json({ message: "Internal server error" });
      }
    } else {
      return res.status(401).json({ message: "Invalid credentials" });
    }
  });
});


app.get("/getProperty", (req,res) => {
  const q = "select * from property";
  db.query(q,(err,data)=>{
      if(err) return res.json(err)
      return res.json(data)
  })
})


app.get("/getPropertyImg/:id", (req, res) => {
  const propId = req.params.id;
  const imagePath = path.join(propertyImages, `property_${propId}.jpg`);

  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404).send("Image not found");
  }
});


app.put("/editUser/:id",   async (req, res) => {
  const empId = req.params.id;
  const q = "UPDATE user SET `name` = ?, `mobile` = ?, `password` = ?, `role` = ?, `file` = ? WHERE id = ?";

  try {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);

      const values = [
          req.body.name,
          req.body.mobile,
          hashedPassword, 
          req.body.role,
          req.file.buffer,
          empId
      ];

      db.query(q, values, (err, data) => {
          if (err) {
              return res.json(err);
          }
          return res.json("Details updated successfully");
      });
  } catch (hashError) {
      console.error("Error hashing password:", hashError);
      return res.status(500).json({ message: "Internal server error" });
  }
});


app.delete("/deleteUser/:id", (req,res) => {
    const empId = req.params.id;
    const q = "delete from user where id = ?";

    db.query(q, [empId], (err,data) => {
        if(err) return res.json(err);
        return res.json("User Deleted Successfully");
    })
})

app.listen(8800, ()=>{
    console.log("Connected to backend");
})