# Exposing ODA through WhatsApp

## Setup

* Open `ODA_WHATSAPP/config/Config.js` and edit the below properties:

```javascript
// ODA Details
module.exports.ODA_WEBHOOK_URL = process.env.BOT_WEBHOOK_URL || 'ODA_WEBHOOK_URL';
module.exports.ODA_WEBHOOK_SECRET = process.env.BOT_WEBHOOK_SECRET || 'ODA_WEBHOOK_SECRET';

// Smooch Details
exports.SMOOCH_APP_ID = process.env.SMOOCH_APP_ID || 'SMOOCH_APP_ID';
exports.SMOOCH_KEY_ID = process.env.SMOOCH_KEY_ID || 'SMOOCH_KEY_ID';
exports.SMOOCH_SECRET = process.env.SMOOCH_SECRET || 'SMOOCH_SECRET';
exports.SMOOCH_WEBHOOK_SECRET = process.env.SMOOCH_WEBHOOK_SECRET || 'SMOOCH_WEBHOOK_SECRET';
```

* run `npm install` to install required libraries.
* start server by running `npm start`.
* if you are running locally, you need to expose your webhook port using ngrok. Default port is 8004. for example `ngrok http 8004`.
* update ODA channel and Smooch webhook to use the generated ngrok URL.

### Webhook URLS
* The URL to register Webhook with ODA `https://SERVER:PORT/bot/message`
* The URL to register Webhook with Smooch `https://SERVER:PORT/user/message`

### More Details.
* [How to setup WhatsApp Channel through Smooch](https://confluence.oraclecorp.com/confluence/display/IBS/WhatsApp+Channel)
* [How to build your Skill for WhatsApp](https://confluence.oraclecorp.com/confluence/display/IBS/Compatibility)
