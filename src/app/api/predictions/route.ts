import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const predictions = await prisma.prediction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(predictions);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch predictions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, date, riskScore, riskLevel, age, bmi, glucose, hba1c, bloodPressure, familyHistory, riskFactors } = body;

    if (!userId || !date || riskScore === undefined || !riskLevel) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const prediction = await prisma.prediction.create({
      data: {
        userId,
        date,
        riskScore: parseFloat(riskScore),
        riskLevel,
        age,
        bmi,
        glucose,
        hba1c,
        bloodPressure,
        familyHistory,
        riskFactors: riskFactors || [],
      },
    });

    return NextResponse.json(prediction);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create prediction" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await prisma.prediction.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete prediction" }, { status: 500 });
  }
}
