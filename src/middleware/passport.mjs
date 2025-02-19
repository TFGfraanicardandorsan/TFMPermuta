import passport from "passport";
import { Strategy as SamlStrategy } from "passport-saml";
import { samlConfig } from "../config/saml.mjs";

// Configuramos la estrategia SAML en Passport
passport.use('saml',new SamlStrategy(samlConfig, (profile, done) => {
    console.log('SAML profile', profile); // ELIMINAR
    return done(null, profile);
}));

// Serialización y deserailización del usuario
passport.serializeUser((user, done) => { // Guarda el usuario en la sesión
    done(null, user);
});

passport.deserializeUser((user, done) => {   // Recupera el usuario en cada request
    done(null, user);
}); 
export default passport;