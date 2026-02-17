import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/?/, "");

  try {
    if (!path || path === "") {
      return res.status(200).json({ status: "ok" });
    }

    if (path === "revenue/monthly") {
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
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
        const month = order.created_at.slice(0, 7);
        monthly[month] = (monthly[month] || 0) + parseFloat(order.total);
      });
      const result = Object.entries(monthly)
        .map(([month, revenue]) => ({ month, revenue: Math.round(revenue * 100) / 100 }))
        .sort((a, b) => a.month.localeCompare(b.month));
      return res.status(200).json(result);
    }

    if (path === "sales/category") {
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
      return res.status(200).json(result);
    }

    if (path === "orders/status") {
      const { data, error } = await supabase.from("orders").select("status");
      if (error) return res.status(500).json({ error: error.message });

      const counts = {};
      data.forEach((o) => {
        counts[o.status] = (counts[o.status] || 0) + 1;
      });
      const result = Object.entries(counts).map(([status, count]) => ({ status, count }));
      return res.status(200).json(result);
    }

    if (path === "sales/region") {
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
      return res.status(200).json(result);
    }

    if (path === "products/top") {
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
      return res.status(200).json(result);
    }

    if (path === "orders") {
      const page = parseInt(url.searchParams.get("page")) || 1;
      const limit = parseInt(url.searchParams.get("limit")) || 20;
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from("orders")
        .select("id, quantity, total, status, created_at, customers(name, region), products(name, category)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({ data, total: count, page, limit });
    }

    return res.status(404).json({ error: "Not found" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
