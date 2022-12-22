//importar dependencias y modulos
const bcrypt = require("bcrypt");
const User = require("../models/user");
const mongoosePagination = require("mongoose-pagination");
const fs = require("fs");
const path = require("path");
const followService = require("../helpers/followUserIds");


//importar servicios
const jwt = require("../helpers/jwt");
const follow = require("../models/follow");
const publication = require("../models/publication");
const validate = require("../helpers/validate");

//Acciones de prueba
const pruebaUser = (req, res) => {
  return res.status(200).send({
    mensaje: "mensaje enviado desde el controlador: user.js",
    usuario: req.user,
  });
};

//Registro de usuarios
const register = (req, res) => {
  //recoger datos de la petición
  let params = req.body;

  //comprobar que me llegan bien (+validación)
  if (!params.name || !params.email || !params.password || !params.nick) {
    return res.status(400).json({
      message: "Faltan datos por enviar",
      status: "error",
    });
  }

  //Validación avanzada
  try{
    validate(params);
  }catch(error){
    return res.status(400).json({
      message: "Validación no superada",
      status: "error",
    });
  }

  //control de usuarios duplicados
  User.find({
    $or: [
      { email: params.email.toLowerCase() },
      { nick: params.nick.toLowerCase() },
    ],
  }).exec(async (error, users) => {
    if (error)
      return res.status(500).json({
        message: "error en la consulta",
        status: "error",
      });

    if (users && users.length >= 1) {
      return res.status(200).send({
        status: "success",
        message: "El usuario ya existe",
      });
    }

    //Cifrar la contraseña
    let hash = await bcrypt.hash(params.password, 10);
    params.password = hash;

    //Crear objeto de usuario
    let user_to_save = new User(params);

    //Guardar usuario en la BBDD
    user_to_save.save((error, userStored) => {
      if (error || !userStored)
        return res.status(500).send({ status: "error al guardar el usuario" });

      return res.status(200).json({
        message: "usuario registrado correctamente",
        status: "success",
        user: userStored,
      });
    });
  });
};

const login = (req, res) => {
  //Recoger parametros body
  let params = req.body;
  console.log(params);
  if (!params.email || !params.password) {
    return res.status(400).send({
      status: "error",
      message: "Faltan datos por enviar",
    });
  }

  //Buscar en la bbdd si existe
  User.findOne({ email: params.email })
    //.select({"password": 0})
    .exec((error, user) => {
      if (error || !user)
        return res.status(404).send({
          status: "error",
          message: "No existe el usuario",
        });

      //Comprobar su contraseña
      let pwd = bcrypt.compareSync(params.password, user.password);

      if (!pwd) {
        return res.status(400).send({
          status: "error",
          message: "No te has identificado correctamente",
        });
      }

      //Conseguir el  token
      const token = jwt.createToken(user);

      //Devolver Datos del usuario
      return res.status(200).send({
        status: "success",
        message: "Te has identificado correctamente",
        user: {
          id: user._id,
          name: user.name,
          nick: user.nick,
        },
        token,
      });
    });
};

const list = (req, res) => {
  //controlar en que pagina estamos
  let page = 1;
  if (req.params.page) {
    page = req.params.page;
  }

  page = parseInt(page);

  //consulta con mongoose paginate
  let itemPerPage = 2;
  User.find().select("-password -email -role -__v")
    .sort("_id")
    .paginate(page, itemPerPage, async(error, users, total) => {
      if (error || !users) {
        return res.status(404).send({
          status: "error",
          message: "No hsy usuario disponibles",
          error,
        });
      }

      let followUserIds = await followService.followUserIds(req.user.id);

      return res.status(200).send({
        status: "success",
        users,
        page,
        itemPerPage,
        total,
        pages: Math.ceil(total / itemPerPage),
        user_following: followUserIds.following,
        user_follow_me: followUserIds.followers,

      });
    });

  //Devolver resultado (posteriormente info follow)
};

const profile = (req, res) => {
  //Recibir el parametro del id de usuario por la url
  const id = req.params.id;

  //Consulta para sacar los datos del usuario
  User.findById(id)
    .select({ password: 0, role: 0 })
    .exec(async(error, userProfile) => {
      if (error || !userProfile) {
        return res.status(404).send({
          message: "El usuario no existe o hay un error",
          status: "Error",
        });
      }

      //Información de seguimiento
      const followInfo = await followService.followThisUser(req.user.id, id);

      //Devolver el resultado
      return res.status(200).send({
        status: "success",
        user: userProfile,
        following: followInfo.following,
        follower: followInfo.follower
      });
    });
};

const update = (req, res) => {
  //recoger info del usuario a actualizar
  let userIdentity = req.user;
  let userToUpdate = req.body;

  //eliminar campos sobrantes
  delete userToUpdate.iat;
  delete userToUpdate.exp;
  delete userToUpdate.role;
  delete userToUpdate.image;

  //comprobar si el usuario ya existe
  User.find({
    $or: [
      { email: userToUpdate.email.toLowerCase() },
      { nick: userToUpdate.nick.toLowerCase() },
    ],
  }).exec(async (error, users) => {
    if (error)
      return res.status(500).json({
        message: "error en la consulta",
        status: "error",
      });

    let userIsset = false;
    users.forEach((user) => {
      if (user && user._id != userIdentity.id) userIsset = true;
    });

    if (userIsset) {
      return res.status(200).send({
        status: "success",
        message: "El usuario ya existe",
      });
    }

    //si me llega la password cifrarla
    if (userToUpdate.password) {
      let hash = await bcrypt.hash(userToUpdate.password, 10);
      userToUpdate.password = hash;
    }else{
      delete userToUpdate.password;
    }

    //buscar y actualizar
    try {
      let userUpdated = await User.findByIdAndUpdate(
       { _id: userIdentity.id},
        userToUpdate,
        { new: true }
      );
      if (!userUpdated) {
        return res.status(400).json({
          message: "error en la consulta",
          status: "error",
        });
      }

      //Devolver respuesta
      return res.status(200).send({
        status: "success",
        message: "Metodo para actualizar usuario",
        user: userUpdated,
      });
    } catch (e) {
      return res.status(500).json({
        message: "error en la consulta",
        status: "error",
        e,
      });
    }
  });
};

const upload = (req, res) => {
  //Recoger el fichero de imagen y comprobar que existe
  if (!req.file) {
    return res.status(404).send({
      status: "error",
      message: "Petición no incluye la imagen",
    });
  }

  //conseguir el nombre del archivo
  let image = req.file.originalname;

  //sacar la extensión del archivo
  const imageSplit = image.split(".");
  const extension = imageSplit[1];

  //comprobar extensión
  if (
    extension != "png" &&
    extension != "jpg" &&
    extension != "jpeg" &&
    extension != "gif"
  ) {
    //borrar archivo subido
    const filePath = req.file.path;
    const fileDeleted = fs.unlinkSync(filePath);

    //devolver respuesta
    return res.status(400).send({
      status: "error",
      message: "Extension del fichero invalida",
    });
  }

  //si si es correcta, guardar imagen en bbdd
  User.findOneAndUpdate(
    {_id: req.user.id},
    { image: req.file.filename },
    { new: true },
    (error, userUpdated) => {
        if(error || !userUpdated){
            return res.status(500).send({
                status: "error",
                message: "error en la subida del avatar"
            });
        }


      //devolver respuesta
      return res.status(400).send({
        status: "success",
        user: userUpdated,
        file: req.file,
      });
    }
  );
};


const avatar = (req,res) =>{

    //sacar el parametro de la url
    const file = req.params.file;

    //montar el path real de la imagen
    const filePath = "./upload/avatars/"+file;
    //Comprobar que existe
    fs.stat(filePath, (error, exists) =>{
        if(!exists) return res.status(400).send({status: "error", message: "No existe la imagen"});

    //Devolver un file con ruta absoluta
    return res.sendFile(path.resolve(filePath));
    })

}

const counters = async(req,res) =>{
  let userId = req.user.id;

  if(req.params.id){
    userId = req.params.id;


    try{
      const following = await follow.count({"user": userId});
      const followed = await follow.count({"followed": userId});
      const publications = await publication.count({"user": userId});
    
      return res.status(200).send({
        userId,
        following: following,
        followed: followed,
        publications: publications
      });
    
    }catch(error){
      return res.status(500).send({
        status: "error",
        message: "Error en los contadores",
        error
      });
    }
  }
}

//Exportar acciones
module.exports = {
  pruebaUser,
  register,
  login,
  profile,
  list,
  update,
  upload,
  avatar,
  counters
};
