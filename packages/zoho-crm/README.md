// WIP

require('dotenv').config();
const {Authenticator} = require('@friggframework/test');
const {Api} = require('./api.js');

api_client = new Api({
    client_id: process.env.ZOHO_CRM_CLIENT_ID,
    client_secret: process.env.ZOHO_CRM_CLIENT_SECRET,
    scope: process.env.ZOHO_CRM_SCOPE,
    redirect_uri: `${process.env.REDIRECT_URI}/zoho-crm`,
});

const url = await api_client.getAuthUri();
const response = await Authenticator.oauth2(url);
const baseArr = response.base.split('/');
response.entityType = baseArr[baseArr.length - 1];
delete response.base;

await api_client.getTokenFromCode(response.data.code);
