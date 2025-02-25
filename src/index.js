// require('dotenv').config({path:'./env'})
//or
import {app} from "./app.js"
import dotenv from "dotenv"
import connectDB from './db/index.js';
dotenv.config({
    path: './.env'
})
 
connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`server is running at port : ${process.env.PORT}`);
        
    })
})
.catch((err)=>{
    console.log("MongoDB Connection failed!!!",err);
})








//first approach
/*
import mongoose from 'mongoose';
import {DB_NAME} from "./constants";
import express from 'express';
const app = express();

(async ()=>{
    try{
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        app.on("error",(error)=>{   // this is the part of express where it can listen to the error
            console.log('error',error);
            throw error;
        })
        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on port ${process.env.PORT}`);
            
        })
    }catch(error){
        console.error('Error: ', error);
        throw new Error('Error: ', error);
    }
})()
*/