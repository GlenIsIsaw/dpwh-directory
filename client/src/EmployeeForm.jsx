import { useState, useEffect } from "react";
import { Modal, Form, Button, Row, Col, Alert } from "react-bootstrap";
import { DEPARTMENTS, POSITIONS, UNIQUE_POSITIONS, SUFFIXES, EMPLOYMENT_TYPES } from "./options";
import { useEmployees, saveEmployee, compressImage } from "./employeesData";

const emptyForm = {
  idNumber: "",
  lastName: "",
  firstName: "",
  middleName: "",
  suffix: "",
  department: "",
  position: "",
  contact: "",
  hireDate: "",
  status: "Active",
  address: "",
  birthday: "",
  emergencyName: "",
  emergencyContact: "",
  nickname: "",
  employmentType: "",
};

export default function EmployeeForm({ show, onHide, onSaved, employee }) {
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { employees } = useEmployees();

  const takenPositions = new Set(
    employees
      .filter((e) => e.status === "Active" && e.position && (!employee || e.id !== employee.id))
      .map((e) => e.position)
  );

    useEffect(() => {
    if (!show) return;
    if (employee) {
      setForm({
        idNumber: employee.idNumber || "",
        lastName: employee.lastName || "",
        firstName: employee.firstName || "",
        middleName: employee.middleName || "",
        suffix: employee.suffix || "",
        department: employee.department || "",
        position: employee.position || "",
        contact: employee.contact || "",
        hireDate: employee.hireDate || "",
        status: employee.status || "Active",
        address: employee.address || "",
        birthday: employee.birthday || "",
        emergencyName: employee.emergencyName || "",
        emergencyContact: employee.emergencyContact || "",
        nickname: employee.nickname || "",
        employmentType: employee.employmentType || "",
      });
          setPreview(employee.photo || "");
    } else {
      setForm(emptyForm);
      setPreview("");
    }
    setPhoto(null);
    setError("");
  }, [show, employee]);

  const UPPER_FIELDS = ["lastName", "firstName", "middleName"];
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: UPPER_FIELDS.includes(name) ? value.toUpperCase() : value });
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file || null);
    setPreview(file ? URL.createObjectURL(file) : "");
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setForm(emptyForm);
    setPhoto(null);
    setPreview("");
    setError("");
  };

  const handleClose = () => {
    reset();
    onHide();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

      try {
      // undefined = keep the current photo; a new file is shrunk in the browser
      const photoData = photo ? await compressImage(photo) : undefined;
      saveEmployee({ id: employee ? employee.id : null, form, photo: photoData, existing: employee });
      reset();
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
        <Modal show={show} onHide={handleClose} size="lg" backdrop="static" centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
                    <Modal.Title>{employee ? "Edit Employee" : "Add Employee"}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          <Row className="mb-3 align-items-center">
            <Col xs="auto">
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  width="96"
                  height="96"
                  className="rounded-circle"
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <div
                  className="rounded-circle bg-light border d-flex align-items-center justify-content-center text-muted"
                  style={{ width: 96, height: 96 }}
                >
                  No photo
                </div>
              )}
            </Col>
            <Col>
              <Form.Label>Photo</Form.Label>
              <Form.Control type="file" accept="image/*" onChange={handlePhoto} />
                          <Form.Text muted>Image files only. Photos are resized automatically.</Form.Text>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={4}>
              <Form.Label>ID Number</Form.Label>
              <Form.Control name="idNumber" value={form.idNumber} onChange={handleChange} />
            </Col>
            <Col md={4}>
              <Form.Label>Hire Date</Form.Label>
              <Form.Control type="date" name="hireDate" value={form.hireDate} onChange={handleChange} />
            </Col>
            <Col md={4}>
              <Form.Label>Status</Form.Label>
              <Form.Select name="status" value={form.status} onChange={handleChange}>
                <option>Active</option>
                <option>Inactive</option>
              </Form.Select>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={3}>
              <Form.Label>Last Name *</Form.Label>
              <Form.Control name="lastName" className="text-uppercase" value={form.lastName} onChange={handleChange} required />
            </Col>
            <Col md={3}>
              <Form.Label>First Name *</Form.Label>
              <Form.Control name="firstName"  className="text-uppercase" value={form.firstName} onChange={handleChange} required />
            </Col>
            <Col md={3}>
              <Form.Label>Middle Name</Form.Label>
              <Form.Control name="middleName"  className="text-uppercase" value={form.middleName} onChange={handleChange} />
            </Col>
            <Col md={3}>
              <Form.Label>Suffix</Form.Label>
              <Form.Select name="suffix" value={form.suffix} onChange={handleChange}>
                <option value="">None</option>
                {form.suffix && !SUFFIXES.includes(form.suffix) && (
                  <option value={form.suffix}>{form.suffix}</option>
                )}
                {SUFFIXES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Form.Select>
            </Col>
          </Row>

                    <Row className="mb-3">
            <Col md={4}>
              <Form.Label>Nickname</Form.Label>
              <Form.Control
              className="text-uppercase"
                name="nickname"
                value={form.nickname}
                onChange={handleChange}
                placeholder="Optional"
                maxLength={30}
              />
            </Col>
            <Col md={4}>
              <Form.Label>Employment Type</Form.Label>
              <Form.Select name="employmentType" value={form.employmentType} onChange={handleChange}>
                <option value="">Select a Type</option>
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Form.Select>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={4}>
              <Form.Label>Department</Form.Label>
                          <Form.Select name="department" value={form.department} onChange={handleChange}>
                <option value="">Select a Department</option>
                {form.department && !DEPARTMENTS.includes(form.department) && (
                  <option value={form.department}>{form.department}</option>
                )}
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Label>Position</Form.Label>
                           <Form.Select name="position" value={form.position} onChange={handleChange}>
                <option value="">Select a Position</option>
                {form.position && !POSITIONS.includes(form.position) && (
                  <option value={form.position}>{form.position}</option>
                )}
                {POSITIONS.map((p) => {
                  const locked =
                    form.status === "Active" &&
                    UNIQUE_POSITIONS.includes(p) &&
                    takenPositions.has(p);
                  return (
                    <option key={p} value={p} disabled={locked}>
                      {locked ? `${p} (taken)` : p}
                    </option>
                  );
                })}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Label>Contact</Form.Label>
              <Form.Control name="contact" value={form.contact} onChange={handleChange} />
            </Col>
          </Row>
                    <Row className="mb-3">
            <Col md={8}>
              <Form.Label>Address</Form.Label>
              <Form.Control name="address" className="text-capitalize" value={form.address} onChange={handleChange} />
            </Col>
            <Col md={4}>
              <Form.Label>Birthday</Form.Label>
              <Form.Control
                type="date"
                name="birthday"
                value={form.birthday}
                max={new Date().toISOString().slice(0, 10)}
                onChange={handleChange}
              />
            </Col>
          </Row>

          <Row className="mb-1">
            <Col md={8}>
              <Form.Label>Emergency Contact Person</Form.Label>
              <Form.Control name="emergencyName" className="text-uppercase" value={form.emergencyName} onChange={handleChange} />
            </Col>
            <Col md={4}>
              <Form.Label>Emergency Contact Number</Form.Label>
              <Form.Control name="emergencyContact" value={form.emergencyContact} onChange={handleChange} />
            </Col>
          </Row>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}