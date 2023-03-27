import * as AWS from 'aws-sdk';

import { ItemsAddedToCart } from './events/items-added-to-cart';
import { CartsRepository } from './repositories/cart-repository';
import { OutboxRepository } from './repositories/outbox-repository';
import { addMiddleWare } from './helpers';

var docClient = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

const baseHandler = async (event: any) => {
  const cartsRepository = new CartsRepository(`${process.env.TABLE_NAME}`, docClient);
  const outboxRepository = new OutboxRepository(`${process.env.OUTBOX_TABLE_NAME}`, docClient);

  const { body, pathParameters } = event;

  if (body == null || pathParameters?.cartId == undefined || body.items == null) {
    return {
      statusCode: 400
    }
  }

  const cartId = pathParameters?.cartId;
  var cart = await cartsRepository.getCart(cartId);

  if (cart == null) {
    return {
      statusCode: 404
    }
  }

  cart.addItems(body.items);

  const itemAddedToCart: ItemsAddedToCart =  {
    cartId: cartId,
    accountId: cart.accountId,
    userId: 'user-1',
    items: body.items,
    occurred: new Date()
  };

  await docClient.transactWrite({
    TransactItems: [
      { Put: cartsRepository.updateCart(cart) },
      { Put: outboxRepository.publish('ItemsAddedToCart', itemAddedToCart) },
    ]
  }).promise();

  return {
    statusCode: 200,
    body: cart
  }
};

const handler = addMiddleWare(baseHandler);

export { handler };