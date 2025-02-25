import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))
app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true , limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

//routes import ..... most of the code bases pe routes yaha pe hi import karte hai.
//upar bhi kr sakte hai
import userRouter from "./routes/user.routes.js"
//routes declaration(below)
//earlier we used to write app.get but now things are sperated in diff files 
//now we want middleware also to take router  hence we use app.use
app.use("/api/v1/users",userRouter) //it will works as http://localhost:8000/api/v1/users/register
//now if we want login also then we dont hv to call it once again. we add directly in userRouter




 
export {app}