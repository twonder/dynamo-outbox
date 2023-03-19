import { IResource, LambdaIntegration, MockIntegration, PassthroughBehavior, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { App, Stack, RemovalPolicy } from 'aws-cdk-lib';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { join } from 'path'
import { DynamoOutbox, DynamoOutboxProps } from './outbox-construct';

export class ShoppingCartDynamoDBOutboxStack extends Stack {
    constructor(app: App, id: string) {
      super(app, id);

      // Setup the table that will store the order data
      const table = new Table(this, 'CartTable', {
        partitionKey: {
          name: 'PK',
          type: AttributeType.STRING
        },
        tableName: 'shopping-carts',
        removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
      });

      // Setup the api lambda function
      const nodeJsFunctionProps: NodejsFunctionProps = {
        bundling: {
          externalModules: [
            'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
          ],
        },
        depsLockFilePath: join(__dirname, 'lambdas', 'package-lock.json'),
        environment: {
          TABLE_NAME: table.tableName,
        },
        runtime: Runtime.NODEJS_16_X,
      };

      const createCartLambda = new NodejsFunction(this, 'CreateCartLambda', {
        entry: join(__dirname, 'lambdas', 'create-cart.ts'),
        ...nodeJsFunctionProps,
      });

      const addItemsLambda = new NodejsFunction(this, 'AddItemsLambda', {
        entry: join(__dirname, 'lambdas', 'add-items.ts'),
        ...nodeJsFunctionProps,
      });

      table.grantReadWriteData(createCartLambda);

      // Setup outbox
      const outboxProps: DynamoOutboxProps =  {
        applicationName: 'shopping-cart-outbox',
        publishingLambdas: [ createCartLambda ]
      };

      new DynamoOutbox(this, 'ShoppingCartOutbox', outboxProps);

      // Create an API Gateway resource for each of the CRUD operations
      const api = new RestApi(this, 'ShoppingCartApi', {
        restApiName: 'Shopping Cart Service'
      });

      const cartResource = api.root.addResource('cart');
      cartResource.addMethod('POST', new LambdaIntegration(createCartLambda));

      const cartItem = cartResource.addResource('{cartId}');
      cartItem.addResource('add-items').addMethod('PUT', new LambdaIntegration(addItemsLambda));

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