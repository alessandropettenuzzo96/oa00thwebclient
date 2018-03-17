var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import Cookies from 'js-cookie';
import axios from 'axios';
import * as qs from 'qs';
var BASE_API_PATH = "http://oauth.k1nd3rg4rt3n.com/";
var NeedsLoginError = /** @class */ (function (_super) {
    __extends(NeedsLoginError, _super);
    function NeedsLoginError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return NeedsLoginError;
}(Error));
var ExpiredTokenError = /** @class */ (function (_super) {
    __extends(ExpiredTokenError, _super);
    function ExpiredTokenError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ExpiredTokenError;
}(Error));
var oa00thHTTPRequest = /** @class */ (function () {
    function oa00thHTTPRequest() {
    }
    oa00thHTTPRequest.get = function (url, config) {
        var token = oa00th.getToken();
        if (token && token.accessToken) {
            if (!config)
                config = {};
            if (config.headers) {
                config.headers["Authorization"] = 'Bearer ' + token.accessToken;
            }
            else {
                config.headers = { 'Authorization': 'Bearer ' + token.accessToken };
            }
        }
        return new Promise(function (resolve, reject) {
            axios.get(url, config).then(function (res) {
                resolve(res.data);
            }).catch(function (err) {
                if (err.response.status === 401 && err.response.data.isExpired) {
                    console.log("REFRESH");
                    oa00th.current().refresh().then(function (t) {
                        console.log("TOKEN_REFRESHED");
                        oa00thHTTPRequest.get(url, config).then(function (res) {
                            resolve(res.data);
                        }).catch(function (err) {
                            reject(err);
                        });
                    }).catch(function (err) {
                        console.log("TOKEN_REFRESH_ERROR: " + JSON.stringify(err));
                        reject(err);
                    });
                }
                else {
                    reject(err);
                }
            });
        });
    };
    oa00thHTTPRequest.post = function (url, params, config) {
        var token = oa00th.getToken();
        if (token && token.accessToken) {
            if (!config)
                config = {};
            if (config.headers) {
                config.headers["Authorization"] = 'Bearer ' + token.accessToken;
            }
            else {
                config.headers = { 'Authorization': 'Bearer ' + token.accessToken };
            }
        }
        if (config && config.encodeParams) {
            params = qs.stringify(params);
            delete config.encodeParams;
        }
        else if (config && config.encodeParams !== undefined && config.encodeParams === false) {
            delete config.encodeParams;
        }
        return new Promise(function (resolve, reject) {
            axios.post(url, params, config).then(function (res) {
                resolve(res.data);
            }).catch(function (err) {
                if (err.response.status === 401 && err.response.data.isExpired) {
                    oa00th.current().refresh().then(function (t) {
                        oa00thHTTPRequest.post(url, params, config).then(function (res) {
                            resolve(res.data);
                        }).catch(function (err) {
                            reject(err);
                        });
                    }).catch(function (err) {
                        reject(err);
                    });
                }
                else {
                    reject(err);
                }
            });
        });
    };
    oa00thHTTPRequest.delete = function (url, config) {
        var token = oa00th.getToken();
        if (token && token.accessToken) {
            if (!config)
                config = {};
            if (config.headers) {
                config.headers["Authorization"] = 'Bearer ' + token.accessToken;
            }
            else {
                config.headers = { 'Authorization': 'Bearer ' + token.accessToken };
            }
        }
        return new Promise(function (resolve, reject) {
            axios.delete(url, config).then(function (res) {
                resolve(res.data);
            }).catch(function (err) {
                if (err.response.status === 401 && err.response.data.isExpired) {
                    oa00th.current().refresh().then(function (t) {
                        oa00thHTTPRequest.delete(url, config).then(function (res) {
                            resolve(res.data);
                        }).catch(function (err) {
                            reject(err);
                        });
                    }).catch(function (err) {
                        reject(err);
                    });
                }
                else {
                    reject(err);
                }
            });
        });
    };
    return oa00thHTTPRequest;
}());
export { oa00thHTTPRequest };
var oa00th = /** @class */ (function () {
    function oa00th(clientId, clientSecret, user) {
        this.clientId = null;
        this.clientSecret = null;
        this.user = null;
        this.needsLogin = true;
        this.user = user;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }
    oa00th.current = function () {
        return oa00th.instance;
    };
    oa00th.init = function (clientId, clientSecret) {
        return new Promise(function (resolve, reject) {
            oa00th.instance = new oa00th(clientId, clientSecret, null);
            oa00th.instance.getUser().then(function (user) {
                oa00th.instance.setUser(user);
                return resolve(oa00th.instance);
            }).catch(function (err) {
                console.log(JSON.stringify(err));
                return resolve(oa00th.instance);
            });
        });
    };
    oa00th.prototype.refresh = function () {
        var that = this;
        return new Promise(function (resolve, reject) {
            var token = oa00th.getToken();
            if (token && token.refreshToken) {
                axios.post(BASE_API_PATH + "oauth/token", qs.stringify({ client_id: that.clientId, client_secret: that.clientSecret, grant_type: 'refresh_token', refresh_token: token.refreshToken })).then(function (res) {
                    var token = { accessToken: res.data.access_token, refreshToken: res.data.refresh_token, tokenType: res.data.token_type, scopes: res.data.scope, expiresIn: res.data.expires_in };
                    oa00th.saveToken(token);
                    return resolve(token);
                }).catch(function (err) {
                    console.log(JSON.stringify(err));
                    reject(err);
                });
            }
            else {
                reject(new NeedsLoginError());
            }
        });
    };
    oa00th.prototype.login = function (username, password) {
        var that = this;
        return new Promise(function (resolve, reject) {
            axios.post(BASE_API_PATH + "oauth/token", qs.stringify({ client_id: that.clientId, client_secret: that.clientSecret, grant_type: 'password', username: username, password: password })).then(function (res) {
                var token = { accessToken: res.data.access_token, refreshToken: res.data.refresh_token, tokenType: res.data.token_type, scopes: res.data.scope, expiresIn: res.data.expires_in };
                oa00th.saveToken(token);
                that.getUser().then(function (user) {
                    return resolve();
                }).catch(function (err) {
                    return reject(err);
                });
            }).catch(function (err) {
                console.log(JSON.stringify(err));
                reject(err);
            });
        });
    };
    oa00th.prototype.logout = function () {
        var that = this;
        return new Promise(function (resolve, reject) {
            var t = oa00th.getToken();
            if (!t || !t.refreshToken)
                return reject(new NeedsLoginError("No user logged in"));
            oa00th.deleteToken();
            that.user = null;
            that.needsLogin = true;
            axios.post(BASE_API_PATH + "oauth/revoke", qs.stringify({ client_id: that.clientId, client_secret: that.clientSecret, refresh_token: t.refreshToken })).then(function (res) {
                resolve();
            }).catch(function (err) {
                console.log(JSON.stringify(err));
                reject(err);
            });
        });
    };
    oa00th.prototype.getUser = function () {
        var _this = this;
        var that = this;
        return new Promise(function (resolve, reject) {
            var token = oa00th.getToken();
            if (!token)
                return reject(new NeedsLoginError("Missing Token"));
            if (that.user)
                return resolve(that.user);
            oa00thHTTPRequest.get(BASE_API_PATH + "app/" + _this.clientId + "/users/me/", { headers: { "Authorization": "Bearer " + token.accessToken } }).then(function (user) {
                that.setUser(user);
                return resolve(that.user);
            }).catch(function (err) {
                return reject(err);
            });
        });
    };
    oa00th.prototype.setUser = function (u) {
        this.needsLogin = false;
        this.user = u;
    };
    oa00th.getToken = function () {
        return Cookies.getJSON('n00z_token');
    };
    oa00th.saveToken = function (t) {
        Cookies.set('n00z_token', t);
    };
    oa00th.deleteToken = function () {
        Cookies.remove("n00z_token");
    };
    oa00th.instance = null;
    return oa00th;
}());
export { oa00th };
//# sourceMappingURL=index.js.map