import * as AWS from 'aws-sdk';
import middy from '@middy/core';
import eventNormalizerMiddleware from '@middy/event-normalizer';
import { DynamoDBStreamEvent } from "aws-lambda";
import { PutEventsRequestEntryList } from 'aws-sdk/clients/eventbridge';

var eventBridgeClient = new AWS.EventBridge({apiVersion: '2015-10-07'});

const baseHandler = async (event: DynamoDBStreamEvent) => {
  var eventBridgeEntries = event.Records.map(outboxMessage => {
    return {
      Detail: outboxMessage.dynamodb!.NewImage!.detail,
      DetailType: outboxMessage.dynamodb!.NewImage!.detailType,
      EventBusName: process.env.EVENT_BUS_NAME,
      Source: process.env.SOURCE_PUBLISHER,
    };
  }) as PutEventsRequestEntryList;

  // Assuming a batch size of 10
  await eventBridgeClient.putEvents({ Entries: eventBridgeEntries }).promise();
};

export default { handler: middy(baseHandler).use(eventNormalizerMiddleware()) };