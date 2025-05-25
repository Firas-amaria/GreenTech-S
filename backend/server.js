const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const serviceAccount = require('./serviceAccountKey.json');


const app = express();


//middlewares 
app.use(cors());
app.use(express.json());

//connect to firebase DB
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();


app.get('/',(req,res)=>{
    res.send("hello world!");
})

app.get("/test-firestore",async (req,res)=>{
    try{
    const docRef = db.collection("test").doc("testDoc");
    await docRef.set({message:"firebase connected!!!"});
    res.send("firestore write to collection succesfully!!!");
    }
    catch(err){
        console.error("failed to write to firestore",err);
        res.status(500).send("error to write to firestore")
        
    }
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
    console.log(`DFCP API is Running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});