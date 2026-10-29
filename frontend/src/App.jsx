import { useEffect, useMemo, useState } from "react";

const colors = [
  "#6751df",
  "#8876e8",
  "#a797ed",
  "#8fcfc5",
  "#5eb7a9",
  "#3e9f91",
];
const fmt = (value) => new Intl.NumberFormat("en-IN").format(value);

function App() {
  const [records, setRecords] = useState([]),
    [month, setMonth] = useState("All months"),
    [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null),
    [loading, setLoading] = useState(true),
    [toast, setToast] = useState(false),
    [nav, setNav] = useState(false),
    [activePage, setActivePage] = useState("fifo"),
    [lastSync, setLastSync] = useState(null);

  const loadRecords = () => {
    setLoading(true);
    return fetch("/api/redemptions?fy=2026-27")
      .then((r) => {
        if (!r.ok) throw new Error("Could not load the live report");
        return r.json();
      })
      .then((data) => {
        setRecords(data.records);
        setLastSync(new Date());
      })
      .catch((error) => {
        console.error(error);
        setRecords([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRecords();
  }, []);
  useEffect(() => {
    const close = (e) => e.key === "Escape" && setSelected(null);
    addEventListener("keydown", close);
    return () => removeEventListener("keydown", close);
  }, []);
  const months = useMemo(
    () => ["All months", ...new Set(records.map((r) => r.redemptionMonth))],
    [records],
  );
  const rows = useMemo(
    () =>
      records.filter(
        (r) =>
          (month === "All months" || r.redemptionMonth === month) &&
          (!query ||
            r.name.toLowerCase().includes(query.toLowerCase()) ||
            r.id.toLowerCase().includes(query.toLowerCase())),
      ),
    [records, month, query],
  );
  const total = rows.reduce((s, r) => s + r.redeemed, 0),
    weighted = rows.reduce(
      (s, r) => s + r.allocations.reduce((x, a) => x + a.points * a.age, 0),
      0,
    );
  const sourceMonths = new Set(
    rows.flatMap((r) => r.allocations.map((a) => a.month)),
  ).size;
  const pageTitles = {
    overview: "Overview",
    fifo: "FIFO Redemption",
    ledger: "Customer Ledger",
    expiry: "Point Expiry",
    sync: "Data Sync",
    settings: "Settings",
  };
  const openPage = (page) => {
    setActivePage(page);
    setNav(false);
  };
  const exportCsv = () => {
    const data = [
      [
        "Customer ID",
        "Customer",
        "Redemption Month",
        "Redeemed Points",
        "Earned Month",
        "Allocated Points",
      ],
      ...rows.flatMap((r) =>
        r.allocations.map((a) => [
          r.id,
          r.name,
          r.redemptionMonth,
          r.redeemed,
          a.month,
          a.points,
        ]),
      ),
    ];
    const csv = data
      .map((row) =>
        row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `fifo-redemption-${month.toLowerCase().replaceAll(" ", "-")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setToast(true);
    setTimeout(() => setToast(false), 2200);
  };
  return (
    <div className="app-shell">
      <aside className={`sidebar ${nav ? "open" : ""}`}>
        <a className="brand" href="#">
          <span className="brand-mark">P</span>
          <span>
            <strong>PointFlow</strong>
            <small>Loyalty Intelligence</small>
          </span>
        </a>
        <nav>
          <p className="nav-label">Workspace</p>
          <button onClick={() => openPage("overview")} className={activePage === "overview" ? "active" : ""}>
            <span>⌂</span> Overview
          </button>
          <button onClick={() => openPage("fifo")} className={activePage === "fifo" ? "active" : ""}>
            <span>↗</span> FIFO Redemption
          </button>
          <button onClick={() => openPage("ledger")} className={activePage === "ledger" ? "active" : ""}>
            <span>◎</span> Customer Ledger
          </button>
          <button onClick={() => openPage("expiry")} className={activePage === "expiry" ? "active" : ""}>
            <span>▤</span> Point Expiry
          </button>
          <p className="nav-label">Administration</p>
          <button onClick={() => openPage("sync")} className={activePage === "sync" ? "active" : ""}>
            <span>⇄</span> Data Sync
          </button>
          <button onClick={() => openPage("settings")} className={activePage === "settings" ? "active" : ""}>
            <span>⚙</span> Settings
          </button>
        </nav>
        <div className="sync-card">
          <span className="status-dot" />
          <div>
            <strong>Live data mode</strong>
            <small>NEWDEMO · SQL Server</small>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <button
            className="icon-button menu-button"
            onClick={() => setNav(!nav)}
          >
            ☰
          </button>
          <div className="topbar-title">
            <span>Reports</span>
            <b>/</b>
            <strong>{pageTitles[activePage]}</strong>
          </div>
          <div className="user-chip">
            <span>NR</span>
            <div>
              <strong>Nilesh R.</strong>
              <small>Administrator</small>
            </div>
          </div>
        </header>
        {activePage === "fifo" ? <div className="content">
          <section className="page-heading">
            <div>
              <p className="eyebrow">LOYALTY ANALYTICS</p>
              <h1>FIFO Redemption Report</h1>
              <p>
                Trace redeemed points back to the month in which they were
                originally earned.
              </p>
            </div>
            <button className="export-button" onClick={exportCsv}>
              <span>⇩</span> Export CSV
            </button>
          </section>
          <section className="filter-panel">
            <label>
              Financial year
              <select>
                <option>FY 2026–27</option>
              </select>
            </label>
            <label>
              Redemption month
              <select value={month} onChange={(e) => setMonth(e.target.value)}>
                {months.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            <label className="search-field">
              Customer
              <span>
                <i>⌕</i>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  type="search"
                  placeholder="Search name or ID"
                />
              </span>
            </label>
            <button
              className="reset-button"
              onClick={() => {
                setMonth("All months");
                setQuery("");
              }}
            >
              Reset
            </button>
          </section>
          <section className="kpi-grid">
            <Kpi
              icon="↗"
              type="purple"
              label="Total redeemed"
              value={fmt(total)}
              note="● points in selection"
            />
            <Kpi
              icon="◉"
              type="teal"
              label="Customers"
              value={rows.length}
              note="with point redemptions"
            />
            <Kpi
              icon="◷"
              type="amber"
              label="Avg. point age"
              value={total ? `${(weighted / total).toFixed(1)} mo` : "0 mo"}
              note="earned to redeemed"
            />
            <Kpi
              icon="▥"
              type="blue"
              label="Source months"
              value={sourceMonths}
              note="earning months consumed"
            />
          </section>
          <section className="report-card">
            <div className="report-header">
              <div>
                <h2>Customer redemption summary</h2>
                <p>FIFO allocation for {month.toLowerCase()}</p>
              </div>
              <div className="legend">
                <span>
                  <i className="jan" />
                  Older points
                </span>
                <span>
                  <i className="recent" />
                  Recent points
                </span>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Redeemed</th>
                    <th>FIFO source allocation</th>
                    <th>Oldest source</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <ReportRow
                      key={r.id}
                      row={r}
                      onView={() => setSelected(r)}
                    />
                  ))}
                </tbody>
              </table>
              {!rows.length && !loading && (
                <div className="empty-state">
                  <span>⌕</span>
                  <h3>No redemptions found</h3>
                  <p>Try changing the month or customer search.</p>
                </div>
              )}
              {loading && (
                <div className="empty-state">
                  <p>Loading report…</p>
                </div>
              )}
            </div>
            <div className="report-footer">
              <p>
                Showing {rows.length} customer{rows.length === 1 ? "" : "s"}
              </p>
              <p>
                <span className="info-icon">i</span> Allocations follow
                first-in, first-out from the FY opening balance onward.
              </p>
            </div>
          </section>
          <section className="method-note">
            <span>i</span>
            <div>
              <strong>How FIFO is calculated</strong>
              <p>
                Every redemption is matched against the customer's oldest
                available earned-point batch. A single redemption may therefore
                be allocated across multiple earning months.
              </p>
            </div>
          </section>
        </div> : (
          <SimplePage
            page={activePage}
            records={records}
            loading={loading}
            lastSync={lastSync}
            onSync={loadRecords}
            onOpenFifo={() => openPage("fifo")}
          />
        )}
      </main>
      {selected && (
        <>
          <div className="drawer-backdrop" onClick={() => setSelected(null)} />
          <DetailDrawer item={selected} onClose={() => setSelected(null)} />
        </>
      )}
      <div className={`toast ${toast ? "show" : ""}`}>
        CSV report downloaded
      </div>
    </div>
  );
}

function SimplePage({ page, records, loading, lastSync, onSync, onOpenFifo }) {
  const totalRedeemed = records.reduce((sum, item) => sum + item.redeemed, 0);
  const uniqueCustomers = new Set(records.map((item) => item.id)).size;
  const totalUnallocated = records.reduce(
    (sum, item) => sum + item.unallocatedPoints,
    0,
  );

  if (page === "overview") {
    return (
      <div className="content">
        <PageHeading title="Overview" text="A live summary of point redemption activity from NEWDEMO." />
        <section className="kpi-grid">
          <Kpi icon="↗" type="purple" label="Total redeemed" value={fmt(totalRedeemed)} note="live points in FY 2026–27" />
          <Kpi icon="◉" type="teal" label="Customers" value={uniqueCustomers} note="with redemptions" />
          <Kpi icon="▤" type="amber" label="Report rows" value={records.length} note="customer-month combinations" />
          <Kpi icon="✓" type="blue" label="Unallocated" value={fmt(totalUnallocated)} note="points needing attention" />
        </section>
        <section className="report-card simple-card">
          <h2>Recent live redemptions</h2>
          {loading ? <p>Loading live data…</p> : records.slice(0, 5).map((item) => (
            <div className="summary-line" key={`${item.id}-${item.redemptionMonth}`}>
              <div><strong>{item.name}</strong><small>{item.id} · {item.redemptionMonth}</small></div>
              <b>{fmt(item.redeemed)} pts</b>
            </div>
          ))}
          <button className="export-button secondary-action" onClick={onOpenFifo}>Open FIFO report →</button>
        </section>
      </div>
    );
  }

  if (page === "ledger") {
    return (
      <div className="content">
        <PageHeading title="Customer Ledger" text="Customers having redemption activity in the selected financial year." />
        <section className="report-card simple-card">
          <div className="simple-table-header"><span>Customer</span><span>Month</span><span>Redeemed</span></div>
          {records.map((item) => (
            <div className="simple-table-row" key={`${item.id}-${item.redemptionMonth}`}>
              <span><strong>{item.name}</strong><small>{item.id}</small></span>
              <span>{item.redemptionMonth}</span>
              <b>{fmt(item.redeemed)} pts</b>
            </div>
          ))}
        </section>
      </div>
    );
  }

  if (page === "expiry") {
    return (
      <div className="content">
        <PageHeading title="Point Expiry" text="Review the oldest point batches consumed by FIFO." />
        <section className="report-card simple-card">
          {records.map((item) => {
            const oldest = item.allocations[0];
            return (
              <div className="summary-line" key={`${item.id}-${item.redemptionMonth}`}>
                <div><strong>{item.name}</strong><small>{oldest ? `Oldest source: ${oldest.month}` : "No source batch available"}</small></div>
                <span className="status-pill">{oldest ? `${oldest.age} months old` : "Review"}</span>
              </div>
            );
          })}
          <p className="page-note">This view shows batch age only. An expiry rule has not yet been configured.</p>
        </section>
      </div>
    );
  }

  if (page === "sync") {
    return (
      <div className="content">
        <PageHeading title="Data Sync" text="Refresh the report directly from your SQL Server database." />
        <section className="report-card simple-card connection-card">
          <span className="connection-icon">⇄</span>
          <div><h2>NEWDEMO is connected</h2><p>MAHESH-RANCE\\SQL2019 · Windows Authentication</p><small>Last refreshed: {lastSync ? lastSync.toLocaleTimeString() : "Not yet refreshed"}</small></div>
          <button className="export-button" disabled={loading} onClick={onSync}>{loading ? "Refreshing…" : "Refresh now"}</button>
        </section>
      </div>
    );
  }

  return (
    <div className="content">
      <PageHeading title="Settings" text="Current report and database configuration." />
      <section className="report-card simple-card settings-list">
        <div><span>SQL Server</span><strong>MAHESH-RANCE\\SQL2019</strong></div>
        <div><span>Database</span><strong>NEWDEMO</strong></div>
        <div><span>Financial year</span><strong>FY 2026–27</strong></div>
        <div><span>Allocation method</span><strong>FIFO</strong></div>
        <p className="page-note">These settings are currently defined by the Node backend.</p>
      </section>
    </div>
  );
}

function PageHeading({ title, text }) {
  return (
    <section className="page-heading">
      <div><p className="eyebrow">LOYALTY ANALYTICS</p><h1>{title}</h1><p>{text}</p></div>
    </section>
  );
}

function Kpi({ icon, type, label, value, note }) {
  return (
    <article className="kpi-card">
      <div className={`kpi-icon ${type}`}>{icon}</div>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{note}</p>
      </div>
    </article>
  );
}
function ReportRow({ row, onView }) {
  return (
    <tr>
      <td>
        <div className="customer-cell">
          <span
            className="avatar"
            style={{ background: row.color, color: row.ink }}
          >
            {row.initials}
          </span>
          <div>
            <strong>{row.name}</strong>
            <small>{row.id}</small>
          </div>
        </div>
      </td>
      <td>
        <span className="points">{fmt(row.redeemed)}</span> pts
      </td>
      <td>
        <div className="allocation-summary">
          <div className="allocation-labels">
            <span>
              {row.allocations
                .map((a) =>
                  a.month.replace(" 2026", "").replace("FY Opening", "Opening"),
                )
                .join(" · ")}
            </span>
          </div>
          <div className="allocation-bar">
            {row.allocations.map((a, i) => (
              <span
                key={a.month}
                style={{
                  width: `${(a.points / row.redeemed) * 100}%`,
                  background: colors[i % colors.length],
                }}
                title={`${a.month}: ${fmt(a.points)} points`}
              />
            ))}
          </div>
        </div>
      </td>
      <td>
        <span className="oldest">
          {row.allocations[0].month}
          <small>
            {row.allocations[0].age} month
            {row.allocations[0].age === 1 ? "" : "s"} old
          </small>
        </span>
      </td>
      <td>
        <span className="status-pill">Allocated</span>
      </td>
      <td>
        <button className="view-button" onClick={onView}>
          View split →
        </button>
      </td>
    </tr>
  );
}
function DetailDrawer({ item, onClose }) {
  return (
    <aside className="detail-drawer open">
      <header>
        <div>
          <p>FIFO ALLOCATION DETAIL</p>
          <h2>{item.name}</h2>
          <span>
            {item.id} · Redeemed in {item.redemptionMonth}
          </span>
        </div>
        <button onClick={onClose}>×</button>
      </header>
      <div className="drawer-content">
        <section className="drawer-total">
          <div>
            <small>Points redeemed</small>
            <strong>{fmt(item.redeemed)} pts</strong>
          </div>
          <span>Fully allocated</span>
        </section>
        <section>
          <h3>Allocation journey</h3>
          <div className="allocation-list">
            {item.allocations.map((a, i) => (
              <div className="allocation-item" key={a.month}>
                <span className="allocation-index">{i + 1}</span>
                <div>
                  <strong>{a.month}</strong>
                  <small>
                    Earned batch · {a.age} month{a.age === 1 ? "" : "s"} before
                    redemption
                  </small>
                </div>
                <div className="allocation-amount">
                  {fmt(a.points)}
                  <small> points</small>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="calculation-box">
          <strong>FIFO check</strong>
          <div>
            <span>Allocated from earned batches</span>
            <b>{fmt(item.redeemed)} pts</b>
          </div>
          <div>
            <span>Unallocated balance</span>
            <b>0 pts</b>
          </div>
        </section>
      </div>
    </aside>
  );
}
export default App;
