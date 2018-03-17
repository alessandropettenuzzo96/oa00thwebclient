import Cookies from 'js-cookie';
import axios from 'axios';
import * as qs from 'qs';


const BASE_API_PATH: string = "http://oauth.k1nd3rg4rt3n.com/";

class NeedsLoginError extends Error{}

class ExpiredTokenError extends Error {}

interface User {
    id: number,
    username: string,
    created_at: Date,
    scopes: string[],
}

interface Token {
    accessToken: string,
    refreshToken: string,
    tokenType: string,
    scopes: string[],
    expiresIn: number
}


export class oa00thHTTPRequest {

    public static get(url: string, config: any) {
        let token = oa00th.getToken();
        if(token && token.accessToken) {
            if(!config) config = {};
            if(config.headers) {
                config.headers["Authorization"] = 'Bearer ' + token.accessToken;
            } else {
                config.headers = {'Authorization': 'Bearer ' + token.accessToken };
            }
        }
        return new Promise<any>((resolve, reject) => {
            axios.get(url, config).then((res) => {
                resolve(res.data);
            }).catch(err => {
                if(err.response.status === 401 && err.response.data.isExpired) {
                    console.log("REFRESH");
                    oa00th.current().refresh().then((t) => {
                        console.log("TOKEN_REFRESHED");
                        oa00thHTTPRequest.get(url, config).then((res) => {
                            resolve(res.data);
                        }).catch((err) => {
                            reject(err);
                        });
                    }).catch((err) => {
                        console.log("TOKEN_REFRESH_ERROR: " + JSON.stringify(err));
                        reject(err);
                    });
                } else {
                    reject(err);
                }
            });
        });
    }

    public static post(url: string, params: any, config: any) {
        let token = oa00th.getToken();
        if(token && token.accessToken) {
            if(!config) config = {};
            if(config.headers) {
                config.headers["Authorization"] = 'Bearer ' + token.accessToken;
            } else {
                config.headers = {'Authorization': 'Bearer ' + token.accessToken };
            }
        }
        if(config && config.encodeParams) {
            params = qs.stringify(params);
            delete config.encodeParams;
        } else if(config && config.encodeParams !== undefined && config.encodeParams === false) {
            delete config.encodeParams;
        }
        return new Promise<any>((resolve, reject) => {
            axios.post(url, params, config).then((res) => {
                resolve(res.data);
            }).catch(err => {
                if(err.response.status === 401 && err.response.data.isExpired) {
                    oa00th.current().refresh().then((t) => {
                        oa00thHTTPRequest.post(url, params, config).then((res) => {
                            resolve(res.data);
                        }).catch((err) => {
                            reject(err);
                        });
                    }).catch((err) => {
                        reject(err);
                    })
                } else {
                    reject(err);
                }
            });
        });
    }

    public static delete(url: string, config: any) {
        let token = oa00th.getToken();
        if(token && token.accessToken) {
            if(!config) config = {};
            if(config.headers) {
                config.headers["Authorization"] = 'Bearer ' + token.accessToken;
            } else {
                config.headers = {'Authorization': 'Bearer ' + token.accessToken };
            }
        }
        return new Promise<any>((resolve, reject) => {
            axios.delete(url, config).then((res) => {
                resolve(res.data);
            }).catch(err => {
                if(err.response.status === 401 && err.response.data.isExpired) {
                    oa00th.current().refresh().then((t) => {
                        oa00thHTTPRequest.delete(url, config).then((res) => {
                            resolve(res.data);
                        }).catch((err) => {
                            reject(err);
                        });
                    }).catch((err) => {
                        reject(err);
                    })
                } else {
                    reject(err);
                }
            });
        });
    }

}

export class oa00th {

    private clientId: number = null;
    private clientSecret: number = null;
    public user: User = null;

    public needsLogin: boolean = true;

    private static instance = null;

    private constructor(clientId, clientSecret, user) {
        this.user = user;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    public static current(): oa00th {
        return oa00th.instance;
    }

    public static init(clientId, clientSecret): Promise<oa00th> {
        return new Promise((resolve, reject) => {
            oa00th.instance = new oa00th(clientId, clientSecret, null);
            oa00th.instance.getUser().then((user) => {
                oa00th.instance.setUser(user);
                return resolve(oa00th.instance);
            }).catch(err => {
                console.log(JSON.stringify(err));
                return resolve(oa00th.instance);
            })
        });
    }

    public refresh(): Promise<Token> {
        let that = this;
        return new Promise<Token>((resolve, reject) => {
            let token = oa00th.getToken();
            if( token && token.refreshToken ) {
                axios.post(BASE_API_PATH+"oauth/token", qs.stringify({ client_id: that.clientId, client_secret: that.clientSecret, grant_type: 'refresh_token', refresh_token: token.refreshToken })).then((res) => {
                    let token: Token = { accessToken: res.data.access_token, refreshToken: res.data.refresh_token, tokenType: res.data.token_type, scopes: res.data.scope, expiresIn: res.data.expires_in };
                    oa00th.saveToken(token);
                    return resolve(token);
                }).catch((err) => {
                    console.log(JSON.stringify(err));
                    reject(err);
                });
            } else {
                reject(new NeedsLoginError());
            }
        });
    }

    public login(username, password): Promise<void> {
        let that = this;
        return new Promise<void>((resolve, reject) => {
            axios.post(BASE_API_PATH+"oauth/token", qs.stringify({ client_id: that.clientId, client_secret: that.clientSecret, grant_type: 'password', username: username, password: password })).then((res) => {
                let token: Token = { accessToken: res.data.access_token, refreshToken: res.data.refresh_token, tokenType: res.data.token_type, scopes: res.data.scope, expiresIn: res.data.expires_in };
                oa00th.saveToken(token);
                that.getUser().then((user) => {
                    return resolve();
                }).catch((err) => {
                    return reject(err);
                });
            }).catch((err) => {
                console.log(JSON.stringify(err));
                reject(err);
            });
        });
    }

    public logout(): Promise<void> {
        let that = this;
        return new Promise<void>((resolve, reject) => {
            let t = oa00th.getToken();
            if(!t || !t.refreshToken) return reject(new NeedsLoginError("No user logged in"));
            oa00th.deleteToken();
            that.user = null;
            that.needsLogin = true;
            axios.post(BASE_API_PATH+"oauth/revoke", qs.stringify({ client_id: that.clientId, client_secret: that.clientSecret, refresh_token: t.refreshToken })).then((res) => {
                resolve()
            }).catch((err) => {
                console.log(JSON.stringify(err));
                reject(err);
            });
        });
    }

    public getUser(): Promise<User> {
        let that = this;
        return new Promise<User>((resolve, reject) => {
            let token = oa00th.getToken();
            if(!token) return reject(new NeedsLoginError("Missing Token"));
            if(that.user) return resolve(that.user);
            oa00thHTTPRequest.get(BASE_API_PATH+"app/"+this.clientId+"/users/me/", { headers: { "Authorization": "Bearer " + token.accessToken } }).then((user) => {
                that.setUser(user);
                return resolve(that.user);
            }).catch((err) => {
                return reject(err);
            });
        });
    }

    private setUser(u: User) {
        this.needsLogin = false;
        this.user = u;
    }

    static getToken(): Token {
        return Cookies.getJSON('n00z_token');
    }

    static saveToken(t: Token) {
        Cookies.set('n00z_token', t);
    }

    static deleteToken() {
        Cookies.remove("n00z_token");
    }
}