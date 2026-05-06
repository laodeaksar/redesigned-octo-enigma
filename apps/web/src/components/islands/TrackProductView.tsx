import { useEffect } from "react";
import { trackView, hydrateRecentlyViewed, type RecentProduct } from "@/stores/recentlyViewed.store";

export default function TrackProductView(props: RecentProduct) {
  useEffect(() => {
    hydrateRecentlyViewed();
    trackView(props);
  }, [props.id]);

  return null;
}
