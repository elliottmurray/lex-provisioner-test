'use strict';

const { delegate, 
  buildMessage, 
  close, 
  elicitIntent, 
  elicitSlot, 
  confirm
} = require('../common/flow');

const {isAustralianResident, 
  isOverseasStudent, 
  isOverseasWorker
} = require('../common/residency');

const {addToNotes} = require('../common/notes');
const VisaStatus = ['Overseas Worker', 'Overseas Student', 'Australian Resident'];
const {codeHookController} = require('../common/controller');
const FunctionName = 'greetingsCodeHook';

const { addSlotsToSession } = require('../common/session');

function isValidVisaStatus(event) {
  if (!event.currentIntent.slots.visaStatus) {
    let visaStatusSlotDetails = event.currentIntent.slotDetails.visaStatus || {};
    let originalSlotValue = visaStatusSlotDetails.originalValue || '';
    if (originalSlotValue.match(/O\/S/i)) {
      event.currentIntent.slots.visaStatus = 'Overseas Worker';
      event.sessionAttributes.visaStatus = 'Overseas Worker';
    } else if (originalSlotValue.match(/int.*? student/i)) {
      event.currentIntent.slots.visaStatus = 'Overseas Student';
      event.sessionAttributes.visaStatus = 'Overseas Student';
    }
  }

  return event.currentIntent.slots.visaStatus
    && VisaStatus.some(v => v.toLowerCase() === event.currentIntent.slots.visaStatus.toLowerCase());
}

/*
 * https://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object
 */
function isEmpty(obj) {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
}

/*
 * Greeting intent can be invoked by user input, e.g: when user enter hi or
 * hello. It can also be invoked by another intent to ask for username and visa
 * status. If it is invoked by user input, the sessionAttributes will be an
 * empty object.
 */
function invokedByUserInput(event) {
  return isEmpty(event.sessionAttributes);
}

function handleDialog(event, callback) {
  if (invokedByUserInput(event)) {
    callback(
      null,
      elicitIntent(
        event.sessionAttributes,
        buildMessage(
          "Hi, I'm nibby. I'm here to help, but I'm still" +
            ' ' +
            'learning. I can help direct you to the right place if you type' +
            ' ' +
            'words like: "claims" or "payments" or "quote" or "tax".' +
            ' ' +
            'How can I help you?'
        )
      )
    );

    return;
  }

  addSlotsToSession(event, ['visaStatus', 'name']);

  if (!isValidVisaStatus(event)) {
    event.currentIntent.slots.visaStatus = null;
    callback(
      null,
      elicitSlot(
        event.sessionAttributes,
        event.currentIntent.name,
        event.currentIntent.slots,
        'visaStatus',
        null
      )
    );

    return;
  }

  if (!event.sessionAttributes.name) {
    callback(
      null,
      elicitSlot(
        event.sessionAttributes,
        event.currentIntent.name,
        event.currentIntent.slots,
        'name',
        null
      )
    );

    return;
  }

  callback(null, delegate(event.sessionAttributes, event.currentIntent.slots));
}

function extractMessage(event, message) {
  if ((message === undefined) || (typeof message === 'string')) {
    return message;
  }
  else {
    if (isOverseasWorker(event)) {
      return message.worker;
    } else if (isOverseasStudent(event)) {
      return message.student;
    } else {
      return message.resident;
    }
  }  
}

function handleFulfillment(event, callback) {
  addToNotes(event, 'Name', event.sessionAttributes.name);
  addToNotes(event, 'Resident', isAustralianResident(event) ? 'Yes' : 'No');

  if (event.sessionAttributes.queuedIntent) {
    let queuedIntent = JSON.parse(event.sessionAttributes.queuedIntent);
    delete event.sessionAttributes.queuedIntent;
    if (queuedIntent.slotToElicit) {
      callback(null, elicitSlot(event.sessionAttributes, queuedIntent.name, queuedIntent.slots || {}, queuedIntent.slotToElicit, null, null));
    } else {
      const message = extractMessage(event, queuedIntent.message);
      callback(null, confirm(event.sessionAttributes, queuedIntent.name, queuedIntent.slots || {}, message));
    }
  } else if (event.sessionAttributes.queuedResponse) {
    let responseMessage = event.sessionAttributes.queuedResponse;
    delete event.sessionAttributes.queuedResponse;
    callback(null, close(event.sessionAttributes, 'Fulfilled', buildMessage(responseMessage)));
  } else {
    callback(null, elicitIntent(event.sessionAttributes, buildMessage('Great thanks! I can help direct you to the right place if you type words like: "claims" or "payments" or "tax". If you want to chat to a real person just let me know. How can I help you?')));
  }
  
}

exports.handler = (event, context, callback) => {
  codeHookController(event, context, FunctionName, callback, handleDialog, handleFulfillment);
};
