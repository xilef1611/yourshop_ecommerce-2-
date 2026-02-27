import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

export interface CartItem {
  productId: number;
  variantId?: number;
  name: string;
  unitLabel?: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: number, variantId?: number) => void;
  updateQuantity: (productId: number, variantId: number | undefined, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | null>(null);

const CART_KEY = "shop_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: CartItem) => {
    setItems(prev => {
      const existing = prev.find(
        i => i.productId === item.productId && i.variantId === item.variantId
      );
      if (existing) {
        return prev.map(i =>
          i.productId === item.productId && i.variantId === item.variantId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((productId: number, variantId?: number) => {
    setItems(prev => prev.filter(
      i => !(i.productId === productId && i.variantId === variantId)
    ));
  }, []);

  const updateQuantity = useCallback((productId: number, variantId: number | undefined, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId, variantId);
      return;
    }
    setItems(prev =>
      prev.map(i =>
        i.productId === productId && i.variantId === variantId
          ? { ...i, quantity }
          : i
      )
    );
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const totalPrice = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items]);

  const value = useMemo(() => ({
    items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice,
  }), [items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
