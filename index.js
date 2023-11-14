import express from "express";
import mysql from "mysql";
import cors from "cors";
import multer from 'multer';
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
const saltRounds = 10;

const __dirname = path.resolve();
const app =express()

const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage });

const db = mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"12345",
    database:"aita"
})

app.use(express.json())

// app.use(cors())
app.use(cors({ 
  origin: 'http://localhost:3000', 
  credentials: true 
}));

const employeeDocumentsDirectory = path.join(__dirname, "employee_documents");
app.use("/employee_documents", express.static(employeeDocumentsDirectory));

app.get("/", (req,res) => {
    res.json("Hello now you are connected to the backend....")
})

app.get("/getEmp", (req,res) => {
    const q = "select * from employee"
    db.query(q,(err,data)=>{
        if(err) return res.json(err)
        return res.json(data)
    })
})

app.get("/getEmpDoc/:id", (req, res) => {
    const empId = req.params.id;
    const documentPath = path.join(employeeDocumentsDirectory, `employee_${empId}.pdf`);
  
    if (fs.existsSync(documentPath)) {
      res.sendFile(documentPath);
    } else {
      res.status(404).send("Document not found");
    }
});

app.post("/addEmp", upload.single('file'), async (req, res) => {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

    const q = "INSERT INTO employee (`name`,`mobile`,`password`,`role`,`file`) VALUES (?,?,?,?,?)";
    const values = [
      req.body.name,
      req.body.mobile,
      hashedPassword, // Use the hashed password instead of the plain text password
      req.body.role,
      req.file.buffer
    ];

    db.query(q, values, async (insertErr, insertResult) => {
      if (insertErr) {
        return res.status(500).json(insertErr);
      }

      const employeeId = insertResult.insertId;
      const documentPath = path.join(employeeDocumentsDirectory, `employee_${employeeId}.pdf`);

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

app.get("/getEmp/:id", (req, res) => {
    const empId = req.params.id;
    const q = "select * from employee where id = ?";

    db.query(q, [empId], (err, data) => {
        if (err) return res.json(err);
        return res.json(data);
    });
});

app.post("/login", (req, res) => {
  const q = "SELECT * FROM employee WHERE `mobile`=?";
  const values = [req.body.mobile];

  db.query(q, values, async (err, data) => {
    if (err) {
      return res.status(500).json(err);
    }

    if (data.length > 0) {
      const storedHashedPassword = data[0].password;

      try {
        
        // console.log('Provided Password:', req.body.password);
        // console.log('Stored Hashed Password:', storedHashedPassword);

        const passwordMatch = await bcrypt.compare(req.body.password, storedHashedPassword);

        console.log('Password Match:', passwordMatch);

        if (passwordMatch) {
          return res.json(data[0]);
        } else {
          return res.status(401).json({ message: "Credentials not matched" });
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


app.put("/editEmp/:id", upload.single('file'), async (req, res) => {
  const empId = req.params.id;
  const q = "UPDATE employee SET `name` = ?, `mobile` = ?, `password` = ?, `role` = ?, `file` = ? WHERE id = ?";

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


app.delete("/deleteEmp/:id", (req,res) => {
    const empId = req.params.id;
    const q = "delete from employee where id = ?";

    db.query(q, [empId], (err,data) => {
        if(err) return res.json(err);
        return res.json("Employee Deleted Successfully");
    })
})

app.listen(8800, ()=>{
    console.log("Connected to backend");
})