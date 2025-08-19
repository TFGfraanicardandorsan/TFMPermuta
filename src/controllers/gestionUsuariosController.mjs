import GenericValidators from "../utils/genericValidators.mjs";
import gestionUsuariosService from "../services/gestionUsuariosService.mjs";
import e from "express";

const actualizarRolUsuario = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
    }
    const uvus = req.session.user.nombre_usuario;
    const validNuevoRol = GenericValidators.isString(req.body.nuevo_rol, "Nuevo rol");
    if (!validNuevoRol.valido) {
      return res.status(400).json({ err: true, message: validNuevoRol.mensaje });
    }
    const nuevoRol = validNuevoRol.valor;
    if (!(nuevoRol === 'estudiante' && nuevoRol === 'administrador')) {
      return res.status(400).json({ err: true, message: "El rol debe ser estudiante o administrador" });
    }
    res.send({ err: false, result: await gestionUsuariosService.actualizarRolUsuario(uvus, nuevoRol) });
  } catch (err) {
    console.log('api actualizarRolUsuario ha tenido una excepción');
    res.sendStatus(500);
  }
}

const obtenerTodosUsuarios = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
    }
    const usuarios = await gestionUsuariosService.obtenerTodosUsuarios();
    res.send({ err: false, result: usuarios });
  } catch (err) {
    console.log('api obtenerTodosUsuarios ha tenido una excepción');
    res.sendStatus(500);
  }
}

const desactivarUsuario = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
    }
    const uvus = req.session.user.nombre_usuario;
    const validUvUs = GenericValidators.isString(uvus, "UVUS");
    if (!validUvUs.valido) {
      return res.status(400).json({ err: true, message: validUvUs.mensaje });
    }
    res.send({ err: false, result: await gestionUsuariosService.desactivarUsuario(uvus) });
  } catch (err) {
    console.log('api desactivarUsuario ha tenido una excepción');
    res.sendStatus(500);
  }
}

const obtenerDatosUsuario = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
    }
    const uvus = req.session.user.nombre_usuario;
    const validUvUs = GenericValidators.isString(uvus, "UVUS");
    if (!validUvUs.valido) {
      return res.status(400).json({ err: true, message: validUvUs.mensaje });
    }
    const datosUsuario = await gestionUsuariosService.obtenerDatosUsuario(uvus);
    res.send({ err: false, result: datosUsuario });
  } catch (err) {
    console.log('api obtenerDatosUsuario ha tenido una excepción');
    res.sendStatus(500);
  }
}

export default {
  actualizarRolUsuario,
  obtenerTodosUsuarios,
  desactivarUsuario,
  obtenerDatosUsuario
};