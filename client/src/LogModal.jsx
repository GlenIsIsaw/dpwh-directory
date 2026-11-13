import { useEffect, useState } from "react";
import { Modal, Table, Form, Button, Badge, Alert, Spinner } from "react-bootstrap";

const LABELS = {
  LOGIN: ["Login", "secondary"],
  LOGIN_FAILED: ["Failed login", "danger"],
  EMPLOYEE_ADDED: ["Employee added", "success"],
  EMPLOYEE_EDITED: ["Employee edited", "primary"],
  EMPLOYEE_DELETED: ["Employee deleted", "danger"],
  EXPORT_EXCEL: ["Excel export", "info"],
  BACKUP_DOWNLOADED: ["Backup", "info"],
  USER_CREATED: ["User created", "success"],
  USER_ROLE_CHANGED: ["Role changed", "warning"],
  USER_PASSWORD_RESET: ["Password reset", "warning"],
  USER_DELETED: ["User deleted", "danger"],
  PASSWORD_CHANGED: ["Password changed", "warning"],
  USER_NAME_CHANGED: ["Name changed", "warning"],
};

function formatTime(value) {
  // the database stores UTC; show it in this computer's local time
  const d = new Date(value.replace(" ", "T") + "Z");
  return d.toLocaleString();
}

export default function LogModal({ show, onHide }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    fetch("/api/logs")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setRows)
      .catch(() => setError("Could not load the activity log"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (show) load();
  }, [show]);

  const term = search.trim().toLowerCase();
  const shown = rows.filter((r) => {
    if (!term) return true;
    const label = (LABELS[r.action] || [r.action])[0];
    return [r.username, r.fullName, label, r.details].filter(Boolean).join(" ").toLowerCase().includes(term);
  });

  return (
    <Modal show={show} onHide={onHide} size="xl" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Activity Log</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <div className="d-flex gap-2 mb-3">
          <Form.Control
            type="search"
            placeholder="Search by user, action or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button variant="outline-primary" onClick={load} disabled={loading}>
            {loading ? <Spinner size="sm" animation="border" /> : "Refresh"}
          </Button>
        </div>

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
                  <td className="text-nowrap">{formatTime(r.createdAt)}</td>
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
            {shown.length === 0 && !loading && (
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