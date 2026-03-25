import { NextResponse } from "next/server";

export class HttpNextResponse {
  static json(body: unknown, init?: ResponseInit): NextResponse {
    return NextResponse.json(body, init);
  }
}
