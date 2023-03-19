import * as AWS from 'aws-sdk';
import { CartItem } from '../events/models/cart-item';
import { CartCreated } from '../events/cart-created';

export class CartsRepository {
    docClient: AWS.DynamoDB.DocumentClient;
    tableName: string;

    constructor(tableName: string, docClient: AWS.DynamoDB.DocumentClient) {
        this.tableName = tableName;
        this.docClient = docClient;
    }

    createCart(cartCreated: CartCreated) : AWS.DynamoDB.DocumentClient.Put {
        return {
            TableName : this.tableName,
            Item: {
                PK: cartCreated.cartId,
                accountId: cartCreated.accountId,
                userId: cartCreated.userId,
                status: "OPEN",
                items: cartCreated.items
            }
        };
    }

    async getCart(cartId: string) {
        return this.docClient.get({
            TableName: this.tableName,
            Key: {
              PK: cartId
            }
        }).promise();
    }

    addItemsToCart(cart: any, items: CartItem[]) : AWS.DynamoDB.DocumentClient.Put {
        return {
            TableName: this.tableName,
            Item: {
                ...cart,
                items: [...cart.items, items]
            }
        }
    }
}