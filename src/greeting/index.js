exports.handler = async (event) => {
    // TODO implement
    const response = {
        "dialogAction": {
            "type": "Close",
            "fulfillmentState": "Fulfilled",
            "message": {
                "contentType": "PlainText",
                "content": "Message to convey to the user. For example, Thanks, your pizza has been ordered."
            }
        }
    };
    // const response = {
    //     statusCode: 200,
    //     body: JSON.stringify('Hello from Lambda!'),
    // };
    return response;
};
