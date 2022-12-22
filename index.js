//IMPORTAR DEPENDENCIAS
const {connection} = require("./database/connection");
const express = require("express");
const cors = require("cors");
require('dotenv').config()

//Mensaje de bienvenida app
console.log("API node para red social arrancada");


//Conexion a bbdd
connection();



//Crear servidor node
const app = express();
const port = process.env.PORT || 3009;


//Configurar cors
app.use(cors());


//Convertir los datos del body a objetos js
app.use(express.json());
app.use(express.urlencoded({extended: true}));


//Cargar conf rutas
const userRoutes = require("./routes/user");
const publicationRoutes = require("./routes/publication");
const followRoutes = require("./routes/follow");

app.use("/api/user",userRoutes);
app.use("/api/publication",publicationRoutes);
app.use("/api/follow",followRoutes);

//ruta de prueba
app.get("/ruta-prueba",(req,res) =>{
    return res.status(200).json(
    {
        "id": 1,
        "nombre": "kevin",
        "web": "kevin.com"
    }
    )
})

//Poner servidor a escuchar peticiones http
app.listen(port, () =>{
    console.log("Servidor de node corriendo en el pueto :",port)
})