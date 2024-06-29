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
    let validAccessToken;

    beforeAll(async () => {
        const url = api.getAuthUri();
        const response = await Authenticator.oauth2(url);
        await api.getTokenFromCode(response.data.code);
        validAccessToken = api.access_token;
    });

    describe('OAuth Flow Tests', () => {
        it('Should generate tokens', async () => {
            expect(api.access_token).toBeTruthy();
        });

        it('Should handle invalid authorization code', async () => {
            try {
                await api.getTokenFromCode('invalid_code');
            } catch (error) {
                expect(error.message).toBe('Failed to get token');
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

        it('Should handle invalid token context request', async () => {
            api.access_token = 'invalid_token';
            try {
                await api.getAccessTokenContext();
            } catch (error) {
                expect(error.message).toContain('GET request failed');
            } finally {
                // Reset access token to valid one for further tests
                api.access_token = validAccessToken;
            }
        });
    });

    describe('Board Actions', () => {
        it('Should retrieve all boards', async () => {
            const boards = await api.getBoards();
            expect(boards.type).toBe('list');
            boardId = boards.data[0].id;
        });

        it('Should handle board retrieval with invalid token', async () => {
            api.access_token = 'invalid_token';
            try {
                await api.getBoards();
            } catch (error) {
                expect(error.message).toContain('GET request failed');
            } finally {
                // Reset access token to valid one for further tests
                api.access_token = validAccessToken;
            }
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
                expect(error.message).toBe(
                    'POST request to https://api.miro.com/v2/boards failed'
                );
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
