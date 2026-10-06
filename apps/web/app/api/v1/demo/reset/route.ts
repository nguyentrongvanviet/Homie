import { NextRequest, NextResponse } from "next/server";
import { mutationsEnabled, resetStore } from "@/lib/store";
import { isSameOrigin } from "@/lib/same-origin";

export function POST(request: NextRequest) {
  if (!mutationsEnabled() || !isSameOrigin(request))
    return NextResponse.json(
      { error: { message: "Thao tác không được phép" } },
      { status: 403 },
    );
  resetStore();
  return NextResponse.json({ data: { reset: true } });
}
