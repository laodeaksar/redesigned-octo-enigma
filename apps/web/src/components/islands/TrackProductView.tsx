import { useEffect } from "react";
import {
  hydrateRecentlyViewed,
  type RecentProduct,
  trackView,
} from "@/stores/recentlyViewed.store";

export default function TrackProductView(props: RecentProduct) {
  useEffect(() => {
    hydrateRecentlyViewed();
    trackView(props);
  }, [props.id]);

  return null;
}
