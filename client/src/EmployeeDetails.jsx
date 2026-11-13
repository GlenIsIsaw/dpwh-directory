import { Modal, Button, Row, Col } from "react-bootstrap";

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
  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Employee Details</Modal.Title>
      </Modal.Header>

      {employee && (
        <Modal.Body>
          <div className="d-flex align-items-center gap-3 mb-2">
            {employee.photo ? (
              <img
                src={`/uploads/${employee.photo}`}
                alt={fullName(employee)}
                width="110"
                height="110"
                className="rounded-circle"
                style={{ objectFit: "cover" }}
              />
            ) : (
              <div
                className="avatar-initials rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: 110, height: 110, fontSize: "2rem" }}
              >
                {`${employee.firstName[0] || ""}${employee.lastName[0] || ""}`}
              </div>
            )}
            <div>
              <h4 className="mb-1 text-uppercase fw-bold">{fullName(employee)}</h4>
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
          </Row>
          <Row>
            <Col md={6}><Field label="Department" value={employee.department} /></Col>
            <Col md={6}><Field label="Position" value={employee.position} /></Col>
          </Row>

          <h6 className="detail-section">Personal</h6>
          <Row>
            <Col md={4}><Field label="Birthday" value={formatDate(employee.birthday)} /></Col>
            <Col md={4}><Field label="Contact Number" value={employee.contact} /></Col>
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
  );
}