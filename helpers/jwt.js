//Importar dependencias
const jwt = require("jwt-simple");
const moment = require("moment");


//Clave secreta
const secret = "CLAVE_SECRETA_DEL_PROIYECTO_DE_LA_RED_SOCIAL_987987";

//Crear una función para generar tokens
 const createToken= (user) =>{
    const payload = {
        id: user._id,
        name: user.name,
        surname: user.surname,
        nick: user.nick,
        email: user.email,
        rol: user.role,
        image: user.image,
        iat: moment().unix(),
        exp: moment().add(30,"days").unix(),
    };

    // Deovolver jwt token codificado
return jwt.encode(payload, secret);
}

module.exports = {
    secret,
    createToken,
}




