const express = require("express");
const router = express.Router();
const publicationController = require("../controllers/publication");
const check = require("../middlewares/auth");
const multer = require("multer");

//conguración de subida
const storage = multer.diskStorage({
    destination:(req,file, cb) =>{
        cb(null,"./upload/publications");
    },

    filename: (req,file,cb) =>{
        cb(null, "pub-"+Date.now()+"-"+file.originalname);
    }
})

const upload = multer({storage});


//Definir rutas
router.get("/prueba-publication", publicationController.pruebaPublication);
router.post("/save", check.auth, publicationController.save);
router.get("/detail/:id", check.auth, publicationController.detail);
router.get("/user/:id/:page?", check.auth, publicationController.user);
router.delete("/remove/:id", check.auth, publicationController.remove);
router.post("/upload/:id",[check.auth, upload.single("file0")], publicationController.upload);
router.get("/media/:file",  publicationController.media);
router.get("/feed/:page?", check.auth, publicationController.feed);


//Exportar el router
module.exports = router;