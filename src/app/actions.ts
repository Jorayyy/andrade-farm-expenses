"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseDateInput } from "@/lib/format";
import { parseCsv, parseCsvDate, parseCsvNumber, rowsToObjects } from "@/lib/csv";

export type ActionState = { ok: boolean; error?: string; message?: string };

export const initialActionState: ActionState = { ok: false };

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value === "" ? null : value;
}

function numberValue(formData: FormData, key: string) {
  const value = text(formData, key);
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export async function saveExpense(previous: ActionState, formData: FormData): Promise<ActionState> {
  try {
    return await saveExpenseImpl(previous, formData);
  } catch (error) {
    console.error("[saveExpense]", error);
    return { ok: false, error: errorMessage(error) };
  }
}

async function saveExpenseImpl(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = text(formData, "id") || null;
  const description = text(formData, "description");
  const amount = numberValue(formData, "amount");
  const date = parseDateInput(formData.get("date"));
  const category = text(formData, "category") || "Other";
  const vendor = optionalText(formData, "vendor");
  const paymentMethod = optionalText(formData, "paymentMethod");
  const notes = optionalText(formData, "notes");
  const receiptData = text(formData, "receiptData");
  const receiptName = text(formData, "receiptName") || "receipt.jpg";

  if (!description) return { ok: false, error: "Description is required." };
  if (!date) return { ok: false, error: "A valid date is required." };
  if (amount === null || amount < 0) return { ok: false, error: "Amount must be a positive number." };

  let newReceiptId: string | null = null;
  if (receiptData) {
    const match = /^data:(image\/[\w.+-]+);base64,(.+)$/.exec(receiptData);
    if (!match) return { ok: false, error: "Receipt must be a valid image." };
    const size = Math.ceil((match[2].length * 3) / 4);
    if (size > 6_000_000) return { ok: false, error: "Receipt image is too large. Please use a smaller photo." };
    const receipt = await prisma.receipt.create({
      data: { filename: receiptName, mimeType: match[1], data: receiptData, size },
    });
    newReceiptId = receipt.id;
  }

  const data = {
    date,
    description,
    amount: amount as number,
    category,
    vendor,
    paymentMethod,
    notes,
  };

  if (id) {
    const existing = await prisma.expense.findUnique({ where: { id }, select: { receiptId: true } });
    await prisma.expense.update({
      where: { id },
      data: { ...data, ...(newReceiptId ? { receiptId: newReceiptId } : {}) },
    });
    if (newReceiptId && existing?.receiptId) {
      await prisma.receipt.delete({ where: { id: existing.receiptId } }).catch(() => undefined);
    }
  } else {
    await prisma.expense.create({
      data: { ...data, ...(newReceiptId ? { receiptId: newReceiptId } : {}) },
    });
  }

  revalidateAll();
  return { ok: true, message: id ? "Expense updated." : "Expense added." };
}

export async function deleteExpense(formData: FormData): Promise<void> {
  const id = text(formData, "id");
  if (!id) return;
  const expense = await prisma.expense.findUnique({ where: { id }, select: { receiptId: true } });
  await prisma.expense.delete({ where: { id } });
  if (expense?.receiptId) {
    await prisma.receipt.delete({ where: { id: expense.receiptId } }).catch(() => undefined);
  }
  revalidateAll();
}

export async function saveIncome(previous: ActionState, formData: FormData): Promise<ActionState> {
  try {
    return await saveIncomeImpl(previous, formData);
  } catch (error) {
    console.error("[saveIncome]", error);
    return { ok: false, error: errorMessage(error) };
  }
}

async function saveIncomeImpl(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = text(formData, "id") || null;
  const description = text(formData, "description");
  const amount = numberValue(formData, "amount");
  const date = parseDateInput(formData.get("date"));
  const category = text(formData, "category") || "Other";
  const buyer = optionalText(formData, "buyer");
  const notes = optionalText(formData, "notes");

  if (!description) return { ok: false, error: "Description is required." };
  if (!date) return { ok: false, error: "A valid date is required." };
  if (amount === null || amount < 0) return { ok: false, error: "Amount must be a positive number." };

  const data = { date, description, amount, category, buyer, notes };

  if (id) {
    await prisma.income.update({ where: { id }, data });
  } else {
    await prisma.income.create({ data });
  }

  revalidateAll();
  return { ok: true, message: id ? "Income updated." : "Income added." };
}

export async function deleteIncome(formData: FormData): Promise<void> {
  const id = text(formData, "id");
  if (!id) return;
  await prisma.income.delete({ where: { id } });
  revalidateAll();
}

export async function saveInventoryItem(previous: ActionState, formData: FormData): Promise<ActionState> {
  try {
    return await saveInventoryItemImpl(previous, formData);
  } catch (error) {
    console.error("[saveInventoryItem]", error);
    return { ok: false, error: errorMessage(error) };
  }
}

async function saveInventoryItemImpl(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = text(formData, "id") || null;
  const name = text(formData, "name");
  const category = text(formData, "category") || "Other";
  const unit = text(formData, "unit") || "piece";
  const quantity = numberValue(formData, "quantity") ?? 0;
  const reorderLevel = numberValue(formData, "reorderLevel") ?? 0;
  const unitCost = numberValue(formData, "unitCost") ?? 0;
  const location = optionalText(formData, "location");
  const notes = optionalText(formData, "notes");

  if (!name) return { ok: false, error: "Item name is required." };
  if (quantity < 0 || reorderLevel < 0 || unitCost < 0) {
    return { ok: false, error: "Quantities and costs cannot be negative." };
  }

  if (id) {
    await prisma.inventoryItem.update({
      where: { id },
      data: { name, category, unit, reorderLevel, unitCost, location, notes },
    });
  } else {
    const item = await prisma.inventoryItem.create({
      data: { name, category, unit, quantity, reorderLevel, unitCost, location, notes },
    });
    if (quantity > 0) {
      await prisma.stockMovement.create({
        data: { itemId: item.id, type: "IN", quantity, note: "Opening stock" },
      });
    }
  }

  revalidateAll();
  return { ok: true, message: id ? "Item updated." : "Item added." };
}

export async function deleteInventoryItem(formData: FormData): Promise<void> {
  const id = text(formData, "id");
  if (!id) return;
  await prisma.inventoryItem.delete({ where: { id } });
  revalidateAll();
}

export async function recordStockMovement(previous: ActionState, formData: FormData): Promise<ActionState> {
  try {
    return await recordStockMovementImpl(previous, formData);
  } catch (error) {
    console.error("[recordStockMovement]", error);
    return { ok: false, error: errorMessage(error) };
  }
}

async function recordStockMovementImpl(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const itemId = text(formData, "itemId");
  const type = text(formData, "type") || "IN";
  const quantity = numberValue(formData, "quantity");
  const date = parseDateInput(formData.get("date")) ?? new Date();
  const note = optionalText(formData, "note");

  if (!itemId) return { ok: false, error: "Missing inventory item." };
  if (quantity === null || quantity < 0) return { ok: false, error: "Quantity must be zero or greater." };

  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item) return { ok: false, error: "Inventory item not found." };

  let delta: number;
  let newQuantity: number;
  if (type === "IN") {
    delta = quantity;
    newQuantity = item.quantity + quantity;
  } else if (type === "OUT") {
    if (quantity > item.quantity) {
      return { ok: false, error: `Only ${item.quantity} ${item.unit} available.` };
    }
    delta = -quantity;
    newQuantity = item.quantity - quantity;
  } else {
    delta = quantity - item.quantity;
    newQuantity = quantity;
  }

  await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        itemId,
        type,
        quantity: delta,
        date,
        note,
      },
    }),
    prisma.inventoryItem.update({ where: { id: itemId }, data: { quantity: newQuantity } }),
  ]);

  revalidateAll();
  return { ok: true, message: "Stock updated." };
}

export async function saveLivestock(previous: ActionState, formData: FormData): Promise<ActionState> {
  try {
    return await saveLivestockImpl(previous, formData);
  } catch (error) {
    console.error("[saveLivestock]", error);
    return { ok: false, error: errorMessage(error) };
  }
}

async function saveLivestockImpl(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = text(formData, "id") || null;
  const tag = text(formData, "tag");
  const species = text(formData, "species") || "Other";
  const breed = optionalText(formData, "breed");
  const sex = optionalText(formData, "sex");
  const birthDate = parseDateInput(formData.get("birthDate"));
  const acquiredDate = parseDateInput(formData.get("acquiredDate"));
  const acquisitionCost = numberValue(formData, "acquisitionCost");
  const status = text(formData, "status") || "Active";
  const location = optionalText(formData, "location");
  const notes = optionalText(formData, "notes");

  if (!tag) return { ok: false, error: "Tag or name is required." };

  const data = { tag, species, breed, sex, birthDate, acquiredDate, acquisitionCost, status, location, notes };

  if (id) {
    await prisma.livestock.update({ where: { id }, data });
  } else {
    await prisma.livestock.create({ data });
  }

  revalidateAll();
  return { ok: true, message: id ? "Livestock updated." : "Livestock added." };
}

export async function deleteLivestock(formData: FormData): Promise<void> {
  const id = text(formData, "id");
  if (!id) return;
  await prisma.livestock.delete({ where: { id } });
  revalidateAll();
}

export async function saveCrop(previous: ActionState, formData: FormData): Promise<ActionState> {
  try {
    return await saveCropImpl(previous, formData);
  } catch (error) {
    console.error("[saveCrop]", error);
    return { ok: false, error: errorMessage(error) };
  }
}

async function saveCropImpl(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = text(formData, "id") || null;
  const name = text(formData, "name");
  const variety = optionalText(formData, "variety");
  const plot = optionalText(formData, "plot");
  const area = numberValue(formData, "area");
  const areaUnit = text(formData, "areaUnit") || "ha";
  const plantedDate = parseDateInput(formData.get("plantedDate"));
  const expectedHarvestDate = parseDateInput(formData.get("expectedHarvestDate"));
  const status = text(formData, "status") || "Planned";
  const notes = optionalText(formData, "notes");

  if (!name) return { ok: false, error: "Crop name is required." };

  const data = { name, variety, plot, area, areaUnit, plantedDate, expectedHarvestDate, status, notes };

  if (id) {
    await prisma.crop.update({ where: { id }, data });
  } else {
    await prisma.crop.create({ data });
  }

  revalidateAll();
  return { ok: true, message: id ? "Crop updated." : "Crop added." };
}

export async function deleteCrop(formData: FormData): Promise<void> {
  const id = text(formData, "id");
  if (!id) return;
  await prisma.crop.delete({ where: { id } });
  revalidateAll();
}

export async function importExpenses(previous: ActionState, formData: FormData): Promise<ActionState> {
  try {
    return await importExpensesImpl(previous, formData);
  } catch (error) {
    console.error("[importExpenses]", error);
    return { ok: false, error: errorMessage(error) };
  }
}

async function importExpensesImpl(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a CSV file to import." };
  }

  const rows = rowsToObjects(parseCsv(await file.text()));
  const data: {
    date: Date;
    description: string;
    amount: number;
    category: string;
    vendor: string | null;
    paymentMethod: string | null;
    notes: string | null;
  }[] = [];

  for (const row of rows) {
    const date = parseCsvDate(row.date);
    const amount = parseCsvNumber(row.amount);
    const description = row.description ?? "";
    if (!date || amount === null || !description) continue;
    data.push({
      date,
      description,
      amount,
      category: row.category || "Other",
      vendor: row.vendor || null,
      paymentMethod: row.paymentmethod || null,
      notes: row.notes || null,
    });
  }

  if (data.length === 0) {
    return {
      ok: false,
      error: "No valid rows found. Required columns: date, description, amount.",
    };
  }

  await prisma.expense.createMany({ data });
  revalidateAll();
  return { ok: true, message: `Imported ${data.length} expense(s).` };
}

export async function importInventory(previous: ActionState, formData: FormData): Promise<ActionState> {
  try {
    return await importInventoryImpl(previous, formData);
  } catch (error) {
    console.error("[importInventory]", error);
    return { ok: false, error: errorMessage(error) };
  }
}

async function importInventoryImpl(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a CSV file to import." };
  }

  const rows = rowsToObjects(parseCsv(await file.text()));
  const data: {
    name: string;
    category: string;
    unit: string;
    quantity: number;
    reorderLevel: number;
    unitCost: number;
    location: string | null;
    notes: string | null;
  }[] = [];

  for (const row of rows) {
    const name = row.name ?? "";
    if (!name) continue;
    data.push({
      name,
      category: row.category || "Other",
      unit: row.unit || "piece",
      quantity: parseCsvNumber(row.quantity) ?? 0,
      reorderLevel: parseCsvNumber(row.reorderlevel) ?? 0,
      unitCost: parseCsvNumber(row.unitcost) ?? 0,
      location: row.location || null,
      notes: row.notes || null,
    });
  }

  if (data.length === 0) {
    return {
      ok: false,
      error: "No valid rows found. Required column: name.",
    };
  }

  await prisma.inventoryItem.createMany({ data });
  revalidateAll();
  return { ok: true, message: `Imported ${data.length} item(s).` };
}
