const express = require("express");
const cors = require("cors");
const supabase = require("../supabase");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Monthly revenue
app.get("/api/revenue/monthly", async (req, res) => {
  const { from, to } = req.query;
  let query = supabase
    .from("orders")
    .select("total, created_at")
    .eq("status", "completed");

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const monthly = {};
  data.forEach((order) => {
    const month = order.created_at.slice(0, 7); // YYYY-MM
    monthly[month] = (monthly[month] || 0) + parseFloat(order.total);
  });

  const result = Object.entries(monthly)
    .map(([month, revenue]) => ({ month, revenue: Math.round(revenue * 100) / 100 }))
    .sort((a, b) => a.month.localeCompare(b.month));

  res.json(result);
});

// Sales by category
app.get("/api/sales/category", async (req, res) => {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("total, product_id, products(category)")
    .eq("status", "completed");

  if (error) return res.status(500).json({ error: error.message });

  const categories = {};
  orders.forEach((o) => {
    const cat = o.products?.category || "Unknown";
    categories[cat] = (categories[cat] || 0) + parseFloat(o.total);
  });

  const result = Object.entries(categories)
    .map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);

  res.json(result);
});

// Order status breakdown
app.get("/api/orders/status", async (req, res) => {
  const { data, error } = await supabase.from("orders").select("status");
  if (error) return res.status(500).json({ error: error.message });

  const counts = {};
  data.forEach((o) => {
    counts[o.status] = (counts[o.status] || 0) + 1;
  });

  const result = Object.entries(counts).map(([status, count]) => ({ status, count }));
  res.json(result);
});

// Sales by region
app.get("/api/sales/region", async (req, res) => {
  const { data, error } = await supabase
    .from("orders")
    .select("total, customer_id, customers(region)")
    .eq("status", "completed");

  if (error) return res.status(500).json({ error: error.message });

  const regions = {};
  data.forEach((o) => {
    const region = o.customers?.region || "Unknown";
    regions[region] = (regions[region] || 0) + parseFloat(o.total);
  });

  const result = Object.entries(regions)
    .map(([region, total]) => ({ region, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);

  res.json(result);
});

// Top 10 products by revenue
app.get("/api/products/top", async (req, res) => {
  const { data, error } = await supabase
    .from("orders")
    .select("total, product_id, products(name, category)")
    .eq("status", "completed");

  if (error) return res.status(500).json({ error: error.message });

  const products = {};
  data.forEach((o) => {
    const name = o.products?.name || "Unknown";
    if (!products[name]) {
      products[name] = { name, category: o.products?.category, total: 0 };
    }
    products[name].total += parseFloat(o.total);
  });

  const result = Object.values(products)
    .map((p) => ({ ...p, total: Math.round(p.total * 100) / 100 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  res.json(result);
});

// Orders list with pagination
app.get("/api/orders", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("orders")
    .select("id, quantity, total, status, created_at, customers(name, region), products(name, category)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ data, total: count, page, limit });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
