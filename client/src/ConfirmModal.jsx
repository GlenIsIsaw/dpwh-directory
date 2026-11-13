import { Modal, Button } from "react-bootstrap";

export default function ConfirmModal({
  show,
  title,
  children,
  confirmText = "Confirm",
  confirmVariant = "primary",
  busy = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal show={show} onHide={busy ? undefined : onCancel} centered backdrop="static">
      <Modal.Header closeButton={!busy}>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{children}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm} disabled={busy}>
          {busy ? "Please wait..." : confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}