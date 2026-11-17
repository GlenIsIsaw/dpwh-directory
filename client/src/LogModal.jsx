import { useEffect, useState } from "react";
import { Modal, Table, Form, Badge, Alert } from "react-bootstrap";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "./firebase";

const LABELS = {
  LOGIN: ["Login", "secondary"],
  EMPLOYEE_ADDED: ["Employee added", "success"],
  EMPLOYEE_EDITED: ["Employee edited", "primary"],
  EMPLOYEE_DELETED: ["Employee deleted", "danger"],
  EXPORT_EXCEL: ["Excel export", "info"],
  BACKUP_DOWNLOADED: ["Backup", "info"],
  USER_CREATED: ["User created", "success"],
  USER_ROLE_CHANGED: ["Role changed", "warning"],
  USER_NAME_CHANGED: ["Name changed", "warning"],
  USER_ENABLED: ["User enabled", "success"],
  USER_DISABLED: ["User disabled", "danger"],
  PASSWORD_CHANGED: ["Password changed", "warning"],
  PASSWORD_RESET: ["Password reset", "warning"],
};

function formatTime(value) {
  return new Date(value).toLocaleString();
}

export default function LogModal({ show, onHide }) {
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!show) return;
    setError("");
    setLoaded(false);
    const q = query(collection(db, "activity"), orderBy("at", "desc"), limit(500));
    return onSnapshot(
      q,
      (snap) => {
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoaded(true);
      },
      () => setError("Could not load the activity log")
    );
  }, [show]);

  const term = search.trim().toLowerCase();
  const shown = rows.filter((r) => {
    if (!term) return true;
    const label = (LABELS[r.action] || [r.action])[0];
    return [r.username, r.fullName, label, r.details]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(term);
  });

  return (
    <Modal show={show} onHide={onHide} size="xl" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Activity Log</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <Form.Control
          type="search"
          className="mb-3"
          placeholder="Search by user, action or details..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="text-muted small mb-2">
          Showing {shown.length} of the latest {rows.length} entries
        </div>

        <Table hover responsive className="align-middle emp-table">
          <thead>
            <tr>
              <th>When</th>
              <th>User</th>
              <th>Action</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const [label, variant] = LABELS[r.action] || [r.action, "secondary"];
              return (
                <tr key={r.id}>
                  <td className="text-nowrap">{formatTime(r.at)}</td>
                  <td>
                    {r.fullName ? (
                      <>
                        {r.fullName} <span className="text-muted">({r.username})</span>
                      </>
                    ) : (
                      r.username
                    )}
                  </td>
                  <td>
                    <Badge bg={variant} text={variant === "warning" || variant === "info" ? "dark" : undefined}>
                      {label}
                    </Badge>
                  </td>
                  <td>{r.details}</td>
                </tr>
              );
            })}
            {shown.length === 0 && loaded && (
              <tr>
                <td colSpan={4} className="text-center text-muted py-4">
                  No entries.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Modal.Body>
    </Modal>
  );
}