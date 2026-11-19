import { useEffect, useState } from "react";
import { Modal, Table, Form, Button, Row, Col, Alert, Badge } from "react-bootstrap";
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { createStaffUser } from "./auth";
import { logActivity } from "./activity";
import ConfirmModal from "./ConfirmModal";

const ROLES = ["admin", "hr", "editor", "viewer"];
const emptyForm = { fullName: "", username: "", password: "", role: "viewer" };
const OFFLINE = "Managing users needs an internet connection";

export default function UsersModal({ show, onHide, currentUser }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [adding, setAdding] = useState(false);

  const [nameTarget, setNameTarget] = useState(null);
  const [nameValue, setNameValue] = useState("");
  const [modalError, setModalError] = useState("");
  const [toggleTarget, setToggleTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!show) return;
    setError("");
    setMessage("");
    const q = query(collection(db, "users"), orderBy("username"));
    return onSnapshot(
      q,
      (snap) => setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setError("Could not load users")
    );
  }, [show]);

  const update = async (id, changes) => {
    try {
      await updateDoc(doc(db, "users", id), changes);
      return "";
    } catch {
      return "Could not save. Check your connection and permissions.";
    }
  };

  const addUser = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!navigator.onLine) return setError("Creating accounts needs an internet connection");
    setAdding(true);
    try {
      await createStaffUser(form);
      setMessage(`User "${form.username.trim().toLowerCase()}" created.`);
      setForm(emptyForm);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const changeRole = async (u, role) => {
    setError("");
    setMessage("");
    if (!navigator.onLine) return setError(OFFLINE);
    const failed = await update(u.id, { role });
    if (failed) setError(failed);
    else logActivity("USER_ROLE_CHANGED", `${u.username} -> ${role}`);
  };

  const openName = (u) => {
    setNameTarget(u);
    setNameValue(u.fullName || "");
    setModalError("");
  };

  const saveName = async (e) => {
    e.preventDefault();
    if (nameValue.trim().length < 2) return setModalError("Full name must be at least 2 characters");
    if (!navigator.onLine) return setModalError(OFFLINE);
    setBusy(true);
    const failed = await update(nameTarget.id, { fullName: nameValue.trim() });
    setBusy(false);
    if (failed) return setModalError(failed);
    logActivity("USER_NAME_CHANGED", `${nameTarget.username} -> ${nameValue.trim()}`);
    setNameTarget(null);
    setMessage("Name updated.");
  };

  const confirmToggle = async () => {
    if (!navigator.onLine) {
      setToggleTarget(null);
      return setError(OFFLINE);
    }
    setBusy(true);
    const failed = await update(toggleTarget.id, { active: !toggleTarget.active });
    setBusy(false);
    const name = toggleTarget.username;
    const nowActive = !toggleTarget.active;
    setToggleTarget(null);
    if (failed) return setError(failed);
    logActivity(nowActive ? "USER_ENABLED" : "USER_DISABLED", name);
    setMessage(`Account "${name}" ${nowActive ? "enabled" : "disabled"}.`);
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
                <th>Status</th>
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
                    <td>
                      {u.active ? (
                        <Badge bg="success">Active</Badge>
                      ) : (
                        <Badge bg="secondary">Disabled</Badge>
                      )}
                    </td>
                    <td className="text-nowrap">
                      <Button size="sm" variant="outline-primary" className="me-2" onClick={() => openName(u)}>
                        Edit name
                      </Button>
                      <Button size="sm" variant="outline-secondary" className="me-2" onClick={() => setResetTarget(u)}>
                        Reset password
                      </Button>
                      <Button
                        size="sm"
                        variant={u.active ? "outline-danger" : "outline-success"}
                        disabled={isMe}
                        onClick={() => setToggleTarget(u)}
                      >
                        {u.active ? "Disable" : "Enable"}
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
                className="text-capitalize"
                  placeholder="Full name"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  required
                />
              </Col>
              <Col md={3}>
                <Form.Control
                  placeholder="Username"
                  autoCapitalize="none"
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
              <Button type="submit" disabled={adding}>
                {adding ? "Creating..." : "Add user"}
              </Button>
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

      <Modal show={!!resetTarget} onHide={() => setResetTarget(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reset password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Passwords of other people can't be changed from the browser. On the
            administrator's computer, open a terminal in the <code>admin-tools</code>{" "}
            folder and run:
          </p>
          <pre className="bg-light border rounded p-2 small">
            node reset-password.js {resetTarget?.username} NEW-PASSWORD
          </pre>
          <p className="mb-0 text-muted small">
            Use at least 8 characters, then tell {resetTarget?.fullName || resetTarget?.username} the new password.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setResetTarget(null)}>Close</Button>
        </Modal.Footer>
      </Modal>

      <ConfirmModal
        show={!!toggleTarget}
        title={toggleTarget?.active ? "Disable account" : "Enable account"}
        confirmText={toggleTarget?.active ? "Disable" : "Enable"}
        confirmVariant={toggleTarget?.active ? "danger" : "success"}
        busy={busy}
        onCancel={() => setToggleTarget(null)}
        onConfirm={confirmToggle}
      >
        {toggleTarget && (
          toggleTarget.active ? (
            <>
              <strong>{toggleTarget.fullName || toggleTarget.username}</strong> will lose access
              right away and can't sign in until the account is enabled again.
            </>
          ) : (
            <>
              <strong>{toggleTarget.fullName || toggleTarget.username}</strong> will be able to
              sign in again.
            </>
          )
        )}
      </ConfirmModal>
    </>
  );
}