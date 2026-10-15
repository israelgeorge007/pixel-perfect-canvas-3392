import type { DashboardData } from "../data/mockData";
import { calculateWeightedAverage } from "./accounting";

type InventoryItem = DashboardData["inventoryItems"][number];
type InventoryLocation = DashboardData["inventoryLocations"][number];
type ReceiptLine = { sku: string; quantity: number; unitPrice: number };

export function getLocationQuantity(item: InventoryItem, location: string): number {
  return item.locationStock?.find((entry) => entry.location === location)?.quantity ?? 0;
}

export function setLocationQuantity(item: InventoryItem, location: string, quantity: number): InventoryItem {
  const locationStock = [...(item.locationStock ?? [])];
  const existing = locationStock.findIndex((entry) => entry.location === location);
  if (existing >= 0) locationStock[existing] = { ...locationStock[existing], quantity };
  else locationStock.push({ location, quantity });
  const normalizedLocationStock = locationStock.filter((entry) => entry.quantity > 0);
  const stock = normalizedLocationStock.reduce((total, entry) => total + entry.quantity, 0);
  return { ...item, locationStock: normalizedLocationStock, stock };
}

function distributeByLegacyLocationWeights(stock: number, locations: InventoryLocation[]) {
  if (!locations.length || stock <= 0) return [];
  const totalWeight = locations.reduce((total, location) => total + Math.max(location.stock, 0), 0);
  const weights = locations.map((location) => totalWeight > 0 ? Math.max(location.stock, 0) / totalWeight : 1 / locations.length);
  const allocations = weights.map((weight) => Math.floor(stock * weight));
  let remainder = stock - allocations.reduce((total, quantity) => total + quantity, 0);
  const priority = weights.map((weight, index) => ({ index, fraction: stock * weight - allocations[index] }))
    .sort((left, right) => right.fraction - left.fraction || left.index - right.index);
  for (let index = 0; index < priority.length && remainder > 0; index += 1, remainder -= 1) allocations[priority[index].index] += 1;
  return locations.flatMap((location, index) => allocations[index] > 0 ? [{ location: location.location, quantity: allocations[index] }] : []);
}

export function initializeInventoryLocationStock(
  items: DashboardData["inventoryItems"],
  locations: InventoryLocation[],
  movements: NonNullable<DashboardData["inventoryMovements"]>,
): DashboardData["inventoryItems"] {
  return items.map((item) => {
    const validLocations = new Set(locations.map(({ location }) => location));
    const existing = item.locationStock?.filter((entry) => validLocations.has(entry.location) && Number.isInteger(entry.quantity) && entry.quantity >= 0);
    if (existing && existing.reduce((total, entry) => total + entry.quantity, 0) === item.stock) {
      return { ...item, locationStock: existing.filter((entry) => entry.quantity > 0) };
    }

    const movementQuantities = new Map<string, number>();
    for (const movement of movements.filter(({ sku, location }) => sku === item.sku && validLocations.has(location))) {
      movementQuantities.set(movement.location, (movementQuantities.get(movement.location) ?? 0) + (movement.direction === "in" ? movement.quantity : -movement.quantity));
    }
    const movementStock = [...movementQuantities.values()].reduce((total, quantity) => total + quantity, 0);
    const movementDistribution = [...movementQuantities].filter(([, quantity]) => quantity > 0)
      .map(([location, quantity]) => ({ location, quantity }));
    const distributionReconciles = movementDistribution.reduce((total, entry) => total + entry.quantity, 0) === item.stock;
    const locationStock = movementStock === item.stock && distributionReconciles && movementDistribution.every(({ quantity }) => Number.isInteger(quantity))
      ? movementDistribution
      : distributeByLegacyLocationWeights(item.stock, locations);
    return { ...item, locationStock };
  });
}

export function syncInventoryLocationTotals(
  items: DashboardData["inventoryItems"],
  locations: InventoryLocation[],
): InventoryLocation[] {
  return locations.map((location) => {
    const stock = items.reduce((total, item) => total + getLocationQuantity(item, location.location), 0);
    return { ...location, stock, capacity: Math.max(location.capacity, stock) };
  });
}

export function receiveInventoryAtLocation(
  items: DashboardData["inventoryItems"],
  locations: InventoryLocation[],
  lines: ReceiptLine[],
  destination: string,
): { inventoryItems?: DashboardData["inventoryItems"]; inventoryLocations?: InventoryLocation[]; receivedLines?: { sku: string; quantity: number; unitCost: number }[]; error?: string } {
  const location = locations.find(({ location: name }) => name === destination);
  if (!location) return { error: "Choose a valid receiving location." };
  if (!lines.length) return { error: "The receipt has no inventory lines." };

  const receiptBySku = new Map<string, { quantity: number; totalCost: number }>();
  for (const line of lines) {
    const itemExists = items.some(({ sku }) => sku === line.sku);
    if (!itemExists || !Number.isInteger(line.quantity) || line.quantity < 1 || !Number.isFinite(line.unitPrice) || line.unitPrice <= 0) {
      return { error: "The receipt contains an invalid inventory SKU, quantity, or unit cost." };
    }
    const current = receiptBySku.get(line.sku) ?? { quantity: 0, totalCost: 0 };
    current.quantity += line.quantity;
    current.totalCost += line.quantity * line.unitPrice;
    receiptBySku.set(line.sku, current);
  }

  const receiptQuantity = [...receiptBySku.values()].reduce((total, receipt) => total + receipt.quantity, 0);
  if (location.stock + receiptQuantity > location.capacity) {
    return { error: `This location only has capacity for ${location.capacity - location.stock} more units.` };
  }

  const receivedLines = [...receiptBySku].map(([sku, receipt]) => ({
    sku,
    quantity: receipt.quantity,
    unitCost: receipt.totalCost / receipt.quantity,
  }));
  const inventoryItems = items.map((item) => {
    const receipt = receivedLines.find(({ sku }) => sku === item.sku);
    if (!receipt) return item;
    const weighted = calculateWeightedAverage(item.stock, item.value, receipt.quantity, receipt.unitCost);
    return {
      ...setLocationQuantity(item, destination, getLocationQuantity(item, destination) + receipt.quantity),
      stock: weighted.quantityOnHand,
      value: weighted.inventoryValue,
      unitCost: weighted.averageUnitCost,
      status: weighted.quantityOnHand <= (item.reorderLevel ?? 5) ? "Low stock" : "Healthy",
    };
  });
  return {
    inventoryItems,
    inventoryLocations: syncInventoryLocationTotals(inventoryItems, locations),
    receivedLines,
  };
}