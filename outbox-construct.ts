import { RemovalPolicy} from '@aws-cdk/core';
import { AttributeType, StreamViewType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Function, Runtime, StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { DynamoEventSource, DynamoEventSourceProps, SqsDlq } from 'aws-cdk-lib/aws-lambda-event-sources';
import { join } from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Queue } from 'aws-cdk-lib/aws-sqs';

export class DynamoOutbox extends Construct {
    readonly outboxTable: Table;

    constructor(scope: Construct, id: string, props: DynamoOutboxProps) {
        super(scope, id);

        const bus = new EventBus(this, 'Bus', {
            eventBusName: `${props?.applicationName}-stream`
        });

        this.outboxTable = new Table(this, 'OutboxTable', {
            partitionKey: {
              name: 'messageId',
              type: AttributeType.STRING
            },
            tableName: `${props?.applicationName}-outbox`,
            removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
            stream: StreamViewType.NEW_IMAGE,
        });

        props?.publishingLambdas.forEach(lambda => {
            // grand the publishing
            this.outboxTable.grantReadWriteData(lambda);
            // add the environment variable
            lambda.addEnvironment('OUTBOX_TABLE_NAME', this.outboxTable.tableName);
        });

        const dlq = new Queue(this, 'DeadLetterQueue');

        const forwarderLambda = new NodejsFunction(this, 'ForwardingLambda', {
            entry: join(__dirname, 'lambdas', 'outbox-handler.ts'),
            bundling: {
                externalModules: [
                    'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
                ],
            },
            environment: {
                EVENT_BUS_NAME: bus.eventBusName,
                SOURCE_PUBLISHER: props.applicationName,
            },
            depsLockFilePath: join(__dirname, 'package-lock.json'),
            runtime: Runtime.NODEJS_16_X,
        });

        forwarderLambda.addEventSource(new DynamoEventSource(this.outboxTable, {
            startingPosition: StartingPosition.LATEST,
            batchSize: 10, // required to be 10
            onFailure: new SqsDlq(dlq),
            retryAttempts: 3
        } as DynamoEventSourceProps));

        bus.grantPutEventsTo(forwarderLambda);
    }
}

export interface DynamoOutboxProps{
    applicationName: string;
    publishingLambdas: Function[]
}