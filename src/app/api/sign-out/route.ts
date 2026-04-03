/** 

**How the full flow works:**

User visits / admin / dashboard
   middleware checks accessToken cookie
   no token -> redirect / signin

User signs in at / signin
   POST / api / sign -in
   server sets httpOnly cookie + returns { user: { role: "admin" } }
   frontend reads role from response → router.push("/admin/dashboard")

User visits / employee / dashboard while logged in as admin
   middleware sees role = "admin", allowed prefix = "/admin"
   /employee doesn't start with /admin → redirect / admin / dashboard

Token expires
   middleware jwtVerify throws → delete cookies → redirect / signin

**/


import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
    const cookieStore = await cookies();
    cookieStore.delete("accessToken");
    cookieStore.delete("refreshToken");
    return NextResponse.json({ message: "Signed out" }, { status: 200 });
}