import { CartItem} from './models/cart-item';

export interface ItemsAddedToCart {
    cartId: string,
    userId: string,
    items: CartItem[],
    occurred: Date
}
