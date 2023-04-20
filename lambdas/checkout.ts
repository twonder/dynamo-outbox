import * as AWS from 'aws-sdk';

import { CartCheckedOut } from './events/cart-checked-out';
import { CartsRepository } from './repositories/cart-repository';
import { OutboxRepository } from './repositories/outbox-repository';
import { addMiddleWare } from './helpers';

var docClient = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

const baseHandler = async (event: any) => {
  const cartsRepository = new CartsRepository(`${process.env.TABLE_NAME}`, docClient);
  const outboxRepository = new OutboxRepository(`${process.env.OUTBOX_TABLE_NAME}`, docClient);

  const { pathParameters } = event;
  // replace this with logged in user id
  const userId = 'user-1';

  if (pathParameters?.cartId == undefined) {
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

  cart.checkout();

  const cartCheckedOut: CartCheckedOut =  {
    cartId: cartId,
    userId: userId,
    occurred: new Date()
  };

  await docClient.transactWrite({
    TransactItems: [
      { Put: cartsRepository.updateCart(cart) },
      { Put: outboxRepository.publish('CartCheckedOut', cartCheckedOut) },
    ]
  }).promise();

  return {
    statusCode: 200,
    body: cart
  }
};

const handler = addMiddleWare(baseHandler);

export { handler };