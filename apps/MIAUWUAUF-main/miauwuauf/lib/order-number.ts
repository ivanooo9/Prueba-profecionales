import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

type OrderNumberClient = Prisma.TransactionClient | typeof prisma;

const ORDER_COUNTER_ID = "order";

function isOrderNumberUnsupported(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  return (
    msg.includes("Unknown field `orderNumber`") ||
    msg.includes("Unknown arg `orderNumber`")
  );
}

export async function backfillMissingOrderNumbers(client: OrderNumberClient = prisma) {
  try {
    const ordered = await client.order.findMany({
      select: { id: true, orderNumber: true },
      orderBy: { createdAt: "asc" },
    });

    let needsResequence = false;
    for (let index = 0; index < ordered.length; index += 1) {
      const expected = index + 1;
      if (ordered[index].orderNumber !== expected) {
        needsResequence = true;
        break;
      }
    }

    if (needsResequence) {
      for (let index = 0; index < ordered.length; index += 1) {
        const expected = index + 1;
        if (ordered[index].orderNumber !== expected) {
          await client.order.update({
            where: { id: ordered[index].id },
            data: { orderNumber: expected },
          });
        }
      }
    }

    return ordered.length;
  } catch (error) {
    if (isOrderNumberUnsupported(error)) {
      return null;
    }
    throw error;
  }
}

export async function reserveNextOrderNumber(tx: Prisma.TransactionClient) {
  try {
    const highestAssigned = await backfillMissingOrderNumbers(tx);
    const counterDelegate = (tx as unknown as { counter?: typeof prisma.counter }).counter;
    if (!counterDelegate) return null;

    await counterDelegate.upsert({
      where: { id: ORDER_COUNTER_ID },
      update: {},
      create: { id: ORDER_COUNTER_ID, value: 0 },
    });

    const maxOrderNumber = highestAssigned ?? 0;

    const currentCounter = await counterDelegate.findUnique({
      where: { id: ORDER_COUNTER_ID },
      select: { value: true },
    });

    if ((currentCounter?.value ?? 0) < maxOrderNumber) {
      await counterDelegate.update({
        where: { id: ORDER_COUNTER_ID },
        data: { value: maxOrderNumber },
      });
    }

    const updatedCounter = await counterDelegate.update({
      where: { id: ORDER_COUNTER_ID },
      data: { value: { increment: 1 } },
      select: { value: true },
    });

    return updatedCounter.value;
  } catch (error) {
    if (isOrderNumberUnsupported(error)) {
      return null;
    }
    throw error;
  }
}
