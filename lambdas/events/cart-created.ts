import { CartItem} from './models/cart-item';

export interface CartCreated {
    cartId: string,
    userId: string,
    items: CartItem[],
    occurred: Date
}

