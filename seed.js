const supabase = require("./supabase");

const categories = ["Electronics", "Clothing", "Food", "Books", "Home"];
const regions = ["Asia", "Europe", "Americas", "Africa", "Oceania"];
const segments = ["Retail", "Wholesale", "Online"];
const statuses = ["completed", "pending", "cancelled", "refunded"];

const productNames = {
  Electronics: ["Laptop", "Phone", "Tablet", "Headphones", "Monitor", "Keyboard", "Mouse", "Camera", "Speaker", "Smartwatch"],
  Clothing: ["T-Shirt", "Jeans", "Jacket", "Sneakers", "Hat", "Dress", "Hoodie", "Shorts", "Boots", "Scarf"],
  Food: ["Coffee Beans", "Chocolate", "Olive Oil", "Pasta", "Tea", "Honey", "Nuts", "Cheese", "Spices", "Jam"],
  Books: ["Novel", "Cookbook", "Biography", "Science Book", "Art Book", "History Book", "Self-Help", "Comics", "Poetry", "Travel Guide"],
  Home: ["Candle", "Pillow", "Blanket", "Mug", "Plant Pot", "Lamp", "Rug", "Clock", "Frame", "Vase"],
};

const firstNames = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Quinn", "Avery", "Sage", "Drew", "Blake", "Logan", "Harper", "Ellis", "Reese", "Parker", "Hayden", "Skyler", "Jamie", "Rowan"];
const lastNames = ["Smith", "Chen", "Kumar", "Garcia", "Müller", "Santos", "Kim", "Nguyen", "Ali", "Petrov"];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

function randomDate(start, end) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return new Date(s + Math.random() * (e - s)).toISOString();
}

async function seed() {
  console.log("Seeding products...");
  const products = [];
  for (const category of categories) {
    for (const name of productNames[category]) {
      products.push({
        name,
        category,
        price: parseFloat((Math.random() * 200 + 5).toFixed(2)),
        stock: rand(10, 500),
      });
    }
  }
  const { data: insertedProducts, error: pErr } = await supabase
    .from("products")
    .insert(products)
    .select("id, price");
  if (pErr) { console.error("Products error:", pErr); return; }
  console.log(`Inserted ${insertedProducts.length} products`);

  console.log("Seeding customers...");
  const customers = [];
  for (let i = 0; i < 200; i++) {
    const first = pick(firstNames);
    const last = pick(lastNames);
    customers.push({
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
      region: pick(regions),
      segment: pick(segments),
    });
  }
  const { data: insertedCustomers, error: cErr } = await supabase
    .from("customers")
    .insert(customers)
    .select("id");
  if (cErr) { console.error("Customers error:", cErr); return; }
  console.log(`Inserted ${insertedCustomers.length} customers`);

  console.log("Seeding orders...");
  const batchSize = 500;
  const totalOrders = 2000;
  let orderCount = 0;

  for (let b = 0; b < totalOrders; b += batchSize) {
    const orders = [];
    const count = Math.min(batchSize, totalOrders - b);
    for (let i = 0; i < count; i++) {
      const product = pick(insertedProducts);
      const customer = pick(insertedCustomers);
      const qty = rand(1, 10);
      const status = pick(statuses);
      // Weight towards completed
      const finalStatus = Math.random() < 0.6 ? "completed" : status;
      orders.push({
        customer_id: customer.id,
        product_id: product.id,
        quantity: qty,
        total: parseFloat((product.price * qty).toFixed(2)),
        status: finalStatus,
        created_at: randomDate("2025-01-01", "2025-12-31"),
      });
    }
    const { error: oErr } = await supabase.from("orders").insert(orders);
    if (oErr) { console.error("Orders error:", oErr); return; }
    orderCount += count;
    console.log(`Inserted ${orderCount}/${totalOrders} orders`);
  }

  console.log("Seeding complete!");
}

seed();
