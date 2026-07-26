const { Schema, model } = require('mongoose');
module.exports = model('PublishLog', new Schema({ creatorId: String, content: String, publishedAt: { type: Date, default: Date.now }, delivered: Number }));
