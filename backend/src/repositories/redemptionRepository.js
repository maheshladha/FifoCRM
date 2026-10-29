import { getDatabase } from "../database.js";

const avatarColors = [
  ["#e9e6ff", "#6048e8"],
  ["#e4f6f2", "#168f7d"],
  ["#fff1dc", "#ca7c09"],
  ["#e5efff", "#3477da"],
  ["#f9e8f1", "#bd538a"],
  ["#ecf3dd", "#6d8d2d"],
];

function monthName(date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function monthAge(sourceMonth, redemptionMonth) {
  if (sourceMonth === "FY Opening") return 12;

  const source = new Date(`1 ${sourceMonth}`);
  const redemption = new Date(`1 ${redemptionMonth}`);
  return Math.max(
    0,
    (redemption.getFullYear() - source.getFullYear()) * 12 +
      redemption.getMonth() -
      source.getMonth(),
  );
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function takeOldest(batches, pointsRequired) {
  const allocations = [];

  for (const batch of batches) {
    if (pointsRequired <= 0) break;
    if (batch.points <= 0) continue;

    const pointsTaken = Math.min(batch.points, pointsRequired);
    allocations.push({ month: batch.month, points: pointsTaken });
    batch.points -= pointsTaken;
    pointsRequired -= pointsTaken;
  }

  return { allocations, unallocatedPoints: pointsRequired };
}

function combineMonths(allocations) {
  const totals = new Map();

  for (const allocation of allocations) {
    totals.set(
      allocation.month,
      (totals.get(allocation.month) || 0) + allocation.points,
    );
  }

  return [...totals].map(([month, points]) => ({
    month,
    points: Number(points.toFixed(3)),
  }));
}

export async function findRedemptions({ month, customer } = {}) {
  const database = await getDatabase();
  const result = await database.request().query(`
    SELECT
      c.CustomerID,
      COALESCE(
        NULLIF(c.CustomerName, ''),
        NULLIF(LTRIM(RTRIM(ISNULL(c.FirstName, '') + ' ' + ISNULL(c.LastName, ''))), ''),
        c.CustomerID
      ) AS CustomerName,
      ISNULL(c.OpeningPoint, 0) AS OpeningPoint,
      p.VoucherDate,
      p.CRMPoints,
      p.Module,
      p.SerialNumber
    FROM dbo.CustomerMaster AS c
    INNER JOIN dbo.CRMPointRedeemData AS p
      ON p.CustomerID = c.CustomerID
    WHERE p.VoucherDate < '2027-04-01'
    ORDER BY c.CustomerID, p.VoucherDate, p.SerialNumber
  `);

  const financialYearStart = new Date("2026-04-01T00:00:00");
  const customers = new Map();

  for (const row of result.recordset) {
    if (!customers.has(row.CustomerID)) {
      customers.set(row.CustomerID, {
        id: row.CustomerID,
        name: row.CustomerName,
        openingPoint: Number(row.OpeningPoint),
        transactions: [],
      });
    }
    customers.get(row.CustomerID).transactions.push(row);
  }

  const report = [];

  for (const person of customers.values()) {
    let openingBalance = person.openingPoint;
    const batches = [];

    for (const transaction of person.transactions) {
      if (new Date(transaction.VoucherDate) < financialYearStart) {
        openingBalance += Number(transaction.CRMPoints);
      }
    }

    if (openingBalance > 0) {
      batches.push({ month: "FY Opening", points: openingBalance });
    }

    for (const transaction of person.transactions) {
      const transactionDate = new Date(transaction.VoucherDate);
      const points = Number(transaction.CRMPoints);
      const moduleNumber = Number(transaction.Module);

      if (transactionDate < financialYearStart) continue;

      if (points > 0) {
        batches.push({ month: monthName(transactionDate), points });
        continue;
      }

      if (points < 0 && (moduleNumber === 0 || moduleNumber === 1)) {
        takeOldest(batches, Math.abs(points));
        continue;
      }

      if (points < 0) {
        const redeemed = Math.abs(points);
        const redemptionMonth = monthName(transactionDate);
        const fifo = takeOldest(batches, redeemed);
        let row = report.find(
          (item) =>
            item.id === person.id &&
            item.redemptionMonth === redemptionMonth,
        );

        if (!row) {
          const colorIndex = report.length % avatarColors.length;
          row = {
            id: person.id,
            name: person.name,
            initials: initials(person.name),
            color: avatarColors[colorIndex][0],
            ink: avatarColors[colorIndex][1],
            redemptionMonth,
            redeemed: 0,
            allocations: [],
            unallocatedPoints: 0,
          };
          report.push(row);
        }

        row.redeemed += redeemed;
        row.allocations.push(...fifo.allocations);
        row.unallocatedPoints += fifo.unallocatedPoints;
      }
    }
  }

  for (const row of report) {
    row.redeemed = Number(row.redeemed.toFixed(3));
    row.unallocatedPoints = Number(row.unallocatedPoints.toFixed(3));
    row.allocations = combineMonths(row.allocations).map((allocation) => ({
      ...allocation,
      age: monthAge(allocation.month, row.redemptionMonth),
    }));
  }

  const search = customer?.trim().toLowerCase();
  return report.filter(
    (row) =>
      (!month || month === "All months" || row.redemptionMonth === month) &&
      (!search ||
        row.name.toLowerCase().includes(search) ||
        row.id.toLowerCase().includes(search)),
  );
}
