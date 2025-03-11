// import usuarioGrupoService from "../services/usuarioGrupoService.mjs";
// const insertarGrupoAsignatura = async (req, res) => {
//     try {
//         if (!req.session.user) {
//             return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
//         }
//         const uvus = req.session.user.nombre_usuario;
//         res.send({ err: false, result: await usuarioGrupoService.insertarGrupoAsignatura(uvus, req.body.grupo, req.body.asignatura)});
//     } catch (err) {
//         console.log('api insertarGrupoAsignatura ha tenido una excepción')
//         res.sendStatus(500)
//     }
// }

// export default {
//     insertarGrupoAsignatura
// }