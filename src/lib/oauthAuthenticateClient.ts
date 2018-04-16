const cryptoRandomString = require('crypto-random-string');
const http = require('http');
const url = require('url');
const querystring = require('querystring');
const opn = require('opn');
import { OAuth2Client } from 'google-auth-library';
//scope: ['https://www.googleapis.com/auth/plus.me','https://www.googleapis.com/auth/blogger'],
export function authenticateClient(oAuth2Client:OAuth2Client,freePort:number,scope:string|string[]) {
    return new Promise<void>(async (resolve, reject) => {
        
        const state=cryptoRandomString(10);
        // Generate the url that will be used for the consent dialog.
        const authorizeUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scope,
            state:state
        });
        console.group("Authenticating");
        // Open an http server to accept the oauth callback. In this simple example, the
        // only request to our webserver is to /oauth2callback?code=<code>
        const server = http.createServer(async (req:any, res:any) => {
        if (req.url.indexOf(`state=${state}`) > -1) {
            console.log("received server response");
            const qs = querystring.parse(url.parse(req.url).query);
            const errorMessage=qs.error;
            const successMessage='Authentication successful! Please return to the console.'
            const responseMessage=errorMessage?errorMessage:successMessage
            res.end(responseMessage);
            server.close();
            if(errorMessage){
                console.groupEnd();
                reject(new Error("Authentication failed: " + errorMessage));
            }else{
                // Now that we have the code, use that to acquire tokens.
                console.log("getting tokens...")
                let r= await oAuth2Client.getToken(qs.code)
                // Make sure to set the credentials on the OAuth2 client.
                
                oAuth2Client.setCredentials(r.tokens);
                console.info('Tokens acquired and client authenticated.');
                console.groupEnd();
                resolve();
            }
        }
        }).listen(freePort, () => {
            console.log("listening for server response on port: " + freePort);
            console.log('opening the browser');
        // open the browser to the authorize url to start the workflow
        opn(authorizeUrl);
        });
    });
    }