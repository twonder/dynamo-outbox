import * as AWS from 'aws-sdk';

import middy from "@middy/core";
// import validator from "@middy/validator";
import httpErrorHandler from "@middy/http-error-handler";
import jsonBodyParser from "@middy/http-json-body-parser";
import httpResponseSerializerMiddleware from '@middy/http-response-serializer';

import { ItemsAddedToCart } from './events/items-added-to-cart';
import { CartsRepository } from './repositories/cart-repository';
import { OutboxRepository } from './repositories/outbox-repository';

var docClient = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

const baseHandler = async (event: any) => {
  const cartsRepository = new CartsRepository(`${process.env.TABLE_NAME}`, docClient);
  const outboxRepository = new OutboxRepository(`${process.env.OUTBOX_TABLE_NAME}`, docClient);

  const { cartId, items } = event.body;

  var cart = await cartsRepository.getCart(cartId);
  var newCart = cartsRepository.addItemsToCart(cart, items);

  const itemAddedToCart: ItemsAddedToCart =  {
    cartId: cartId,
    userId: 'user-1',
    items: items,
    occurred: new Date()
  };

  try {
    await docClient.transactWrite({
        TransactItems: [
          { Put: newCart },
          { Put: outboxRepository.publish('ItemsAddedToCart', itemAddedToCart) },
        ]
      }).promise();
  } catch(e) {
    console.log(JSON.stringify(e));
  }

  var returnObject:any = {
    cartId,
    ...newCart,
  };

  delete returnObject["PK"];

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
  .use(httpErrorHandler());

export { handler };