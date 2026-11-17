import { useState, useEffect } from "react";
import { Container, Button, Dropdown, Offcanvas } from "react-bootstrap";
import EmployeeList from "./EmployeeList";
import EmployeeForm from "./EmployeeForm";
import Login from "./Login";
import UsersModal from "./UsersModal";
import ChangePasswordModal from "./ChangePasswordModal";
import LogModal from "./LogModal";
import ConfirmModal from "./ConfirmModal";
import NoticeModal from "./NoticeModal";
import EmployeeDetails from "./EmployeeDetails";
import LeadershipCards from "./LeadershipCards";
import Dashboard from "./Dashboard";
import NavLinks from "./Sidebar";
import { useAuth, logout } from "./auth";

export default function App() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [user, authMessage] = useAuth(); // undefined = checking, null = logged out

  const handleLogout = () => logout();

    const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `employees-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setNotice({
        title: "Export failed",
        message: "Could not create the Excel file.",
        variant: "danger",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleEdit = (employee) => {
    setEditing(employee);
    setShowForm(true);
  };

  const handleDelete = (employee) => setDeleting(employee);

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/employees/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDeleting(null);
      setRefreshKey((k) => k + 1);
    } catch {
      setDeleting(null);
      setNotice({
        title: "Delete failed",
        message: "Could not delete the employee.",
        variant: "danger",
      });
    } finally {
      setDeleteBusy(false);
    }
  };

    const [showUsers, setShowUsers] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
    const [exporting, setExporting] = useState(false);
      const [showLog, setShowLog] = useState(false);
        const [showLogout, setShowLogout] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [notice, setNotice] = useState(null);
    const [viewing, setViewing] = useState(null);
      const [view, setView] = useState("employees");
  const [showMenu, setShowMenu] = useState(false);

  // after every login the main page is always the Employees list
  useEffect(() => {
    setView("employees");
  }, [user?.id]);

    if (user === undefined) {
    return <Container className="mt-4">Loading...</Container>;
  }
  if (user === null) {
    return <Login message={authMessage} />;
  }

  const canEdit = ["admin", "hr", "editor"].includes(user.role);
  const canDelete = ["admin", "hr"].includes(user.role);
  const canExport = ["admin", "hr"].includes(user.role);
  const isAdmin = user.role === "admin";

   return (
    <>
      <header className="app-topbar">
        <Container className="d-flex align-items-center justify-content-between">
             <div className="brand d-flex align-items-center gap-2">
            <Button
              variant="outline-light"
              size="sm"
              className="d-lg-none nav-toggle"
              onClick={() => setShowMenu(true)}
              aria-label="Open menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </Button>
                        <img src="/logo.png" alt="Logo" className="brand-logo" />
            <span className="brand-title">DPWH Employee Management System</span>
          </div>

          <Dropdown align="end">
            <Dropdown.Toggle variant="light" size="sm" className="user-chip">
              <span className="user-avatar">
                {(user.fullName || user.username).charAt(0).toUpperCase()}
              </span>
                 <span className="user-name" title={user.fullName || user.username}>
                {user.fullName || user.username}
              </span>
              <span className={`role-badge role-${user.role}`}>{user.role}</span>
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => setShowPassword(true)}>
                Change password
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item onClick={() => setShowLogout(true)}>Log out</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Container>
      </header>

      <div className="app-shell">
        <aside className="sidebar">
          <NavLinks view={view} onSelect={setView} />
        </aside>

        <main className="app-main">
          {view === "dashboard" ? (
            <Dashboard canSeePersonal={canExport} onView={setViewing} />
          ) : (
      <Container className="page">
        <div className="page-head">
          <div>
            <h1 className="page-title">Employees</h1>
            <p className="page-sub">Manage employee records, photos and status.</p>
          </div>

          <div className="d-flex flex-wrap gap-2">
            {canEdit && (
              <Button
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
              >
                + Add Employee
              </Button>
            )}
            {canExport && (
              <>
                <Button variant="outline-success" onClick={handleExport} disabled={exporting}>
                  {exporting ? "Exporting..." : "Export Excel"}
                </Button>
                <Button variant="outline-dark" href="/api/backup">
                  Backup
                </Button>
              </>
            )}
            {isAdmin && (
              <>
                <Button variant="outline-primary" onClick={() => setShowUsers(true)}>
                  Users
                </Button>
                <Button variant="outline-secondary" onClick={() => setShowLog(true)}>
                  Activity Log
                </Button>
              </>
            )}
          </div>
        </div>

        <LeadershipCards refreshKey={refreshKey} onView={setViewing} />

        <div className="surface">
          <EmployeeList
            refreshKey={refreshKey}
            onEdit={handleEdit}
            onDelete={handleDelete}
            canEdit={canEdit}
            canDelete={canDelete}
            onUnauthorized={() => {}}
            onView={setViewing}
          />
        </div>
      </Container>
          )}
        </main>
      </div>

      <EmployeeForm
        show={showForm}
        employee={editing}
        onHide={() => setShowForm(false)}
        onSaved={() => {
          setShowForm(false);
          setRefreshKey((k) => k + 1);
        }}
      />
      {user.role === "admin" && (
        <UsersModal
          show={showUsers}
          onHide={() => setShowUsers(false)}
          currentUser={user}
        />
      )}
            {isAdmin && (
        <LogModal show={showLog} onHide={() => setShowLog(false)} />
      )}
      <ChangePasswordModal
        show={showPassword}
        onHide={() => setShowPassword(false)}
      />
            <EmployeeDetails
        show={!!viewing}
        employee={viewing}
        onHide={() => setViewing(null)}
        onEdit={
          canEdit
            ? (emp) => {
                setViewing(null);
                handleEdit(emp);
              }
            : null
        }
        onDelete={
          canDelete
            ? (emp) => {
                setViewing(null);
                handleDelete(emp);
              }
            : null
        }
      />
            <Offcanvas
        show={showMenu}
        onHide={() => setShowMenu(false)}
        placement="start"
        className="nav-offcanvas"
      >
        <Offcanvas.Header closeButton closeVariant="white">
          <Offcanvas.Title className="d-flex align-items-center gap-2">
            <img src="/logo.png" alt="" className="brand-logo" />
            Menu
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <NavLinks
            view={view}
            onSelect={(v) => {
              setView(v);
              setShowMenu(false);
            }}
          />
        </Offcanvas.Body>
      </Offcanvas>

            <ConfirmModal
        show={showLogout}
        title="Log out"
        confirmText="Log out"
        onCancel={() => setShowLogout(false)}
        onConfirm={async () => {
          setShowLogout(false);
          await handleLogout();
        }}
      >
        Do you want to log out of the system?
      </ConfirmModal>

      <ConfirmModal
        show={!!deleting}
        title="Delete employee"
        confirmText="Delete"
        confirmVariant="danger"
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      >
        {deleting && (
          <>
            Delete <strong>{deleting.firstName} {deleting.lastName}</strong>? Their
            record and photo will be permanently removed. This cannot be undone.
          </>
        )}
      </ConfirmModal>

      <NoticeModal
        show={!!notice}
        title={notice?.title}
        message={notice?.message}
        variant={notice?.variant}
        onClose={() => setNotice(null)}
      />
    </>
  );
}