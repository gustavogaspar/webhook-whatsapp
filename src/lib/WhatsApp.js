const WhatsAppSender = require('./WhatsAppSender');
const _ = require('underscore');
const {
    MessageModel
} = require('@oracle/bots-node-sdk/lib');
const log4js = require('log4js');
let logger = log4js.getLogger('WhatsAppUIBuilder');
logger.level = 'debug';

// Smooch Restrictions
const  MAX_TEXT_LENGTH = 128;
const MAX_CARDS = 10;
const MAX_CARD_ACTIONS = 3

/**
 * Utility Class to send and recieve messages from WhatsApp through Smooch.
 */
class WhatsApp {
    constructor() {
        this.whatsAppSender = new WhatsAppSender();
    }

    /**
     * Recieves a message from smooch and convert to ODA payload
     * @returns {object []} array of messages in ODA format.
     * @param {object} payload - Smooch Message Object
     */
    recieve(payload) {
        let self = this;
        let {
            trigger,
            appUser
        } = payload;
        let userId = appUser._id;
        let responses = [];

        switch (trigger) {
            // Recieved Text message from smooch
            case 'message:appUser':
                {
                    responses = self._processWhatsAppMessages(payload.messages, userId);
                    break;
                };
                // Recieved a button postback from smooch
            case 'postback':
                {
                    responses = self._processWhatsAppButtons(trigger, payload, userId);
                    break;
                }
                // Smooch API v1.1
            case 'message:delivery:user':
                {

                }
                // Smooch API v1.1
            case 'message:delivery:channel':
                {
                    let messages = [payload.message];
                    self._processWhatsAppDeliveryMessages(messages);
                    break
                }
                // smooch API v1.0
            case 'delivery:success':
                {
                    self._processWhatsAppDeliveryMessages(payload.messages);
                    break;
                }
        }

        return responses;
    }

    /**
     * Send ODA message to smooch. Converts message from ODA format to Smooch message format.
     * @param {object} payload - ODA Message Payload
     */
    send(payload) {
        let self = this;
        let response = {};
        let {
            userId,
            messagePayload
        } = payload;
        let {
            type,
            actions,
            globalActions,
            footerText
        } = messagePayload;

        switch (type) {
            case 'text':
                {
                    response = self._processODATextMessage(messagePayload.text);
                    break;
                };
            case 'card':
                {
                    response = self._processODACards(messagePayload);
                    break;
                }
            case 'attachment':
                {
                    response = self._processODAAttachment(messagePayload.attachment);
                    break;
                }
            default:
                {
                    throw new Error('Unsupported format')
                };
        }

        let smoochPayloads = [];

        // Process ODA Actions and Global Actions;
        let smoochActions = self._processODAActions(actions, globalActions, footerText);

        if (smoochActions && smoochActions.length > 0) {
            if (type === 'text') {
                response.text = response.text.concat(smoochActions);
                if (footerText) {
                    response.text = response.text.concat("\n\n").concat(footerText);
                }
                smoochPayloads.push(response);
            } else {
                smoochPayloads.push(response);

                if (footerText) {
                    smoochActions = smoochActions.concat("\n\n").concat(footerText);
                }

                smoochPayloads.push(self._processODATextMessage(smoochActions));
            }

        } else {
            smoochPayloads.push(response);
        }

        self._sendToSmooch(userId, smoochPayloads);

    }
    /**
     * Send Message to smooch.
     * @param {string} userId - User ID
     * @param {object[]} messages - Array of Smooch message payload to be sent.
     */
    _sendToSmooch(userId, messages) {
        let self = this;
        messages.forEach(message => {
            message.role = 'appMaker';
            self.whatsAppSender.queueMessage(userId, message);
        });
    }

    /**
     * Process Smooch messages and convert to ODA message format.
     * @returns {object []} Array of ODA messages.
     * @param {object[]} messages - Smooch Messages array to be processed.
     * @param {string} userId - User ID.
     */
    _processWhatsAppMessages(messages, userId) {
        let self = this;
        let odaMessages = [];
        messages.forEach(message => {
            ;
            let messagePayload = {}
            switch (message.type) {
                case 'text':
                    {
                        messagePayload = self._processWhatsAppTextMessage(message.text);
                        break;
                    };
                case 'location':
                    {
                        messagePayload = self._processWhatsAppLocationMessage(message.coordinates);
                        break;
                    }
                case 'image':
                    {
                        messagePayload = self._processWhatsAppMediaMessage(message.mediaUrl, message.mediaType);
                        break;
                    }
            }
            odaMessages.push({
                userId: userId,
                messagePayload: messagePayload,
                metadata: {
                    webhookChannel: "whatsapp"
                }
            });
        });

        return odaMessages;
    }

    /**
     * Process Smooch delivery messages.
     * @returns null
     * @param {object[]} messages - Smooch Messages Array.
     */
    _processWhatsAppDeliveryMessages(messages) {
        let self = this;
        messages.forEach(message => {
            self.whatsAppSender.messageDelivered(message._id);
        });
    }

    /**
     * Process Smooch buttons and conver to ODA message format.
     * @returns {object []} Array of ODA messages.
     * @param {string} trigger 
     * @param {object []} payload - array of smooch buttons
     */
    _processWhatsAppButtons(trigger, payload, userId) {
        let self = this;
        switch (trigger) {
            case 'postback':
                {
                    return self._processWhatsAppPostbacks(payload.postbacks, userId)
                }
        }

    }

    /**
     * Convert Smooch postbacks into ODA Buttons.
     * @returns {object[]} Array of ODA messages.
     * @param {object []} postbacks - Smooch postbacks array
     * @param {String} userId - User ID.
     */
    _processWhatsAppPostbacks(postbacks, userId) {
        let odaResponses = [];
        postbacks.forEach(postback => {
            let {
                type
            } = postback.action;
            let {
                action,
                state,
                variables
            } = JSON.parse(postback.action.payload);
            let odaPostback = {
                action: action,
                state: state,
                variables: variables
            }
            odaResponses.push({
                userId: userId,
                messagePayload: {
                    type: type,
                    postback: odaPostback
                }
            });
        });
        return odaResponses;

    }
    /**
     * Convert Smooch text message to ODA text message
     * @returns {object} ODA Text message.
     * @param {string} message - Smooch text Message.
     */
    _processWhatsAppTextMessage(text) {
        let response = MessageModel.textConversationMessage(text);
        return response;
    }

    /**
     * Convert Smooch Coordinates message to ODA Coordinates Message
     * @returns ODA Coordinates Message
     * @param {object} coordinates - Smooch object holding user coordinates.
     */
    _processWhatsAppLocationMessage(coordinates) {
        let messagePayload = {
            type: 'location',
            location: {
                longitude: coordinates.long,
                latitude: coordinates.lat
            }
        };
        return messagePayload;

    }

    /**
     * Convert Smooch Media (images and attachments) messages to ODA attachements.
     * @returns {object} ODA attachment message.
     * @param {string} mediaUrl - media URL
     * @param {*} mediaType - media Type
     */
    _processWhatsAppMediaMessage(mediaUrl, mediaType) {
        let response = {
            type: 'attachment',
            attachment: {}
        };
        switch (mediaType) {
            case 'image/jpeg':
                {
                    response.attachment.type = 'image',
                    response.attachment.url = mediaUrl;
                    break;
                }
        }
        return response;
    }

    /**
     * Process and convert ODA text message to Smooch Text message. If buttons 'actions' and 'globalActions' are available, they are processed too.
     * @returns {object} Smooch foramt message.
     * @param {string} text - ODA messagePayload.text
     */
    _processODATextMessage(text) {
        let self = this;
        logger.info("Generating a Text Message");
        let response = {
            type: 'text',
            text: text
        };
        return response;
    }

    /**
     * Convert ODA Cards into Smooch Carousel message payload
     * @returns {object} Smooch carousel message payload.
     * @param {object} messagePayload - ODA Message Payload
     */
    _processODACards(messagePayload) {
        let self = this;
        logger.info("Generating a Carousel");
        let response = {
            type: 'list'
        };
        let smoochCards = [];
        messagePayload.cards.forEach(card => {

            smoochCards.push(self._createSmoochCard(card));
        });

        response.items = smoochCards;

        return response;


    }

    /**
     * Convert ODA Attachment Payload to Smooch Attachment message payload.
     * @returns {object} Smooch Attachment message Payload.
     * @param {object} attachment - ODA messagePayload.attachment
     */
    _processODAAttachment(attachment) {
        let self = this;
        logger.info("Generating attachments");
        let {
            type,
            url
        } = attachment;
        type = type == 'image' ? type : 'file';
        let response = {
            type: type,
            mediaUrl: url,
            text: ""
        };

        return response;
    }

    /**
     * Convert ODA Card Object into Smooch Card Object
     * @returns {object} Smooch Card Object
     * @param {object} odaCard - ODA Card object
     */
    _createSmoochCard(odaCard) {
        let self = this;
        let {
            title,
            description,
            imageUrl,
            actions,
            footerText
        } = odaCard;

        description = description ? description : "";
        // Create Smooch Card
        let smoochCard = {
            title: title,
            // Smooch limits a card description to 128 characters only.
            description: description.length > MAX_TEXT_LENGTH ? description.substr(0, MAX_TEXT_LENGTH - 1) : description,
            mediaUrl: imageUrl,
            size: "large",
            // Smooch requires a minimum of 1 action button per card; so I add a dummy action with no label
            actions: [{
                type: "postback",
                "text": "",
                payload: ""
            }]
        };

        // Limit the number of actions to conform with Smooch restrictions
        if (actions.length > MAX_CARD_ACTIONS) {
            actions = actions.slice(0, MAX_CARD_ACTIONS - 1);
        }

        // Create Smooch Actions for every card.
        let smoochActions = self._processODAActions(actions, footerText);
        if (smoochActions) {
            // Smooch has a limit of 128 characters for description. Actions are added as text to a card description.
            // if Actions, exists, then we should trucn the original desription to fit the actions.
            smoochActions = '\n\n'.concat(smoochActions.length > MAX_TEXT_LENGTH ? smoochActions.substr(0 , MAX_TEXT_LENGTH-2) : smoochActions);
            let actionsCharLength = smoochActions.length;
            let allowedCharsLength = MAX_TEXT_LENGTH - actionsCharLength;
            smoochCard.description = description.substr(0, allowedCharsLength - 1);
            smoochCard.description =  smoochCard.description.concat(smoochActions);
        }
        //smoochCard.actions = smoochActions;
        return smoochCard;
    }

    /**
     * Convert ODA Action to Smooch Action. 'Share' actions are not supported.
     * @returns {string} Smooch Action Label.
     * @param {object} odaAction - ODA Action.
     */
    _createSmoochAction(odaAction) {
        let {
            type,
            label,
            url,
            phoneNumber,
        } = odaAction;

        if (type == 'share') {
            return;
        }
        let smoochButton = {
            text: label
        }

        // Nothing to do for postback/Location buttons, all what is needed to set ODA action text to SmoochAction label which is done already at the beggining of method.
        switch (type) {
            case 'url':
                {
                    smoochButton.text = smoochButton.text.concat(": ").concat(url);
                    break;
                }
            case 'call':
                {
                    smoochButton.text = smoochButton.text.concat(": ").concat(phoneNumber);
                    break;
                }
                // Share buttons not supported
            case 'share':
                {
                    return null;
                }
        }
        return smoochButton.text;
    }

    /**
     * Convert ODA Actions into Smooch Actions.
     * @returns {object[]} Array of Smooch Actions.
     * @param {object[]} actions - ODA Actions Array.
     * @param {object[]} globalActions - ODA Global Actions Array.
     */
    _processODAActions(actions, globalActions) {
        let self = this;
        logger.info("Generating Buttons");

        // Combine Actions and Global Actions
        actions = actions ? actions : [];
        globalActions = globalActions ? globalActions : [];
        actions = actions.concat(globalActions);

        if (actions && actions.length) {
            let response = "";
            // Group Actions by type;
            actions = _.groupBy(actions, 'type');

            let postbackActions = _.pick(actions, ['postback']);
            let otherActions = _.omit(actions, ['postback']);

            // process postback buttons lastly
            response = generateActions(otherActions);
            response = response.concat(generateActions(postbackActions));

            function generateActions(actions) {
                let response = "";
                for (var key in actions) {
                    actions[key].forEach(action => {
                        let actionAstext = self._createSmoochAction(action)
                        if (actionAstext) {
                            response = response.concat("\n").concat(actionAstext);
                        }
                    });
                }
                return response;
            }

            return response;

        } else
            return;
    }
};
module.exports = WhatsApp;