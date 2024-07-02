const { OAuth2Requester, get } = require('@friggframework/core');
/* eslint-disable camelcase */
class Api extends OAuth2Requester {
    constructor(params) {
        super(params);
        // The majority of the properties for OAuth are default loaded by OAuth2Requester.
        // This includes the `client_id`, `client_secret`, `scopes`, and `redirect_uri`.

        // Validate constructor parameters
        if (
            !params.client_id ||
            !params.client_secret ||
            !params.redirect_uri
        ) {
            throw new Error(
                'Missing required parameters: client_id, client_secret, redirect_uri'
            );
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

        this.authorizationUri = `https://miro.com/oauth/authorize?response_type=code&client_id=${this.client_id}&redirect_uri=${this.redirect_uri}`;
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
            throw new Error('POST request failed');
        }
    }

    async _patch(options, stringify) {
        this.addJsonHeaders(options);
        try {
            return await super._patch(options, stringify);
        } catch (error) {
            throw new Error('PATCH request failed');
        }
    }

    async _put(options, stringify) {
        this.addJsonHeaders(options);
        try {
            return await super._put(options, stringify);
        } catch (error) {
            throw new Error('PUT request failed');
        }
    }

    async _get(options) {
        this.addJsonHeaders(options);
        try {
            return await super._get(options);
        } catch (error) {
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

    async getBoards(query) {
        const options = {
            url: this.baseUrl + this.URLs.boards,
            query,
        };

        return this._get(options);
    }

    // **************************   Board Members   **********************************

    async getAllBoardMembers(boardId, query) {
        if (!boardId || typeof boardId !== 'string') {
            throw new Error('Invalid boardId for getAllBoardMembers');
        }

        const options = {
            url: this.baseUrl + this.URLs.membersByBoards(boardId),
            query,
        };

        return this._get(options);
    }

    // **************************   Other/All   **********************************

    async getTokenFromCode(code) {
        if (!code || typeof code !== 'string') {
            throw new Error('Invalid code for getTokenFromCode');
        }

        try {
            const options = {
                url: `${this.tokenUri}?grant_type=authorization_code&client_id=${this.client_id}&client_secret=${this.client_secret}&code=${code}&redirect_uri=${this.redirect_uri}`,
            };

            const response = await this._post(options);
            await this.setTokens(response);

            return response;
        } catch (err) {
            throw new Error('Failed to get token: ' + err.message);
        }
    }

    async getAccessTokenContext() {
        const options = {
            url: this.baseUrl + this.URLs.oauth_token,
        };
        return this._get(options);
    }
}

module.exports = { Api };
