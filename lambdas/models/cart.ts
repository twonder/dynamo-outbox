import { CartItem } from "../events/models/cart-item";

export class Cart {
    cartId: string;
    accountId: string;
    userId: string;
    status: string;
    items: CartItem[];

    addItems(newItems: CartItem[]): void {
        var itemObjects: CartItem[] = [];

        // if the item is already in the cart, update the quantity
        newItems.forEach(newItem => {
            var item = this.items.find(i => i.itemId == newItem.itemId);

            if (item) {
                newItem.quantity += item.quantity;
            }
            itemObjects.push(newItem);
        });

        this.items = [...itemObjects, ...this.items.filter(i => itemObjects.map(ib => ib.itemId).indexOf(i.itemId) < 0)];
    }

    removeItems(items: CartItem[]): void {
        var updatedItems = this.items.map(cartItem => {
            var matchingItem = items.find(i => i.itemId == cartItem.itemId);
            if (!matchingItem){
                return cartItem;
            }

            return {
                itemId: cartItem.itemId,
                quantity: cartItem.quantity - matchingItem.quantity
            } as CartItem;
        });

        this.items = updatedItems.filter(i => i.quantity > 0);
    }

    checkout(): void {
        this.status = "CHECKOUT"
    }
};