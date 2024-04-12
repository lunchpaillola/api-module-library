const {Authenticator} = require('@friggframework/test');
const {Api} = require('../api');
const config = require('../defaultConfig.json');

describe(`${config.label} API tests`, () => {

    const apiParams = {
        client_id: process.env.ASANA_CLIENT_ID,
        client_secret: process.env.ASANA_CLIENT_SECRET,
        redirect_uri: `${process.env.REDIRECT_URI}/asana`,
        scope: process.env.ASANA_SCOPE
    };
    const api = new Api(apiParams);

    describe('List tasks', () => {
        it('Should throw if invalid params are provided', async () => {
						api._get = jest.fn(() => Promise.resolve({data: []}))
            expect(api.listTasks()).rejects.toThrow();
						expect(api.listTasks({})).rejects.toThrow();
						expect(api.listTasks({workspaceId: '123'})).rejects.toThrow();
						expect(api.listTasks({workspaceId: '123', assigneeId: undefined})).rejects.toThrow();
						expect(api.listTasks({workspaceId: '123', assigneeId: '123'})).resolves.toEqual({data: []});

        });
    });
});