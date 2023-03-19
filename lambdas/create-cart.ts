import * as AWS from 'aws-sdk';

import middy from "@middy/core";
// import validator from "@middy/validator";
import httpErrorHandler from "@middy/http-error-handler";
import jsonBodyParser from "@middy/http-json-body-parser";
import httpResponseSerializerMiddleware from '@middy/http-response-serializer';

import { CartCreated } from './events/cart-created';
import { CartsRepository } from './repositories/cart-repository';
import { OutboxRepository } from './repositories/outbox-repository';
import { v4 as uuidv4 } from 'uuid';

var docClient = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

const baseHandler = async (event: any) => {
  const cartsRepository = new CartsRepository(`${process.env.TABLE_NAME}`, docClient);
  const outboxRepository = new OutboxRepository(`${process.env.OUTBOX_TABLE_NAME}`, docClient);

  const { items } = event.body;

  const cartCreated: CartCreated =  {
    cartId: uuidv4(),
    accountId: 'account-1',
    userId: 'user-1',
    items: items,
    occurred: new Date()
  };

  var item = cartsRepository.createCart(cartCreated)

  try {
    await docClient.transactWrite({
        TransactItems: [
          { Put: item },
          { Put: outboxRepository.publish('CartCreated', cartCreated) },
        ]
      }).promise();
  } catch(e) {
    console.log(JSON.stringify(e));
  }

  var returnObject:any = {
    ...cartCreated,
    status: item.Item.status
  };

  delete returnObject["occurred"];

  return {
    statusCode: 200,
    body: returnObject
  }
};

const handler = middy(baseHandler)
  .use(jsonBodyParser())
  .use(
    httpResponseSerializerMiddleware({
      serializers: [
        {
          regex: /^application\/json$/,
          serializer: ({ body }) => JSON.stringify(body)
        }
      ],
      defaultContentType: 'application/json'
    })
  )
  // .use(
  //   validator({
  //     inputSchema: placeOrderCommand,
  //   })
  // )
  .use(httpErrorHandler());

export { handler };