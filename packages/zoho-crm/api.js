const FormData = require('form-data');
const {OAuth2Requester, get} = require('@friggframework/core');

class Api extends OAuth2Requester {
    constructor(params) {
        super(params);
        // The majority of the properties for OAuth are default loaded by OAuth2Requester.
        // This includes the `client_id`, `client_secret`, `scopes`, and `redirect_uri`.
        this.baseUrl = 'https://www.zohoapis.com/crm/v6';
        this.authorizationUri = encodeURI(
            `https://accounts.zoho.com/oauth/v2/auth?scope=${this.scope}&client_id=${this.client_id}&redirect_uri=${this.redirect_uri}&response_type=code&access_type=offline`
        );
        this.tokenUri = 'https://accounts.zoho.com/oauth/v2/token';
        this.access_token = get(params, 'access_token', null);
        this.refresh_token = get(params, 'refresh_token', null);

        this.URLs = {
            // Users
            user: (userId) => `/users/${userId}`,
            users: '/users',

            // Organization
            organization: '/org',

            // Roles
            roles: '/settings/roles',
        };
    }

    getAuthUri() {
        return this.authorizationUri;
    }

    async getTokenFromCode(code) {
        const formData = new FormData();
        formData.append('grant_type', 'authorization_code');
        formData.append('client_id', this.client_id);
        formData.append('client_secret', this.client_secret);
        formData.append('redirect_uri', this.redirect_uri);
        formData.append('scope', this.scope);
        formData.append('code', code);
        const options = {
            body: formData,
            headers: formData.getHeaders(),
            url: this.tokenUri,
        };
        const response = await this._post(options, false);
        await this.setTokens(response);
        return response;
    }

    addJsonHeaders(options) {
        const jsonHeaders = {
            'content-type': 'application/json',
            Accept: 'application/json',
        };
        options.headers = {
            ...jsonHeaders,
            ...options.headers,
        }
    }

    async _post(options, stringify) {
        this.addJsonHeaders(options);
        return super._post(options, stringify);
    }

    async _patch(options, stringify) {
        this.addJsonHeaders(options);
        return super._patch(options, stringify);
    }

    async _put(options, stringify) {
        this.addJsonHeaders(options);
        return super._put(options, stringify);
    }

    // **************************   Users   **********************************
    
    async listUsers(queryParams = {}) {
        const options = {
            url: this.baseUrl + this.URLs.users,
            query: {...queryParams},
        };
        return this._get(options);
    }

    async getUser(userId) {
        const options = {
            url: this.baseUrl + this.URLs.user(userId),
        };
        return this._get(options);
    }

    // **************************   Organizations   **********************************

    async getOrganization() {
        return this._get({url: this.baseUrl + this.URLs.organization});
    }

    // **************************   Roles   **********************************
    
    async listRoles() {
        return this._get({url: this.baseUrl + this.URLs.roles});
    }

    async createRole(body = {}) {
        return this._post({
            url: this.baseUrl + this.URLs.roles,
            body: body
        });
    }
}

module.exports = {Api};
