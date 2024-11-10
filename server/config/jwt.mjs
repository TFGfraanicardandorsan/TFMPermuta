import jwkToPem from 'jwk-to-pem';
import jwtlib from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import nodeFetch from 'node-fetch';

class JWT {
    #kidpems = {};
    #sesiones= {};
    #autorizaciones = {};
    
    constructor(){
    }
    
    hora(){
        return new Date().toISOString();
    }

    async retrieveKidPem(url){
        const response = await nodeFetch(url);
        const jwk = await response.json();
        for (let i=0; i< jwk.keys.length; i++){
            this.#kidpems[jwk.keys[i].kid] = jwkToPem(jwk.keys[i]);
        }
        console.log(`KID/PEM descargado: ${url}, (${jwk.keys.length} keys)`)
    }

    async actualizaKidPem() {
        console.log('Descargando KID/PEM...');
        // Podría quitarlo??
        await this.retrieveKidPem('https://login.microsoftonline.com/common/discovery/v2.0/keys');
        // Para obtener el conjunto de claves públicas de la organización, se utiliza el endpoint con tenant-id
        await this.retrieveKidPem(`https://login.microsoftonline.com/${process.env.tenantId}/discovery/v2.0/keys`)
    }

    async loginJwt(jwtoken) {
        try {
            let header;
            let payload;
            try{
                const segmentos = jwtoken.split('.');
                header = JSON.parse(Buffer.from(segmentos[0], 'base64').toString('utf-8'));
                payload = JSON.parse(Buffer.from(segmentos[1], 'base64').toString('utf-8'));
            } catch (err) {
                console.error('loginJwt: el jwtoken no tiene un formato válido');
                return { err:true, errmsg: 'loginJwt: jwtoken con formato inválido'};
            }
        if (!this.#kidpems[header.kid]) {
            console.log('KID/PEM ha sido actualizado de manera forzosa')
            await this.actualizaKidPem();
        }
        const token = jwtlib.verify(jwtoken, this.#kidpems[header.kid]);
        const sesionid = uuidv4();
        this.#sesiones[sesionid] = {
            sesionid,
            userid: token.preferred_username || token.email,
            name: payload.name,
            picture: payload.picture,
            mmtCreacion: this.hora(),
        }
        console.log(`SESION con login: ${sesionid} ${this.#sesiones[sesionid].userid} ${this.#sesiones[sesionid].mmtCreacion}`);
        return this.#sesiones[sesionid]
        }
        catch(err) {
            console.error(jwtoken);
            console.error('loginJwt error:', err);
            return { err:true, errmsg: 'error, hay que comprobar el origen del servidor'};
        }
    }

    async loginRenew(sesionid, mmtCreacion) {
        try{
            if(!this.#sesiones[sesionid]) {
                console.log(`SESION renew: ${sesionid} no existe`);
                return { err:true, errmsg: 'no existe la sesión'};
            }
            if (this.#sesiones[sesionid].mmtCreacion !== mmtCreacion) {
                console.log(`SESION renew: ${sesionid} no coincide mmtCreacion`);
                return { err:true, errmsg: 'no existe la sesión'};
            }
            this.#sesiones[sesionid].mmtRenovacion = this.hora();
            console.log(`SESION renew: ${sesionid} ${this.#sesiones[sesionid].userid} ${this.#sesiones[sesionid].mmtCreacion} ${this.#sesiones[sesionid].mmtRenovacion}`);
            return this.#sesiones[sesionid];
        } catch (err) {
            console.log('loginRenew error:', err);
            return { err:true, errmsg: 'error, comprobar el origen en el servidor'};
        }
    }
}
const jwt = new JWT();
export default jwt;