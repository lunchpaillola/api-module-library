/* eslint-disable camelcase */
require('dotenv').config();
const { Api } = require('./api');
const { get } = require('@friggframework/core');
const config = require('./defaultConfig.json');

const Definition = {
    API: Api,
    getName: function () {
        return config.name;
    },
    moduleName: config.name,
    modelName: 'Miro',
    requiredAuthMethods: {
        getToken: async function (api, params) {
            const code = get(params.data, 'code');
            return api.getTokenFromCode(code);
        },
        getEntityDetails: async function (
            api,
            callbackParams,
            tokenResponse,
            userId
        ) {
            const userDetails = await api.getAccessTokenContext();
            return {
                identifiers: { externalId: userDetails.user.id, user: userId },
                details: {
                    userName: userDetails.user.name,
                    organizationName: userDetails.organization.name,
                    organizationId: userDetails.organization.id,
                },
            };
        },
        apiPropertiesToPersist: {
            credential: ['access_token', 'refresh_token'],
            entity: [],
        },
        getCredentialDetails: async function (api, userId) {
            const userDetails = await api.getAccessTokenContext();
            return {
                identifiers: { externalId: userDetails.user.id, user: userId },
                details: {},
            };
        },
        testAuthRequest: async function (api) {
            return api.getAccessTokenContext();
        },
    },
    env: {
        client_id: process.env.MIRO_CLIENT_ID,
        client_secret: process.env.MIRO_CLIENT_SECRET,
        scope: process.env.MIRO_SCOPE,
        redirect_uri: `${process.env.REDIRECT_URI}/miro`,
    },
};

module.exports = { Definition };
