import { useCallback, useEffect, useState } from "react";
import {
  $cart,
  $removeRequested,
  addToCart,
  removeFromCart,
  type CartItem,
} from "@/stores/cart.store";
import { useStore } from "@nanostores/react";

import { LoadingIndicator } from "@/components/shared/LoadingIndicator";

interface PendingDeletion {
  expiresAt: number;
  id: string;
  item: CartItem;
  restored: boolean;
  restoring: boolean;
}

const TOAST_DURATION = 6000;
const ANIMATION_DURATION = 200;

export function UndoToast() {
  const cartItems = useStore($cart);
  const removeRequested = useStore($removeRequested);
  const [pendingDeletions, setPendingDeletions] = useState<PendingDeletion[]>(
    []
  );
  const [toastVisible, setToastVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Start an undo countdown for a cart item
  const handleItemDelete = useCallback((item: CartItem) => {
    const deletionId = crypto.randomUUID();
    const pendingItem: PendingDeletion = {
      id: deletionId,
      item,
      expiresAt: Date.now() + TOAST_DURATION,
      restored: false,
      restoring: false,
    };

    setPendingDeletions(prev => [...prev, pendingItem]);
    setToastVisible(true);

    console.debug("[UndoToast] Item scheduled for deletion with undo toast", {
      deletionId,
      productName: item.productName,
      variantId: item.variantId,
    });

    // Commit the deletion after the undo window expires
    setTimeout(() => {
      setPendingDeletions(prev => {
        const pending = prev.find(p => p.id === deletionId);
        if (pending && !pending.restored) {
          removeFromCart(pending.item.variantId);
          console.debug("[UndoToast] Item permanently deleted after timeout", {
            deletionId,
          });
        }
        return prev.filter(p => p.id !== deletionId);
      });
    }, TOAST_DURATION);
  }, []);

  // React to $removeRequested atom — this replaces the window global hack
  useEffect(() => {
    if (!removeRequested) return;

    const item = cartItems.find(i => i.variantId === removeRequested);
    if (item) {
      handleItemDelete(item);
    }

    // Acknowledge the event so the atom is cleared and won't re-fire
    $removeRequested.set(null);
  }, [removeRequested]); // intentionally excludes cartItems: we want to react to the signal, not every cart change

  // Handler for the Batalkan (undo) button
  const handleUndo = useCallback((deletionId: string) => {
    setPendingDeletions(prev => {
      const item = prev.find(p => p.id === deletionId);
      if (item && !item.restored && !item.restoring) {
        return prev.map(p =>
          p.id === deletionId ? { ...p, restoring: true } : p
        );
      }
      return prev;
    });

    // Brief delay to show the loading spinner before restoring
    setTimeout(() => {
      setPendingDeletions(prev => {
        const item = prev.find(p => p.id === deletionId);
        if (item && item.restoring) {
          addToCart(item.item);
          return prev.map(p =>
            p.id === deletionId
              ? { ...p, restored: true, restoring: false }
              : p
          );
        }
        return prev;
      });

      setTimeout(() => {
        setPendingDeletions(prev => prev.filter(p => p.id !== deletionId));
      }, ANIMATION_DURATION);
    }, 300);
  }, []);

  // Auto-hide toast when all pending deletions are resolved
  useEffect(() => {
    if (pendingDeletions.length === 0) {
      setAnimating(true);
      setTimeout(() => {
        setToastVisible(false);
        setAnimating(false);
      }, ANIMATION_DURATION);
    }
  }, [pendingDeletions.length]);

  if (!toastVisible) {
    return null;
  }

  const activeDeletion = pendingDeletions.find(p => !p.restored);
  if (!activeDeletion) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className={`fixed right-4 bottom-4 left-4 z-50 flex transform items-center gap-4 rounded-xl bg-gray-900 px-5 py-4 text-white shadow-2xl transition-all duration-200 md:right-6 md:left-auto md:max-w-md ${
        animating ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
      }`}
      role="alert"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {activeDeletion.item.productName} telah dihapus
        </p>
        <p className="text-xs text-gray-400">
          {activeDeletion.item.quantity} x Rp{" "}
          {activeDeletion.item.price.toLocaleString("id-ID")}
        </p>
      </div>

      <button
        className={`bg-accent hover:bg-accent/90 shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all ${activeDeletion.restoring ? "pointer-events-none opacity-50" : "hover:scale-105 active:scale-95"} `}
        disabled={activeDeletion.restoring}
        onClick={() => handleUndo(activeDeletion.id)}
      >
        {activeDeletion.restoring ? (
          <span className="flex items-center gap-2">
            <LoadingIndicator size="xs" variant="white" />
            Memproses
          </span>
        ) : (
          "Batalkan"
        )}
      </button>

      {/* Progress bar countdown */}
      <div className="absolute right-0 bottom-0 left-0 h-1 overflow-hidden rounded-b-xl bg-gray-700">
        <div
          className="linear bg-accent h-full transition-all duration-100"
          style={{
            animation: `shrink ${TOAST_DURATION}ms linear forwards`,
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
