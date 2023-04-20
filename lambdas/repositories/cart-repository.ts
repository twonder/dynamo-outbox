import * as AWS from 'aws-sdk';
import { Cart } from '../models/cart';
import { CartCreated } from '../events/cart-created';

export class CartsRepository {
    docClient: AWS.DynamoDB.DocumentClient;
    tableName: string;

    constructor(tableName: string, docClient: AWS.DynamoDB.DocumentClient) {
        this.tableName = tableName;
        this.docClient = docClient;
    }

    public updateCart(cart: Cart) : AWS.DynamoDB.DocumentClient.Put {
        return {
            TableName: this.tableName,
            Item: this.mapToCartItem(cart)
        }
    }

    public createCart(cartCreated: CartCreated) : AWS.DynamoDB.DocumentClient.Put {
        return {
            TableName : this.tableName,
            Item: {
                PK: cartCreated.cartId,
                userId: cartCreated.userId,
                status: "OPEN",
                items: cartCreated.items
            }
        };
    }

    async getCart(cartId: string | undefined): Promise<Cart | null> {
        if (cartId == null) return null;

        var response = await this.docClient.get({
            TableName: this.tableName,
            Key: {
              PK: cartId
            }
        }).promise();

        if (!response.Item) return null;

        return this.mapToCart(response.Item);
    }

    private mapToCart(item: AWS.DynamoDB.DocumentClient.AttributeMap): Cart {
        var cart = new Cart();

        cart.cartId = item.PK;
        cart.userId = item.userId;
        cart.status = item.status;
        cart.items = item.items;

        return cart;
    }

    private mapToCartItem(cart: Cart): any {
        return {
            PK: cart.cartId,
            userId: cart.userId,
            status: cart.status,
            items: cart.items
        };
    }
}