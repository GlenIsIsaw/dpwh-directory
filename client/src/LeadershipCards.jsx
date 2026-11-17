import { useEmployees } from "./employeesData";
import { UNIQUE_POSITIONS } from "./options";
import { pickLeaders } from "./leaders";

const TOP_SLOTS = ["District Engineer", "Assistant District Engineer"];
const CHIEF_SLOTS = UNIQUE_POSITIONS.filter((p) => p.startsWith("OIC"));

function fullName(e) {
  const mid = e.middleName ? ` ${e.middleName.charAt(0)}.` : "";
  const suf = e.suffix ? ` ${e.suffix}` : "";
  return `${e.firstName}${mid} ${e.lastName}${suf}`;
}

function initials(e) {
  return `${e.firstName[0] || ""}${e.lastName[0] || ""}`;
}

// "OIC - Chief, Finance Section" -> "Finance Section"
function sectionOf(position) {
  return position.replace(/^OIC\s*[-–]\s*Chief,?\s*/i, "");
}

export default function LeadershipCards({ onView }) {
  const { employees, loading, error } = useEmployees();

  if (loading || error) return null;

  const leaders = pickLeaders(employees);
  const holder = (position) => leaders.get(position);

  const openProps = (person) => ({
    role: "button",
    tabIndex: 0,
    onClick: () => onView(person),
    onKeyDown: (ev) => ev.key === "Enter" && onView(person),
  });

  return (
    <>
      <div className="lead-grid">
        {TOP_SLOTS.map((position) => {
          const person = holder(position);

          if (!person) {
            return (
              <div key={position} className="lead-card is-vacant">
                <div className="lead-photo is-empty">?</div>
                <div className="lead-body">
                  <div className="lead-role">{position}</div>
                  <div className="lead-name text-muted">Vacant</div>
                </div>
              </div>
            );
          }

          return (
            <div key={position} className="lead-card" {...openProps(person)}>
              {person.photo ? (
                <div className="lead-photo">
                  <img src={person.photo} alt={fullName(person)} />
                </div>
              ) : (
                <div className="lead-photo is-empty">{initials(person)}</div>
              )}
              <div className="lead-body">
                <div className="lead-role">{position}</div>
                <div className="lead-name text-uppercase fw-bold">{fullName(person)}</div>
                <div className="lead-dept">{person.department}</div>
              </div>
            </div>
          );
        })}
      </div>

      {CHIEF_SLOTS.length > 0 && (
        <>
          <div className="lead-subtitle">Section Chiefs (OIC)</div>
          <div className="chief-row">
            {CHIEF_SLOTS.map((position) => {
              const person = holder(position);

              if (!person) {
                return (
                  <div key={position} className="chief-card is-vacant">
                    <div className="chief-photo">?</div>
                    <div className="chief-role">OIC Chief</div>
                    <div className="chief-name text-muted">Vacant</div>
                    <div className="chief-section">{sectionOf(position)}</div>
                  </div>
                );
              }

              return (
                <div key={position} className="chief-card" {...openProps(person)}>
                  <div className="chief-photo">
                    {person.photo ? (
                      <img src={person.photo} alt={fullName(person)} />
                    ) : (
                      initials(person)
                    )}
                  </div>
                  <div className="chief-role">OIC Chief</div>
                  <div className="chief-name">{fullName(person)}</div>
                  <div className="chief-section">{sectionOf(position)}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}