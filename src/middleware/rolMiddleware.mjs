export const verificarRol = (rol) => {
    return (req, res, next) => {
        if (req.session.user && req.session.user.rol === rol) {
            return next(); 
        }
        return res.status(403).json({ message: 'Acceso denegado. No tienes permisos suficientes.' });
    };
};
