import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const reports = await prisma.report.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reports);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, date, type, status, summary, keyFindings, recommendations, error } = body;

    if (!userId || !name || !date || !type || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const report = await prisma.report.create({
      data: {
        userId,
        name,
        date,
        type,
        status,
        summary,
        keyFindings: keyFindings || [],
        recommendations: recommendations || [],
        error,
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const report = await prisma.report.update({
      where: { id },
      data,
    });

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await prisma.report.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
  }
}
