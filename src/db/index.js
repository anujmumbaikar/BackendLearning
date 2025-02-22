import mongoose from "mongoose"
import {DB_NAME} from "../constants.js"

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n MongoDB connected !! DB HOST:${connectionInstance.connection.host}`);
        
    } catch (error) {
        console.log("MONGODB connection error:",error);
        //throw
        //we can hv done with throw error.. but there is one process (means whatever our application is running its running on process that process ka reference hai)
        //in the node  we dont hve to import it
        //so there is method called exit where we can exit process
        //there are different exit codes we can learn.
        process.exit(1)
    }
}
export default connectDB;