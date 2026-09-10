import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, email, name, dob, gender, bloodGroup } = body;

    if (!id || !email) {
      return NextResponse.json({ error: "id and email required" }, { status: 400 });
    }

    const user = await prisma.user.upsert({
      where: { id },
      update: {
        email,
        name,
        dob,
        gender,
        bloodGroup,
      },
      create: {
        id,
        email,
        name,
        dob,
        gender,
        bloodGroup,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, email, ...data } = body;

    console.log("PUT /api/user - id:", id, "data:", data);

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const user = await prisma.user.upsert({
      where: { id },
      update: data,
      create: {
        id,
        email: email || "",
        ...data,
      },
    });

    console.log("User updated:", user);
    return NextResponse.json(user);
  } catch (error) {
    console.error("PUT /api/user error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
