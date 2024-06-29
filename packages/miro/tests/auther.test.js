const {
    connectToDatabase,
    disconnectFromDatabase,
    createObjectId,
    Auther,
} = require('@friggframework/core');
const { Definition } = require('../definition');
const { Authenticator } = require('@friggframework/test');
/* eslint-disable camelcase */

//Increase the global timeout for all tests
jest.setTimeout(30000);

describe('Miro Auther Tests', () => {
    let auther, authUrl;

    beforeAll(async () => {
        await connectToDatabase();
        auther = await Auther.getInstance({
            definition: Definition,
            userId: createObjectId(),
        });
    });

    afterAll(async () => {
        await auther.CredentialModel.deleteMany();
        await auther.EntityModel.deleteMany();
        await disconnectFromDatabase();
    });

    describe('getAuthorizationRequirements() test', () => {
        it('should return auth requirements', async () => {
            const requirements = auther.getAuthorizationRequirements();
            expect(requirements).toBeDefined();
            expect(requirements.type).toEqual('oauth2');
            expect(requirements.url).toBeDefined();
            authUrl = requirements.url;
        });

        it.skip('should fail test auth', async () => {
            const response = await auther.testAuth();
            expect(response).toBeFalsy();
        });
    });

    describe('Authorization requests', () => {
        let firstRes;
        it('processAuthorizationCallback()', async () => {
            const response = await Authenticator.oauth2(authUrl);
            const authorizationCode = encodeURIComponent(
                response.data.code.trim()
            );

            try {
                firstRes = await auther.processAuthorizationCallback({
                    data: {
                        code: authorizationCode,
                    },
                });
                expect(firstRes).toBeDefined();
                expect(firstRes.entity_id).toBeDefined();
                expect(firstRes.credential_id).toBeDefined();
            } catch (error) {
                throw error;
            }
        }, 30000); // Set a specific timeout for this test
    });

    describe('Test credential retrieval and auther instantiation', () => {
        it('retrieve by entity id', async () => {
            const newAuther = await Auther.getInstance({
                userId: auther.userId,
                entityId: auther.entity?.id,
                definition: Definition,
            });
            expect(newAuther).toBeDefined();
            expect(newAuther.entity).toBeDefined();
            expect(newAuther.credential).toBeDefined();
            expect(await newAuther.testAuth()).toBeTruthy();
        });

        it('retrieve by credential id', async () => {
            const newAuther = await Auther.getInstance({
                userId: auther.userId,
                credentialId: auther.credential?.id,
                definition: Definition,
            });
            expect(newAuther).toBeDefined();
            expect(newAuther.credential).toBeDefined();
            expect(await newAuther.testAuth()).toBeTruthy();
        });
    });
});
