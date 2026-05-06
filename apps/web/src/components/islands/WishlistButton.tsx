import { useStore } from "@nanostores/react";
import { $wishlistedIds, toggleWishlist, hydrateWishlist } from "@/stores/wishlist.store";
import { useEffect, useState } from "react";

interface Props {
  productId: string;
  variant?: "icon" | "full"; // icon → product card, full → product detail
  isLoggedIn: boolean;
}

export default function WishlistButton({
  productId,
  variant = "icon",
  isLoggedIn,
}: Props) {
  const wishlistedIds = useStore($wishlistedIds);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isLoggedIn) hydrateWishlist();
  }, [isLoggedIn]);

  const wishlisted = mounted && wishlistedIds.has(productId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    toggleWishlist(productId);
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        aria-label={wishlisted ? "Hapus dari wishlist" : "Tambah ke wishlist"}
        className={`
          absolute top-2 right-2 z-10 p-1.5 rounded-full
          bg-white/80 backdrop-blur-sm shadow-sm
          transition-all hover:scale-110
          ${wishlisted ? "text-rose-500" : "text-gray-400 hover:text-rose-400"}
        `}
      >
        <svg
          xmlns="<http://www.w3.org/2000/svg>"
          viewBox="0 0 24 24"
          fill={wishlisted ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={2}
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935
               0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733
               -4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22
               9 12 9 12s9-4.78 9-12Z"
          />
        </svg>
      </button>
    );
  }

  // variant === "full"
  return (
    <button
      onClick={handleClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg border
        font-medium text-sm transition-colors
        ${
          wishlisted
            ? "border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100"
            : "border-gray-200 bg-white text-gray-700 hover:border-rose-300 hover:text-rose-500"
        }
      `}
    >
      <svg
        xmlns="<http://www.w3.org/2000/svg>"
        viewBox="0 0 24 24"
        fill={wishlisted ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
        className="w-4 h-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935
             0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733
             -4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22
             9 12 9 12s9-4.78 9-12Z"
        />
      </svg>
      {wishlisted ? "Tersimpan" : "Simpan"}
    </button>
  );
}
