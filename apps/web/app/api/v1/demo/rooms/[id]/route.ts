import { NextRequest, NextResponse } from "next/server";
import { mutationsEnabled, patchRoom } from "@/lib/store";
import { isSameOrigin } from "@/lib/same-origin";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!mutationsEnabled())
    return NextResponse.json(
      { error: { message: "Thao tác demo không được bật" } },
      { status: 403 },
    );
  if (!isSameOrigin(request))
    return NextResponse.json(
      { error: { message: "Origin không hợp lệ" } },
      { status: 403 },
    );
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { message: "JSON không hợp lệ" } },
      { status: 400 },
    );
  }
  if (
    !body ||
    !Number.isInteger(body.version) ||
    body.version < 1 ||
    (body.status !== undefined &&
      !["AVAILABLE", "RENTED"].includes(body.status)) ||
    (body.price !== undefined &&
      (!Number.isInteger(body.price) ||
        body.price < 100000 ||
        body.price > 100000000)) ||
    (body.status === undefined && body.price === undefined)
  ) {
    return NextResponse.json(
      { error: { message: "Giá, trạng thái hoặc phiên bản không hợp lệ" } },
      { status: 400 },
    );
  }
  const { id } = await context.params;
  const changes = {
    ...(body.status ? { status: body.status } : {}),
    ...(body.price !== undefined ? { price: body.price } : {}),
  };
  const result = patchRoom(id, body.version, changes);
  if ("error" in result)
    return NextResponse.json(
      {
        error: {
          code: result.error,
          message:
            result.error === "NOT_FOUND"
              ? "Không tìm thấy phòng"
              : "Phòng vừa được thay đổi. Vui lòng tải lại.",
        },
      },
      { status: result.error === "NOT_FOUND" ? 404 : 409 },
    );
  return NextResponse.json({
    data: result.room,
    meta: { revision: result.revision },
  });
}
