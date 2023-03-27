import { App } from 'aws-cdk-lib';
import { ShoppingCartDynamoDBOutboxStack } from './dynamo-outbox-stack';

const app = new App();
new ShoppingCartDynamoDBOutboxStack(app, 'ShoppingCartDynamoDBOutbox');
app.synth();
