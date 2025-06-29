import passport from "passport";
import SamlStrategy from "passport-saml";
import { samlConfig } from "../config/saml.mjs";

// Configuramos la estrategia SAML en Passport
passport.use('saml',new SamlStrategy.Strategy(samlConfig, (profile, done) => {
    return done(null, profile);
}));
export default passport;