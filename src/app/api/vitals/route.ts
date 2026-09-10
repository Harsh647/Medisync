import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const vitals = await prisma.vital.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(vitals);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch vitals" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, date, time, heartRate, systolic, diastolic, glucose, oxygen, temperature } = body;

    if (!userId || !date) {
      return NextResponse.json({ error: "userId and date required" }, { status: 400 });
    }

    const vital = await prisma.vital.create({
      data: {
        userId,
        date,
        time,
        heartRate: heartRate ? parseInt(heartRate) : null,
        systolic: systolic ? parseInt(systolic) : null,
        diastolic: diastolic ? parseInt(diastolic) : null,
        glucose: glucose ? parseInt(glucose) : null,
        oxygen: oxygen ? parseInt(oxygen) : null,
        temperature: temperature ? parseFloat(temperature) : null,
      },
    });

    return NextResponse.json(vital);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create vital" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await prisma.vital.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete vital" }, { status: 500 });
  }
}
