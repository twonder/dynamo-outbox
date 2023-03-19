import { CartItem} from './models/cart-item';

export interface CartCreated {
    cartId: string,
    accountId: string,
    userId: string,
    items: CartItem[],
    occurred: Date
}

