import { useEffect, useState } from "react";
import { Modal, Table, Form, Button, Row, Col, Alert } from "react-bootstrap";
import ConfirmModal from "./ConfirmModal";

const ROLES = ["admin", "hr", "editor", "viewer"];
const emptyForm = { fullName: "", username: "", password: "", role: "viewer" };

export default function UsersModal({ show, onHide, currentUser }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);

  const [nameTarget, setNameTarget] = useState(null);
  const [nameValue, setNameValue] = useState("");
  const [pwTarget, setPwTarget] = useState(null);
  const [pwValue, setPwValue] = useState("");
  const [pwAgain, setPwAgain] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [modalError, setModalError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    fetch("/api/users")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setUsers)
      .catch(() => setError("Could not load users"));

  useEffect(() => {
    if (show) {
      setError("");
      setMessage("");
      load();
    }
  }, [show]);

  const call = async (url, method, body) => {
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || "Something went wrong" };
      return { ok: true };
    } catch {
      return { ok: false, error: "Cannot reach server" };
    }
  };

  const addUser = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const r = await call("/api/users", "POST", form);
    if (!r.ok) return setError(r.error);
    setMessage(`User "${form.username}" created.`);
    setForm(emptyForm);
    load();
  };

  const changeRole = async (u, role) => {
    setError("");
    setMessage("");
    const r = await call(`/api/users/${u.id}`, "PUT", { role });
    if (!r.ok) setError(r.error);
    load();
  };

  const openName = (u) => {
    setNameTarget(u);
    setNameValue(u.fullName || "");
    setModalError("");
  };

  const saveName = async (e) => {
    e.preventDefault();
    setBusy(true);
    setModalError("");
    const r = await call(`/api/users/${nameTarget.id}`, "PUT", { fullName: nameValue });
    setBusy(false);
    if (!r.ok) return setModalError(r.error);
    setNameTarget(null);
    setMessage("Name updated.");
    load();
  };

  const openPassword = (u) => {
    setPwTarget(u);
    setPwValue("");
    setPwAgain("");
    setModalError("");
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pwValue !== pwAgain) return setModalError("Passwords do not match");
    setBusy(true);
    setModalError("");
    const r = await call(`/api/users/${pwTarget.id}`, "PUT", { password: pwValue });
    setBusy(false);
    if (!r.ok) return setModalError(r.error);
    setMessage(`Password changed for ${pwTarget.username}.`);
    setPwTarget(null);
  };

  const confirmDelete = async () => {
    setBusy(true);
    const r = await call(`/api/users/${deleteTarget.id}`, "DELETE");
    setBusy(false);
    const name = deleteTarget.username;
    setDeleteTarget(null);
    if (!r.ok) return setError(r.error);
    setMessage(`User "${name}" deleted.`);
    load();
  };

  return (
    <>
      <Modal show={show} onHide={onHide} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Users</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {message && <Alert variant="success">{message}</Alert>}

          <Table hover responsive className="align-middle emp-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isMe = u.id === currentUser.id;
                return (
                  <tr key={u.id}>
                    <td className="fw-semibold">
                      {u.fullName || <span className="text-muted fw-normal">(no name yet)</span>}{" "}
                      {isMe && <span className="text-muted fw-normal">(you)</span>}
                    </td>
                    <td>{u.username}</td>
                    <td style={{ width: 150 }}>
                      <Form.Select
                        size="sm"
                        value={u.role}
                        disabled={isMe}
                        onChange={(e) => changeRole(u, e.target.value)}
                      >
                        {ROLES.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </Form.Select>
                    </td>
                    <td className="text-nowrap">
                      <Button size="sm" variant="outline-primary" className="me-2" onClick={() => openName(u)}>
                        Edit name
                      </Button>
                      <Button size="sm" variant="outline-secondary" className="me-2" onClick={() => openPassword(u)}>
                        Reset password
                      </Button>
                      <Button size="sm" variant="outline-danger" disabled={isMe} onClick={() => setDeleteTarget(u)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>

          <hr />
          <h6>Add user</h6>
          <Form onSubmit={addUser}>
            <Row className="g-2">
              <Col md={4}>
                <Form.Control
                  placeholder="Full name"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  required
                />
              </Col>
              <Col md={3}>
                <Form.Control
                  placeholder="Username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                />
              </Col>
              <Col md={3}>
                <Form.Control
                  type="password"
                  placeholder="Password (8+ characters)"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </Col>
              <Col md={2}>
                <Form.Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </Form.Select>
              </Col>
            </Row>
            <div className="text-end mt-2">
              <Button type="submit">Add user</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal show={!!nameTarget} onHide={() => setNameTarget(null)} centered backdrop="static">
        <Form onSubmit={saveName}>
          <Modal.Header closeButton>
            <Modal.Title>Edit name</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {modalError && <Alert variant="danger">{modalError}</Alert>}
            <Form.Label>
              Full name for <strong>{nameTarget?.username}</strong>
            </Form.Label>
            <Form.Control value={nameValue} onChange={(e) => setNameValue(e.target.value)} required autoFocus />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setNameTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving..." : "Save"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={!!pwTarget} onHide={() => setPwTarget(null)} centered backdrop="static">
        <Form onSubmit={savePassword}>
          <Modal.Header closeButton>
            <Modal.Title>Reset password</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {modalError && <Alert variant="danger">{modalError}</Alert>}
            <p className="mb-3">
              New password for <strong>{pwTarget?.fullName || pwTarget?.username}</strong>
            </p>
            <Form.Group className="mb-3">
              <Form.Label>New password (at least 8 characters)</Form.Label>
              <Form.Control type="password" value={pwValue} onChange={(e) => setPwValue(e.target.value)} required autoFocus />
            </Form.Group>
            <Form.Group>
              <Form.Label>Repeat new password</Form.Label>
              <Form.Control type="password" value={pwAgain} onChange={(e) => setPwAgain(e.target.value)} required />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setPwTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving..." : "Reset password"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <ConfirmModal
        show={!!deleteTarget}
        title="Delete user"
        confirmText="Delete"
        confirmVariant="danger"
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      >
        {deleteTarget && (
          <>
            Delete the account of <strong>{deleteTarget.fullName || deleteTarget.username}</strong> (
            {deleteTarget.username})? They will lose access immediately. This cannot be undone.
          </>
        )}
      </ConfirmModal>
    </>
  );
}