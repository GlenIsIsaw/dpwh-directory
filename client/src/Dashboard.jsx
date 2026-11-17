import { useEffect, useState } from "react";
import { Container, Row, Col, ProgressBar, Spinner, Alert, Badge } from "react-bootstrap";
import { EMPLOYMENT_TYPES } from "./options";
import { LEADER_POSITIONS, pickLeaders } from "./leaders";
import { DonutChart, ColumnChart } from "./Charts";
import { useEmployees } from "./employeesData";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function listName(e) {
  const suf = e.suffix ? ` ${e.suffix}` : "";
  return `${e.lastName}, ${e.firstName}${suf}`;
}

function countBy(list, getKey) {
  const map = new Map();
  list.forEach((item) => {
    const key = getKey(item);
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
}

function StatCard({ label, value, tone }) {
  return (
    <div className={`stat-card ${tone || ""}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function BarList({ rows, total }) {
  return (
    <>
      {rows.map(([label, count]) => (
        <div key={label} className="bar-row">
          <div className="bar-head">
            <span className="bar-label">{label}</span>
            <span className="bar-count">{count}</span>
          </div>
          <ProgressBar now={total ? (count / total) * 100 : 0} className="bar-track" />
        </div>
      ))}
    </>
  );
}

const AGE_GROUPS = [
  ["Under 30", 0, 29],
  ["30–39", 30, 39],
  ["40–49", 40, 49],
  ["50–59", 50, 59],
  ["60+", 60, 200],
];

function ageOf(birthday, now) {
  const [y, m, d] = birthday.split("-").map(Number);
  let age = now.getFullYear() - y;
  const month = now.getMonth() + 1;
  if (month < m || (month === m && now.getDate() < d)) age -= 1;
  return age;
}

export default function Dashboard({ canSeePersonal, onView }) {
  const { employees, loading, error } = useEmployees();

  if (error) {
    return <Container className="page"><Alert variant="danger">{error}</Alert></Container>;
  }
  if (loading) {
    return <Container className="page"><Spinner animation="border" /></Container>;
  }

  const active = employees.filter((e) => e.status === "Active");
  const inactive = employees.length - active.length;
  const filled = pickLeaders(employees).size;
  const vacant = LEADER_POSITIONS.length - filled;

  const typeCounts = countBy(active, (e) => e.employmentType || "Not set");
  const typeRows = [...EMPLOYMENT_TYPES, "Not set"]
    .map((t) => [t, typeCounts.get(t) || 0])
    .filter(([t, c]) => t !== "Not set" || c > 0);

  const deptCounts = countBy(active, (e) => e.department || "Not set");
  const deptRows = [...deptCounts.entries()].sort((a, b) => b[1] - a[1]);

  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const birthdays = active
    .filter((e) => e.birthday && e.birthday.slice(5, 7) === month)
    .sort((a, b) => a.birthday.slice(8, 10).localeCompare(b.birthday.slice(8, 10)));

  const missing = [
    ["Photo", active.filter((e) => !e.photo).length],
    ["Employment type", active.filter((e) => !e.employmentType).length],
    ["Birthday", active.filter((e) => !e.birthday).length],
    ["Emergency contact", active.filter((e) => !e.emergencyName || !e.emergencyContact).length],
  ];

     const typeData = typeRows.map(([label, value]) => ({ label, value }));

  const thisYear = now.getFullYear();
  const firstYear = thisYear - 9;
  const hireCounts = new Map();
  let earlier = 0;
  let noHireDate = 0;
  active.forEach((e) => {
    if (!e.hireDate) {
      noHireDate += 1;
      return;
    }
    const y = Number(e.hireDate.slice(0, 4));
    if (y < firstYear) earlier += 1;
    else if (y <= thisYear) hireCounts.set(y, (hireCounts.get(y) || 0) + 1);
  });
  const hireData = [];
  if (earlier > 0) hireData.push({ label: "Earlier", value: earlier });
  for (let y = firstYear; y <= thisYear; y += 1) {
    hireData.push({ label: String(y), value: hireCounts.get(y) || 0 });
  }

  const ageCounts = AGE_GROUPS.map(([label, min, max]) => ({ label, min, max, value: 0 }));
  let noBirthday = 0;
  active.forEach((e) => {
    if (!e.birthday) {
      noBirthday += 1;
      return;
    }
    const age = ageOf(e.birthday, now);
    const group = ageCounts.find((g) => age >= g.min && age <= g.max);
    if (group) group.value += 1;
  });

  return (
    <Container className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">A summary of the active employee records.</p>
        </div>
      </div>

      <Row xs={2} lg={4} className="g-2 g-md-3 mb-3">
        <Col><StatCard label="Active employees" value={active.length} tone="is-blue" /></Col>
        <Col><StatCard label="Inactive" value={inactive} /></Col>
        <Col><StatCard label="Leadership posts filled" value={`${filled}/${LEADER_POSITIONS.length}`} tone="is-gold" /></Col>
        <Col><StatCard label="Vacant leadership posts" value={vacant} tone={vacant > 0 ? "is-warn" : ""} /></Col>
      </Row>

      <Row className="g-3">
        <Col lg={6}>
          <div className="surface p-3 h-100">
            <h6 className="panel-title">By employment type</h6>
            <DonutChart data={typeData} centerLabel="active" />
          </div>
        </Col>
        <Col lg={6}>
          <div className="surface p-3 h-100">
            <h6 className="panel-title">Hired per year</h6>
            <ColumnChart data={hireData} />
            {noHireDate > 0 && (
              <div className="chart-note">{noHireDate} without a hire date</div>
            )}
          </div>
        </Col>
        <Col lg={canSeePersonal ? 6 : 12}>
          <div className="surface p-3 h-100">
            <h6 className="panel-title">By department</h6>
            <BarList rows={deptRows} total={active.length} />
          </div>
        </Col>
        {canSeePersonal && (
          <Col lg={6}>
            <div className="surface p-3 h-100">
              <h6 className="panel-title">Age groups</h6>
              <ColumnChart data={ageCounts} color="#c9a227" />
              {noBirthday > 0 && (
                <div className="chart-note">{noBirthday} without a birthday</div>
              )}
            </div>
          </Col>
        )}

        {canSeePersonal && (
          <>
            <Col lg={6}>
              <div className="surface p-3 h-100">
                <h6 className="panel-title">
                  Birthdays in {now.toLocaleString(undefined, { month: "long" })}
                </h6>
                <ul className="dash-list">
                  {birthdays.map((e) => {
                    const day = Number(e.birthday.slice(8, 10));
                    return (
                      <li key={e.id}>
                        <button type="button" className="dash-link" onClick={() => onView(e)}>
                          <span className="dash-date">{MONTHS[now.getMonth()]} {day}</span>
                          <span>{listName(e)}</span>
                          {day === now.getDate() && (
                            <Badge bg="warning" text="dark">Today</Badge>
                          )}
                        </button>
                      </li>
                    );
                  })}
                  {birthdays.length === 0 && (
                    <li className="text-muted">No birthdays this month.</li>
                  )}
                </ul>
              </div>
            </Col>

            <Col lg={6}>
              <div className="surface p-3 h-100">
                <h6 className="panel-title">Needs attention</h6>
                <ul className="dash-list">
                  {missing.map(([label, count]) => (
                    <li key={label} className="d-flex justify-content-between align-items-center">
                      <span>{label}</span>
                      {count === 0 ? (
                        <Badge bg="success">Complete</Badge>
                      ) : (
                        <Badge bg="warning" text="dark">{count} missing</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </Col>
          </>
        )}
      </Row>
    </Container>
  );
}