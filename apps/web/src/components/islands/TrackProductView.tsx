import { useEffect } from "react";
import {
  hydrateRecentlyViewed,
  trackView,
  type RecentProduct,
} from "@/stores/recentlyViewed.store";

export default function TrackProductView(props: RecentProduct) {
  useEffect(() => {
    hydrateRecentlyViewed();
    trackView(props);
  }, [props.id]);

  return null;
}
