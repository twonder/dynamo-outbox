import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

export class OutboxRepository {
    docClient: AWS.DynamoDB.DocumentClient;
    tableName: string;

    constructor(tableName: string, docClient: AWS.DynamoDB.DocumentClient) {
        this.tableName = tableName;
        this.docClient = docClient;
    }

    publish(eventType: string, event: any) : AWS.DynamoDB.DocumentClient.Put {
        var tomorrow = new Date();
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

        return {
            TableName : this.tableName,
            Item: {
              messageId: uuidv4(),
              detailType: eventType,
              detail: JSON.stringify(event),
              ttl: tomorrow.getTime()
            }
        };
    }
}