import { useState } from "react";
import { Modal, Form, Button, Alert } from "react-bootstrap";

export default function ChangePasswordModal({ show, onHide }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setCurrent("");
    setNext("");
    setAgain("");
    setError("");
    setDone(false);
    onHide();
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (next !== again) {
      setError("New passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not change password");
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal show={show} onHide={close} backdrop="static" centered>
      <Modal.Header closeButton>
        <Modal.Title>Change my password</Modal.Title>
      </Modal.Header>

      {done ? (
        <>
          <Modal.Body>
            <Alert variant="success" className="mb-0">
              Password changed.
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={close}>Close</Button>
          </Modal.Footer>
        </>
      ) : (
        <Form onSubmit={submit}>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form.Group className="mb-3">
              <Form.Label>Current password</Form.Label>
              <Form.Control type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>New password (at least 8 characters)</Form.Label>
              <Form.Control type="password" value={next} onChange={(e) => setNext(e.target.value)} required />
            </Form.Group>
            <Form.Group>
              <Form.Label>Repeat new password</Form.Label>
              <Form.Control type="password" value={again} onChange={(e) => setAgain(e.target.value)} required />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving..." : "Change password"}
            </Button>
          </Modal.Footer>
        </Form>
      )}
    </Modal>
  );
}