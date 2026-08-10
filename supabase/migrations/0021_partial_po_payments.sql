-- Supports paying a vendor in stages rather than only the full PO total at once.
alter type po_payment_status add value 'partially_paid';
