
import mongoose from "mongoose"


const connectDB = async () =>{
    try{ 

     
        const connectionInstance = await  mongoose.connect(process.env.MONGODB_URI)

        console.log(`\n MongoDB connected!! DB HOST: ${connectionInstance.connection.host}`)

        // konse host par connectdd hai bas itna pata karne ke liye dev, prod, test sab ka db alag

    }catch(error)
    {
        console.log("MongoDB Connection error: ", error.message)
        process.exit(1);
        // learn about this
    }
}

export default connectDB