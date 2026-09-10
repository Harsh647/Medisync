import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const medicines = await prisma.medicine.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(medicines);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch medicines" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, dosage, meal, times, quantity, threshold, taken } = body;

    if (!userId || !name || !dosage || !meal || !times || quantity === undefined || threshold === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const medicine = await prisma.medicine.create({
      data: {
        userId,
        name,
        dosage,
        meal,
        times,
        quantity: parseInt(quantity),
        threshold: parseInt(threshold),
        taken: taken || [],
      },
    });

    return NextResponse.json(medicine);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create medicine" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    console.log("PUT /api/medicines - id:", id, "data:", JSON.stringify(data));

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const updateData: Record<string, any> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.dosage !== undefined) updateData.dosage = data.dosage;
    if (data.meal !== undefined) updateData.meal = data.meal;
    if (data.times !== undefined) updateData.times = data.times;
    if (data.quantity !== undefined) updateData.quantity = typeof data.quantity === "number" ? data.quantity : parseInt(data.quantity);
    if (data.threshold !== undefined) updateData.threshold = typeof data.threshold === "number" ? data.threshold : parseInt(data.threshold);
    if (data.taken !== undefined) updateData.taken = data.taken;
    if (data.takenDate !== undefined) updateData.takenDate = data.takenDate === null ? null : data.takenDate;

    console.log("updateData:", JSON.stringify(updateData));

    const medicine = await prisma.medicine.update({
      where: { id },
      data: updateData,
    });

    console.log("Updated medicine:", JSON.stringify(medicine));
    return NextResponse.json(medicine);
  } catch (error) {
    console.error("PUT /api/medicines error:", error);
    return NextResponse.json({ error: "Failed to update medicine" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await prisma.medicine.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete medicine" }, { status: 500 });
  }
}
