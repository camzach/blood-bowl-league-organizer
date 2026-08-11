import { useEffect } from "react";
import { useContext } from "react";
import { notificationContext } from "~/app/components/notification-provider";
import type { Fetcher } from "react-router";

export function useFetcherErrorNotification(fetcher: Fetcher) {
  const sendNotification = useContext(notificationContext);

  useEffect(() => {
    if (fetcher.data && !fetcher.data.success) {
      sendNotification({ text: fetcher.data.error, time: 5000 });
    }
  }, [fetcher.data, sendNotification]);
}
