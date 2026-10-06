import { NextRequest, NextResponse } from "next/server";
import { filterRooms, parseQuery, QueryError } from "@/lib/search";
import { getStore, mutationsEnabled } from "@/lib/store";

export const dynamic = "force-dynamic";
export function GET(request: NextRequest) {
  try {
    const { filters, bounds } = parseQuery(request.nextUrl.searchParams);
    const store = getStore();
    const rooms = filterRooms(store.rooms, filters, bounds);
    return NextResponse.json(
      {
        data: rooms,
        meta: {
          total: rooms.length,
          revision: store.revision,
          updatedAt: store.updatedAt,
          queryKey: request.nextUrl.searchParams.toString(),
          demoMutations: mutationsEnabled(),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof QueryError)
      return NextResponse.json(
        { error: { code: "INVALID_QUERY", message: error.message } },
        { status: 400 },
      );
    throw error;
  }
}
