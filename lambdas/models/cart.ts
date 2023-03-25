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

    checkout(): void {
        this.status = "CHECKOUT"
    }
};

export interface CartItem {
    itemId: string;
    quantity: number;
};