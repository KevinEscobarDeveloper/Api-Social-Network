//importar dependencias
const jwt = require("jwt-simple");
const moment = require("moment");

//importar clave secreta
const libjwt = require("../helpers/jwt");
const secret = libjwt.secret;

//middleware de autenticación
exports.auth = (req,res,next) =>{
    //comporbar si llega la cabecera de auth
    if(!req.headers.authorization){
        return res.status(403).send({
            status: "error",
            message: "La petición no tiene la cabecera de autenticación",
        })
    }
    //limpiar el token
    let token = req.headers.authorization.replace(/['"]+/g, '');

    //decodificar el token
    try{
        let payload = jwt.decode(token,secret);

        //comprobar expiración del token
        if(payload.exp <= moment().unix()){
            return res.status(401).send({
                status: "error",
                message: "token expirado",
                error
            })
        }
        //agregar datos de usuario a request
        req.user = payload;
    }catch(error){
        return res.status(404).send({
            status: "error",
            message: "token invalido",
            error
        })
    }

    

    //pasar a ejecución de acción.
    next();
}

