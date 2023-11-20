import express from "express";
import mysql from "mysql";
import cors from "cors"; 
import fs from "fs";
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

// app.use(cors())
app.use(cors({ 
  origin: 'http://localhost:3000', 
  methods: ["POST","GET","PUT","DELETE"],
  credentials: true 
}));

const employeeDocumentsDirectory = path.join(__dirname, "employee_documents");
app.use("/employee_documents", express.static(employeeDocumentsDirectory));
 
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
    const documentPath = path.join(employeeDocumentsDirectory, `user_${userId}.pdf`);
  
    if (fs.existsSync(documentPath)) {
      res.sendFile(documentPath);
    } else {
      res.status(404).send("Document not found");
    }
});

app.post("/addUser",   async (req, res) => {
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
      // req.body.date,
      req.file.buffer
    ];

    db.query(q, values, async (insertErr, insertResult) => {
      if (insertErr) {
        return res.status(500).json(insertErr);
      }

      const userId = insertResult.insertId;
      const documentPath = path.join(employeeDocumentsDirectory, `user_${userId}`);

      fs.writeFile(documentPath, req.file.buffer, (writeErr) => {
        if (writeErr) {
          return res.status(500).json(writeErr);
        }

        return res.json("Registration and document upload done successfully");
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
          // console.log(token);
          // jwt.verify(token, secretKey, function(err,decoded)
          // {
          //   console.log(decoded);
          // });


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