import express from "express";
import { readName } from "./controler.js";
import multer from 'multer';
const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage });
const router = express.Router();




router.get('/', (req, res) => {
    res.send('Birds home page')
  })
  router.get('/hi', readName);
  router.post('/hi',upload.single('file'), readName);
  export  default router;