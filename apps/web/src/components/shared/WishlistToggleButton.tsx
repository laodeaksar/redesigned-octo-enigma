import { useState, useCallback } from "react";
import { useStore } from "@nanostores/react";
import { 
  $wishlist, 
  toggleWishlist, 
  isInWishlist, 
  type WishlistItem 
} from "@/stores/wishlist.store";
import { LoadingIndicator } from "./LoadingIndicator";

interface WishlistToggleButtonProps {
  item: Omit<WishlistItem, "addedAt">;
  variant?: "icon" | "button";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function WishlistToggleButton({ 
  item, 
  variant = "icon",
  size = "md",
  className = ""
}: WishlistToggleButtonProps) {
  const wishlist = useStore($wishlist);
  const [loading, setLoading] = useState(false);

  const isActive = wishlist.some(i => i.variantId === item.variantId);

  const handleToggle = useCallback(() => {
    if (loading) return;
    
    setLoading(true);
    
    // Simulasi delay optimis
    setTimeout(() => {
      toggleWishlist(item);
      setLoading(false);
    }, 150);
  }, [item, loading]);

  const sizeClasses = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-2.5"
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        aria-label={isActive ? "Hapus dari wishlist" : "Tambahkan ke wishlist"}
        aria-pressed={isActive}
        className={`rounded-full bg-white/90 backdrop-blur-sm shadow-sm 
        hover:shadow-md transition-all duration-150 ${sizeClasses[size]} ${className}
        ${isActive ? "text-red-500" : "text-gray-600 hover:text-red-500"}
        ${loading ? "opacity-50 pointer-events-none" : ""}`}
      >
        {loading ? (
          <LoadingIndicator size="sm" variant="gray" />
        ) : (
          <svg 
            className={`w-5 h-5 ${isActive ? "fill-current" : ""}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
            />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border 
      transition-all duration-150 ${className}
      ${isActive 
        ? "border-red-500 text-red-500 bg-red-50" 
        : "border-gray-200 text-gray-700 hover:border-gray-300"
      }
      ${loading ? "opacity-50 pointer-events-none" : ""}`}
    >
      {loading ? (
        <LoadingIndicator size="sm" />
      ) : (
        <svg 
          className={`w-4 h-4 ${isActive ? "fill-current" : ""}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
          />
        </svg>
      )}
      <span className="text-sm font-medium">
        {isActive ? "Disukai" : "Simpan"}
      </span>
    </button>
  );
}
