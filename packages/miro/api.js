const { OAuth2Requester, get } = require('@friggframework/core');
const { Miro } = require('@mirohq/miro-api');

class Api extends OAuth2Requester {
    constructor(params) {
        super(params);
        // The majority of the properties for OAuth are default loaded by OAuth2Requester.
        // This includes the `client_id`, `client_secret`, `scopes`, and `redirect_uri`.

         // Validate constructor parameters
         if (!params.client_id || !params.client_secret || !params.redirect_uri) {
            throw new Error('Missing required parameters: client_id, client_secret, redirect_uri');
        }


        this.baseUrl = 'https://api.miro.com';

        this.URLs = {
            authorization: '/oauth/authorize',
            access_token: '/oauth/v1/token',
            oauth_token: '/v1/oauth-token',
            boards: '/v2/boards',
            membersByBoards: (boardId) => `/v2/boards/${boardId}/members`,
        };

        this.tokenUri = 'https://api.miro.com/v1/oauth/token';
        

        this.access_token = get(params, 'access_token', null);
        this.refresh_token = get(params, 'refresh_token', null);

// Initialize Miro SDK instance
this.miro = new Miro({
    clientId: this.client_id,
    clientSecret: this.client_secret,
    redirectUrl: this.redirect_uri,
});

this.authorizationUri = this.miro.getAuthUrl();

    }

    getAuthUri() {
        return this.authorizationUri;
    }

    addJsonHeaders(options) {
        const jsonHeaders = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        };
        if (this.access_token) {
            jsonHeaders.Authorization = `Bearer ${this.access_token}`;
        }
        options.headers = {
            ...jsonHeaders,
            ...options.headers,
        };
    }

    async _post(options, stringify) {
        this.addJsonHeaders(options);
        try {
            return await super._post(options, stringify);
        } catch (error) {
            console.error('POST request failed:', error);
            throw new Error('POST request failed');
        }
    }
    

    async _patch(options, stringify) {
        this.addJsonHeaders(options);
        try {
            return await super._patch(options, stringify);
        } catch (error) {
            console.error('PATCH request failed:', error);
            throw new Error('PATCH request failed');
        }
    }

    async _put(options, stringify) {
        this.addJsonHeaders(options);
        try {
            return await super._put(options, stringify);
        } catch (error) {
            console.error('PUT request failed:', error);
            throw new Error('PUT request failed');
        }
    }

    async _get(options) {
        this.addJsonHeaders(options);
        try {
            return await super._get(options);
        } catch (error) {
            console.error('GET request failed:', error);
            throw new Error('GET request failed');
        }
    }

    // **************************   Boards   **********************************

    async createBoard(body) {
        const options = {
            url: this.baseUrl + this.URLs.boards,
            body,
        };

        return this._post(options);
    }

    async getBoards() {
        const options = {
            url: this.baseUrl + this.URLs.boards,
        };

        return this._get(options);
    }

    // **************************   Board Members   **********************************

    async getTokenFromCode(code) {
        if (!code || typeof code !== 'string') {
            throw new Error('Invalid code for getTokenFromCode');
        }

        try {
            const token = await this.miro.exchangeCodeForAccessToken('<user_id>', code);    
            if (token) {
                await this.setTokens({ access_token: token });
                return { access_token: token };
            } else {
                throw new Error('Access token not found in response');
            }
        } catch (err) {
            console.error('Failed to get token:', err);
            throw new Error('Failed to get token');
        }
    }

    
    

    
    async getAllBoardMembers(boardId) {
        if (!boardId || typeof boardId !== 'string') {
            throw new Error('Invalid boardId for getAllBoardMembers');
        }

        const options = {
            url: this.baseUrl + this.URLs.membersByBoards(boardId),
        };

        return this._get(options);
    }

    // **************************   Other/All   **********************************
    async getAccessTokenContext() {
        const options = {
            url: this.baseUrl + this.URLs.oauth_token,
        };
        return this._get(options);
    }
}

module.exports = { Api };
