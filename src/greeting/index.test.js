'use strict';

const lambdaFunction = require('./index.js');

function createEvent(slots = {}, slotDetails = {}) {
  return {
    messageVersion: '1.0',
    invocationSource: 'DialogCodeHook',
    userId: 'fakeUserId',
    sessionAttributes: {},
    bot: {
      name: 'Nibby',
      alias: null,
      version: '$LATEST'
    },
    outputDialogMode: 'Text',
    currentIntent: {
      name: 'Greeting',
      slots,
      slotDetails,
      confirmationStatus: 'None'
    },
    inputTranscript: ''
  };
}

describe('greeting handleDialog', () => {
  let event;

  beforeEach(() => {
    event = createEvent();
    event.invocationSource = 'DialogCodeHook';
  });

  describe('called from another intent', () => {
    beforeEach(() => {
      event.sessionAttributes.queuedIntent = JSON.stringify({
        queuedIntent: {
          name: 'CBSaskintentfirstUpdateEmailAddress',
          message:
            'Great thanks, just to confirm, you wish to update your' +
            ' ' +
            'email address, is that right?',
          slots: {}
        }
      });
    });

    it('elicitSlot when name not specified', done => {
      event.currentIntent.slots = {
        name: null,
        visaStatus: null
      };

      event.currentIntent.slotDetails = {
        visaStatus: {
          originalValue: null
        }
      };

      lambdaFunction.handler(event, {}, (_error, result) => {
        expect(result.dialogAction.type).toEqual('ElicitSlot');
        expect(result.dialogAction.slots.name).toBeNull();
        expect(result.dialogAction.slots.visaStatus).toBeNull();
        done();
      });
    });

    it('elicitSlot when visaStatus invalid', done => {
      event.currentIntent.slots = {
        name: 'John',
        visaStatus: 'student'
      };

      lambdaFunction.handler(event, {}, (_error, result) => {
        expect(result.dialogAction.type).toEqual('ElicitSlot');
        expect(result.dialogAction.slots.name).toEqual('John');
        expect(result.dialogAction.slots.visaStatus).toBeNull();
        done();
      });
    });

    it('delegates back to bot when all slots set', done => {
      event.currentIntent.slots = {
        name: 'John',
        visaStatus: 'australian resident'
      };

      lambdaFunction.handler(event, {}, (_error, result) => {
        expect(result.dialogAction.type).toEqual('Delegate');
        expect(result.dialogAction.slots.name).toEqual('John');
        done();
      });
    });

    it('delegates to lex when visaStatus is overseas student/worker', done => {
      event.currentIntent.slotDetails = {
        visaStatus: {
          originalValue: 'Overseas worker'
        }
      };

      event.sessionAttributes = {
        visaStatus: 'overseas worker'
      };

      lambdaFunction.handler(event, {}, (_error, result) => {
        expect(result.dialogAction.type).toEqual('ElicitSlot');
        done();
      });
    });

    it('delegates back to Lex when visaStatus slotDetails is null', done => {
      event.currentIntent.slots = {
        name: null,
        visaStatus: null
      };

      event.currentIntent.slotDetails = {
        visaStatus: null,
        name: null
      };

      lambdaFunction.handler(event, {}, (_error, result) => {
        expect(result.dialogAction.type).toEqual('ElicitSlot');
        expect(result.dialogAction.slots.visaStatus).toBeNull();
        done();
      });
    });
  });

  it('elicits name slot when visaStatus is Australian resident but name is missing', done => {
    event.currentIntent.slotDetails = {
      visaStatus: {
        originalValue: 'Australian Resident'
      }
    };

    event.sessionAttributes = {
      visaStatus: 'Australian Resident'
    };

    lambdaFunction.handler(event, {}, (_error, result) => {
      expect(result.dialogAction.type).toEqual('ElicitSlot');
      done();
    });
  });

  it('elicits intent when user say hi/hello', done => {
    event.inputTranscript = 'Hello';

    lambdaFunction.handler(event, {}, (_error, result) => {
      expect(result.dialogAction.type).toEqual('ElicitIntent');
      expect(result.dialogAction.message.contentType).toEqual('PlainText');
      expect(result.dialogAction.message.content).toEqual(
        "Hi, I'm nibby. I'm here to help, but I'm still" +
          ' ' +
          'learning. I can help direct you to the right place if you type' +
          ' ' +
          'words like: "claims" or "payments" or "quote" or "tax".' +
          ' ' +
          'How can I help you?'
      );
      done();
    });
  });
});

describe('greeting handlFulfillment', () => {
  let event;

  beforeEach(() => {
    event = createEvent();
    event.invocationSource = 'FulfillmentCodeHook';
  });

  it('should confirm if no slots left', done => {
    event.sessionAttributes = {
      visaStatus: 'overseas student',
      queuedIntent: JSON.stringify({
        name: 'queued intent'        
      })
    };

    lambdaFunction.handler(event, {}, (_error, result) => {
      expect(result.dialogAction.type).toEqual('ConfirmIntent');
      expect(result.dialogAction.intentName).toEqual('queued intent');
          
      done();
    });
  });

  it('should elicit intent slots if an intent queued', done => {
    let queuedIntent = JSON.stringify({
      name: 'queued intent',
      slotToElicit: 'slot to elicit'
    });
    event.sessionAttributes = {
      visaStatus: 'overseas worker',
      queuedIntent: queuedIntent

    };

    lambdaFunction.handler(event, {}, (_error, result) => {
      expect(result.dialogAction.type).toEqual('ElicitSlot');
      expect(result.dialogAction.intentName).toEqual('queued intent');
      expect(result.dialogAction.slotToElicit).toEqual('slot to elicit');
      
      done();
    });
  });

  it('should confirm intent if an intent queued with no slots', done => {
    let queuedIntent = JSON.stringify({
      name: 'queued intent',
      message: 'normal message'
    });
    event.sessionAttributes = {
      visaStatus: 'overseas worker',
      queuedIntent: queuedIntent

    };

    lambdaFunction.handler(event, {}, (_error, result) => {
      expect(result.dialogAction.type).toEqual('ConfirmIntent');
      expect(result.dialogAction.intentName).toEqual('queued intent');
      expect(result.dialogAction.message.content).toEqual('normal message');

      expect(result.dialogAction.slotToElicit).toBeUndefined();
      
      done();
    });
  });


  it('should confirm intent with resident message if specific message specified', done => {
    let queuedIntent = JSON.stringify({
      name: 'queued intent',
      message: {
        resident: 'resident message',
        student: 'student message',
        worker: 'worker message'
      }
    });
    event.sessionAttributes = {
      visaStatus: 'australian resident',
      queuedIntent: queuedIntent
    };

    lambdaFunction.handler(event, {}, (_error, result) => {
      expect(result.dialogAction.type).toEqual('ConfirmIntent');
      expect(result.dialogAction.intentName).toEqual('queued intent');
      expect(result.dialogAction.message.content).toEqual('resident message');

      expect(result.dialogAction.slotToElicit).toBeUndefined();
      
      done();
    });
  });

  it("should display help msg when request for australian resident and nothing queued", done => {
    event.sessionAttributes = {
      name: 'John',
      visaStatus: 'australian resident'
    };

    lambdaFunction.handler(event, {}, (_error, result) => {
      expect(result.dialogAction.type).toEqual('ElicitIntent');
      expect(result.dialogAction.message.content).toEqual(
        'Great thanks! I can help direct you to the right place if you type' +
          ' ' +
          'words like: "claims" or "payments" or "tax". If you want' +
          ' ' +
          'to chat to a real person just let me know. How can I help you?'
      );
      done();
    });
  });

  it("should add Name to notes", done => {
    event.sessionAttributes = {
      name: 'John',
      visaStatus: 'australian resident'
    };

    lambdaFunction.handler(event, {}, (_error, result) => {
      let notes = JSON.parse(result.sessionAttributes.notes);
      expect(notes.Name).toEqual('John');

      done();
    });
  });

  it("should add 'Resident = Yes' to notes when australian resident", done => {
    event.sessionAttributes = {
      name: 'John',
      visaStatus: 'australian resident'
    };

    lambdaFunction.handler(event, {}, (_error, result) => {
      let notes = JSON.parse(result.sessionAttributes.notes);
      expect(notes.Resident).toEqual('Yes');
      done();
    });
  });

  it("should add 'Resident = No' to notes when overseas worker", done => {
    event.sessionAttributes = {
      name: 'John',
      visaStatus: 'overseas worker'
    };

    lambdaFunction.handler(event, {}, (_error, result) => {
      let notes = JSON.parse(result.sessionAttributes.notes);
      expect(notes.Resident).toEqual('No');
      done();
    });
  });

  it("should add 'Resident = No' to notes when overseas student", done => {
    event.sessionAttributes = {
      name: 'John',
      visaStatus: 'overseas student'
    };

    lambdaFunction.handler(event, {}, (_error, result) => {
      let notes = JSON.parse(result.sessionAttributes.notes);
      expect(notes.Resident).toEqual('No');
      done();
    });
  });
});
