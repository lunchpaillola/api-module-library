const {Entity: Parent} = require('@friggframework/core');
'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema({});
const name = 'ZoomEntity';
const Entity =
    Parent.discriminators?.[name] || Parent.discriminator(name, schema);
module.exports = {Entity};
