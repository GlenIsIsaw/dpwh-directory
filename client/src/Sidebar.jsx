import { Nav } from "react-bootstrap";

const ICON = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

const ITEMS = [
  {
    key: "employees",
    label: "Employees",
    icon: (
      <svg {...ICON} aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: "dashboard",
    label: "Dashboard",
    icon: (
      <svg {...ICON} aria-hidden="true">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

export default function NavLinks({ view, onSelect }) {
  return (
    <Nav className="side-nav flex-column gap-1">
      {ITEMS.map((item) => (
        <Nav.Link
          as="button"
          type="button"
          key={item.key}
          active={view === item.key}
          onClick={() => onSelect(item.key)}
        >
          {item.icon}
          {item.label}
        </Nav.Link>
      ))}
    </Nav>
  );
}