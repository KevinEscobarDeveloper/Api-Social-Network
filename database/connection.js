const mongoose = require("mongoose");


const connection = async() =>{
    try{
        await mongoose.connect(process.env.Database);

        console.log("Conectado correctamente a la base de datos: mi_redsocial");
    }catch(e){
        console.log(e);
        throw new Error("No se ha podido conectar a la base de datos");
    }
}


module.exports = {
    connection
}