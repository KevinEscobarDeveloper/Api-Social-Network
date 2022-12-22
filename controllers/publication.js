//importar modulos
const fs = require("fs");
const path = require("path");

const Publication = require("../models/publication");

//Importar servicios
const followService = require("..//helpers/followUserIds");

//Acciones de prueba
const pruebaPublication = (req, res) => {
  return res.status(200).send({
    mensaje: "mensaje enviado desde el controlador: publication.js",
  });
};

//Guardar publicación
const save = (req, res) => {
  //recoger datos del body
  const params = req.body;

  //si no me llegan dar respuesta negativa
  if (!params.text)
    return res.status(400).send({
      status: "error",
      message: "Debes enviar el texto de la publicación",
    });

  //crear y rellenar el objeto del modelo
  let newPublication = new Publication(params);
  newPublication.user = req.user.id;

  //Guardar objeto en bbdd
  newPublication.save((error, publicationStored) => {
    if (error || !publicationStored) {
      return res.status(400).send({
        status: "error",
        message: "No se a guardado la publicación",
      });
    }

    return res.status(200).send({
      status: "success",
      message: "Publicacion guardada",
      publicationStored,
    });
  });
};

// Sacar una publicación
const detail = (req, res) => {
  //Savar id de la publicación de la url
  const publicationId = req.params.id;

  //find con la condicion del id
  Publication.findById(publicationId, (error, publicationStored) => {
    if (error || !publicationStored) {
      return res.status(404).send({
        status: "error",
        message: "No existe la publicación",
      });
    }

    //Devolver respuesta
    return res.status(200).send({
      status: "success",
      message: "Mostrar publicación",
      publication: publicationStored,
    });
  });
};

//Eliminar publicaciones
const remove = (req, res) => {
  //Sacar el id de la publicación a eliminar
  const publicationId = req.params.id;

  //Find y luego un remove
  Publication.find({ user: req.user.id, _id: publicationId }).remove(
    (error) => {
      if (error) {
        //Devolver respuesta
        return res.status(500).send({
          status: "error",
          message: "No se ha eliminado la publicación",
        });
      }

      //Devolver respuesta
      return res.status(200).send({
        status: "success",
        message: "Eliminar publicación",
        publication: publicationId,
      });
    }
  );
};

//Listar todas las publicaciones
const user = (req, res) => {
  //Sacar el id del usuario
  const userId = req.params.id;
  //Controlar la pagina
  let page = 1;

  if (req.params.page) {
    page = req.params.page;
  }

  const itemsPerPage = 5;

  //Find, populate, ordenar, paginar
  Publication.find({ user: userId })
    .sort("-create_at")
    .populate("user", "-password -__v -role -email")
    .paginate(page, itemsPerPage, (error, publications, total) => {
      if (error || !publications || publications.length <= 0) {
        return res.status(404).send({
          status: "error",
          message: "No hay publicaciones para mostrar",
        });
      }

      //Devolver respuesta
      return res.status(200).send({
        status: "success",
        message: "Publicaciones del perfil de un usuario",
        page,
        total,
        pages: Math.ceil(total / itemsPerPage),
        publications,
      });
    });
};

//Listar publicaciones de un usuario

//Subir ficheros
const upload = (req, res) => {
  //Sacar publication id
  const publicationId = req.params.id;

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
  Publication.findOneAndUpdate(
    { "user": req.user.id, "_id": publicationId },
    { file: req.file.filename },
    { new: true },
    (error, publicationUpdated) => {
      if (error || !publicationUpdated) {
        return res.status(500).send({
          status: "error",
          message: "error en la subida del avatar",
        });
      }

      //devolver respuesta
      return res.status(200).send({
        status: "success",
        publication: publicationUpdated,
        file: req.file,
      });
    }
  );
};

//Devolver archivos multimedia imagenes
const media = (req, res) => {
  //sacar el parametro de la url
  const file = req.params.file;

  //montar el path real de la imagen
  const filePath = "./upload/publications/" + file;
  //Comprobar que existe
  fs.stat(filePath, (error, exists) => {
    if (!exists)
      return res
        .status(404)
        .send({ status: "error", message: "No existe la imagen" });

    //Devolver un file con ruta absoluta
    return res.sendFile(path.resolve(filePath));
  });
};

//Listar todas las publicaciones (feed)

const feed = async (req, res) => {
  //Sacar la pagina actual
  let page = 1;

  if (req.params.page) {
    page = req.params.page;
  }

  //Establecer numero de elementos por pagina
  let itemsPerPage = 5;

  //Sacar un array de identificadores de usuarios que yo sigo como usuario identificado
  try {
    const myFollows = await followService.followUserIds(req.user.id);
    //Find a publicacion in, ordenar, popular, paginar
    const publications = Publication.find({
      user: myFollows.following,
    })
      .populate("user", "-password -role -__v -email")
      .sort("-created_at")
      .paginate(page, itemsPerPage, (error, publications, total) => {
        
        if(error || !publications){
          return res.status(500).send({
            status: "error",
            message: "No hay publicaciones para mostrar",
          });
        }
        
        return res.status(200).send({
          status: "success",
          message: "Feed de publicación",
          following: myFollows.following,
          total,
          page,
          itemsPerPage,
          pages: Math.ceil(total / itemsPerPage),
          publications,
        });
      });
  } catch (error) {
    //Find a publicacion in, ordenar, popular, paginar

    return res.status(500).send({
      status: "error",
      message: "No se han listado las publicaciones del feed",
    });
  }
};

//Exportar acciones
module.exports = {
  pruebaPublication,
  save,
  detail,
  remove,
  user,
  upload,
  media,
  feed,
};
