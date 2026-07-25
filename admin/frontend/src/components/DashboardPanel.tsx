"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  FileText,
  Gift,
  Heart,
  IndianRupee,
  Package,
  Plus,
  ShoppingBag,
  Star,
  Users,
  Wallet,
} from "lucide-react";

type RevenueRange = "ALL" | "1M" | "6M" | "1Y";

const metricCards = [
  {
    title: "Total Earnings",
    value: "₹55.92L",
    change: "+16.24%",
    positive: true,
    href: "/?tab=reports",
    linkLabel: "View net earnings",
    icon: IndianRupee,
    tone: "green",
  },
  {
    title: "Orders",
    value: "3,894",
    change: "-3.57%",
    positive: false,
    href: "/?tab=orders",
    linkLabel: "View all orders",
    icon: ShoppingBag,
    tone: "blue",
  },
  {
    title: "Customers",
    value: "18,335",
    change: "+29.08%",
    positive: true,
    href: "/?tab=users",
    linkLabel: "See details",
    icon: Users,
    tone: "orange",
  },
  {
    title: "My Balance",
    value: "₹16.58L",
    change: "+0.00%",
    positive: true,
    href: "/?tab=reports",
    linkLabel: "Withdraw money",
    icon: Wallet,
    tone: "sky",
  },
] as const;

const revenueByRange: Record<
  RevenueRange,
  { months: string[]; bars: number[]; orders: number; earnings: string; refunds: number; conversion: string }
> = {
  ALL: {
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    bars: [42, 55, 48, 62, 70, 58, 75, 68, 80, 72, 85, 78],
    orders: 7585,
    earnings: "₹22.89L",
    refunds: 367,
    conversion: "18.92%",
  },
  "1M": {
    months: ["W1", "W2", "W3", "W4"],
    bars: [48, 62, 55, 70],
    orders: 612,
    earnings: "₹1.84L",
    refunds: 28,
    conversion: "16.40%",
  },
  "6M": {
    months: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
    bars: [55, 48, 62, 70, 58, 75],
    orders: 3840,
    earnings: "₹11.20L",
    refunds: 190,
    conversion: "17.85%",
  },
  "1Y": {
    months: ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
    bars: [50, 58, 64, 60, 72, 68, 55, 48, 62, 70, 58, 75],
    orders: 7585,
    earnings: "₹22.89L",
    refunds: 367,
    conversion: "18.92%",
  },
};

const locations = [
  { name: "Tamil Nadu", pct: 82 },
  { name: "Karnataka", pct: 68 },
  { name: "Kerala", pct: 54 },
  { name: "Maharashtra", pct: 47 },
  { name: "Delhi NCR", pct: 39 },
];

const activities = [
  {
    title: "Purchase by James Price",
    detail: "Product received · Classic Way Tee",
    time: "05:57 AM Today",
    icon: "cart" as const,
  },
  {
    title: "New style collection added",
    detail: "3 products published to storefront",
    time: "1 day ago",
    icon: "star" as const,
  },
  {
    title: "Natasha Carey liked a product",
    detail: "Liked · Silk Saree Emerald",
    time: "2 days ago",
    icon: "heart" as const,
  },
];

const topCategories = [
  { name: "Mobile & Accessories", count: 10294 },
  { name: "Desktop", count: 8542 },
  { name: "Electronics", count: 7504 },
  { name: "Home & Furniture", count: 6321 },
  { name: "Fashion & Clothing", count: 5890 },
  { name: "Grocery", count: 4120 },
  { name: "Beauty & Personal Care", count: 3894 },
  { name: "Books", count: 2740 },
  { name: "Sports", count: 2105 },
  { name: "Toys", count: 1840 },
];

const bestSelling = [
  {
    name: "Branded T-Shirts",
    date: "24 Apr 2025",
    price: "₹799",
    orders: 82,
    stock: "In stock",
    amount: "₹65,518",
  },
  {
    name: "Bentwood Chair",
    date: "19 Mar 2025",
    price: "₹4,299",
    orders: 35,
    stock: "Out of stock",
    amount: "₹1,50,465",
  },
  {
    name: "Borosil Glass Set",
    date: "01 Mar 2025",
    price: "₹1,249",
    orders: 74,
    stock: "In stock",
    amount: "₹92,426",
  },
  {
    name: "Classic Way Saree",
    date: "11 Feb 2025",
    price: "₹2,899",
    orders: 55,
    stock: "In stock",
    amount: "₹1,59,445",
  },
  {
    name: "Leather Handbag",
    date: "15 Jan 2025",
    price: "₹3,499",
    orders: 29,
    stock: "In stock",
    amount: "₹1,01,471",
  },
];

const topSellers = [
  {
    company: "iTest Factory",
    person: "Oliver Phillips",
    category: "Bags and Wallets",
    stock: 8547,
    sales: "₹4.85L",
    pct: 32,
  },
  {
    company: "Digitech Galaxy",
    person: "John Roberts",
    category: "Watches",
    stock: 4631,
    sales: "₹3.12L",
    pct: 25,
  },
  {
    company: "Nesta Technologies",
    person: "Harley Fuller",
    category: "Bike Accessories",
    stock: 2890,
    sales: "₹2.40L",
    pct: 18,
  },
  {
    company: "Zoetic Fashion",
    person: "James Morris",
    category: "Clothes",
    stock: 4102,
    sales: "₹1.98L",
    pct: 15,
  },
];

const reviews = [
  {
    quote: "Great product and packing. Delivery was on time.",
    name: "Nancy Martino",
    rating: 5,
  },
  {
    quote: "Quality matches the photos. Will order again.",
    name: "Henry Baird",
    rating: 4,
  },
];

const ratingBreakdown = [
  { stars: 5, count: 2758, color: "#16a34a" },
  { stars: 4, count: 1238, color: "#84cc16" },
  { stars: 3, count: 872, color: "#eab308" },
  { stars: 2, count: 410, color: "#f97316" },
  { stars: 1, count: 220, color: "#ef4444" },
];

const visitSources = [
  { label: "Direct", pct: 32.0, color: "#16a34a" },
  { label: "Social", pct: 25.6, color: "#3577f1" },
  { label: "Email", pct: 23.8, color: "#f7b84b" },
  { label: "Referrals", pct: 9.9, color: "#f06548" },
  { label: "Others", pct: 8.7, color: "#299cdb" },
];

const recentOrders = [
  {
    id: "#CW2112",
    customer: "Alex Smith",
    product: "Clothes",
    amount: "₹2,190",
    vendor: "Zoetic Fashion",
    status: "Paid" as const,
    rating: "5.0",
    votes: 61,
  },
  {
    id: "#CW2111",
    customer: "Jansh Brown",
    product: "Kitchen Storage",
    amount: "₹1,499",
    vendor: "Micro Design",
    status: "Pending" as const,
    rating: "4.5",
    votes: 61,
  },
  {
    id: "#CW2109",
    customer: "Ayaan Bowen",
    product: "Bike Accessories",
    amount: "₹3,450",
    vendor: "Nesta Technologies",
    status: "Paid" as const,
    rating: "4.9",
    votes: 89,
  },
  {
    id: "#CW2108",
    customer: "Prezy Mark",
    product: "Furniture",
    amount: "₹8,990",
    vendor: "Syntyce Solutions",
    status: "Unpaid" as const,
    rating: "4.3",
    votes: 47,
  },
  {
    id: "#CW2107",
    customer: "Vihan Hudda",
    product: "Bags and Wallets",
    amount: "₹1,899",
    vendor: "iTest Factory",
    status: "Paid" as const,
    rating: "4.8",
    votes: 55,
  },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function statusClass(status: "Paid" | "Pending" | "Unpaid") {
  if (status === "Paid") return "status-pill status-pill-success";
  if (status === "Pending") return "status-pill status-pill-warning";
  return "status-pill status-pill-danger";
}

function metricTone(tone: (typeof metricCards)[number]["tone"]) {
  if (tone === "green") return "dash-metric-icon-green";
  if (tone === "blue") return "dash-metric-icon-blue";
  if (tone === "orange") return "dash-metric-icon-orange";
  return "dash-metric-icon-sky";
}

function RevenueChart({ months, bars }: { months: string[]; bars: number[] }) {
  const max = Math.max(...bars, 1);
  const width = 560;
  const height = 220;
  const padX = 28;
  const padY = 20;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;
  const gap = chartW / bars.length;
  const barW = Math.max(10, gap * 0.45);

  const linePoints = bars
    .map((value, index) => {
      const x = padX + gap * index + gap / 2;
      const y = padY + chartH - (value / max) * chartH;
      return `${x},${y}`;
    })
    .join(" ");

  const dashedPoints = bars
    .map((value, index) => {
      const soft = Math.max(12, value * 0.72);
      const x = padX + gap * index + gap / 2;
      const y = padY + chartH - (soft / max) * chartH;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full" role="img" aria-label="Revenue chart">
      {[0.25, 0.5, 0.75, 1].map((step) => {
        const y = padY + chartH * (1 - step);
        return (
          <line
            key={step}
            x1={padX}
            x2={width - padX}
            y1={y}
            y2={y}
            stroke="#eef0f2"
            strokeWidth="1"
          />
        );
      })}
      {bars.map((value, index) => {
        const h = (value / max) * chartH;
        const x = padX + gap * index + (gap - barW) / 2;
        const y = padY + chartH - h;
        return (
          <rect
            key={`bar-${months[index]}`}
            x={x}
            y={y}
            width={barW}
            height={h}
            fill="#c3d6f7"
          />
        );
      })}
      <polyline
        points={dashedPoints}
        fill="none"
        stroke="#16a34a"
        strokeWidth="2"
        strokeDasharray="5 4"
      />
      <polyline points={linePoints} fill="none" stroke="#f7b84b" strokeWidth="2.5" />
      {bars.map((value, index) => {
        const x = padX + gap * index + gap / 2;
        const y = padY + chartH - (value / max) * chartH;
        return <circle key={`dot-${index}`} cx={x} cy={y} r="3.5" fill="#f7b84b" />;
      })}
      {months.map((month, index) => {
        const x = padX + gap * index + gap / 2;
        return (
          <text
            key={month}
            x={x}
            y={height - 4}
            textAnchor="middle"
            fontSize="10"
            fill="#878a99"
          >
            {month}
          </text>
        );
      })}
    </svg>
  );
}

function DonutChart({
  segments,
}: {
  segments: { label: string; pct: number; color: string }[];
}) {
  const size = 180;
  const stroke = 28;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {segments.map((segment) => {
            const length = (segment.pct / 100) * circumference;
            const el = (
              <circle
                key={segment.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={segment.color}
                strokeWidth={stroke}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return el;
          })}
        </g>
        <text
          x="50%"
          y="48%"
          textAnchor="middle"
          className="fill-[var(--foreground)]"
          fontSize="22"
          fontWeight="700"
        >
          100%
        </text>
        <text
          x="50%"
          y="60%"
          textAnchor="middle"
          fill="#878a99"
          fontSize="11"
        >
          Visits
        </text>
      </svg>
      <ul className="w-full space-y-2 text-sm">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-600">
              <span
                className="inline-block size-2.5"
                style={{ background: segment.color }}
              />
              {segment.label}
            </span>
            <span className="font-semibold text-[var(--foreground)]">
              {segment.pct.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Sparkline({ pct }: { pct: number }) {
  const h = Math.max(8, Math.min(28, pct * 0.7));
  return (
    <div className="flex items-end gap-0.5">
      {[0.4, 0.7, 0.55, 1, 0.85].map((factor, index) => (
        <span
          key={index}
          className="w-1 bg-[var(--theme-green)]"
          style={{ height: `${h * factor}px` }}
        />
      ))}
    </div>
  );
}

export function DashboardPanel({ userName }: { userName?: string | null }) {
  const [range, setRange] = useState<RevenueRange>("ALL");
  const revenue = revenueByRange[range];
  const firstName = useMemo(
    () => (userName?.trim().split(/\s+/)[0] || "Admin"),
    [userName],
  );

  return (
    <div className="dash-page space-y-5">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
            {greeting()}, {firstName}!
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Here&apos;s what&apos;s happening with your store today.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="dash-date-btn">
            <CalendarDays size={15} />
            01 Jul, 2026 to 31 Jul, 2026
          </button>
          <Link href="/products/new" className="primary-button inline-flex items-center gap-1.5">
            <Plus size={15} /> Add Product
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="dash-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[var(--muted)]">{card.title}</p>
                  <p
                    className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${
                      card.positive ? "text-[var(--theme-green)]" : "text-[#f06548]"
                    }`}
                  >
                    {card.positive ? (
                      <ArrowUpRight size={13} />
                    ) : (
                      <ArrowDownRight size={13} />
                    )}
                    {card.change}
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight">{card.value}</p>
                </div>
                <span className={`dash-metric-icon ${metricTone(card.tone)}`}>
                  <Icon size={18} />
                </span>
              </div>
              <Link
                href={card.href}
                className="mt-4 inline-block text-sm font-medium text-[var(--theme-green)] hover:underline"
              >
                {card.linkLabel}
              </Link>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <article className="dash-card xl:col-span-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--card-border)] px-4 py-3">
            <h3 className="text-base font-semibold">Revenue</h3>
            <div className="flex gap-1">
              {(["ALL", "1M", "6M", "1Y"] as RevenueRange[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRange(key)}
                  className={`px-2.5 py-1 text-xs font-semibold ${
                    range === key
                      ? "bg-[var(--theme-green)] text-white"
                      : "bg-[#f3f6f9] text-slate-600"
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 border-b border-[var(--card-border)] px-4 py-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-[var(--muted)]">Orders</p>
              <p className="text-sm font-bold">{revenue.orders.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted)]">Earnings</p>
              <p className="text-sm font-bold">{revenue.earnings}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted)]">Refunds</p>
              <p className="text-sm font-bold">{revenue.refunds}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted)]">Conversion</p>
              <p className="text-sm font-bold text-[var(--theme-green)]">
                {revenue.conversion}
              </p>
            </div>
          </div>
          <div className="p-3 sm:p-4">
            <RevenueChart months={revenue.months} bars={revenue.bars} />
          </div>
        </article>

        <article className="dash-card xl:col-span-3">
          <div className="border-b border-[var(--card-border)] px-4 py-3">
            <h3 className="text-base font-semibold">Sales by Locations</h3>
          </div>
          <div className="space-y-4 p-4">
            <div className="dash-map-placeholder">
              <span>India sales heatmap</span>
            </div>
            {locations.map((location) => (
              <div key={location.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{location.name}</span>
                  <span className="text-[var(--muted)]">{location.pct}%</span>
                </div>
                <div className="h-1.5 bg-[#eef2f7]">
                  <div
                    className="h-full bg-[var(--theme-green)]"
                    style={{ width: `${location.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <div className="space-y-4 xl:col-span-4">
          <article className="dash-card">
            <div className="border-b border-[var(--card-border)] px-4 py-3">
              <h3 className="text-base font-semibold">Recent Activity</h3>
            </div>
            <ul className="divide-y divide-[var(--card-border)]">
              {activities.map((item) => (
                <li key={item.title} className="flex gap-3 px-4 py-3">
                  <span
                    className={`mt-0.5 grid size-8 place-items-center ${
                      item.icon === "cart"
                        ? "bg-[var(--theme-green-soft)] text-[var(--theme-green)]"
                        : item.icon === "star"
                          ? "bg-[#fff4de] text-[#f7b84b]"
                          : "bg-[#fef2f2] text-[#f06548]"
                    }`}
                  >
                    {item.icon === "cart" ? (
                      <ShoppingBag size={14} />
                    ) : item.icon === "star" ? (
                      <Star size={14} />
                    ) : (
                      <Heart size={14} />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="truncate text-xs text-[var(--muted)]">{item.detail}</p>
                    <p className="mt-1 text-[11px] text-[var(--muted)]">{item.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="dash-card">
            <div className="border-b border-[var(--card-border)] px-4 py-3">
              <h3 className="text-base font-semibold">Top 10 Categories</h3>
            </div>
            <ol className="space-y-2.5 p-4 text-sm">
              {topCategories.map((category, index) => (
                <li key={category.name} className="flex items-center justify-between gap-2">
                  <span className="text-slate-700">
                    <span className="mr-1.5 font-semibold text-[var(--muted)]">
                      {index + 1}.
                    </span>
                    {category.name}
                  </span>
                  <span className="shrink-0 text-xs text-[var(--muted)]">
                    ({category.count.toLocaleString("en-IN")})
                  </span>
                </li>
              ))}
            </ol>
            <div className="border-t border-[var(--card-border)] px-4 py-3">
              <Link
                href="/?tab=categories"
                className="text-sm font-medium text-[var(--theme-green)] hover:underline"
              >
                View all Categories
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <article className="dash-card xl:col-span-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--card-border)] px-4 py-3">
            <h3 className="text-base font-semibold">Best Selling Products</h3>
            <select className="form-input-sm" defaultValue="today" aria-label="Sort best selling">
              <option value="today">SORT BY: Today</option>
              <option value="week">SORT BY: This Week</option>
              <option value="month">SORT BY: This Month</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Orders</th>
                  <th>Stock</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {bestSelling.map((product) => (
                  <tr key={product.name}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-9 place-items-center bg-[#f3f6f9] text-[var(--muted)]">
                          <Package size={15} />
                        </span>
                        <div>
                          <p className="font-semibold">{product.name}</p>
                          <p className="text-xs text-[var(--muted)]">{product.date}</p>
                        </div>
                      </div>
                    </td>
                    <td className="font-semibold">{product.price}</td>
                    <td>{product.orders}</td>
                    <td>
                      <span
                        className={
                          product.stock === "In stock"
                            ? "status-pill status-pill-success"
                            : "status-pill status-pill-danger"
                        }
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className="font-semibold">{product.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--card-border)] px-4 py-3 text-xs text-[var(--muted)]">
            <span>Showing 5 of 25 Results</span>
            <div className="flex gap-1">
              {[1, 2, 3].map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`size-7 text-xs font-semibold ${
                    page === 1
                      ? "bg-[var(--theme-green)] text-white"
                      : "bg-[#f3f6f9] text-slate-600"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        </article>

        <article className="dash-card xl:col-span-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--card-border)] px-4 py-3">
            <h3 className="text-base font-semibold">Top Sellers</h3>
            <select className="form-input-sm" defaultValue="report" aria-label="Top sellers report">
              <option value="report">Report</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
          <ul className="divide-y divide-[var(--card-border)]">
            {topSellers.map((seller) => (
              <li key={seller.company} className="flex items-center gap-3 px-4 py-3">
                <span className="grid size-10 place-items-center bg-[var(--theme-green-soft)] text-sm font-bold text-[var(--theme-green)]">
                  {seller.company.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{seller.company}</p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {seller.person} · {seller.category}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Stock: {seller.stock.toLocaleString("en-IN")} · {seller.sales}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkline pct={seller.pct} />
                  <span className="text-sm font-bold">{seller.pct}%</span>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <div className="space-y-4 xl:col-span-3">
          <article className="dash-card">
            <div className="border-b border-[var(--card-border)] px-4 py-3">
              <h3 className="text-base font-semibold">Products Reviews</h3>
            </div>
            <ul className="divide-y divide-[var(--card-border)]">
              {reviews.map((review) => (
                <li key={review.name} className="px-4 py-3">
                  <p className="text-sm italic text-slate-600">&ldquo;{review.quote}&rdquo;</p>
                  <div className="mt-2 flex items-center gap-1 text-[#f7b84b]">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        size={12}
                        fill={index < review.rating ? "currentColor" : "none"}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-xs font-medium text-[var(--muted)]">
                    - by {review.name}
                  </p>
                </li>
              ))}
            </ul>
          </article>

          <article className="dash-card p-4">
            <p className="text-sm font-semibold">Customer Reviews</p>
            <p className="mt-2 text-2xl font-bold">
              4.5 <span className="text-base font-medium text-[var(--muted)]">out of 5</span>
            </p>
            <div className="mt-1 flex items-center gap-1 text-[#f7b84b]">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} size={14} fill="currentColor" />
              ))}
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">Total 5.50k reviews</p>
            <ul className="mt-4 space-y-2">
              {ratingBreakdown.map((row) => (
                <li key={row.stars} className="flex items-center gap-2 text-xs">
                  <span className="w-8 shrink-0 font-medium">{row.stars} ★</span>
                  <div className="h-1.5 flex-1 bg-[#eef2f7]">
                    <div
                      className="h-full"
                      style={{
                        width: `${(row.count / 2758) * 100}%`,
                        background: row.color,
                      }}
                    />
                  </div>
                  <span className="w-10 text-right text-[var(--muted)]">{row.count}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <article className="dash-card xl:col-span-3">
          <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
            <h3 className="text-base font-semibold">Store Visits by Source</h3>
            <select className="form-input-sm" defaultValue="report" aria-label="Visits report">
              <option value="report">Report</option>
            </select>
          </div>
          <div className="p-4">
            <DonutChart segments={visitSources} />
          </div>
        </article>

        <article className="dash-card xl:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--card-border)] px-4 py-3">
            <h3 className="text-base font-semibold">Recent Orders</h3>
            <button type="button" className="dash-outline-btn">
              <FileText size={14} /> Generate Report
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Amount</th>
                  <th>Vendor</th>
                  <th>Status</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link
                        href="/?tab=orders"
                        className="font-semibold text-[#3577f1] hover:underline"
                      >
                        {order.id}
                      </Link>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="grid size-7 place-items-center bg-[#f3f6f9] text-[10px] font-bold">
                          {order.customer
                            .split(" ")
                            .map((part) => part[0])
                            .join("")}
                        </span>
                        {order.customer}
                      </div>
                    </td>
                    <td>{order.product}</td>
                    <td className="font-semibold text-[var(--theme-green)]">{order.amount}</td>
                    <td>{order.vendor}</td>
                    <td>
                      <span className={statusClass(order.status)}>{order.status}</span>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1">
                        <Star size={12} className="text-[#f7b84b]" fill="currentColor" />
                        {order.rating}
                        <span className="text-[var(--muted)]">({order.votes})</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="dash-card dash-invite xl:col-span-3">
          <div className="dash-invite-art">
            <Gift size={36} />
          </div>
          <h3 className="mt-3 text-base font-semibold">Invite sellers</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Refer new sellers to Classic Way and grow your marketplace together.
          </p>
          <button type="button" className="primary-button mt-4 w-full">
            Invite Now
          </button>
        </article>
      </section>
    </div>
  );
}
