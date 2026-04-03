/**
 * Script to seed the database with initial RBAC configurations.
 * Run this script using: npx tsx src/scripts/seed-rbac.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding RBAC Database...");

  // 1. Create Base Permissions
  const permissionsData = [
    { action: "read" },
    { action: "write" },
    { action: "edit" },
    { action: "delete" },
  ];

  const permissions = [];
  for (const perm of permissionsData) {
    const created = await prisma.permission.upsert({
      where: { action: perm.action },
      update: {},
      create: { action: perm.action },
    });
    permissions.push(created);
  }
  console.log("Permissions seeded!");

  // 2. Identify permission IDs conceptually
  const readPermId = permissions.find((p) => p.action === "read")!.id;
  const writePermId = permissions.find((p) => p.action === "write")!.id;
  const editPermId = permissions.find((p) => p.action === "edit")!.id;
  const deletePermId = permissions.find((p) => p.action === "delete")!.id;

  // 3. Create Default Team Roles
  const rolesData = [
    {
      name: "admin",
      permissionIDs: [readPermId, writePermId, editPermId, deletePermId],
    },
    {
      name: "editor",
      permissionIDs: [readPermId, writePermId, editPermId],
    },
    {
      name: "viewer",
      permissionIDs: [readPermId],
    },
  ];

  /* 
   Upserting an array for the implicit M:N connection is tricky because role name isn't tagged unique 
   in the schema. We'll find or create them based on name.
  */
  for (const roleDef of rolesData) {
    const existingRole = await prisma.role.findFirst({
        where: { name: roleDef.name }
    });

    if (existingRole) {
         await prisma.role.update({
             where: { id: existingRole.id },
             data: { permissionIDs: roleDef.permissionIDs }
         });
    } else {
        await prisma.role.create({
            data: {
                name: roleDef.name,
                permissionIDs: roleDef.permissionIDs
            }
        });
    }
  }

  console.log("Roles seeded with associated permissions!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("Seeding complete.");
  });
