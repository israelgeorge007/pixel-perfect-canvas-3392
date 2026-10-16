import type { DashboardData, InvoiceCompanyDetails, InvoiceCustomerDetails, InvoiceLine } from "../data/mockData";
import { formatDateKey, toDateKey } from "./dashboardData";
import { getLocationQuantity, setLocationQuantity, syncInventoryLocationTotals } from "./inventoryStock";
import { appendJournal, prepareJournal } from "./journalPosting";

export interface CustomerInvoiceDraft {
  customerId: string;
  invoice: string;
  amount: number;
  items: InvoiceLine[];
  invoiceDate: string;
  dueDate: string;
  companyDetails?: InvoiceCompanyDetails;
  customerDetails?: InvoiceCustomerDetails;
}

export function getSellableInventoryItems(items: DashboardData["inventoryItems"]) {
  return items.filter(({ stock }) => stock >= 1);
}

export function createCustomerInvoice(
  data: DashboardData,
  draft: CustomerInvoiceDraft,
): { data?: DashboardData; error?: string } {
  const invoice = draft.invoice.trim();
  const customer = data.customers?.find(({ id }) => id === draft.customerId);
  if (!customer) return { error: "Choose a saved customer profile." };
  const customerDetails = draft.customerDetails ?? {
    name: customer.name,
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    address: customer.billingAddress ?? "",
  };
  if (!invoice || data.invoices.some(({ invoice: existing }) => existing.trim().toLowerCase() === invoice.toLowerCase()) ||
    data.receivables.some(({ invoice: existing }) => existing.trim().toLowerCase() === invoice.toLowerCase())) {
    return { error: "Enter an invoice number that is not already in use." };
  }
  if (!Array.isArray(draft.items) || draft.items.length === 0) return { error: "Add at least one invoice item or service." };
  const items: InvoiceLine[] = [];
  const soldQuantities = new Map<string, number>();
  const soldByLocation = new Map<string, { sku: string; location: string; quantity: number }>();
  for (const item of draft.items) {
    const inventoryItem = item.inventorySku
      ? data.inventoryItems.find(({ sku }) => sku === item.inventorySku)
      : undefined;
    if (item.inventorySku && !inventoryItem) return { error: "Choose an inventory item that is still available." };
    if ((!inventoryItem && !item.description.trim()) || !Number.isFinite(item.quantity) || item.quantity <= 0 ||
      Math.abs(item.quantity * 100 - Math.round(item.quantity * 100)) > 1e-7 || !Number.isFinite(item.unitPrice) || item.unitPrice <= 0 ||
      Math.abs(item.unitPrice * 100 - Math.round(item.unitPrice * 100)) > 1e-7) {
      return { error: "Enter a description, positive quantity, and unit price with no more than two decimal places for each item." };
    }
    if (inventoryItem) {
      if (!Number.isInteger(item.quantity)) return { error: "Inventory item quantities must be whole numbers." };
      if (!item.inventoryLocation || !data.inventoryLocations.some(({ location }) => location === item.inventoryLocation)) {
        return { error: `Choose a stock location for ${inventoryItem.item}.` };
      }
      soldQuantities.set(inventoryItem.sku, (soldQuantities.get(inventoryItem.sku) ?? 0) + item.quantity);
      const locationKey = `${inventoryItem.sku}\u0000${item.inventoryLocation}`;
      const currentLocationSale = soldByLocation.get(locationKey);
      soldByLocation.set(locationKey, {
        sku: inventoryItem.sku,
        location: item.inventoryLocation,
        quantity: (currentLocationSale?.quantity ?? 0) + item.quantity,
      });
    }
    items.push({
      description: inventoryItem?.item ?? item.description.trim(),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      ...(inventoryItem ? { inventorySku: inventoryItem.sku } : {}),
      ...(inventoryItem && item.inventoryLocation ? { inventoryLocation: item.inventoryLocation } : {}),
    });
  }
  const inventoryIssues = [...soldQuantities].map(([sku, quantity]) => {
    const inventoryItem = data.inventoryItems.find((item) => item.sku === sku)!;
    return { inventoryItem, quantity };
  });
  const unavailableItem = inventoryIssues.find(({ inventoryItem, quantity }) => inventoryItem.stock < quantity);
  if (unavailableItem) return { error: `Not enough ${unavailableItem.inventoryItem.item} in stock. Available: ${unavailableItem.inventoryItem.stock}; requested: ${unavailableItem.quantity}.` };
  for (const { sku, location, quantity } of soldByLocation.values()) {
    const inventoryItem = data.inventoryItems.find((item) => item.sku === sku)!;
    const available = getLocationQuantity(inventoryItem, location);
    if (available < quantity) return { error: `Not enough ${inventoryItem.item} at ${location}. Available: ${available}; requested: ${quantity}.` };
  }
  const locationSales = [...soldByLocation.values()];
  const inventoryUpdates = inventoryIssues.map(({ inventoryItem, quantity }) => {
    const unitCost = inventoryItem.stock > 0 ? inventoryItem.value / inventoryItem.stock : 0;
    const cost = Math.min(inventoryItem.value, Math.round((unitCost * quantity + Number.EPSILON) * 100) / 100);
    const stock = inventoryItem.stock - quantity;
    const value = Math.max(0, Math.round((inventoryItem.value - cost + Number.EPSILON) * 100) / 100);
    return {
      sku: inventoryItem.sku,
      quantity,
      unitCost,
      cost,
      stock,
      value,
      status: stock <= (inventoryItem.reorderLevel ?? 5) ? "Low stock" : "Healthy",
    };
  });
  const amount = Math.round(items.reduce((total, item) => total + Math.round(item.quantity * item.unitPrice * 100) / 100, 0) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(draft.amount) || Math.abs(draft.amount - amount) > 1e-7) {
    return { error: "Invoice total must match the total of its items." };
  }
  const invoiceDate = new Date(`${draft.invoiceDate}T00:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.invoiceDate) || toDateKey(invoiceDate) !== draft.invoiceDate || draft.invoiceDate > toDateKey(new Date())) {
    return { error: "Choose a valid invoice date that is not in the future." };
  }
  const dueDate = new Date(`${draft.dueDate}T00:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.dueDate) || toDateKey(dueDate) !== draft.dueDate) {
    return { error: "Choose a valid due date." };
  }

  const prepared = prepareJournal(data, {
    dateKey: draft.invoiceDate,
    memo: `Customer invoice ${invoice}`,
    sourceType: "sales-invoice",
    sourceId: invoice,
    partyId: draft.customerId,
    sourceCodes: [invoice],
    lines: [
      { account: "Accounts Receivable", debit: amount, credit: 0 },
      { account: "Sales Revenue", debit: 0, credit: amount },
    ],
  });
  if (!prepared.entry) return { error: prepared.error ?? "Customer invoice could not be posted." };
  const entry = prepared.entry;
  const posted = appendJournal(data, entry);
  if (!posted.data) return { error: posted.error ?? "Customer invoice could not be posted." };
  let postedData = posted.data;
  const costOfGoodsSold = Math.round(inventoryUpdates.reduce((total, item) => total + item.cost, 0) * 100) / 100;
  if (costOfGoodsSold > 0) {
    const inventoryJournal = prepareJournal(postedData, {
      dateKey: draft.invoiceDate,
      memo: `Inventory sold on invoice ${invoice}`,
      sourceType: "inventory-sale",
      sourceId: invoice,
      lines: [
        { account: "Cost of Goods Sold", debit: costOfGoodsSold, credit: 0 },
        { account: "Inventory", debit: 0, credit: costOfGoodsSold },
      ],
    });
    if (!inventoryJournal.entry) return { error: inventoryJournal.error ?? "Inventory could not be issued for this invoice." };
    const inventoryPosted = appendJournal(postedData, inventoryJournal.entry);
    if (!inventoryPosted.data) return { error: inventoryPosted.error ?? "Inventory could not be issued for this invoice." };
    postedData = inventoryPosted.data;
  }
  if (inventoryUpdates.length) {
    const inventoryItems = postedData.inventoryItems.map((item) => {
      const update = inventoryUpdates.find(({ sku }) => sku === item.sku);
      if (!update) return item;
      let updatedItem = item;
      for (const sale of locationSales.filter(({ sku }) => sku === item.sku)) {
        updatedItem = setLocationQuantity(updatedItem, sale.location, getLocationQuantity(updatedItem, sale.location) - sale.quantity);
      }
      return {
        ...updatedItem,
        stock: update.stock,
        value: update.value,
        unitCost: update.stock > 0 ? update.value / update.stock : 0,
        status: update.status,
      };
    });
    postedData = {
      ...postedData,
      inventoryItems,
      inventoryLocations: syncInventoryLocationTotals(inventoryItems, postedData.inventoryLocations),
      inventoryMovements: [
        ...locationSales.map((sale, index) => ({
          id: `${invoice}-${sale.sku}-${index}`,
          sku: sale.sku,
          location: sale.location,
          quantity: sale.quantity,
          unitCost: inventoryUpdates.find(({ sku }) => sku === sale.sku)?.unitCost ?? 0,
          direction: "out" as const,
          dateKey: draft.invoiceDate,
          journalEntryId: entry.id,
        })),
        ...(postedData.inventoryMovements ?? []),
      ],
    };
  }
  const [dueYear, dueMonth, dueDay] = draft.dueDate.split("-").map(Number);
  const due = new Date(dueYear, dueMonth - 1, dueDay).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const auditEvent = {
    time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    action: "New invoice",
    detail: `${invoice} · ${customer.name}`,
    user: data.profile.name,
    email: data.profile.email,
    type: "Invoice",
    status: "Created",
    dateKey: toDateKey(new Date()),
  };
  return {
    data: {
      ...postedData,
      invoices: [{
        id: invoice,
        vendor: "",
        customer: customer.name,
        customerId: customer.id,
        invoice,
        date: formatDateKey(draft.invoiceDate),
        dateKey: draft.invoiceDate,
        dueDate: draft.dueDate,
        amount,
        companyDetails: draft.companyDetails,
        customerDetails,
        items,
        status: "Matched",
        owner: data.profile.name,
        journalEntryId: entry.id,
      }, ...data.invoices],
      receivables: [{
        customer: customer.name,
        customerId: customer.id,
        invoice,
        amount,
        due,
        outstanding: amount,
        status: "Open",
        dateKey: draft.invoiceDate,
        journalEntryId: entry.id,
      }, ...data.receivables],
      auditEvents: [
        ...(inventoryUpdates.length ? [{
          ...auditEvent,
          action: "Inventory sold",
          detail: `${invoice} · ${inventoryUpdates.map((item) => `${item.sku} × ${item.quantity}`).join(", ")}`,
          type: "Inventory",
          status: "Issued",
        }] : []),
        auditEvent,
        ...postedData.auditEvents,
      ],
    },
  };
}