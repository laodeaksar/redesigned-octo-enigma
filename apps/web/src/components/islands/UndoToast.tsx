import { useEffect, useState, useCallback } from "react";
import { $cart, removeFromCart, addToCart, type CartItem } from "@/stores/cart.store";
import { useStore } from "@nanostores/react";
import { LoadingIndicator } from "@/components/shared/LoadingIndicator";

interface PendingDeletion {
  id: string;
  item: CartItem;
  expiresAt: number;
  restored: boolean;
  restoring: boolean;
}

const TOAST_DURATION = 6000;
const ANIMATION_DURATION = 200;

export function UndoToast() {
  const cartItems = useStore($cart);
  const [pendingDeletions, setPendingDeletions] = useState<PendingDeletion[]>([]);
  const [toastVisible, setToastVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Handler ketika item dihapus dari keranjang
  const handleItemDelete = useCallback((item: CartItem) => {
    const deletionId = crypto.randomUUID();
    const pendingItem: PendingDeletion = {
      id: deletionId,
      item,
      expiresAt: Date.now() + TOAST_DURATION,
      restored: false,
      restoring: false
    };

    setPendingDeletions(prev => [...prev, pendingItem]);
    setToastVisible(true);
    
    logger.debug("Item scheduled for deletion with undo toast", {
      deletionId,
      productName: item.productName,
      variantId: item.variantId
    });

    // Schedule permanent deletion
    setTimeout(() => {
      setPendingDeletions(prev => {
        const item = prev.find(p => p.id === deletionId);
        if (item && !item.restored) {
          // Hapus permanen dari state keranjang
          removeFromCart(item.item.variantId);
          logger.debug("Item permanently deleted after timeout", { deletionId });
        }
        return prev.filter(p => p.id !== deletionId);
      });
    }, TOAST_DURATION);

  }, []);

  // Handler undo penghapusan
  const handleUndo = useCallback((deletionId: string) => {
    setPendingDeletions(prev => {
      const item = prev.find(p => p.id === deletionId);
      if (item && !item.restored && !item.restoring) {
        // Tandai sebagai loading sebelum operasi
        return prev.map(p => p.id === deletionId ? { ...p, restoring: true } : p);
      }
      return prev;
    });

    // Simulasi async delay untuk menunjukkan loading
    setTimeout(() => {
      setPendingDeletions(prev => {
        const item = prev.find(p => p.id === deletionId);
        if (item && item.restoring) {
          addToCart(item.item);
          return prev.map(p => p.id === deletionId ? { ...p, restored: true, restoring: false } : p);
        }
        return prev;
      });

      setTimeout(() => {
        setPendingDeletions(prev => prev.filter(p => p.id !== deletionId));
      }, ANIMATION_DURATION);
    }, 300);
  }, []);

  // Auto hide toast ketika tidak ada pending item
  useEffect(() => {
    if (pendingDeletions.length === 0) {
      setAnimating(true);
      setTimeout(() => {
        setToastVisible(false);
        setAnimating(false);
      }, ANIMATION_DURATION);
    }
  }, [pendingDeletions.length]);

  // Override fungsi removeFromCart global untuk inject undo
  useEffect(() => {
    const originalRemove = removeFromCart;

    // @ts-expect-error override fungsi global
    window.removeFromCartWithUndo = (variantId: string) => {
      const item = cartItems.find(i => i.variantId === variantId);
      if (item) {
        handleItemDelete(item);
      }
    };

    return () => {
      // @ts-expect-error restore original
      window.removeFromCartWithUndo = undefined;
    };
  }, [cartItems, handleItemDelete]);

  if (!toastVisible) return null;

  const activeDeletion = pendingDeletions.find(p => !p.restored);
  if (!activeDeletion) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md 
      bg-gray-900 text-white rounded-xl shadow-2xl px-5 py-4 z-50 flex items-center gap-4 
      transition-all duration-200 transform ${
        animating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {activeDeletion.item.productName} telah dihapus
        </p>
        <p className="text-xs text-gray-400">
          {activeDeletion.item.quantity} x Rp {activeDeletion.item.price.toLocaleString("id-ID")}
        </p>
      </div>
      
      <button
        onClick={() => handleUndo(activeDeletion.id)}
        disabled={activeDeletion.restoring}
        className={`shrink-0 bg-accent hover:bg-accent/90 text-white font-medium
        text-sm px-4 py-2 rounded-lg transition-all
        ${activeDeletion.restoring ? "opacity-50 pointer-events-none" : "hover:scale-105 active:scale-95"}
        `}
      >
        {activeDeletion.restoring ? (
          <span className="flex items-center gap-2">
            <LoadingIndicator size="xs" variant="white" />
            Memproses
          </span>
        ) : "Batalkan"}
      </button>

      {/* Progress bar countdown */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700 rounded-b-xl overflow-hidden">
        <div 
          className="h-full bg-accent transition-all duration-100 linear"
          style={{
            animation: `shrink ${TOAST_DURATION}ms linear forwards`
          }}
        />
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
