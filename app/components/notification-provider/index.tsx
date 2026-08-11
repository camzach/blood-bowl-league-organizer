import {
  createContext,
  CSSProperties,
  PropsWithChildren,
  useCallback,
  useState,
} from "react";
import styles from "./notification-provider.module.css";
import nanoid from "~/app/utils/nanoid";

type Notification = {
  text: string;
  time?: number;
};

export const notificationContext = createContext<(notif: Notification) => void>(
  () => {},
);

export function NotificationProvider({ children }: PropsWithChildren) {
  const [notifications, setNotifications] = useState<
    (Notification & { id: string })[]
  >([]);

  const sendNotification = useCallback((notif: Notification) => {
    const id = nanoid();
    setNotifications((o) => [...o, { ...notif, id }]);
    if (notif.time) {
      setTimeout(() => {
        setNotifications((o) => o.filter((n) => n.id !== id));
      }, notif.time);
    }
  }, []);
  return (
    <>
      <notificationContext.Provider value={sendNotification}>
        {children}
      </notificationContext.Provider>
      <div className={styles["notif-column"]}>
        {notifications.map((n) => (
          <Notification key={n.id} notif={n} />
        ))}
      </div>
    </>
  );
}

type NotificationProps = {
  notif: Notification;
};
function Notification({ notif }: NotificationProps) {
  return (
    <div className={styles.notif}>
      <span
        className={styles["notif-timer"]}
        style={{ "--duration": notif.time } as CSSProperties}
      />
      {notif.text}
    </div>
  );
}
