import { useState } from "react";
import { Button } from "react-bootstrap";
import { collection, getDocsFromServer } from "firebase/firestore";
import { db } from "./firebase";
import { useEmployees } from "./employeesData";
import { logActivity } from "./activity";
import { exportExcel, downloadJson } from "./exporters";

const today = () => new Date().toISOString().slice(0, 10);

export default function DataTools({ role, onNotice }) {
  const { employees, loading } = useEmployees();
  const [busy, setBusy] = useState("");

  const doExcel = async () => {
    setBusy("excel");
    try {
      await exportExcel(employees, `employees-${today()}.xlsx`);
      logActivity("EXPORT_EXCEL", `${employees.length} employees`);
    } catch (err) {
      console.error(err);
      onNotice({
        title: "Export failed",
        message: "Could not create the Excel file.",
        variant: "danger",
      });
    } finally {
      setBusy("");
    }
  };

  const doBackup = async () => {
    setBusy("backup");
    try {
      const backup = {
        app: "dpwh-directory",
        version: 1,
        createdAt: new Date().toISOString(),
        employees: employees.map(({ pending, ...rest }) => rest),
      };

      let scope = "employees only";
      let warning = "";

      if (role === "admin") {
        try {
          // read from the server so a missing local copy is never mistaken for "no accounts"
          const [users, logs] = await Promise.all([
            getDocsFromServer(collection(db, "users")),
            getDocsFromServer(collection(db, "activity")),
          ]);
          backup.users = users.docs.map((d) => ({ id: d.id, ...d.data() }));
          backup.activity = logs.docs.map((d) => ({ id: d.id, ...d.data() }));
          scope = "full";
        } catch {
          warning =
            "The accounts and the activity log could not be included because there is no connection to the server. The employees were saved.";
        }
      }

      downloadJson(backup, `dpwh-backup-${today()}.json`);
      logActivity("BACKUP_DOWNLOADED", scope);
      if (warning) {
        onNotice({ title: "Backup saved (employees only)", message: warning, variant: "warning" });
      }
    } catch (err) {
      console.error(err);
      onNotice({
        title: "Backup failed",
        message: "Could not create the backup.",
        variant: "danger",
      });
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <Button variant="outline-success" onClick={doExcel} disabled={loading || busy !== ""}>
        {busy === "excel" ? "Exporting..." : "Export Excel"}
      </Button>
      <Button variant="outline-dark" onClick={doBackup} disabled={loading || busy !== ""}>
        {busy === "backup" ? "Preparing..." : "Backup"}
      </Button>
    </>
  );
}