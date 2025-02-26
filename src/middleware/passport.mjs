import passport from "passport";
import SamlStrategy from "passport-saml";
import { samlConfig } from "../config/saml.mjs";

// Configuramos la estrategia SAML en Passport
passport.use('saml',new SamlStrategy.Strategy(samlConfig, (profile, done) => {
    return done(null, profile);
}));

// Serialización y deserialización del usuario
passport.serializeUser((user, done) => { // Guarda el usuario en la sesión
    done(null, user);
});

passport.deserializeUser((user, done) => {   // Recupera el usuario en cada request
    done(null, user);
}); 
export default passport;