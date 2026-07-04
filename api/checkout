// =====================================================================
//  HamperKey — Stripe Checkout (Vercel serverless function)
//  This runs on Vercel, NOT on your website. It is the only place that
//  knows the real prices, so customers can never change them.
//
//  BEFORE GOING LIVE, edit the two URLs marked "EDIT THIS" below to use
//  your real website address.
// =====================================================================

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const CURRENCY = 'gbp';
const SERVICE_CHARGE_RATE = 0.10; // 10% service charge, matches the website

// ---- EDIT THIS: your live website address (no trailing slash) ----
const SITE = 'https:/hamperkey.co.uk';
// -------------------------------------------------------------------
const SUCCESS_URL = SITE + '/index.html?session_id={CHECKOUT_SESSION_ID}#thank-you';
const CANCEL_URL  = SITE + '/index.html';

// Must be identical to the slug() function in your website's index.html
function slug(s){
  return String(s)
    .replace(/&amp;/g,'&')
    .replace(/&ndash;|&mdash;/g,'-')
    .replace(/&pound;/g,'')
    .replace(/&[a-z]+;/g,'')
    .toLowerCase()
    .replace(/&/g,' and ')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'');
}

// ---------------------------------------------------------------------
//  MASTER PRICE LIST (in £). This is the single source of truth.
//  To change a price, edit it here and redeploy — nothing else needed.
// ---------------------------------------------------------------------
const PRICE_LIST_GBP = {
  // ---- Ready-made packages ----
  'Dog-Friendly Welcome Pack': 25,
  'Classic Arrival Pack': 39,
  'Full English Breakfast Kit': 45,
  'Pizza Night for 4&ndash;5': 45,
  'Wine, Cheese &amp; Nibbles': 65,
  'Celebration Ready': 75,
  'Local Hero Hamper': 79,
  'First 24 Hours Sorted': 89,
  'Family No-Shop Bundle': 149,
  'Group House Starter': 299,

  // ---- Custom Builder options ----
  'Traditional Full English Kit': 45,
  'Continental Breakfast': 18,
  'Full English Upgrade': 25,
  'Healthy Start Box': 22,
  'Sunday Brunch Box': 35,
  'Easy Pasta Night': 29,
  'Curry Night Kit': 32,
  'BBQ Box': 55,
  'Pie &amp; Mash Supper': 30,
  'Sparkling Wine': 18,
  'Birthday Cake': 22,
  'Local Flowers': 20,
  'Dog Welcome Add-on': 15,

  // ---- Individual add-ons ----
  'Coca-Cola 6-pack': 4.50,
  'Diet Coke 6-pack': 4.50,
  'Fanta Orange 6-pack': 4.50,
  'Sprite 6-pack': 4.50,
  'Sparkling Water': 3.50,
  'Still Water': 3.00,
  'Apple Juice 1L': 2.80,
  'House Prosecco': 12.00,
  'Champagne 75cl': 28.00,
  'Kentish Pale Ale': 8.50,
  'Kentish Cider': 8.50,
  'White Wine 75cl': 10.00,
  'Red Wine 75cl': 10.00,
  'Butter 250g': 2.20,
  'Eggs 6-pack': 3.20,
  'Whole Milk 1L': 1.80,
  'Mature Cheddar': 4.50,
  'Avocado 2-pack': 2.80,
  'Pancake Mix': 3.50,
  'Sourdough Loaf': 3.80,
  'Cooked Bacon': 4.20,
  'Sliced Ham': 3.50,
  'Brie 200g': 4.80,
  'Chutney': 3.80,
  'Hummus': 2.50,
  'Green Salad': 2.50,
  'Cherry Tomatoes': 2.20,
  'Cucumber': 0.90,
  'Mixed Veg 1kg': 2.80,
  'Sweet Potato Fries': 3.50,
  'Prawns 300g': 5.50,
  'Fish Fillets': 4.20,
  'Chunky Chips': 2.80,
  'Fish Fingers': 3.50,
  'Braeburn Apples': 2.20,
  'Strawberries': 3.80,
  'Blueberries': 2.80,
  'Bananas': 1.50,
  'Oranges': 2.20,
  'Watermelon': 4.50,
  'Fruit Box': 8.50,
  'Salted Peanuts': 2.80,
  'Roasted Almonds': 3.80,
  'Sea Salt': 2.50,
  'Black Pepper': 1.80,
  'Vanilla Ice Cream': 4.20,
  'Choc Ice Cream': 4.20,
  'Strawberry Ice Cream': 4.20,
  'Kent Crisps Sea Salt': 2.20,
  'Kent Crisps S&V': 2.20,
  'Kent Crisps Bacon': 2.20,
  'Kent Crisps C&O': 2.20
};

// Build a lookup keyed by product code (slug) -> { display name, pence }
const CATALOG = {};
for (const [name, gbp] of Object.entries(PRICE_LIST_GBP)) {
  CATALOG[slug(name)] = { name: name.replace(/&amp;/g,'&').replace(/&ndash;/g,'-'), amount: Math.round(gbp * 100) };
}

export default async function handler(req, res) {
  // Allow the website (different domain) to call this function
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { items, notes } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your basket is empty.' });
    }

    // Tally quantities per product code, pricing ONLY from our catalog
    const qty = {};
    for (const it of items) {
      const code = String((it && it.sku) || '');
      if (!CATALOG[code]) continue; // ignore anything we don't recognise
      const n = Math.max(1, Math.min(50, parseInt(it.quantity, 10) || 1));
      qty[code] = (qty[code] || 0) + n;
    }

    const line_items = Object.entries(qty).map(([code, n]) => ({
      price_data: {
        currency: CURRENCY,
        product_data: { name: CATALOG[code].name },
        unit_amount: CATALOG[code].amount
      },
      quantity: n
    }));

    if (line_items.length === 0) {
      return res.status(400).json({ error: 'No valid items in basket.' });
    }

    // 10% service charge on the goods subtotal
    const subtotal = line_items.reduce((s, li) => s + li.price_data.unit_amount * li.quantity, 0);
    const service = Math.round(subtotal * SERVICE_CHARGE_RATE);
    if (service > 0) {
      line_items.push({
        price_data: {
          currency: CURRENCY,
          product_data: { name: 'Service Charge (10%)' },
          unit_amount: service
        },
        quantity: 1
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: SUCCESS_URL,
      cancel_url: CANCEL_URL,
      // Collect the customer details you need for delivery
      shipping_address_collection: { allowed_countries: ['GB'] },
      phone_number_collection: { enabled: true },
      metadata: { customer_notes: (notes || '').slice(0, 480) }
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
