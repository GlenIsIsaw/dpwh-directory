import { useEffect, useState } from "react";
import { Table, Alert, Spinner, Button, Form, Row, Col, Pagination } from "react-bootstrap";
import { pickLeaders } from "./leaders";

// set to false to show the leaders in the table again
const HIDE_LEADERS = true;

function fullName(e) {
  const mid = e.middleName ? ` ${e.middleName.charAt(0)}.` : "";
  const suf = e.suffix ? ` ${e.suffix}` : "";
  return `${e.lastName}, ${e.firstName}${mid}${suf}`;
}

function Avatar({ employee }) {
  if (employee.photo) {
    return (
      <img
        src={`/uploads/${employee.photo}`}
        alt={fullName(employee)}
        width="48"
        height="48"
        className="rounded-circle"
        style={{ objectFit: "cover" }}
      />
    );
  }
  const initials = `${employee.firstName[0]}${employee.lastName[0]}`;
  return (
    <div
            className="avatar-initials rounded-circle d-flex align-items-center justify-content-center"
      style={{ width: 48, height: 48 }}
    >
      {initials}
    </div>
  );
}

function pageWindow(current, total) {
  const start = Math.max(1, Math.min(current - 2, total - 4));
  const end = Math.min(total, start + 4);
  const pages = [];
  for (let p = start; p <= end; p++) pages.push(p);
  return pages;
}

export default function EmployeeList({ refreshKey, onEdit, onDelete, canEdit, canDelete, onUnauthorized, onView }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

    const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [search, deptFilter, statusFilter, pageSize]);

  useEffect(() => {
    fetch("/api/employees")
      .then((res) => {
        if (res.status === 401) {
          onUnauthorized();
          throw new Error("Not logged in");
        }
        if (!res.ok) throw new Error("Bad response");
        return res.json();
      })
      .then(setEmployees)
      .catch(() => setError("Cannot reach server"))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) return <Spinner animation="border" />;
  if (error) return <Alert variant="danger">{error}</Alert>;
  if (employees.length === 0) {
    return <Alert variant="info">No employees yet.</Alert>;
  }

  const departments = [
    ...new Set(employees.map((e) => e.department).filter(Boolean)),
  ].sort();

  const term = search.trim().toLowerCase();
  const leaderIds = new Set([...pickLeaders(employees).values()].map((p) => p.id));
  const hideLeaders = HIDE_LEADERS && !term;
  const hiddenLeaders = hideLeaders ? leaderIds.size : 0;
  const filtered = employees.filter((e) => {
       const text = [e.idNumber, e.lastName, e.firstName, e.middleName, e.nickname, e.department, e.position, e.employmentType]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      !(hideLeaders && leaderIds.has(e.id)) &&
      (!term || text.includes(term)) &&
      (!deptFilter || e.department === deptFilter) &&
      (!statusFilter || e.status === statusFilter)
    );
  });

    const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);
  const startIndex = (current - 1) * pageSize;
  const pageRows = filtered.slice(startIndex, startIndex + pageSize);

  return (
    <>
            <div className="toolbar">
      <Row className="g-2">
        <Col md={6}>
          <Form.Control
            type="search"
            className="text-capitalize"
            placeholder="Search name, ID number, department, position..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Col>
        <Col md={3}>
          <Form.Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </Form.Select>
        </Col>
        </Row>
      </div>
      <div className="result-count">
        Showing {filtered.length} of {employees.length} Employees
        {hiddenLeaders > 0 && ""}
      </div>
      <Table hover responsive className="align-middle emp-table">
      <thead>
        <tr>
          <th>Profile</th>
          <th>ID No.</th>
          <th>Name</th>
          <th>Department</th>
             <th className="d-none d-xl-table-cell">Position</th>
          <th>Status</th>
          {(canEdit || canDelete) && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {pageRows.map((e) => (
          <tr
            key={e.id}
            className="clickable"
            tabIndex={0}
            onClick={() => onView(e)}
            onKeyDown={(ev) => ev.target === ev.currentTarget && ev.key === "Enter" && onView(e)}
          >
            <td><Avatar employee={e} /></td>
            <td>{e.idNumber}</td>
                                <td className="fw-semibold text-uppercase">
              {fullName(e)}
              <div className="d-md-none small text-muted fw-normal">
                {e.position || e.department}
              </div>
            </td>
            <td>{e.department}</td>
            <td className="d-none d-xl-table-cell">{e.position}</td>
            <td className="d-none d-sm-table-cell">
              <span className={`status-badge ${e.status === "Active" ? "is-active" : "is-inactive"}`}>
                {e.status}
              </span>
            </td>
            {(canEdit || canDelete) && (
              <td className="text-nowrap" onClick={(ev) => ev.stopPropagation()}>
                {canEdit && (
                  <Button size="sm" variant="outline-primary" className="me-2" onClick={() => onEdit(e)}>
                    Edit
                  </Button>
                )}
                {canDelete && (
                  <Button size="sm" variant="outline-danger" onClick={() => onDelete(e)}>
                    Delete
                  </Button>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </Table>
      {filtered.length === 0 && (
        <Alert variant="warning">No employees match your search.</Alert>
      )}

      {total > 0 && (
        <div className="pager">
          <div className="pager-info">
            {startIndex + 1}–{Math.min(startIndex + pageSize, total)} of {total}
          </div>

          <div className="d-flex d-sm-none align-items-center gap-2">
            <Button size="sm" variant="outline-primary" disabled={current === 1} onClick={() => setPage(current - 1)}>
              Prev
            </Button>
            <span className="small text-muted">
              Page {current} of {totalPages}
            </span>
            <Button size="sm" variant="outline-primary" disabled={current === totalPages} onClick={() => setPage(current + 1)}>
              Next
            </Button>
          </div>

          <Pagination className="mb-0 d-none d-sm-flex">
            <Pagination.First disabled={current === 1} onClick={() => setPage(1)} />
            <Pagination.Prev disabled={current === 1} onClick={() => setPage(current - 1)} />
            {pageWindow(current, totalPages).map((p) => (
              <Pagination.Item key={p} active={p === current} onClick={() => setPage(p)}>
                {p}
              </Pagination.Item>
            ))}
            <Pagination.Next disabled={current === totalPages} onClick={() => setPage(current + 1)} />
            <Pagination.Last disabled={current === totalPages} onClick={() => setPage(totalPages)} />
          </Pagination>

          <Form.Select
            size="sm"
            className="pager-size"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </Form.Select>
        </div>
      )}
    </>
  );
}