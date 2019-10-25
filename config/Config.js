// ODA Details
module.exports.ODA_WEBHOOK_URL = process.env.BOT_WEBHOOK_URL || 'ODA_WEBHOOK_URL';
module.exports.ODA_WEBHOOK_SECRET = process.env.BOT_WEBHOOK_SECRET || 'ODA_WEBHOOK_SECRET';

// Smooch Details
exports.SMOOCH_APP_ID = process.env.SMOOCH_APP_ID || 'SMOOCH_APP_ID';
exports.SMOOCH_KEY_ID = process.env.SMOOCH_KEY_ID || 'SMOOCH_KEY_ID';
exports.SMOOCH_SECRET = process.env.SMOOCH_SECRET || 'SMOOCH_SECRET';
exports.SMOOCH_WEBHOOK_SECRET = process.env.SMOOCH_WEBHOOK_SECRET || 'SMOOCH_WEBHOOK_SECRET';

// General Details
exports.PROXY = process.env.PROXY || process.env.http_proxy;
exports.PORT = process.env.PORT || 8004;

// WhatsApp Sender event IDs
exports.EVENT_QUEUE_MESSAGE_TO_SMOOCH = "100";
exports.EVENT_QUEUE_MESSAGE_TO_BOT = "200";
exports.EVENT_SMOOCH_MESSAGE_DELIVERED = "1000";
exports.EVENT_PROCESS_NEXT_SMOOCH_MESSAGE = "2000";