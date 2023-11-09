import express from "express";
import mysql from "mysql";
import cors from "cors";
import multer from 'multer';
import fs from "fs";
import path from "path";

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

app.use(cors())

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

app.post("/addEmp", upload.single('file'), (req,res) => {

    const q = "insert into employee (`name`,`mobile`,`password`,`role`,`file`) values (?,?,?,?,?)"
    const values = [
        req.body.name,
        req.body.mobile,
        req.body.password,
        req.body.role,
        req.file.buffer
    ];

    db.query(q, values, (insertErr, insertResult) => {
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
    });

app.get("/getEmp/:id", (req, res) => {
    const empId = req.params.id;
    const q = "select * from employee where id = ?";

    db.query(q, [empId], (err, data) => {
        if (err) return res.json(err);
        return res.json(data);
    });
});

app.put("/editEmp/:id", upload.single('file'), (req, res) => {
    const empId = req.params.id;
    const q = "update employee set `name`= ?, `mobile` = ?,`password` = ?, `role` = ?, `file` = ? where id = ?";
    const values = [
        req.body.name,
        req.body.mobile,
        req.body.password,
        req.body.role,
        req.file.buffer,
        empId
    ];

    db.query(q, values, (err, data) => {
        if (err) return res.json(err);
        return res.json("Details updated Successfully");
    });
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