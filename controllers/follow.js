
// importar modelo
const Follow = require("../models/follow");
const user = require("../models/user");

//importar servicio
const followService = require("../helpers/followUserIds");

//Importar dependencias
const mongoosePaginate = require("mongoose-pagination");

//Acciones de prueba
const pruebaFollow = (req,res) => {
    return res.status(200).send({
        mensaje: "mensaje enviado desde el controlador: follow.js"
    })
}

//Accion de guardar un follow (accion seguir)
const save = (req,res) =>{

    //Conseguir datos por body
    const params = req.body;

    //Sacar id del usuario identificado
    const identity = req.user;

    //Crear objeto con modelo follow
    let userToFollow = new Follow({
        user: identity.id,
        followed: params.followed
    });
    

    //GUardar objeto en bbdd
    userToFollow.save((error, followStored)=>{
        if(error || !followStored){
            return res.status(500).send({
                status: "error",
                message: "No se a guardado el follow"
            })
        }
        
        return res.status(200).send({
            status: "success",
            identity: req.user,
            follow: followStored
        })
    })   
}


//Accion de borrar un follow (accion dejar de seguir)
const unfollow = (req,res) =>{

    //recoger el id del usuario identificado
    const userId = req.user.id;
    //recoger el id del usuario que sigo y quiero dejar de seguir
    const followedId = req.params.id;
    //find de las coincidencias
    Follow.find({
        "user": userId,
        "followed": followedId
    }).remove((error, followDeleted) =>{
        if(error || !followDeleted){
            return res.status(500).send({
                status: "error",
                message: "No has dejado de seguir a nadie"
            });
        }
        
        //find de las colecciones y hacer remove
        return res.status(200).send({
            status: "success",
            message: "Follow eliminado correctamente",
        });
    });


    
}


//Accion listado de usuarios que cualquier usuario esta siguiendo
const following = (req,res) =>{
    //Sacar el id del usuario identificado
    let userId = req.user.id;

    //Comprobar si me llega el id por parametro en el url
    if(req.params.id)userId = req.params.id;
    //Comprobar si me llega la pagina, si no la pagina 1
    let page = 1;
    
    if(req.params.page) page = req.params.page;
    //Usuarios por pagina que quiero mostrar
    const itemsPerPage = 2;
    
    //Find a follow, popular datos de los usuarios y paginar con mongoose paginate
    Follow.find(
        {user: userId}).populate("user followed","-password -role -__v -email")
        .paginate(page, itemsPerPage, async(error, follows, total) =>{

            //Sacar un array de ids de los usuarios que me siguen y los que sigo 
            let followUserIds = await followService.followUserIds(req.user.id);
                return res.status(200).send({
                    status: "success",
                    message: "Listado de usuarios que estoy siguiendo",
                    follows,
                    total,
                    page: Math.ceil(total/itemsPerPage),
                    user_following: followUserIds.following,
                    user_follow_me: followUserIds.followers,
                });
        })
         
}

//Accion listado de usuarios que siguen a cualquier otro usuario
const followers = (req,res) =>{
    //Sacar el id del usuario identificado
    let userId = req.user.id;

    //Comprobar si me llega el id por parametro en el url
    if(req.params.id)userId = req.params.id;
    //Comprobar si me llega la pagina, si no la pagina 1
    let page = 1;
    
    if(req.params.page) page = req.params.page;
    //Usuarios por pagina que quiero mostrar
    const itemsPerPage = 2;
    
    //Find a follow, popular datos de los usuarios y paginar con mongoose paginate
    Follow.find(
        {followed: userId}).populate("user followed","-password -role -__v -email")
        .paginate(page, itemsPerPage, async(error, follows, total) =>{

            //Sacar un array de ids de los usuarios que me siguen y los que sigo 
            let followUserIds = await followService.followUserIds(req.user.id);
                return res.status(200).send({
                    status: "success",
                    message: "Listado de usuarios que me siguen",
                    follows,
                    total,
                    page: Math.ceil(total/itemsPerPage),
                    user_following: followUserIds.following,
                    user_follow_me: followUserIds.followers,
                });
        })
    
}

//Exportar acciones
module.exports = {
    pruebaFollow,
    save,
    unfollow,
    following,
    followers
}