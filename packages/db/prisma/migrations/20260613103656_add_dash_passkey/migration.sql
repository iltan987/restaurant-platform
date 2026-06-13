-- CreateTable
CREATE TABLE "dash_passkey" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "publicKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialID" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "deviceType" TEXT NOT NULL,
    "backedUp" BOOLEAN NOT NULL,
    "transports" TEXT,
    "createdAt" TIMESTAMP(3),
    "aaguid" TEXT,

    CONSTRAINT "dash_passkey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dash_passkey_userId_idx" ON "dash_passkey"("userId");

-- CreateIndex
CREATE INDEX "dash_passkey_credentialID_idx" ON "dash_passkey"("credentialID");

-- AddForeignKey
ALTER TABLE "dash_passkey" ADD CONSTRAINT "dash_passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dash_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
