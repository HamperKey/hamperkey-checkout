// =====================================================================
//  HamperKey — Stripe Checkout (Vercel serverless function)
//  This runs on Vercel, NOT on your website. It is the only place that
//  knows the real prices, so customers can never change them.
//
//  BEFORE GOING LIVE, edit the two URLs marked "EDIT THIS" below to use
//  your real website address.
//
//  NOTE: This price list was rebuilt from the live catalogue in
//  index.html on 2026-09-08 to keep it in sync with the actual
//  site content (real supplier products, updated prices). If you add or
//  change a product in index.html's Custom Builder / packages, add or
//  update the matching line here too — the two must always match
//  exactly (name AND price) or the item will be silently dropped from
//  checkout.
// =====================================================================

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const CURRENCY = 'gbp';
const SERVICE_CHARGE_RATE = 0.10; // 10% service charge, matches the website

// ---- EDIT THIS: your live website address (no trailing slash) ----
const SITE = 'https://hamperkey.co.uk';
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

// Unescapes HTML entities for display in Stripe checkout (product name only —
// pricing/matching still uses the raw key via slug() above).
function decodeEntities(s){
  return String(s)
    .replace(/&amp;/g,'&')
    .replace(/&ndash;/g,'\u2013')
    .replace(/&mdash;/g,'\u2014')
    .replace(/&apos;/g,"'")
    .replace(/&pound;/g,'£');
}

// ---------------------------------------------------------------------
//  MASTER PRICE LIST (in £). This is the single source of truth.
//  To change a price, edit it here AND in index.html — they must match.
// ---------------------------------------------------------------------
const PRICE_LIST_GBP = {
// ---- Ready-made packages ----
  'Dog-Friendly Welcome Pack': 25,
  'Baby Traveller&apos;s Kit': 35,
  'Classic Arrival Pack': 39,
  'Full English Breakfast Kit': 45,
  'Pizza Night for 4': 45,
  'Vegetarian Feast Kit': 49,
  'Wine, Cheese &amp; Nibbles': 65,
  'Celebration Ready': 75,
  'Local Hero Hamper': 79,
  'First 24 Hours Sorted': 89,
  'Family No-Shop Bundle': 149,
  'Group House Starter': 299,

// ---- Add-ons (Custom Builder) ----
  'Coca-Cola (8-pack cans)': 5.99,
  'Diet Coke (8-pack cans)': 4.5,
  'Fanta Orange (8-pack cans)': 6,
  'Sprite Lemon Lime 2L': 2.15,
  'Harrogate Spring Water &mdash; Sparkling 1.5L': 1.59,
  'Biddenden Apple Juice 1L': 4.3,
  'Harrogate Spring Water &mdash; Still 1.5L': 1.5,
  'Nestlé Pure Life &mdash; Still Spring Water 1.5L': 1.25,
  'Biddenden &mdash; Sparkling Grape Juice 750ml': 8.5,
  'Biddenden &mdash; Sparkling Apple Juice 750ml': 7.5,
  'Biddenden &mdash; Pear Juice 1L': 5.5,
  'Beck&apos;s Blue &mdash; Non-Alcoholic Lager (4-pack, 275ml)': 4.5,
  'Onken &mdash; Natural Set Yogurt 450g': 2.09,
  'President &mdash; Unsalted Butter 250g': 3.49,
  'Free-Range Eggs (6-pack)': 2.79,
  'Cravendale &mdash; Filtered Whole Milk 1L': 1.85,
  'Mature Cheddar with Pickled Onion 454g': 5.99,
  'Avocado (2-pack)': 2.99,
  'Dr. Oetker &mdash; Pancake Mix 170g': 1.5,
  'White Sourdough Loaf 450g': 2.49,
  'Sprouted Grains Sourdough Loaf 450g': 2.49,
  'Unsmoked Streaky Bacon 200g': 2.99,
  'Smoked Streaky Bacon 200g': 2.99,
  'Breaded Ham 90g': 1,
  'Président &mdash; French Brie Cheese 200g': 3.49,
  'Red Onion Chutney 1.1L': 6.5,
  'Potato Salad 200g': 1.39,
  'Hummus 170g': 2.5,
  'Four Cheese Tortelloni 250g': 2.29,
  'Goodfellas &mdash; Margherita Stonebaked Thin Pizza 334g': 2.99,
  'Goodfellas &mdash; Pepperoni Stonebaked Thin Pizza 332g': 2.99,
  'Franco Manca &mdash; Quattro Formaggi Sourdough Pizza 474g': 5.99,
  'Mixed Green Salad 450g': 3.5,
  'Cherry Tomatoes 250g': 1.6,
  'Cucumber': 1.3,
  'Mixed Vegetables 2.5kg': 7.2,
  'Sweet Potato Gourmet Fries 2.5kg': 9.5,
  'Ocean Pearl &mdash; Garlic &amp; Herb Marinated King Prawns 800g': 10.99,
  'Battered Cod Fillets (2-pack) 200g': 3.5,
  'Chef&apos;s Premium &mdash; Triple Cooked Chunky Chips 2.5kg': 5.2,
  'Birds Eye &mdash; Fish Fingers (10-pack) 250g': 2,
  'Green Apples (4-pack)': 2.09,
  'Red Apples (4-pack)': 2.09,
  'Strawberries 227g': 2.49,
  'Strawberries 800g': 4.99,
  'Blueberries 150g': 2.99,
  'Fyffes &mdash; Premium Bananas (5-pack)': 1.19,
  'Oranges (4-pack)': 2.65,
  'Watermelon': 5,
  'Seasonal Fruit Box': 8.5,
  'Roasted Salted Peanuts 75g': 0.85,
  'Itac &mdash; Almonds 400g': 5.99,
  'Sea Salt Flakes 95g': 2.5,
  'Ground Black Pepper 41g': 2.99,
  'Vanilla Ice Cream 900ml': 3.99,
  'Triple Chocolate Ice Cream 900ml': 3.99,
  'Strawberry &amp; Cream Ice Cream 900ml': 3.99,
  'Dairylea &mdash; Snackers Cheese &amp; Crackers 56.5g': 1.89,
  'Silver Spoon &mdash; Table Sweetener (150 tablets)': 1.5,
  'Silver Spoon &mdash; Granulated Sugar 500g': 1.15,
  'Kent Crisps &mdash; Sea Salt 150g': 2.5,
  'Kent Crisps &mdash; Sea Salt &amp; Vinegar 150g': 2.5,
  'Kent Crisps &mdash; Smoked Bacon 150g': 2.5,
  'Kent Crisps &mdash; Cheese &amp; Onion 150g': 2.5,
  // ---- Added today (Custom Request / restricted add-ons update) ----
  'IPA': 5.50,
  'Boero Dark Chocolate Cherry Shot': 1.50,
  'Lightly Salted Butter 250g': 2.20,
  'Semi-Skimmed Milk 1L': 1.80,
  'Fruit Yogurt 450g': 2.10,
  'Clementines / Easy Peelers': 2.60,
  'Seedless White Grapes 500g': 3.50,
  'Mixed Olives 150g': 4.50,
  'Crispbread &amp; Flatbreads': 3.00,
  'Plain Muesli 500g': 4.00,
  'Salted Cashews 150g': 4.50,
  'Chocolate &amp; Truffles Selection': 6.50,
  'Orange Juice 1L': 3.50,
  'Fruit Conserve': 4.00,
  'Biscuits &amp; Cookies Selection': 3.50,
  'Van Nahmen White Peach Nectar': 3.90,
  'Pesto Crisps (Tartuflanghe)': 2.80,
  'The Fine Cheese Co. Fresh Brillat-Savarin &amp; Apricot Cheesecake Biscuits 120g': 3.70,
  'The Fine Cheese Co. English Oak-Smoked Cheddar 200g': 6.00
};

// Build a lookup keyed by product code (slug) -> { display name, pence }
const CATALOG = {};
for (const [name, gbp] of Object.entries(PRICE_LIST_GBP)) {
  CATALOG[slug(name)] = { name: decodeEntities(name), amount: Math.round(gbp * 100) };
}

// ---------------------------------------------------------------------
//  PARTNER COMMISSION RATES
//  Add a new entry here for each partner, using the same code they'll
//  share as ?partner=CODE in their unique link (see index.html's
//  PARTNER TRACKING section). Rate is a decimal (0.12 = 12%).
//  Commission is calculated on the goods subtotal only (not the 10%
//  service charge), and is recorded in Stripe metadata on every order —
//  it does NOT change what the guest pays.
// ---------------------------------------------------------------------
const PARTNER_COMMISSION_RATES = {
  'veeve': 0.12,
};
const DEFAULT_PARTNER_COMMISSION_RATE = 0.10; // used if a partner_code is present but not listed above

export default async function handler(req, res) {
  // Allow the website (different domain) to call this function
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { items, notes, partner_code } = req.body || {};
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

    // Partner commission tracking (does not affect what the guest pays —
    // recorded in metadata only, for month-end commission reporting)
    // Lower-cased so ?partner=Veeve and ?partner=veeve both match the rate table
    const cleanPartnerCode = String(partner_code || '').trim().toLowerCase().slice(0, 40);
    let commissionMeta = {};
    if (cleanPartnerCode) {
      const rate = Object.prototype.hasOwnProperty.call(PARTNER_COMMISSION_RATES, cleanPartnerCode)
        ? PARTNER_COMMISSION_RATES[cleanPartnerCode]
        : DEFAULT_PARTNER_COMMISSION_RATE;
      const commissionPence = Math.round(subtotal * rate);
      commissionMeta = {
        partner_code: cleanPartnerCode,
        commission_rate: String(rate),
        commission_gbp: (commissionPence / 100).toFixed(2),
        subtotal_gbp: (subtotal / 100).toFixed(2)
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: SUCCESS_URL,
      cancel_url: CANCEL_URL,
      // Collect the customer details you need for delivery
      shipping_address_collection: { allowed_countries: ['GB'] },
      phone_number_collection: { enabled: true },
      metadata: { customer_notes: (notes || '').slice(0, 480), ...commissionMeta }
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
