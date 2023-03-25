import { CartItem} from './models/cart-item';

export interface ItemsAddedToCart {
    cartId: string,
    accountId: string,
    userId: string,
    items: CartItem[],
    occurred: Date
}
