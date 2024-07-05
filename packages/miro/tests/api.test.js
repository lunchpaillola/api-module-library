require('dotenv').config();
const { Api } = require('../api');
const { Authenticator } = require('@friggframework/test');
/* eslint-disable camelcase */
// Increase the global timeout for all tests
jest.setTimeout(30000);

describe('Miro API Tests', () => {
    const apiParams = {
        client_id: process.env.MIRO_CLIENT_ID,
        client_secret: process.env.MIRO_CLIENT_SECRET,
        redirect_uri: `${process.env.REDIRECT_URI}/miro`,
        scope: process.env.MIRO_SCOPE,
    };

    const api = new Api(apiParams);
    let boardId;

    beforeAll(async () => {
        const url = api.getAuthUri();
        const response = await Authenticator.oauth2(url);
        await api.getTokenFromCode(response.data.code);
    });

    describe('OAuth Flow Tests', () => {
        it('Should generate tokens', async () => {
            expect(api.access_token).toBeTruthy();
            expect(api.refresh_token).toBeTruthy();
        });

        it('Should be able to refresh the token', async () => {
            const oldToken = api.access_token;
            const oldRefreshToken = api.refresh_token;
            api.access_token = 'nope';
            await api.refreshAccessToken({ refresh_token: api.refresh_token });
            expect(api.access_token).not.toBeNull();
            expect(api.access_token).not.toEqual(oldToken);
            expect(api.refresh_token).not.toBeNull();
            expect(api.refresh_token).not.toEqual(oldRefreshToken);
        });

        it('Should handle invalid authorization code', async () => {
            try {
                await api.getTokenFromCode('invalid_code');
            } catch (error) {
                expect(error.message).toContain('failed');
            }
        });
    });

    describe('Basic Identification Requests', () => {
        it('Should retrieve access token context', async () => {
            const context = await api.getAccessTokenContext();
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
                name: 'Test Board',
                description: 'This is a test board',
            };
            const response = await api.createBoard(body);
            expect(response.type).toBe('board');
            boardId = response.id;
        });

        it('Should handle board creation with invalid input', async () => {
            const body = {
                invalidField: 'Invalid data',
            };
            try {
                await api.createBoard(body);
            } catch (error) {
                expect(error.message).toContain('POST request failed');
            }
        });

        it('Should retrieve all members for a board', async () => {
            const members = await api.getAllBoardMembers(boardId);
            expect(members.type).toBe('list');
            expect(members.data[0].type).toBe('board_member');
        });

        it('Should handle member retrieval with invalid board ID', async () => {
            try {
                await api.getAllBoardMembers('invalid_board_id');
            } catch (error) {
                expect(error.message).toContain('GET request failed');
            }
        });
    });
});
