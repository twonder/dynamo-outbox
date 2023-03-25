import { IResource, LambdaIntegration, MockIntegration, PassthroughBehavior, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { App, Stack, RemovalPolicy } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { join } from 'path'
import { DynamoOutbox } from './constructs/outbox-construct';
import { LogTarget } from './constructs/log-target-construct';

export class ShoppingCartDynamoDBOutboxStack extends Stack {
    constructor(app: App, id: string) {
      super(app, id);

      var applicationName = 'shopping-cart';

      // Setup the table that will store the order data
      const table = new Table(this, 'CartTable', {
        partitionKey: {
          name: 'PK',
          type: AttributeType.STRING
        },
        tableName: applicationName,
        removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
      });

      // Setup Lambdas
      const createCartLambda = new NodejsFunction(this, 'CreateCartLambda', nodeJsFunctionObject('create-cart.ts', table.tableName));
      const addItemsLambda = new NodejsFunction(this, 'AddItemsLambda', nodeJsFunctionObject('add-items.ts', table.tableName));
      const checkoutLambda = new NodejsFunction(this, 'CheckoutLambda', nodeJsFunctionObject('checkout.ts', table.tableName));

      table.grantReadWriteData(createCartLambda);
      table.grantReadWriteData(addItemsLambda);
      table.grantReadWriteData(checkoutLambda);

      // Setup outbox
      var outbox = new DynamoOutbox(this, 'ShoppingCartOutbox', {
        applicationName: table.tableName,
        publishingLambdas: [
          createCartLambda,
          addItemsLambda,
          checkoutLambda
        ]
      });

      // Create a log group to put all the events
      new LogTarget(this, 'LogTarget', {
        name: table.tableName,
        account: this.account,
        bus: outbox.bus
      });

      // Create an API Gateway resource for each of the operations
      const api = new RestApi(this, 'ShoppingCartApi', {
        restApiName: 'Shopping Cart Service'
      });

      const cartResource = api.root.addResource('cart');
      cartResource.addMethod('POST', new LambdaIntegration(createCartLambda), {
        apiKeyRequired: true
      });

      const cartItem = cartResource.addResource('{cartId}');
      cartItem.addResource('add-items').addMethod('PUT', new LambdaIntegration(addItemsLambda));
      cartItem.addResource('checkout').addMethod('PUT', new LambdaIntegration(checkoutLambda));

      addCorsOptions(cartResource);
    }
  }

  export function addCorsOptions(apiResource: IResource) {
    apiResource.addMethod('OPTIONS', new MockIntegration({
      integrationResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
          'method.response.header.Access-Control-Allow-Origin': "'*'",
          'method.response.header.Access-Control-Allow-Credentials': "'false'",
          'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
        },
      }],
      passthroughBehavior: PassthroughBehavior.NEVER,
      requestTemplates: {
        "application/json": "{\"statusCode\": 200}"
      },
    }), {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true,
          'method.response.header.Access-Control-Allow-Credentials': true,
          'method.response.header.Access-Control-Allow-Origin': true,
        },
      }]
    })
  }

  function nodeJsFunctionObject(fileName: string, tableName: string) {
    return {
      entry: join(__dirname, 'lambdas', fileName),
      bundling: {
        externalModules: [
          'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
        ],
      },
      depsLockFilePath: join(__dirname, 'lambdas', 'package-lock.json'),
      environment: {
        TABLE_NAME: tableName,
      },
      runtime: Runtime.NODEJS_16_X,
    }
  };
