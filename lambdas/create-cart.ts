import * as AWS from 'aws-sdk';

import { CartCreated } from './events/cart-created';
import { CartsRepository } from './repositories/cart-repository';
import { OutboxRepository } from './repositories/outbox-repository';
import { v4 as uuidV4 } from 'uuid';
import { addMiddleWare } from './helpers';

var docClient = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

const baseHandler = async (event: any) => {
  const cartsRepository = new CartsRepository(`${process.env.TABLE_NAME}`, docClient);
  const outboxRepository = new OutboxRepository(`${process.env.OUTBOX_TABLE_NAME}`, docClient);

  const { items } = event.body;
  // replace this with logged in user id
  const userId = 'user-1';

  const cartCreated: CartCreated =  {
    cartId: uuidV4(),
    userId: userId,
    items: items,
    occurred: new Date()
  };

  var item = cartsRepository.createCart(cartCreated);

  await docClient.transactWrite({
    TransactItems: [
      { Put: item },
      { Put: outboxRepository.publish('CartCreated', cartCreated) },
    ]
  }).promise();

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

const handler = addMiddleWare(baseHandler);

export { handler };