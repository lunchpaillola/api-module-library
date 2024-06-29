require('dotenv').config();
const { Api } = require('../api'); 
const { Authenticator } = require("@friggframework/test");

//Increase the global timeout for all tests
jest.setTimeout(30000);

describe('Miro API Tests', () => {
    /* eslint-disable camelcase */
    const apiParams = {
        client_id: process.env.MIRO_CLIENT_ID,
        client_secret: process.env.MIRO_CLIENT_SECRET,
        redirect_uri: `${process.env.REDIRECT_URI}/miro`,
        scope: process.env.MIRO_SCOPE,
    };
    /* eslint-enable camelcase */

    const api = new Api(apiParams);
    //api.access_token = process.env.ACCESS_TOKEN;
    let boardId;

    beforeAll(async () => {
        const url = api.getAuthUri();
        const response = await Authenticator.oauth2(url);
        await api.getTokenForURL(response.data.code);
    });

    describe('OAuth Flow Tests', () => {
        it('Should generate tokens', async () => {
            expect(api.access_token).toBeTruthy();
        });
    });

    describe('Basic Identification Requests', () => {
        it('Should retrieve access token context', async () => {
            const context = await api.getAccessTokenContext();
            console.log('context', context);
            expect(context).toBeDefined();
            expect(context.type).toBe('oAuthToken');
            expect(context.createdBy).toBeDefined();
            expect(context.organization).toBeDefined();
            expect(context.user).toBeDefined();
            expect(context.scopes).toBeInstanceOf(Array);
            expect(context.team).toBeDefined();
        });
    });



    describe('Board Actions', () => {
        it('Should retrieve all boards', async () => {
            const boards = await api.getBoards();
            expect(boards.type).toBe('list');
            boardId = boards.data[0].id;
        });

        it('Should create a board', async () => {
            const body = {
                name: "Test Board",
                description: "This is a test board",
            };
            const response = await api.createBoard(body);
            expect(response.type).toBe('board');
            boardId = response.id;
        });

        it('Should retrieve all members for a board', async () => {
            const members = await api.getAllBoardMembers(boardId);
            expect(members.type).toBe('list');
            expect(members.data[0].type).toBe('board_member');
        }); 
    });
});
