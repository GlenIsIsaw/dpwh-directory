import { Modal, Button, Row, Col } from "react-bootstrap";
import { useState } from "react";

function fullName(e) {
  const mid = e.middleName ? ` ${e.middleName}` : "";
  const suf = e.suffix ? ` ${e.suffix}` : "";
  return `${e.firstName}${mid} ${e.lastName}${suf}`;
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function Field({ label, value }) {
  return (
    <div className="mb-3">
      <div className="detail-label">{label}</div>
      <div className="detail-value">{value || <span className="text-muted">—</span>}</div>
    </div>
  );
}

export default function EmployeeDetails({ show, employee, onHide, onEdit, onDelete }) {
    const [zoom, setZoom] = useState(false);
  return (
    <>
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Employee Details</Modal.Title>
      </Modal.Header>

      {employee && (
        <Modal.Body>
          <div className="d-flex align-items-center gap-3 mb-2">
            {employee.photo ? (
              <button
                type="button"
                className="photo-btn"
                onClick={() => setZoom(true)}
                aria-label="View photo full screen"
                title="Click to view full screen"
              >
                <img
                  src={employee.photo}
                  alt={fullName(employee)}
                  width="110"
                  height="110"
                  className="rounded-circle"
                  style={{ objectFit: "cover" }}
                />
              </button>
            ) : (
              <div
                className="avatar-initials text-uppercase rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: 110, height: 110, fontSize: "2rem" }}
              >
                {`${employee.firstName[0] || ""}${employee.lastName[0] || ""}`}
              </div>
            )}
            <div>
                            <h4 className="mb-1 text-uppercase fw-bold">{fullName(employee)}</h4>
              {employee.nickname && (
                <div className="text-muted mb-1 text-uppercase fw-bold">“{employee.nickname}”</div>
              )}
              <div className="text-muted mb-2">{employee.position || "No position"}</div>
              <span className={`status-badge ${employee.status === "Active" ? "is-active" : "is-inactive"}`}>
                {employee.status}
              </span>
            </div>
          </div>

          <h6 className="detail-section">Employment</h6>
          <Row>
            <Col md={4}><Field label="ID Number" value={employee.idNumber} /></Col>
                   <Col md={4}><Field label="Hire Date" value={formatDate(employee.hireDate)} /></Col>
            <Col md={4}><Field label="Employment Type" value={employee.employmentType} /></Col>
          </Row>
          <Row>
            <Col md={6}><Field label="Department" value={employee.department} /></Col>
            <Col md={6}><Field label="Position" value={employee.position} /></Col>
          </Row>

          <h6 className="detail-section">Personal</h6>
          <Row>
            <Col md={4}><Field label="Birthday" value={formatDate(employee.birthday)} /></Col>
            <Col md={4}><Field label="Contact Number" value={employee.contact} /></Col>
            <Col md={4}><Field label="Gender" value={employee.gender} /></Col>
          </Row>
          <Col className="text-capitalize"><Field label="Address" value={employee.address} /></Col>

          <h6 className="detail-section">In case of emergency</h6>
          <Row>
            <Col md={6} className="text-capitalize"><Field label="Contact Person" value={employee.emergencyName} /></Col>
            <Col md={6}><Field label="Contact Number" value={employee.emergencyContact} /></Col>
          </Row>
        </Modal.Body>
      )}

      <Modal.Footer>
        {employee && onDelete && (
          <Button variant="outline-danger" className="me-auto" onClick={() => onDelete(employee)}>
            Delete
          </Button>
        )}
        {employee && onEdit && (
          <Button variant="outline-primary" onClick={() => onEdit(employee)}>
            Edit
          </Button>
        )}
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>

    <Modal show={zoom} onHide={() => setZoom(false)} fullscreen className="photo-viewer">
      <Modal.Header closeButton closeVariant="white">
                <Modal.Title className="text-uppercase">{employee ? fullName(employee) : ""}</Modal.Title>
      </Modal.Header>
      <Modal.Body onClick={() => setZoom(false)}>
        {employee?.photo && (
          <img
            src={employee.photo}
            alt={employee ? fullName(employee) : ""}
            className="photo-viewer-img"
          />
        )}
      </Modal.Body>
    </Modal>
    </>
  );
}