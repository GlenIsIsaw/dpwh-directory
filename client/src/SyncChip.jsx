import { useEffect, useState } from "react";
import { useEmployees } from "./employeesData";

export default function SyncChip() {
  const { employees } = useEmployees();
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const waiting = employees.filter((e) => e.pending).length;

  let tone = "is-ok";
  let text = "Online · up to date";
  if (!online) {
    tone = "is-off";
    text = waiting > 0 ? `Offline · ${waiting} waiting to upload` : "Offline · saved copy";
  } else if (waiting > 0) {
    tone = "is-sync";
    text = `Online · syncing ${waiting}`;
  }

  return (
    <span className={`sync-chip ${tone}`} title={text} role="status">
      <span className="sync-dot" />
      <span className="sync-text">{text}</span>
    </span>
  );
}