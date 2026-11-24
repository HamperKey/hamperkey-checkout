// =====================================================================
//  HamperKey — Veeve guest page checkout (Vercel serverless function)
//  Save as api/veeve-guest-checkout.js next to api/checkout.js.
//  Guests of Veeve pay the guest price; HamperKey keeps the supply price
//  and owes Veeve the £65 service fee per order (paid monthly).
//  No 12% commission applies to these orders.
// =====================================================================
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ---- EDIT THIS: same live website address as in checkout.js (no trailing slash) ----
const SITE = 'https://hamperkey.co.uk';
const PAGE_PATH = '/veeve-guests.html';
const VEEVE_FEE_GBP = 65;

const PACKAGES = {
  p1: { name: 'Veeve Essentials Small (1-2 guests)',  amount: 14400, supply: 79 },
  p2: { name: 'Veeve Essentials Medium (3-4 guests)', amount: 19400, supply: 129 },
  p3: { name: 'Veeve Essentials Large (5-6 guests)',  amount: 26200, supply: 197 }
};

const clean = (v, n) => String(v || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const b = req.body || {};
    const pkg = PACKAGES[String(b.pkg)];
    if (!pkg) return res.status(400).json({ error: 'Please choose a package.' });

    const email = clean(b.vEmail, 120);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Please check the email address.' });
    for (const k of ['vName', 'pAddr', 'pPost', 'dDate', 'cInDate', 'cInTime', 'wFrom', 'wTo', 'access']) {
      if (!clean(b[k], 200)) return res.status(400).json({ error: 'Missing details: ' + k });
    }

    const delivery = clean(b.dDate, 10) + ' ' + clean(b.wFrom, 5) + '-' + clean(b.wTo, 5);
    const meta = {
      order_type: 'veeve_private_page',
      package: pkg.name,
      guest: clean(b.vName, 100) + ' <' + email + '>',
      property: clean(b.pName, 100),
      address: clean(b.pAddr, 200) + ', ' + clean(b.pPost, 12).toUpperCase(),
      delivery: delivery,
      checkin: clean(b.cInDate, 10) + ' ' + clean(b.cInTime, 5),
      access: clean(b.access, 60) + (b.accessNote ? ' - ' + clean(b.accessNote, 200) : ''),
      dietary: clean(b.diet, 480) || 'None given',
      requests: clean(b.reqs, 480) || 'None',
      veeve_fee_gbp: VEEVE_FEE_GBP.toFixed(2),
      hamperkey_supply_gbp: pkg.supply.toFixed(2)
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price_data: { currency: 'gbp', product_data: { name: pkg.name }, unit_amount: pkg.amount }, quantity: 1 }],
      customer_email: email,
      phone_number_collection: { enabled: true },
      success_url: SITE + PAGE_PATH + '?paid=1',
      cancel_url: SITE + PAGE_PATH,
      metadata: meta,
      payment_intent_data: { description: 'Veeve guest Essentials - ' + meta.guest + ' - ' + delivery, metadata: meta }
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
