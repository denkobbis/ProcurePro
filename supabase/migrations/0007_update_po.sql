-- Allows editing a draft PO's vendor, delivery terms, and line items before it's
-- sent, per spec section 4.3 ("Ability to edit PO before sending, with audit
-- log of changes"). Only "draft" POs can be edited — once sent, receiving
-- records rely on the line items being stable.

create or replace function update_po(
  p_po_id uuid,
  p_vendor_id uuid,
  p_delivery_terms text,
  p_line_items jsonb -- [{description, qty, unit_price}, ...]
)
returns void language plpgsql security definer set search_path = public as $$
declare
  po purchase_orders%rowtype;
  before_snapshot jsonb;
  item jsonb;
  total numeric(14,2) := 0;
begin
  if not is_procurement_or_admin() then
    raise exception 'Only procurement officers or admins can edit purchase orders';
  end if;

  select * into po from purchase_orders where id = p_po_id;
  if po is null then raise exception 'Purchase order not found'; end if;
  if po.status <> 'draft' then
    raise exception 'Only draft purchase orders can be edited';
  end if;

  before_snapshot := jsonb_build_object(
    'vendor_id', po.vendor_id,
    'delivery_terms', po.delivery_terms,
    'total_amount', po.total_amount,
    'line_items', (select coalesce(jsonb_agg(jsonb_build_object('description', description, 'qty', qty, 'unit_price', unit_price)), '[]'::jsonb)
                    from po_line_items where po_id = p_po_id)
  );

  delete from po_line_items where po_id = p_po_id;

  for item in select * from jsonb_array_elements(p_line_items)
  loop
    insert into po_line_items (po_id, description, qty, unit_price)
    values (p_po_id, item->>'description', (item->>'qty')::numeric, (item->>'unit_price')::numeric);
    total := total + (item->>'qty')::numeric * (item->>'unit_price')::numeric;
  end loop;

  update purchase_orders
    set vendor_id = p_vendor_id, delivery_terms = p_delivery_terms, total_amount = total
    where id = p_po_id;

  perform write_audit('purchase_order', p_po_id, 'edited', jsonb_build_object(
    'before', before_snapshot,
    'after', jsonb_build_object('vendor_id', p_vendor_id, 'delivery_terms', p_delivery_terms, 'total_amount', total, 'line_items', p_line_items)
  ));
end;
$$;
