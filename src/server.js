const express = require('express');
const OracleBot = require('@oracle/bots-node-sdk');
const Config = require('../config/Config');
const Errors = require('../config/Errors');
const WhatsApp = require('./lib/WhatsApp');
const log4js = require('log4js');
let logger = log4js.getLogger('Server');
logger.level = 'debug';

const app = express();
OracleBot.init(app, {
    logger: logger,
});

// Init Smooch Connector
const whatsApp = new WhatsApp();

// implement webhook
const {
    WebhookClient,
    WebhookEvent
} = OracleBot.Middleware;

const channel = {
    url: Config.ODA_WEBHOOK_URL,
    secret: Config.ODA_WEBHOOK_SECRET
};
const webhook = new WebhookClient({
    channel: channel
});
webhook.on(WebhookEvent.ERROR, console.error); // receive errors

// receive bot messages
app.post('/bot/message', webhook.receiver()); // receive bot messages
webhook.on(WebhookEvent.MESSAGE_RECEIVED, message => {
    logger.info('Received a message from ODA, processing message before sending to WhatsApp.');
    whatsApp.send(message);
    logger.info('Message Sent successfully to WhatsApp.');

});

// send messages to bot
app.post('/user/message', async (req, res) => {
    // Make sure Request is coming from Smooch by inspecting x-api-key header value
    if (req.header('x-api-key') && req.header('x-api-key') == Config.SMOOCH_WEBHOOK_SECRET) {
        try {
            logger.info('Received a message from WhatsApp, processing message before sending to ODA.');
            res.status(200).send();
            let messages = whatsApp.recieve(req.body);
            messages.forEach(async message => {
                await webhook.send(message);
                logger.info('Message Sent successfully to ODA.');
            });

        } catch (error) {
            logger.error(error);
            res.status(400).end();
        }
    } else { // missing x-api-key header value or it is invalid.
        let errorMessage = Errors.FORBIDDEN.message;
        logger.error(errorMessage);
        res.status(Errors.FORBIDDEN.code).send(Errors.FORBIDDEN);
    }
});

app.listen(Config.PORT, function () {
    logger.info('Server listening on port %s', Config.PORT);
});