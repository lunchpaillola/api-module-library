const { OAuth2Requester, get } = require('@friggframework/core');
const { Miro } = require('@mirohq/miro-api');

class Api extends OAuth2Requester {
    constructor(params) {
        super(params);
        // The majority of the properties for OAuth are default loaded by OAuth2Requester.
        // This includes the `client_id`, `client_secret`, `scopes`, and `redirect_uri`.
        this.baseUrl = 'https://api.miro.com';

        this.URLs = {
            authorization: '/oauth/authorize',
            access_token: '/oauth/v1/token',
            oauth_token: '/v1/oauth-token',
            boards: '/v2/boards',
            membersByBoards: (boardId) => `/v2/boards/${boardId}/members`,
        };

        /*this.authorizationUri = encodeURI(
            `https://miro.com/oauth/authorize?response_type=code&client_id=${this.client_id}&redirect_uri=${this.redirect_uri}`
        );*/

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
        console.log('theauthuri', this.authorizationUri)
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

   /*async getTokenForURL(code) {
        console.log('code',code);
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('client_id', this.client_id);
        params.append('client_secret',this.client_secret);
        params.append('code',code);
        params.append('redirect_uri', "this.redirec");
        
    
        const url = `${this.tokenUri}?${params.toString()}`;
        console.log('Token request URL:', url);
        
        const options = {
            headers: {
                'Accept': 'application/json',
            },
            url: url,
        };
        
        const response = await this._post(options, false);
        await this.setTokens(response);
        return response;
    }*/

        async getTokenForURL(code) {
            console.log('code', code);
        
            try {
                const token = await this.miro.exchangeCodeForAccessToken('<user_id>', code);
        
                // Log the full token to ensure we have it
                console.log('Full Token response:', token);
        
                if (token) {
                    // Assuming the token is the access token
                    await this.setTokens({ access_token: token });
                    return { access_token: token };
                } else {
                    throw new Error('Access token not found in response');
                }
            } catch (err) {
                console.error('Failed to get token:', err);
                throw err;
            }
        }
    
    

    
    async getAllBoardMembers(boardId) {
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
